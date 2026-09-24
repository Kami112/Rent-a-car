'use strict';
// Flight inventory. Schedules live in the database; fares are derived
// deterministically from (schedule, date, cabin) so a quote is always
// reproducible server-side. Replace `searchFlights`/`getOffer` with a GDS or
// NDC connector (Amadeus, Sabre, Travelport) when going live with real fares.

const crypto = require('node:crypto');
const { AppError } = require('./errors');

const AIRPORTS = {
  RUH: { en: 'Riyadh', ar: 'الرياض', tz: 3 },
  JED: { en: 'Jeddah', ar: 'جدة', tz: 3 },
  MED: { en: 'Madinah', ar: 'المدينة المنورة', tz: 3 },
  DMM: { en: 'Dammam', ar: 'الدمام', tz: 3 },
  AHB: { en: 'Abha', ar: 'أبها', tz: 3 },
  ULH: { en: 'AlUla', ar: 'العلا', tz: 3 },
  DXB: { en: 'Dubai', ar: 'دبي', tz: 4 },
  DOH: { en: 'Doha', ar: 'الدوحة', tz: 3 },
  CAI: { en: 'Cairo', ar: 'القاهرة', tz: 3 },
  IST: { en: 'Istanbul', ar: 'إسطنبول', tz: 3 },
  GYD: { en: 'Baku', ar: 'باكو', tz: 4 },
  TBS: { en: 'Tbilisi', ar: 'تبليسي', tz: 4 },
  LHR: { en: 'London', ar: 'لندن', tz: 1 },
  CDG: { en: 'Paris', ar: 'باريس', tz: 2 },
  ZRH: { en: 'Zurich', ar: 'زيورخ', tz: 2 },
  KUL: { en: 'Kuala Lumpur', ar: 'كوالالمبور', tz: 8 },
  MLE: { en: 'Malé (Maldives)', ar: 'ماليه (المالديف)', tz: 5 },
};

const CABINS = {
  economy: { en: 'Economy', ar: 'الدرجة السياحية', factor: 1 },
  premium: { en: 'Premium Economy', ar: 'السياحية الممتازة', factor: 1.7 },
  business: { en: 'Business', ar: 'درجة الأعمال', factor: 3.2 },
  first: { en: 'First', ar: 'الدرجة الأولى', factor: 5 },
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayRiyadh() {
  return new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
}

function assertDate(date, label = 'date') {
  if (!ISO_DATE.test(String(date)) || Number.isNaN(Date.parse(date))) {
    throw new AppError(`Please choose a valid ${label}.`, { ar: 'يرجى اختيار تاريخ صحيح.' });
  }
}

function hashUnit(str) {
  return crypto.createHash('sha256').update(str).digest().readUInt32BE(0) / 0xffffffff;
}

function fareFor(sched, date, cabin) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay(); // 4 = Thu, 5 = Fri
  const weekend = day === 4 || day === 5 ? 1.1 : 1;
  const daysOut = Math.round((Date.parse(date) - Date.parse(todayRiyadh())) / 864e5);
  const lastMinute = daysOut < 7 ? 1.25 : daysOut < 21 ? 1.1 : 1;
  const demand = 0.85 + hashUnit(`${sched.id}|${date}`) * 0.5;
  const sar = (sched.base_fare / 100) * weekend * lastMinute * demand * CABINS[cabin].factor;
  return Math.ceil(sar / 5) * 5 * 100; // round up to 5 SAR, in halalas
}

function toOffer(sched, date, cabin) {
  const [h, m] = sched.depart_time.split(':').map(Number);
  const tzDiff = (AIRPORTS[sched.destination]?.tz ?? 3) - (AIRPORTS[sched.origin]?.tz ?? 3);
  const arriveMin = h * 60 + m + sched.duration_min + tzDiff * 60;
  const dayOffset = Math.floor(arriveMin / 1440);
  const arr = ((arriveMin % 1440) + 1440) % 1440;
  const pad = (n) => String(n).padStart(2, '0');
  return {
    id: `${sched.id}@${date}`,
    scheduleId: sched.id,
    airline: sched.airline,
    airlineCode: sched.airline_code,
    flightNo: sched.flight_no,
    origin: sched.origin,
    destination: sched.destination,
    originCity: AIRPORTS[sched.origin],
    destinationCity: AIRPORTS[sched.destination],
    date,
    departTime: sched.depart_time,
    arriveTime: `${pad(Math.floor(arr / 60))}:${pad(arr % 60)}`,
    arriveDayOffset: dayOffset,
    durationMin: sched.duration_min,
    stops: sched.stops,
    cabin,
    cabinLabel: CABINS[cabin],
    fare: fareFor(sched, date, cabin),
  };
}

function searchFlights(db, { from, to, date, cabin = 'economy' }) {
  from = String(from || '').toUpperCase();
  to = String(to || '').toUpperCase();
  if (!AIRPORTS[from] || !AIRPORTS[to] || from === to) {
    throw new AppError('Please choose valid departure and arrival airports.', { ar: 'يرجى اختيار مطاري المغادرة والوصول.' });
  }
  assertDate(date);
  if (date < todayRiyadh()) throw new AppError('Departure date cannot be in the past.', { ar: 'لا يمكن أن يكون تاريخ المغادرة في الماضي.' });
  if (!CABINS[cabin]) cabin = 'economy';
  const rows = db.prepare(
    'SELECT * FROM flight_schedules WHERE origin = ? AND destination = ? AND active = 1 ORDER BY depart_time'
  ).all(from, to);
  return rows.map((s) => toOffer(s, date, cabin)).sort((a, b) => a.fare - b.fare);
}

function getOffer(db, id, cabin = 'economy') {
  const m = String(id || '').match(/^(\d+)@(\d{4}-\d{2}-\d{2})$/);
  if (!m) throw new AppError('This flight is no longer available.', { ar: 'هذه الرحلة لم تعد متاحة.' });
  if (!CABINS[cabin]) cabin = 'economy';
  const sched = db.prepare('SELECT * FROM flight_schedules WHERE id = ? AND active = 1').get(Number(m[1]));
  if (!sched || m[2] < todayRiyadh()) throw new AppError('This flight is no longer available.', { ar: 'هذه الرحلة لم تعد متاحة.' });
  return toOffer(sched, m[2], cabin);
}

module.exports = { AIRPORTS, CABINS, searchFlights, getOffer, todayRiyadh, assertDate };
