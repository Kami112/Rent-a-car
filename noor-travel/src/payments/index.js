'use strict';
// Payment orchestration: which methods are offered, starting a payment,
// verifying it with the provider (never trusting the browser), capturing,
// refunding, and moving the booking through its lifecycle.

const config = require('../config');
const dbm = require('../db');
const notify = require('../notify');
const { AppError } = require('../errors');
const { randomToken } = require('../auth');
const moyasar = require('./moyasar');
const tabby = require('./tabby');
const tamara = require('./tamara');
const ticketing = require('../ticketing');
const flights = require('../flights');

const PROVIDERS = { card: moyasar, tabby, tamara };
const ONLINE = Object.keys(PROVIDERS);
const OFFLINE = ['bank_transfer', 'cash', 'pos'];

const isLive = (method) => PROVIDERS[method]?.isConfigured() || false;
const isSandbox = (method) => !isLive(method) && config.paymentsMode === 'sandbox';
const outstanding = (b) => Math.max(0, b.total - b.paid_amount);

function limits(db) {
  return dbm.getSetting(db, 'payment_limits', {});
}

/** Methods the checkout page should show for an amount (halalas). */
function listMethods(db, amount) {
  const lim = limits(db);
  const within = (m) => !lim[m] || (amount >= lim[m].min && amount <= lim[m].max);
  const out = [];
  if (isLive('card') || isSandbox('card')) {
    out.push({ key: 'card', sandbox: !isLive('card'), brands: ['mada', 'visa', 'mastercard', 'applepay', 'stcpay'] });
  }
  if ((isLive('tabby') || isSandbox('tabby')) && within('tabby')) {
    out.push({ key: 'tabby', sandbox: !isLive('tabby'), instalments: 4, perInstalment: Math.ceil(amount / 4) });
  }
  if ((isLive('tamara') || isSandbox('tamara')) && within('tamara')) {
    out.push({ key: 'tamara', sandbox: !isLive('tamara'), instalments: [3, 4], perInstalment: Math.ceil(amount / 4) });
  }
  const bank = dbm.getSetting(db, 'bank_transfer', { enabled: false });
  if (bank.enabled) out.push({ key: 'bank_transfer', sandbox: false });
  return out;
}

function getBooking(db, id) {
  return db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
}

