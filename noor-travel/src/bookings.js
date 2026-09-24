'use strict';
const crypto = require('node:crypto');
const config = require('./config');
const dbm = require('./db');
const pricing = require('./pricing');
const notify = require('./notify');
const ticketing = require('./ticketing');
const zatca = require('./zatca');
const { AppError } = require('./errors');
const { randomToken } = require('./auth');
const { toSar } = require('./money');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newRef(db) {
  for (;;) {
    const bytes = crypto.randomBytes(6);
    const ref = `NT${[...bytes].map((b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('')}`;
    if (!db.prepare('SELECT 1 FROM bookings WHERE ref = ?').get(ref)) return ref;
  }
}

/** Normalise Saudi mobiles to +9665XXXXXXXX; accept other E.164 numbers. */
function normalisePhone(raw) {
  let p = String(raw || '').replace(/[\s\-()]/g, '');
  if (/^05\d{8}$/.test(p)) p = `+966${p.slice(1)}`;
  else if (/^5\d{8}$/.test(p)) p = `+966${p}`;
  else if (/^00\d+$/.test(p)) p = `+${p.slice(2)}`;
  else if (/^966\d{9}$/.test(p)) p = `+${p}`;
  if (!/^\+\d{8,15}$/.test(p)) throw new AppError('Please enter a valid mobile number (e.g. 05XXXXXXXX).', { ar: 'يرجى إدخال رقم جوال صحيح (مثال: 05XXXXXXXX).' });
  return p;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function cleanTravelers(list, count) {
  const arr = Array.isArray(list) ? list.slice(0, count) : [];
  return arr.map((t) => ({
    title: ['mr', 'mrs', 'ms'].includes(t?.title) ? t.title : 'mr',
    gender: t?.gender === 'f' || ['mrs', 'ms'].includes(t?.title) ? 'f' : 'm',
    firstName: String(t?.firstName || '').trim().slice(0, 60),
    lastName: String(t?.lastName || '').trim().slice(0, 60),
    dob: DATE.test(t?.dob || '') ? t.dob : '',
    nationality: /^[A-Z]{2}$/.test(String(t?.nationality || '').toUpperCase()) ? String(t.nationality).toUpperCase() : String(t?.nationality || '').slice(0, 40),
    passport: String(t?.passport || '').trim().toUpperCase().replace(/\s/g, '').slice(0, 20),
    passportExpiry: DATE.test(t?.passportExpiry || '') ? t.passportExpiry : '',
    type: ['adult', 'child', 'infant'].includes(t?.type) ? t.type : 'adult',
  }));
}

/** Airlines need exact names, dates of birth and (for international trips) passport data. */
function validateFlightTravelers(travelers, q) {
  const bad = (en, ar) => { throw new AppError(en, { ar }); };
  const counts = { adult: 0, child: 0, infant: 0 };
  const travelDate = q.endDate || q.date;
  for (const t of travelers) {
    counts[t.type]++;
    if (!/^[A-Za-z][A-Za-z '-]*$/.test(t.firstName) || !/^[A-Za-z][A-Za-z '-]*$/.test(t.lastName)) {
      bad('Passenger names must be in English letters exactly as in the passport.', 'يجب كتابة أسماء المسافرين بالأحرف الإنجليزية كما في جواز السفر.');
    }
    if (!t.dob) bad('Please enter the date of birth for every passenger.', 'يرجى إدخال تاريخ الميلاد لكل مسافر.');
    const age = (Date.parse(q.date) - Date.parse(t.dob)) / (365.25 * 864e5);
    if (t.type === 'adult' && age < 12) bad('Adult passengers must be 12 or older on the travel date.', 'يجب أن يكون عمر البالغ 12 سنة فأكثر في تاريخ السفر.');
    if (t.type === 'child' && (age < 2 || age >= 12)) bad('Child passengers must be 2–11 years old on the travel date.', 'يجب أن يكون عمر الطفل بين 2 و11 سنة في تاريخ السفر.');
    if (t.type === 'infant' && (age < 0 || age >= 2)) bad('Infants must be under 2 years old on the travel date.', 'يجب أن يكون عمر الرضيع أقل من سنتين في تاريخ السفر.');
    if (!q.meta.domestic) {
      if (!t.passport || !/^[A-Z]{2}$/.test(t.nationality) || !t.passportExpiry) {
        bad('Passport number, nationality and passport expiry are required for international flights.', 'رقم الجواز والجنسية وتاريخ انتهاء الجواز مطلوبة للرحلات الدولية.');
      }
      if (Date.parse(t.passportExpiry) < Date.parse(travelDate) + 182 * 864e5) {
        bad('Passports must be valid for at least 6 months after travel.', 'يجب أن يكون الجواز سارياً لمدة 6 أشهر على الأقل بعد السفر.');
      }
    }
  }
  if (counts.adult !== q.adults || counts.child !== q.children || counts.infant !== q.infants) {
    bad('Please complete the details for every passenger.', 'يرجى إكمال بيانات جميع المسافرين.');
  }
}

/** Create a booking from a quote request + contact details. */
async function create(db, input, { user = null, source = 'web', createdBy = null } = {}) {
  const q = await pricing.quote(db, input);
  const c = input.contact || {};
  const name = String(c.name || '').trim();
  const email = String(c.email || '').trim().toLowerCase();
  if (name.length < 3) throw new AppError('Please enter the lead traveler’s full name.', { ar: 'يرجى إدخال الاسم الكامل للمسافر الرئيسي.' });
  if (!EMAIL.test(email)) throw new AppError('Please enter a valid email address.', { ar: 'يرجى إدخال بريد إلكتروني صحيح.' });
  const phone = normalisePhone(c.phone);
  const travelers = cleanTravelers(input.travelers, q.adults + q.children + q.infants);
  if (q.type === 'flight') validateFlightTravelers(travelers, q);
  if (q.type !== 'hotel' && travelers.some((t) => !t.firstName || !t.lastName)) {
    throw new AppError('Please enter the first and last name of every traveler as shown in the passport.', { ar: 'يرجى إدخال الاسم الأول والأخير لكل مسافر كما في جواز السفر.' });
  }
  if (!input.acceptTerms && source === 'web') {
    throw new AppError('Please accept the terms and cancellation policy.', { ar: 'يرجى الموافقة على الشروط وسياسة الإلغاء.' });
  }

  const ref = newRef(db);
  const token = randomToken(18);
  const details = {
    lines: q.lines, addons: q.addons, meta: q.meta, titleAr: q.titleAr,
    input: { id: input.id, returnId: input.returnId, cabin: input.cabin, rooms: input.rooms, date: input.date, endDate: input.endDate },
  };
  const id = dbm.tx(db, () => {
    const r = db.prepare(`INSERT INTO bookings (ref, access_token, user_id, type, item_id, title, details, travel_date, end_date,
      adults, children, infants, travelers, contact_name, contact_email, contact_phone, notes, subtotal, discount, total, vat,
      promo_code, source, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      ref, token, user?.id ?? null, q.type, q.itemId, q.title, JSON.stringify(details), q.date, q.endDate,
      q.adults, q.children, q.infants, JSON.stringify(travelers), name.slice(0, 120), email, phone,
      String(input.notes || '').slice(0, 2000), q.subtotal, q.discount, q.total, q.vat, q.promo, source, createdBy,
    );
    const bid = Number(r.lastInsertRowid);
    dbm.logActivity(db, { userId: createdBy ?? user?.id ?? null, bookingId: bid, action: 'booking.created', detail: `${source} ${q.type}` });
    return bid;
  });
  if (q.type === 'flight') await ticketing.onCreated(db, db.prepare('SELECT * FROM bookings WHERE id = ?').get(id));
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  notify.bookingCreated(db, booking);
  return booking;
}

/** Find a booking the requester is allowed to see. */
function findAccessible(db, ref, { token, user }) {
  const b = db.prepare('SELECT * FROM bookings WHERE ref = ?').get(String(ref || '').toUpperCase());
  if (!b) return null;
  const ok = (token && crypto.timingSafeEqual(Buffer.from(sha(token)), Buffer.from(sha(b.access_token))))
    || (user && (user.id === b.user_id || ['agent', 'admin'].includes(user.role)));
  return ok ? b : null;
}
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

function view(db, b) {
  const d = JSON.parse(b.details);
  const pays = db.prepare(`SELECT id, provider, amount, refunded_amount, status, sandbox, created_at FROM payments
    WHERE booking_id = ? AND status != 'initiated' OR (booking_id = ? AND provider = 'bank_transfer') ORDER BY id`).all(b.id, b.id);
  return {
    ref: b.ref, token: b.access_token, type: b.type, title: b.title, titleAr: d.titleAr,
    travelDate: b.travel_date, endDate: b.end_date,
    adults: b.adults, children: b.children, infants: b.infants,
    travelers: JSON.parse(b.travelers), lines: d.lines, meta: d.meta,
    contact: { name: b.contact_name, email: b.contact_email, phone: b.contact_phone },
    notes: b.notes,
    subtotal: b.subtotal, discount: b.discount, promo: b.promo_code, total: b.total, vat: b.vat,
    paid: b.paid_amount, outstanding: Math.max(0, b.total - b.paid_amount), currency: b.currency,
    status: b.status, paymentStatus: b.payment_status, paymentMethod: b.payment_method,
    invoiceNo: b.invoice_no, createdAt: b.created_at,
    ticketStatus: b.ticket_status, pnr: b.pnr, tickets: JSON.parse(b.tickets || '[]'),
    payments: pays.map((p) => ({ ...p, sandbox: !!p.sandbox })),
  };
}

function invoice(db, b) {
  if (!b.invoice_no) throw new AppError('The tax invoice is issued once the booking is fully paid.', { status: 409, ar: 'تصدر الفاتورة الضريبية بعد سداد كامل المبلغ.' });
  const timestamp = new Date(`${b.invoiced_at.replace(' ', 'T')}Z`).toISOString();
  return {
    ...view(db, b),
    invoiceDate: timestamp,
    seller: config.company,
    vatRate: config.vatRate,
    qr: zatca.qrPayload({
      sellerName: config.company.nameEn,
      vatNumber: config.company.vatNumber,
      timestamp,
      total: toSar(b.total),
      vat: toSar(b.vat),
    }),
  };
}

function setStatus(db, b, status, userId) {
  const allowed = {
    pending_payment: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    refunded: [],
  };
  if (!allowed[b.status]?.includes(status)) throw new AppError(`Cannot change status from ${b.status} to ${status}.`);
  if (status === 'confirmed' && b.payment_status !== 'paid') throw new AppError('Only fully paid bookings can be confirmed. Record a payment first.');
  db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, b.id);
  dbm.logActivity(db, { userId, bookingId: b.id, action: 'booking.status', detail: `${b.status} → ${status}` });
  const fresh = db.prepare('SELECT * FROM bookings WHERE id = ?').get(b.id);
  notify.bookingStatusChanged(db, fresh, status);
  return fresh;
}

module.exports = { create, findAccessible, view, invoice, setStatus, normalisePhone };
