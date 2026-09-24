'use strict';
// Server-side quote engine. The browser only ever sends *what* the customer
// wants; every amount charged is computed here.
//
// VAT (KSA): prices are VAT-inclusive. Each line carries its own rate —
// international air transport is zero-rated, domestic flights and all agency
// service fees are standard-rated (15%). Confirm treatment of packages with
// your tax advisor; they are standard-rated here.

const config = require('./config');
const dbm = require('./db');
const { AppError } = require('./errors');
const { vatFromInclusive } = require('./money');
const flights = require('./flights');
const { AIRPORTS } = require('./airports');

const CHILD_RATE = 0.75;
const INFANT_RATE = 0.1;

const ADDONS = {
  insurance: { en: 'Travel insurance', ar: 'تأمين السفر', per: 'traveler', price: 7500, types: ['package', 'flight', 'hotel'] },
  transfer: { en: 'Airport transfers (return)', ar: 'توصيل من وإلى المطار', per: 'booking', price: 15000, types: ['package', 'flight', 'hotel'] },
  esim: { en: 'Travel eSIM (10 GB)', ar: 'شريحة بيانات إلكترونية (10 جيجا)', per: 'traveler', price: 4900, types: ['package', 'flight', 'hotel'] },
  express: { en: 'Express visa processing', ar: 'معالجة التأشيرة المستعجلة', per: 'traveler', price: 20000, types: ['visa'] },
};

const int = (v, d = 0) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : d);

function parsePax(input) {
  const adults = int(input.adults, 1);
  const children = int(input.children, 0);
  const infants = int(input.infants, 0);
  if (adults < 1 || adults > 9) throw new AppError('Adults must be between 1 and 9.', { ar: 'عدد البالغين يجب أن يكون بين 1 و 9.' });
  if (children < 0 || children > 8) throw new AppError('Children must be between 0 and 8.', { ar: 'عدد الأطفال يجب أن يكون بين 0 و 8.' });
  if (infants < 0 || infants > adults) throw new AppError('Each infant must travel with an adult.', { ar: 'يجب أن يرافق كل رضيع شخص بالغ.' });
  return { adults, children, infants };
}

function paxLines(unitAdult, pax, labelEn, labelAr) {
  const lines = [{ en: `${labelEn} — adult`, ar: `${labelAr} — بالغ`, qty: pax.adults, unit: unitAdult }];
  if (pax.children) lines.push({ en: `${labelEn} — child`, ar: `${labelAr} — طفل`, qty: pax.children, unit: Math.round(unitAdult * CHILD_RATE) });
  if (pax.infants) lines.push({ en: `${labelEn} — infant`, ar: `${labelAr} — رضيع`, qty: pax.infants, unit: Math.round(unitAdult * INFANT_RATE) });
  return lines;
}

function quotePackage(db, input, pax) {
  const pkg = db.prepare('SELECT * FROM packages WHERE (id = ? OR slug = ?) AND active = 1').get(int(input.id, -1), String(input.id));
  if (!pkg) throw new AppError('This package is not available.', { ar: 'هذه الباقة غير متاحة.' });
  flights.assertDate(input.date, 'travel date');
  const minDate = flights.addDays(flights.todayRiyadh(), 3);
  if (input.date < minDate) throw new AppError('Packages must be booked at least 3 days before departure.', { ar: 'يجب حجز الباقات قبل 3 أيام على الأقل من موعد السفر.' });
  if (pax.adults + pax.children > pkg.seats) throw new AppError(`Only ${pkg.seats} seats left on this package.`, { ar: `تبقى ${pkg.seats} مقاعد فقط في هذه الباقة.` });
  return {
    itemId: String(pkg.id),
    title: pkg.title_en,
    titleAr: pkg.title_ar,
    date: input.date,
    endDate: flights.addDays(input.date, pkg.duration_days - 1),
    lines: paxLines(pkg.price, pax, pkg.title_en, pkg.title_ar),
    meta: { slug: pkg.slug, category: pkg.category, durationDays: pkg.duration_days, destination: pkg.destination_en },
  };
}

const cityEn = (c) => AIRPORTS[c]?.en || c;
const cityAr = (c) => AIRPORTS[c]?.ar || c;