function insertPayment(db, { bookingId, provider, providerRef, amount, status = 'initiated', sandbox = false, raw = null }) {
  const r = db.prepare(`INSERT INTO payments (booking_id, provider, provider_ref, amount, status, sandbox, raw)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(bookingId, provider, providerRef, amount, status, sandbox ? 1 : 0, raw ? JSON.stringify(raw) : null);
  return Number(r.lastInsertRowid);
}

function assertPayable(booking) {
  if (['cancelled', 'refunded'].includes(booking.status)) {
    throw new AppError('This booking can no longer be paid.', { ar: 'لم يعد بالإمكان دفع هذا الحجز.' });
  }
  if (outstanding(booking) <= 0) throw new AppError('This booking is already paid.', { ar: 'تم دفع هذا الحجز مسبقاً.' });
}

/** Live airline fares expire and can change: re-check before charging (held seats are guaranteed). */
async function assertFareStillValid(db, booking) {
  if (booking.type !== 'flight' || booking.ticket_status === 'held' || !booking.item_id.startsWith('off_')) return;
  const offer = await flights.getOffer(db, booking.item_id);
  const fareLine = JSON.parse(booking.details).lines[0];
  if (offer.total !== fareLine.unit) {
    throw new AppError('The airline has changed this fare. Please search again for the latest price.', {
      ar: 'قامت شركة الطيران بتغيير هذا السعر. يرجى البحث مرة أخرى للحصول على أحدث سعر.',
    });
  }
}

/**
 * Begin a payment. Returns one of:
 *   { action: 'redirect', url }
 *   { action: 'moyasar', config }
 *   { action: 'bank_transfer', bank, reference, amount }
 */
async function start(db, booking, { method, lang = 'en', instalments = 4, customer = null }) {
  assertPayable(booking);
  const amount = outstanding(booking);
  const offered = listMethods(db, amount).map((m) => m.key);
  if (!offered.includes(method)) {
    throw new AppError('This payment method is not available for this booking.', { ar: 'طريقة الدفع هذه غير متاحة لهذا الحجز.' });
  }
  await assertFareStillValid(db, booking);
  db.prepare("UPDATE bookings SET payment_method = ?, updated_at = datetime('now') WHERE id = ?").run(method, booking.id);

  if (method === 'bank_transfer') {
    const pending = db.prepare("SELECT id FROM payments WHERE booking_id = ? AND provider = 'bank_transfer' AND status = 'initiated'").get(booking.id);
    if (pending) db.prepare('UPDATE payments SET amount = ? WHERE id = ?').run(amount, pending.id);
    else insertPayment(db, { bookingId: booking.id, provider: 'bank_transfer', providerRef: `BT-${booking.ref}-${randomToken(4)}`, amount });
    db.prepare("UPDATE bookings SET payment_status = 'pending' WHERE id = ? AND payment_status IN ('unpaid','failed')").run(booking.id);
    dbm.logActivity(db, { bookingId: booking.id, action: 'payment.bank_transfer_selected' });
    return { action: 'bank_transfer', bank: dbm.getSetting(db, 'bank_transfer'), reference: booking.ref, amount };
  }

  if (isSandbox(method)) {
    const ref = `sbx_${randomToken(12)}`;
    insertPayment(db, { bookingId: booking.id, provider: method, providerRef: ref, amount, sandbox: true, raw: { outcome: null, instalments } });
    return { action: 'redirect', url: `/pay-sandbox.html?ref=${ref}` };
  }

  if (method === 'card') {
    // Moyasar creates the payment in the browser; we record it on return.
    return { action: 'moyasar', config: moyasar.formConfig(booking, amount, lang) };
  }

  const provider = PROVIDERS[method];
  const n = method === 'tamara' && [3, 4].includes(Number(instalments)) ? Number(instalments) : 4;
  const session = await provider.createCheckout(booking, amount, { lang, instalments: n, customer });
  insertPayment(db, { bookingId: booking.id, provider: method, providerRef: session.providerRef, amount, raw: session.raw });
  dbm.logActivity(db, { bookingId: booking.id, action: `payment.${method}.started`, detail: session.providerRef });
  return { action: 'redirect', url: session.redirectUrl };
}

// Serialise confirmation per payment so a browser return and a webhook that
// arrive together cannot capture twice (single-process deployment).
const inflight = new Map();
function locked(key, fn) {
  const prev = inflight.get(key) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  inflight.set(key, next);
  next.finally(() => { if (inflight.get(key) === next) inflight.delete(key); }).catch(() => {});
  return next;
}

function sandboxRemote(payment, booking) {
  const raw = JSON.parse(payment.raw || '{}');
  const status = raw.outcome === 'approve' ? 'paid' : raw.outcome ? 'failed' : 'initiated';
  return { id: payment.provider_ref, status, amount: payment.amount, currency: 'SAR', reference: booking.ref, raw };
}

/**
 * Verify a payment with its provider and update the booking. Idempotent.
 * Returns the (fresh) booking row.
 */
function confirm(db, method, providerRef) {
  if (!PROVIDERS[method] || !providerRef) throw new AppError('Unknown payment.', { status: 404, ar: 'عملية دفع غير معروفة.' });
  return locked(`${method}:${providerRef}`, async () => {
    let payment = db.prepare('SELECT * FROM payments WHERE provider = ? AND provider_ref = ?').get(method, providerRef);
    if (payment && payment.sandbox) {
      const booking = getBooking(db, payment.booking_id);
      return settle(db, payment, sandboxRemote(payment, booking));
    }
    if (payment && ['paid', 'refunded', 'partially_refunded'].includes(payment.status)) return getBooking(db, payment.booking_id);
    if (!isLive(method)) throw new AppError('Payment provider is not configured.', { status: 400 });

    const remote = await PROVIDERS[method].fetchPayment(providerRef);
    if (!payment) {
      // Card payments are created client-side by Moyasar; adopt them here.
      const booking = remote.reference && db.prepare('SELECT * FROM bookings WHERE ref = ?').get(remote.reference);
      if (!booking) throw new AppError('Payment does not match any booking.', { status: 404 });
      const id = insertPayment(db, { bookingId: booking.id, provider: method, providerRef, amount: outstanding(booking) || remote.amount, raw: remote.raw });
      payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
    }
    return settle(db, payment, remote);
  });
}

async function settle(db, payment, remote) {
  const booking = getBooking(db, payment.booking_id);
  const mismatch = remote.reference !== booking.ref || remote.currency !== 'SAR' || remote.amount !== payment.amount;
  if (mismatch) {
    dbm.logActivity(db, { bookingId: booking.id, action: 'payment.mismatch', detail: JSON.stringify({ ref: remote.reference, amount: remote.amount, expected: payment.amount }) });
    markFailed(db, payment, 'Amount or reference mismatch');
    return getBooking(db, booking.id);
  }
  let status = remote.status;
  const provider = PROVIDERS[payment.provider];
  if (!payment.sandbox) {
    if (status === 'approved' && provider.authorise) {
      await provider.authorise(payment.provider_ref);
      status = 'authorized';
    }
    if (status === 'authorized') {
      await provider.capture(payment.provider_ref, payment.amount);
      status = 'paid';
    }
  }
  db.prepare("UPDATE payments SET raw = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(remote.raw ?? {}), payment.id);
  if (status === 'paid') markPaid(db, payment.id);
  else if (['failed', 'cancelled'].includes(status)) markFailed(db, payment, remote.message || status);
  return getBooking(db, booking.id);
}

function markPaid(db, paymentId, { userId = null } = {}) {
  let confirmedNow = null;
  dbm.tx(db, () => {
    const p = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
    if (!p || p.status === 'paid') return;
    db.prepare("UPDATE payments SET status = 'paid', updated_at = datetime('now') WHERE id = ?").run(p.id);
    const b = getBooking(db, p.booking_id);
    const paid = b.paid_amount + p.amount;
    const fullyPaid = paid >= b.total;
    db.prepare(`UPDATE bookings SET paid_amount = ?, payment_status = ?, payment_method = ?,
      status = CASE WHEN ? AND status = 'pending_payment' THEN 'confirmed' ELSE status END,
      updated_at = datetime('now') WHERE id = ?`)
      .run(paid, fullyPaid ? 'paid' : 'pending', p.provider, fullyPaid ? 1 : 0, b.id);
    if (fullyPaid && !b.invoice_no) {
      const year = new Date().getFullYear();
      const invoiceNo = `INV-${year}-${String(dbm.nextCounter(db, `invoice-${year}`)).padStart(6, '0')}`;
      db.prepare("UPDATE bookings SET invoice_no = ?, invoiced_at = datetime('now') WHERE id = ?").run(invoiceNo, b.id);
      if (b.promo_code) db.prepare('UPDATE promo_codes SET used = used + 1 WHERE code = ?').run(b.promo_code);
      if (b.type === 'package') {
        db.prepare('UPDATE packages SET seats = MAX(0, seats - ?) WHERE id = ?').run(b.adults + b.children, Number(b.item_id));
      }
      confirmedNow = b.id;
    }
    dbm.logActivity(db, { userId, bookingId: b.id, action: `payment.${p.provider}.paid`, detail: `${p.amount} halalas${p.sandbox ? ' (sandbox)' : ''}` });
  });
  if (confirmedNow) {
    const b = getBooking(db, confirmedNow);
    notify.bookingConfirmed(db, b).catch((e) => console.error('[notify]', e));
    if (b.type === 'flight') ticketing.issue(db, b.id, { userId }).catch((e) => console.error('[ticketing]', e));
  }
}

function markFailed(db, payment, reason = '') {
  db.prepare("UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ? AND status IN ('initiated','authorized')").run(payment.id);
  db.prepare("UPDATE bookings SET payment_status = 'failed', updated_at = datetime('now') WHERE id = ? AND payment_status IN ('unpaid','pending')").run(payment.booking_id);
  dbm.logActivity(db, { bookingId: payment.booking_id, action: `payment.${payment.provider}.failed`, detail: reason });
}

/** Staff: record a payment received at the office (cash, POS terminal, bank transfer). */
function recordOffline(db, booking, { method, amount, reference = '', userId }) {
  if (!OFFLINE.includes(method)) throw new AppError('Unsupported offline payment method.');
  assertPayable(booking);
  amount = Math.trunc(amount);
  if (!(amount > 0) || amount > outstanding(booking)) throw new AppError('Amount must be between 0 and the outstanding balance.');
  const id = insertPayment(db, { bookingId: booking.id, provider: method, providerRef: `${method.toUpperCase()}-${reference || randomToken(6)}`, amount });
  markPaid(db, id, { userId });
  return getBooking(db, booking.id);
}

/** Staff: refund all or part of a captured payment. */
async function refund(db, paymentId, amount, { userId, reason = '' } = {}) {
  const p = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
  if (!p || !['paid', 'partially_refunded'].includes(p.status)) throw new AppError('Only captured payments can be refunded.');
  amount = Math.trunc(amount);
  const refundable = p.amount - p.refunded_amount;
  if (!(amount > 0) || amount > refundable) throw new AppError(`Refund must be between 0.01 and ${(refundable / 100).toFixed(2)} SAR.`);

  if (!p.sandbox && PROVIDERS[p.provider]) await PROVIDERS[p.provider].refund(p.provider_ref, amount);

  dbm.tx(db, () => {
    const refunded = p.refunded_amount + amount;
    const pStatus = refunded >= p.amount ? 'refunded' : 'partially_refunded';
    db.prepare("UPDATE payments SET refunded_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?").run(refunded, pStatus, p.id);
    const b = getBooking(db, p.booking_id);
    const paid = Math.max(0, b.paid_amount - amount);
    db.prepare(`UPDATE bookings SET paid_amount = ?, payment_status = ?, status = CASE WHEN ? = 0 THEN 'refunded' ELSE status END,
      updated_at = datetime('now') WHERE id = ?`).run(paid, paid === 0 ? 'refunded' : 'partially_refunded', paid, b.id);
    dbm.logActivity(db, { userId, bookingId: b.id, action: `payment.${p.provider}.refund`, detail: `${amount} halalas ${reason}`.trim() });
  });
  const b = getBooking(db, p.booking_id);
  notify.refundIssued(db, b, amount);
  return b;
}

module.exports = {
  listMethods, start, confirm, markPaid, markFailed, recordOffline, refund, outstanding, isLive, isSandbox, ONLINE, OFFLINE,
};
