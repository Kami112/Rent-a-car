'use strict';
// Server-side quote engine. The browser only ever sends *what* the customer
// wants; every amount charged is computed here.

const { AppError } = require('./errors');
const { vatFromInclusive } = require('./money');
const flights = require('./flights');

const CHILD_RATE = 0.75;
const INFANT_RATE = 0.1;

const ADDONS = {
  insurance: { en: 'Travel insurance', ar: 'تأمين السفر', per: 'traveler', price: 7500, types: ['package', 'flight', 'hotel'] },
  transfer: { en: 'Airport transfers (return)', ar: 'توصيل من وإلى المطار', per: 'booking', price: 15000, types: ['package', 'flight', 'hotel'] },
  esim: { en: 'Travel eSIM (10 GB)', ar: 'شريحة بيانات إلكترونية (10 جيجا)', per: 'traveler', price: 4900, types: ['package', 'flight', 'hotel'] },
  baggage: { en: 'Extra baggage (23 kg)', ar: 'أمتعة إضافية (23 كجم)', per: 'traveler', price: 18000, types: ['flight'] },
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
  const minDate = new Date(Date.parse(flights.todayRiyadh()) + 3 * 864e5).toISOString().slice(0, 10);
  if (input.date < minDate) throw new AppError('Packages must be booked at least 3 days before departure.', { ar: 'يجب حجز الباقات قبل 3 أيام على الأقل من موعد السفر.' });
  if (pax.adults + pax.children > pkg.seats) throw new AppError(`Only ${pkg.seats} seats left on this package.`, { ar: `تبقى ${pkg.seats} مقاعد فقط في هذه الباقة.` });
  const end = new Date(Date.parse(input.date) + (pkg.duration_days - 1) * 864e5).toISOString().slice(0, 10);
  return {
    itemId: String(pkg.id),
    title: pkg.title_en,
    titleAr: pkg.title_ar,
    date: input.date,
    endDate: end,
    lines: paxLines(pkg.price, pax, pkg.title_en, pkg.title_ar),
    meta: { slug: pkg.slug, category: pkg.category, durationDays: pkg.duration_days, destination: pkg.destination_en },
  };
}

function quoteFlight(db, input, pax) {
  const cabin = flights.CABINS[input.cabin] ? input.cabin : 'economy';
  const out = flights.getOffer(db, input.id, cabin);
  const ret = input.returnId ? flights.getOffer(db, input.returnId, cabin) : null;
  if (ret && (ret.origin !== out.destination || ret.destination !== out.origin || ret.date < out.date)) {
    throw new AppError('The return flight does not match the outbound flight.', { ar: 'رحلة العودة لا تتوافق مع رحلة الذهاب.' });
  }
  const leg = (o) => `${o.airline} ${o.flightNo} ${o.origin}→${o.destination} ${o.date}`;
  const lines = paxLines(out.fare, pax, leg(out), leg(out));
  if (ret) lines.push(...paxLines(ret.fare, pax, leg(ret), leg(ret)));
  return {
    itemId: ret ? `${out.id},${ret.id}` : out.id,
    title: `${out.originCity.en} → ${out.destinationCity.en}${ret ? ' (return)' : ''} · ${out.cabinLabel.en}`,
    titleAr: `${out.originCity.ar} ← ${out.destinationCity.ar}${ret ? ' (ذهاب وعودة)' : ''} · ${out.cabinLabel.ar}`,
    date: out.date,
    endDate: ret ? ret.date : null,
    lines,
    meta: { cabin, outbound: out, inbound: ret },
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

/**
 * Build a full, priced quote.
 * input: { type, id, returnId?, date, endDate?, adults, children, infants, rooms?, cabin?, addons?: string[], promo? }
 */
function quote(db, input = {}) {
  const type = input.type;
  const pax = type === 'hotel'
    ? { adults: Math.max(1, Math.min(int(input.adults, 1), 20)), children: Math.max(0, Math.min(int(input.children, 0), 10)), infants: 0 }
    : parsePax(input);
  let q;
  if (type === 'package') q = quotePackage(db, input, pax);
  else if (type === 'flight') q = quoteFlight(db, input, pax);
  else if (type === 'hotel') q = quoteHotel(db, input);
  else if (type === 'visa') q = quoteVisa(db, input, pax);
  else throw new AppError('Unknown booking type.', { ar: 'نوع الحجز غير معروف.' });

  const travelers = pax.adults + pax.children + pax.infants;
  const addons = [...new Set(Array.isArray(input.addons) ? input.addons : [])].filter((k) => ADDONS[k]?.types.includes(type));
  for (const key of addons) {
    const a = ADDONS[key];
    const qty = a.per === 'booking' ? 1 : key === 'baggage' ? pax.adults + pax.children : travelers;
    q.lines.push({ key, en: a.en, ar: a.ar, qty, unit: a.price, addon: true });
  }
  for (const l of q.lines) l.amount = l.qty * l.unit;

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
    vat: vatFromInclusive(total),
    currency: 'SAR',
  };
}

function availableAddons(type) {
  return Object.entries(ADDONS)
    .filter(([, a]) => a.types.includes(type))
    .map(([key, a]) => ({ key, en: a.en, ar: a.ar, per: a.per, price: a.price }));
}

module.exports = { quote, availableAddons, ADDONS, CHILD_RATE, INFANT_RATE };