async function quoteFlight(db, input, pax) {
  const offer = await flights.getOffer(db, input.id);
  const o = offer.pax;
  if (o.adults !== pax.adults || o.children !== pax.children || o.infants !== pax.infants) {
    throw new AppError('Passenger numbers changed — please search again.', { ar: 'تغيّر عدد المسافرين — يرجى البحث مرة أخرى.' });
  }
  const first = offer.slices[0];
  const ret = offer.slices.length === 2;
  const codes = offer.slices.flatMap((s) => s.segments.flatMap((g) => [g.origin, g.destination]));
  const domestic = flights.isDomestic(codes);
  const cabin = flights.CABINS[offer.cabin] || flights.CABINS.economy;
  const routeEn = `${cityEn(first.origin)} → ${cityEn(first.destination)}`;
  const routeAr = `${cityAr(first.origin)} ← ${cityAr(first.destination)}`;
  const seated = pax.adults + pax.children + pax.infants;
  const fee = dbm.getSetting(db, 'flight_fees', { perPassenger: 0 }).perPassenger;
  const lines = [{
    en: `Air ticket${seated > 1 ? 's' : ''} — ${offer.owner.name}, ${routeEn}${ret ? ' (return)' : ''}`,
    ar: `تذاكر طيران — ${offer.owner.name}، ${routeAr}${ret ? ' (ذهاب وعودة)' : ''}`,
    qty: 1, unit: offer.total, vatRate: domestic ? config.vatRate : 0,
  }];
  if (fee) lines.push({ en: 'Booking service fee', ar: 'رسوم خدمة الحجز', qty: seated, unit: fee, vatRate: config.vatRate });
  return {
    itemId: offer.id,
    title: `${routeEn}${ret ? ' · Return' : ' · One way'} · ${cabin.en}`,
    titleAr: `${routeAr}${ret ? ' · ذهاب وعودة' : ' · ذهاب فقط'} · ${cabin.ar}`,
    date: first.departAt.slice(0, 10),
    endDate: ret ? offer.slices[1].departAt.slice(0, 10) : null,
    lines,
    meta: {
      provider: offer.provider, owner: offer.owner, cabin: offer.cabin, slices: offer.slices, baggage: offer.baggage,
      refundable: offer.refundable, changeable: offer.changeable, expiresAt: offer.expiresAt, domestic, holdable: !!offer.holdable,
    },
  };
}

function quoteHotel(db, input) {
  const hotel = db.prepare('SELECT * FROM hotels WHERE id = ? AND active = 1').get(int(input.id, -1));
  if (!hotel) throw new AppError('This hotel is not available.', { ar: 'هذا الفندق غير متاح.' });
  flights.assertDate(input.date, 'check-in date');
  flights.assertDate(input.endDate, 'check-out date');
  if (input.date < flights.todayRiyadh()) throw new AppError('Check-in cannot be in the past.', { ar: 'لا يمكن أن يكون تاريخ الوصول في الماضي.' });
  const nights = Math.round((Date.parse(input.endDate) - Date.parse(input.date)) / 864e5);
  if (nights < 1 || nights > 30) throw new AppError('Stays must be between 1 and 30 nights.', { ar: 'مدة الإقامة يجب أن تكون بين ليلة و 30 ليلة.' });
  const rooms = int(input.rooms, 1);
  if (rooms < 1 || rooms > 5) throw new AppError('You can book between 1 and 5 rooms.', { ar: 'يمكنك حجز من 1 إلى 5 غرف.' });
  return {
    itemId: String(hotel.id),
    title: `${hotel.name}, ${hotel.city_en}`,
    titleAr: `${hotel.name}، ${hotel.city_ar}`,
    date: input.date,
    endDate: input.endDate,
    lines: [{ en: `${hotel.name} — ${rooms} room(s) × ${nights} night(s)`, ar: `${hotel.name} — ${rooms} غرفة × ${nights} ليلة`, qty: rooms * nights, unit: hotel.price_per_night }],
    meta: { nights, rooms, stars: hotel.stars, city: hotel.city_en },
  };
}

function quoteVisa(db, input, pax) {
  const visa = db.prepare('SELECT * FROM visas WHERE id = ? AND active = 1').get(int(input.id, -1));
  if (!visa) throw new AppError('This visa service is not available.', { ar: 'خدمة التأشيرة هذه غير متاحة.' });
  if (input.date) flights.assertDate(input.date, 'travel date');
  const applicants = pax.adults + pax.children + pax.infants;
  return {
    itemId: String(visa.id),
    title: `${visa.country_en} — ${visa.type_en}`,
    titleAr: `${visa.country_ar} — ${visa.type_ar}`,
    date: input.date || null,
    endDate: null,
    lines: [{ en: `${visa.country_en} ${visa.type_en} — applicant`, ar: `${visa.country_ar} ${visa.type_ar} — متقدم`, qty: applicants, unit: visa.price }],
    meta: { processing: visa.processing_days },
  };
}

