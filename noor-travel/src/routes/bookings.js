'use strict';
const express = require('express');
const bookings = require('../bookings');
const payments = require('../payments');
const config = require('../config');
const dbm = require('../db');
const { AppError } = require('../errors');
const { rateLimit } = require('../auth');

const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = function bookingRoutes(db) {
  const r = express.Router();

  const load = (req) => {
    const b = bookings.findAccessible(db, req.params.ref, { token: req.query.t || req.body?.t, user: req.user });
    if (!b) throw new AppError('Booking not found.', { status: 404, ar: 'لم يتم العثور على الحجز.' });
    return b;
  };

  // Customers must be signed in to book (the booking is saved to their account).
  r.post('/', rateLimit({ max: 30, windowMs: 3600e3 }), ah(async (req, res) => {
    if (!req.user) throw new AppError('Please sign in or create an account to complete your booking.', { status: 401, ar: 'يرجى تسجيل الدخول أو إنشاء حساب لإتمام الحجز.' });
    const b = await bookings.create(db, req.body || {}, { user: req.user });
    res.status(201).json({ ref: b.ref, token: b.access_token, total: b.total, paymentMethods: payments.listMethods(db, b.total) });
  }));

  // Guest lookup by reference + email (rate-limited against enumeration).
  r.post('/lookup', rateLimit({ max: 10 }), (req, res) => {
    const ref = String(req.body?.ref || '').trim().toUpperCase();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const b = db.prepare('SELECT ref, access_token FROM bookings WHERE ref = ? AND contact_email = ?').get(ref, email);
    if (!b) throw new AppError('No booking matches that reference and email.', { status: 404, ar: 'لا يوجد حجز مطابق لهذا الرقم والبريد الإلكتروني.' });
    res.json({ ref: b.ref, token: b.access_token });
  });

  r.get('/:ref', (req, res) => {
    const b = load(req);
    const bankTransfer = b.payment_method === 'bank_transfer' && payments.outstanding(b) > 0 ? dbm.getSetting(db, 'bank_transfer') : null;
    res.json({ ...bookings.view(db, b), bankTransfer, paymentMethods: payments.listMethods(db, payments.outstanding(b)) });
  });

  r.get('/:ref/invoice', (req, res) => res.json(bookings.invoice(db, load(req))));

  // ZATCA QR as an image (used inside confirmation emails).
  r.get('/:ref/invoice-qr.png', ah(async (req, res) => {
    const inv = bookings.invoice(db, load(req));
    const png = await require('qrcode').toBuffer(inv.qr, { margin: 1, width: 300 });
    res.set('Cache-Control', 'private, max-age=86400').type('png').send(png);
  }));

  r.post('/:ref/pay', rateLimit({ max: 20 }), ah(async (req, res) => {
    const b = load(req);
    const { method, instalments } = req.body || {};
    const customer = b.user_id ? db.prepare(`SELECT created_at, (SELECT COUNT(*) FROM bookings WHERE user_id = ? AND status = 'completed')
      AS completedOrders FROM users WHERE id = ?`).get(b.user_id, b.user_id) : null;
    const lang = req.body?.lang === 'ar' ? 'ar' : 'en';
    res.json(await payments.start(db, b, { method, instalments, lang, customer }));
  }));

  r.post('/:ref/cancel', (req, res) => {
    const b = load(req);
    if (b.status !== 'pending_payment' || b.paid_amount > 0) {
      throw new AppError('Paid bookings are cancelled by our team per the cancellation policy — please contact us.', {
        ar: 'يتم إلغاء الحجوزات المدفوعة عن طريق فريقنا وفق سياسة الإلغاء — يرجى التواصل معنا.',
      });
    }
    db.prepare("UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(b.id);
    dbm.logActivity(db, { userId: req.user?.id, bookingId: b.id, action: 'booking.cancelled_by_customer' });
    res.json({ ok: true });
  });

  return r;
};

module.exports.paymentRoutes = function paymentRoutes(db) {
  const r = express.Router();

  const finish = (res, booking, result) => {
    const outcome = result || (booking.payment_status === 'paid' ? 'success' : booking.payment_status === 'failed' ? 'failed' : 'pending');
    res.redirect(303, `/booking.html?ref=${booking.ref}&t=${booking.access_token}&payment=${outcome}`);
  };

  // Browser returns from the gateway (or the sandbox simulator).
  r.get('/return/:method', ah(async (req, res) => {
    const { method } = req.params;
    const ref = req.query.sbx || { card: req.query.id, tabby: req.query.payment_id, tamara: req.query.orderId }[method];
    if (!ref) {
      // Customer cancelled before a payment was created at the provider.
      const b = req.query.booking && db.prepare('SELECT * FROM bookings WHERE ref = ?').get(String(req.query.booking));
      if (b) return finish(res, b, req.query.result === 'cancel' ? 'cancelled' : 'failed');
      return res.redirect(303, '/');
    }
    try {
      const b = await payments.confirm(db, method, String(ref));
      finish(res, b, req.query.result === 'cancel' && b.payment_status !== 'paid' ? 'cancelled' : null);
    } catch (err) {
      console.error('[pay/return]', err.message);
      const p = db.prepare('SELECT booking_id FROM payments WHERE provider = ? AND provider_ref = ?').get(method, String(ref));
      const b = p && db.prepare('SELECT * FROM bookings WHERE id = ?').get(p.booking_id);
      if (b) return finish(res, b, 'error');
      res.redirect(303, '/?payment=error');
    }
  }));

  // Server-to-server notifications. We never trust the body: the payment is
  // always re-fetched from the provider before anything changes.
  r.post('/webhook/tabby', ah(async (req, res) => {
    const id = req.body?.id;
    if (id) await payments.confirm(db, 'tabby', String(id)).catch((e) => console.error('[webhook/tabby]', e.message));
    res.json({ ok: true });
  }));

  r.post('/webhook/tamara', ah(async (req, res) => {
    const token = req.query.tamaraToken || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!require('../payments/tamara').verifyNotificationToken(token)) return res.status(401).json({ error: 'invalid token' });
    const id = req.body?.order_id;
    if (id) await payments.confirm(db, 'tamara', String(id)).catch((e) => console.error('[webhook/tamara]', e.message));
    res.json({ ok: true });
  }));

  r.post('/webhook/moyasar', ah(async (req, res) => {
    const secret = process.env.MOYASAR_WEBHOOK_SECRET;
    if (secret && req.body?.secret_token !== secret) return res.status(401).json({ error: 'invalid token' });
    const id = req.body?.data?.id;
    if (id) await payments.confirm(db, 'card', String(id)).catch((e) => console.error('[webhook/moyasar]', e.message));
    res.json({ ok: true });
  }));

  // ---- Sandbox simulator (only when a provider has no live keys) ----
  const sandboxPayment = (ref) => {
    const p = db.prepare('SELECT * FROM payments WHERE provider_ref = ? AND sandbox = 1').get(String(ref));
    if (!p || config.paymentsMode !== 'sandbox') throw new AppError('Sandbox payment not found.', { status: 404 });
    return p;
  };

  r.get('/sandbox/:ref', (req, res) => {
    const p = sandboxPayment(req.params.ref);
    const b = db.prepare('SELECT ref, title, total, contact_name FROM bookings WHERE id = ?').get(p.booking_id);
    const raw = JSON.parse(p.raw || '{}');
    res.json({ provider: p.provider, amount: p.amount, status: p.status, instalments: raw.instalments || 4, booking: b });
  });

  r.post('/sandbox/:ref', (req, res) => {
    const p = sandboxPayment(req.params.ref);
    if (p.status !== 'initiated') throw new AppError('This sandbox payment was already completed.');
    let outcome = ['approve', 'decline', 'cancel'].includes(req.body?.outcome) ? req.body.outcome : 'decline';
    // Test cards: any valid number approves except those ending 0002 (declined).
    if (p.provider === 'card' && outcome === 'approve' && String(req.body?.last4) === '0002') outcome = 'decline';
    const raw = { ...JSON.parse(p.raw || '{}'), outcome, last4: String(req.body?.last4 || '').slice(-4) };
    db.prepare('UPDATE payments SET raw = ? WHERE id = ?').run(JSON.stringify(raw), p.id);
    const result = outcome === 'cancel' ? '&result=cancel' : '';
    res.json({ redirect: `/api/pay/return/${p.provider}?sbx=${p.provider_ref}${result}` });
  });

  return r;
};
