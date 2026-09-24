'use strict';
// Flight search & offers. Two providers share one normalised offer format:
//   • duffel — live content & ticketing from 300+ airlines (set DUFFEL_ACCESS_TOKEN)
//   • demo   — deterministic schedules/fares for any route in src/airports.js;
//              tickets are issued manually by staff (GDS / airline portal) and
//              recorded in the back-office.

const crypto = require('node:crypto');
const config = require('./config');
const { AppError } = require('./errors');
const { AIRPORTS, distanceKm, tzOffsetMin } = require('./airports');
const duffel = require('./flights-duffel');

const CABINS = {
  economy: { en: 'Economy', ar: 'السياحية', factor: 1 },
  premium_economy: { en: 'Premium Economy', ar: 'السياحية الممتازة', factor: 1.7 },
  business: { en: 'Business', ar: 'الأعمال', factor: 3.2 },
  first: { en: 'First', ar: 'الأولى', factor: 5.2 },
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const todayRiyadh = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

function assertDate(date, label = 'date') {
  if (!ISO_DATE.test(String(date)) || Number.isNaN(Date.parse(date))) {
    throw new AppError(`Please choose a valid ${label}.`, { ar: 'يرجى اختيار تاريخ صحيح.' });
  }
}

const provider = () => (duffel.isConfigured() ? 'duffel' : 'demo');
const isDomestic = (codes) => codes.every((c) => (AIRPORTS[c]?.country || duffel.countryOf(c)) === 'SA');

function parsePax(p) {
  const adults = Math.trunc(Number(p.adults) || 1);
  const children = Math.trunc(Number(p.children) || 0);
  const infants = Math.trunc(Number(p.infants) || 0);
  if (adults < 1 || adults > 9) throw new AppError('Adults must be between 1 and 9.', { ar: 'عدد البالغين يجب أن يكون بين 1 و 9.' });
  if (children < 0 || adults + children > 9) throw new AppError('A maximum of 9 seated passengers per booking.', { ar: 'الحد الأقصى 9 مسافرين بمقاعد لكل حجز.' });
  if (infants < 0 || infants > adults) throw new AppError('Each infant must travel with an adult.', { ar: 'يجب أن يرافق كل رضيع شخص بالغ.' });
  return { adults, children, infants };
}

// --------------------------------------------------------------- demo engine
const CARRIERS = {
  SV: { name: 'Saudia', hubs: ['RUH', 'JED'], factor: 1.0, lcc: false, bags: 2 },
  XY: { name: 'flynas', hubs: ['RUH', 'JED'], factor: 0.76, lcc: true, bags: 0 },
  F3: { name: 'flyadeal', hubs: ['RUH', 'JED'], factor: 0.72, lcc: true, bags: 0 },
  EK: { name: 'Emirates', hubs: ['DXB'], factor: 1.12, lcc: false, bags: 1 },
  QR: { name: 'Qatar Airways', hubs: ['DOH'], factor: 1.1, lcc: false, bags: 1 },
  EY: { name: 'Etihad Airways', hubs: ['AUH'], factor: 1.05, lcc: false, bags: 1 },
  TK: { name: 'Turkish Airlines', hubs: ['IST'], factor: 0.98, lcc: false, bags: 1 },
  GF: { name: 'Gulf Air', hubs: ['BAH'], factor: 0.92, lcc: false, bags: 1 },
  WY: { name: 'Oman Air', hubs: ['MCT'], factor: 0.93, lcc: false, bags: 1 },
  MS: { name: 'EgyptAir', hubs: ['CAI'], factor: 0.88, lcc: false, bags: 1 },
  RJ: { name: 'Royal Jordanian', hubs: ['AMM'], factor: 0.94, lcc: false, bags: 1 },
};

const h32 = (s) => crypto.createHash('sha256').update(s).digest().readUInt32BE(0);
const unit = (s) => h32(s) / 0xffffffff;
const legMinutes = (a, b) => Math.round((distanceKm(a, b) / 790) * 60 / 5) * 5 + 35;

function routeOptions(o, d) {
  const dist = distanceKm(o, d);
  const opts = [];
  const saEnd = AIRPORTS[o].country === 'SA' || AIRPORTS[d].country === 'SA';
  const domestic = AIRPORTS[o].country === 'SA' && AIRPORTS[d].country === 'SA';
  const hubAtEnd = (c) => CARRIERS[c].hubs.includes(o) || CARRIERS[c].hubs.includes(d);
  const direct = (carrier, n = 1) => { for (let i = 0; i < n; i++) opts.push({ key: `${carrier}${i}`, carrier, legs: [[o, d]] }); };

  if (saEnd) {
    const saHub = hubAtEnd('SV') || domestic;
    if (saHub || dist < 4200) direct('SV', dist < 2500 ? 3 : dist < 6000 ? 2 : 1);
    if ((saHub || domestic) && dist < 5200) direct('XY', dist < 2500 ? 2 : 1);
    if ((saHub || domestic) && dist < 3200) direct('F3', 1);
  }
  for (const c of ['EK', 'QR', 'EY', 'TK', 'GF', 'WY', 'MS', 'RJ']) if (hubAtEnd(c) && dist > 250) direct(c, dist < 3000 ? 2 : 1);

  // One-stop connections through carrier hubs.
  const via = [];
  for (const [c, info] of Object.entries(CARRIERS)) {
    if (info.lcc && dist > 4500) continue;
    for (const hub of info.hubs) {
      if (hub === o || hub === d) continue;
      const a = distanceKm(o, hub); const b = distanceKm(hub, d);
      if (a < 250 || b < 250 || a + b > dist * 1.5 + 300) continue;
      if (info.lcc && !saEnd) continue; // Saudi low-cost carriers only connect trips touching the Kingdom
      via.push({ key: `${c}-${hub}`, carrier: c, legs: [[o, hub], [hub, d]], detour: (a + b) / dist });
    }
  }
  via.sort((x, y) => x.detour - y.detour);
  opts.push(...via.slice(0, opts.length ? 4 : 6));
  return opts;
}

function toUtc(dateIso, minutes, tz) {
  const guess = Date.parse(`${dateIso}T00:00:00Z`) + minutes * 60000;
  return guess - tzOffsetMin(tz, new Date(guess)) * 60000;
}
function localIso(utcMs, tz) {
  const t = new Date(utcMs + tzOffsetMin(tz, new Date(utcMs)) * 60000);
  return t.toISOString().slice(0, 16);
}

function buildSlice(opt, date) {
  const info = CARRIERS[opt.carrier];
  const depMin = (5 * 60) + Math.round((unit(`${opt.key}|${opt.legs[0].join('')}|dep`) * 18 * 60) / 5) * 5; // 05:00–23:00
  let t = toUtc(date, depMin, AIRPORTS[opt.legs[0][0]].tz);
  const start = t;
  const segments = [];
  const layovers = [];
  opt.legs.forEach(([a, b], i) => {
    if (i > 0) {
      const lay = 70 + Math.round((unit(`${opt.key}|lay|${a}`) * 150) / 5) * 5;
      layovers.push({ airport: a, city: AIRPORTS[a].en, cityAr: AIRPORTS[a].ar, durationMin: lay });
      t += lay * 60000;
    }
    const dur = legMinutes(a, b);
    const num = 100 + (h32(`${opt.carrier}${a}${b}${i}`) % 1800);
    segments.push({
      carrierCode: opt.carrier, carrierName: info.name, flightNo: `${opt.carrier} ${num}`,
      origin: a, destination: b,
      departAt: localIso(t, AIRPORTS[a].tz), arriveAt: localIso(t + dur * 60000, AIRPORTS[b].tz),
      durationMin: dur, aircraft: dur > 300 ? 'Boeing 787' : dur > 150 ? 'Airbus A330' : 'Airbus A320neo',
    });
    t += dur * 60000;
  });
  const first = segments[0]; const last = segments[segments.length - 1];
  return {
    origin: first.origin, destination: last.destination, departAt: first.departAt, arriveAt: last.arriveAt,
    durationMin: Math.round((t - start) / 60000), stops: segments.length - 1, segments, layovers,
  };
}

function demoFare(opt, date, cabin) {
  const info = CARRIERS[opt.carrier];
  const flown = opt.legs.reduce((s, [a, b]) => s + distanceKm(a, b), 0);
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const weekend = day === 4 || day === 5 ? 1.1 : 1;
  const daysOut = Math.round((Date.parse(date) - Date.parse(todayRiyadh())) / 864e5);
  const lastMinute = daysOut < 7 ? 1.3 : daysOut < 21 ? 1.12 : 1;
  const demand = 0.85 + unit(`${opt.key}|${date}|${opt.legs.flat().join('')}`) * 0.45;
  const directPremium = opt.legs.length === 1 ? 1.08 : 1;
  const sar = (140 + flown * 0.155) * info.factor * weekend * lastMinute * demand * directPremium * CABINS[cabin].factor;
  return Math.ceil(sar / 5) * 5 * 100;
}

const encodeId = (o) => `demo_${Buffer.from(JSON.stringify(o)).toString('base64url')}`;
function decodeId(id) {
  try { return JSON.parse(Buffer.from(String(id).slice(5), 'base64url').toString('utf8')); } catch { return null; }
}

function demoOffer(parts, cabin, pax) {
  // parts: [{opt, date}] per slice
  const perAdult = parts.reduce((s, p) => s + demoFare(p.opt, p.date, cabin), 0);
  const sar = (h) => Math.round(h / 100) * 100;
  const total = perAdult * pax.adults + sar(perAdult * 0.75) * pax.children + sar(perAdult * 0.1) * pax.infants;
  const carrier = CARRIERS[parts[0].opt.carrier];
  const lcc = parts.some((p) => CARRIERS[p.opt.carrier].lcc);
  return {
    id: encodeId({ s: parts.map((p) => [p.opt.legs[0][0], p.opt.legs[p.opt.legs.length - 1][1], p.date, p.opt.key]), c: cabin, p: [pax.adults, pax.children, pax.infants] }),
    provider: 'demo',
    expiresAt: null,
    owner: { code: parts[0].opt.carrier, name: carrier.name },
    cabin,
    slices: parts.map((p) => buildSlice(p.opt, p.date)),
    total,
    perAdult,
    taxes: Math.round(total * 0.18),
    currency: 'SAR',
    baggage: { checked: lcc ? 0 : cabin === 'economy' ? carrier.bags : 2, cabin: 1 },
    refundable: !lcc,
    changeable: true,
    pax,
  };
}

function demoSearch({ from, to, date, returnDate, cabin, pax }) {
  const out = routeOptions(from, to).filter((o) => cabin === 'economy' || !CARRIERS[o.carrier].lcc);
  if (!returnDate) return out.map((o) => demoOffer([{ opt: o, date }], cabin, pax));
  const back = routeOptions(to, from).filter((o) => cabin === 'economy' || !CARRIERS[o.carrier].lcc);
  const offers = [];
  for (const o of out) {
    const same = back.filter((b) => b.carrier === o.carrier);
    for (const b of same.slice(0, 3)) offers.push(demoOffer([{ opt: o, date }, { opt: b, date: returnDate }], cabin, pax));
  }
  return offers;
}

function demoGet(id) {
  const d = decodeId(id);
  if (!d || !Array.isArray(d.s) || !CABINS[d.c]) return null;
  const pax = { adults: d.p[0], children: d.p[1], infants: d.p[2] };
  const parts = [];
  for (const [o, dst, date, key] of d.s) {
    if (!AIRPORTS[o] || !AIRPORTS[dst] || !ISO_DATE.test(date) || date < todayRiyadh()) return null;
    const opt = routeOptions(o, dst).find((x) => x.key === key);
    if (!opt) return null;
    parts.push({ opt, date });
  }
  return demoOffer(parts, d.c, pax);
}

// ------------------------------------------------------------------ public
async function search(db, q) {
  const from = String(q.from || '').toUpperCase();
  const to = String(q.to || '').toUpperCase();
  const cabin = CABINS[q.cabin] ? q.cabin : 'economy';
  const pax = parsePax(q);
  const live = provider() === 'duffel';
  const known = (c) => AIRPORTS[c] || (live && /^[A-Z]{3}$/.test(c));
  if (!known(from) || !known(to) || from === to) {
    throw new AppError('Please choose valid departure and arrival airports.', { ar: 'يرجى اختيار مطاري المغادرة والوصول.' });
  }
  assertDate(q.date, 'departure date');
  if (q.date < todayRiyadh()) throw new AppError('Departure date cannot be in the past.', { ar: 'لا يمكن أن يكون تاريخ المغادرة في الماضي.' });
  if (q.returnDate) {
    assertDate(q.returnDate, 'return date');
    if (q.returnDate < q.date) throw new AppError('Return date must be after departure.', { ar: 'يجب أن يكون تاريخ العودة بعد المغادرة.' });
  }
  const args = { from, to, date: q.date, returnDate: q.returnDate || null, cabin, pax };

  if (live) {
    const offers = await duffel.search(args);
    return { provider: 'duffel', offers, calendar: null };
  }
  const offers = demoSearch(args);
  // Cheapest fare for neighbouring departure dates (fare calendar strip).
  const calendar = [];
  for (let i = -3; i <= 3; i++) {
    const day = addDays(q.date, i);
    if (day < todayRiyadh() || (q.returnDate && day > q.returnDate)) continue;
    const list = i === 0 ? offers : demoSearch({ ...args, date: day });
    calendar.push({ date: day, price: list.length ? Math.min(...list.map((o) => o.total)) : null });
  }
  return { provider: 'demo', offers, calendar };
}

async function getOffer(db, id) {
  const s = String(id || '');
  let offer = null;
  if (s.startsWith('demo_')) offer = demoGet(s);
  else if (s.startsWith('off_') && duffel.isConfigured()) offer = await duffel.getOffer(s);
  if (!offer) throw new AppError('This fare is no longer available. Please search again.', { ar: 'هذا السعر لم يعد متاحاً. يرجى البحث مرة أخرى.' });
  if (offer.expiresAt && Date.parse(offer.expiresAt) < Date.now()) {
    throw new AppError('This fare has expired. Please search again for the latest prices.', { ar: 'انتهت صلاحية هذا السعر. يرجى البحث مرة أخرى للحصول على أحدث الأسعار.' });
  }
  return offer;
}

module.exports = { CABINS, CARRIERS, search, getOffer, parsePax, provider, isDomestic, todayRiyadh, assertDate, addDays };