function findPromo(db, code, subtotal) {
  if (!code) return null;
  const p = db.prepare('SELECT * FROM promo_codes WHERE code = ? AND active = 1').get(String(code).trim());
  const bad = (en, ar) => { throw new AppError(en, { ar }); };
  if (!p) bad('This promo code is not valid.', 'رمز الخصم غير صالح.');
  if (p.expires_at && p.expires_at < flights.todayRiyadh()) bad('This promo code has expired.', 'انتهت صلاحية رمز الخصم.');
  if (p.max_uses != null && p.used >= p.max_uses) bad('This promo code has been fully redeemed.', 'تم استخدام رمز الخصم بالكامل.');
  if (subtotal < p.min_amount) bad(`This code needs a minimum spend of SAR ${(p.min_amount / 100).toFixed(0)}.`, `يتطلب هذا الرمز حداً أدنى ${(p.min_amount / 100).toFixed(0)} ريال.`);
  let discount = p.kind === 'percent' ? Math.round((subtotal * p.value) / 100) : p.value;
  if (p.max_discount != null) discount = Math.min(discount, p.max_discount);
  return { code: p.code, discount: Math.min(discount, subtotal) };
}

/** VAT contained in the lines, per rate, after spreading the discount proportionally. */
function vatFor(lines, discount) {
  const byRate = new Map();
  for (const l of lines) byRate.set(l.vatRate, (byRate.get(l.vatRate) || 0) + l.amount);
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const groups = [...byRate.entries()];
  let left = discount;
  return groups.reduce((sum, [rate, amount], i) => {
    const share = i === groups.length - 1 ? left : Math.round((discount * amount) / (subtotal || 1));
    left -= share;
    return sum + vatFromInclusive(amount - share, rate);
  }, 0);
}

/**
 * Build a full, priced quote.
 * input: { type, id, date, endDate?, adults, children, infants, rooms?, addons?: string[], promo? }
 */
async function quote(db, input = {}) {
  const type = input.type;
  const pax = type === 'hotel'
    ? { adults: Math.max(1, Math.min(int(input.adults, 1), 20)), children: Math.max(0, Math.min(int(input.children, 0), 10)), infants: 0 }
    : parsePax(input);
  let q;
  if (type === 'package') q = quotePackage(db, input, pax);
  else if (type === 'flight') q = await quoteFlight(db, input, pax);
  else if (type === 'hotel') q = quoteHotel(db, input);
  else if (type === 'visa') q = quoteVisa(db, input, pax);
  else throw new AppError('Unknown booking type.', { ar: 'نوع الحجز غير معروف.' });

  const travelers = pax.adults + pax.children + pax.infants;
  const addons = [...new Set(Array.isArray(input.addons) ? input.addons : [])].filter((k) => ADDONS[k]?.types.includes(type));
  for (const key of addons) {
    const a = ADDONS[key];
    q.lines.push({ key, en: a.en, ar: a.ar, qty: a.per === 'booking' ? 1 : travelers, unit: a.price, addon: true });
  }
  for (const l of q.lines) {
    l.amount = l.qty * l.unit;
    if (l.vatRate == null) l.vatRate = config.vatRate;
  }

  const subtotal = q.lines.reduce((s, l) => s + l.amount, 0);
  const promo = findPromo(db, input.promo, subtotal);
  const discount = promo ? promo.discount : 0;
  const total = subtotal - discount;

  return {
    type,
    ...q,
    ...pax,
    addons,
    subtotal,
    discount,
    promo: promo ? promo.code : null,
    total,
    vat: vatFor(q.lines, discount),
    currency: 'SAR',
  };
}

function availableAddons(type) {
  return Object.entries(ADDONS)
    .filter(([, a]) => a.types.includes(type))
    .map(([key, a]) => ({ key, en: a.en, ar: a.ar, per: a.per, price: a.price }));
}

module.exports = { quote, availableAddons, ADDONS, CHILD_RATE, INFANT_RATE };
