'use strict';
const express = require('express');
const auth = require('../auth');
const dbm = require('../db');
const bookings = require('../bookings');
const payments = require('../payments');
const notify = require('../notify');
const ticketing = require('../ticketing');
const flights = require('../flights');
const config = require('../config');
const { AppError } = require('../errors');
const { toHalalas } = require('../money');

const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const staff = auth.requireStaff('agent', 'admin');
const adminOnly = auth.requireStaff('admin');
const J = (v) => JSON.stringify(v);

function csvCell(v) {
  const s = v == null ? '' : String(v);
  // Neutralise spreadsheet formula injection and quote as needed.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

module.exports = function adminRoutes(db) {
  const r = express.Router();
  r.use(staff);

  // ---------- Dashboard ----------
  r.get('/stats', (req, res) => {
    const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));
    const since = `-${days} days`;
    const one = (sql, ...a) => db.prepare(sql).get(...a);
    const kpi = {
      revenue: one("SELECT COALESCE(SUM(paid_amount),0) v FROM bookings WHERE created_at >= datetime('now', ?)", since).v,
      bookings: one("SELECT COUNT(*) v FROM bookings WHERE created_at >= datetime('now', ?)", since).v,
      confirmed: one("SELECT COUNT(*) v FROM bookings WHERE status IN ('confirmed','completed') AND created_at >= datetime('now', ?)", since).v,
      pendingPayment: one("SELECT COUNT(*) v FROM bookings WHERE status = 'pending_payment'").v,
      awaitingTransfer: one("SELECT COUNT(*) v FROM payments WHERE provider = 'bank_transfer' AND status = 'initiated'").v,
      vatCollected: one("SELECT COALESCE(SUM(vat),0) v FROM bookings WHERE payment_status = 'paid' AND created_at >= datetime('now', ?)", since).v,
      customers: one("SELECT COUNT(*) v FROM users WHERE role = 'customer'").v,
      newInquiries: one("SELECT COUNT(*) v FROM inquiries WHERE status = 'new'").v,
    };
    kpi.avgOrder = kpi.confirmed ? Math.round(kpi.revenue / kpi.confirmed) : 0;
    kpi.conversion = kpi.bookings ? Math.round((kpi.confirmed / kpi.bookings) * 100) : 0;
    res.json({
      days,
      kpi,
      daily: db.prepare(`SELECT date(created_at) d, COUNT(*) bookings, COALESCE(SUM(paid_amount),0) revenue FROM bookings
        WHERE created_at >= datetime('now', ?) GROUP BY d ORDER BY d`).all(since),
      byMethod: db.prepare(`SELECT provider k, COUNT(*) n, SUM(amount - refunded_amount) v FROM payments
        WHERE status IN ('paid','partially_refunded') AND created_at >= datetime('now', ?) GROUP BY provider ORDER BY v DESC`).all(since),
      byType: db.prepare(`SELECT type k, COUNT(*) n, SUM(paid_amount) v FROM bookings
        WHERE created_at >= datetime('now', ?) GROUP BY type ORDER BY v DESC`).all(since),
      upcoming: db.prepare(`SELECT ref, title, travel_date, contact_name, adults + children + infants pax, status FROM bookings
        WHERE status = 'confirmed' AND travel_date BETWEEN date('now') AND date('now', '+14 days') ORDER BY travel_date LIMIT 10`).all(),
      toTicket: db.prepare("SELECT COUNT(*) v FROM bookings WHERE type = 'flight' AND ticket_status IN ('manual','failed') AND status != 'cancelled'").get().v,
      recent: db.prepare(`SELECT ref, title, contact_name, total, status, payment_status, payment_method, ticket_status, pnr, created_at FROM bookings
        ORDER BY id DESC LIMIT 8`).all(),
    });
  });

  // ---------- Bookings ----------
  r.get('/bookings', (req, res) => {
    const where = ['1=1'];
    const args = [];
    for (const f of ['status', 'payment_status', 'type', 'source', 'ticket_status']) {
      if (req.query[f]) { where.push(`${f} = ?`); args.push(String(req.query[f])); }
    }
    if (req.query.q) {
      const q = `%${String(req.query.q).slice(0, 60)}%`;
      where.push('(ref LIKE ? OR contact_name LIKE ? OR contact_email LIKE ? OR contact_phone LIKE ? OR title LIKE ?)');
      args.push(q, q, q, q, q);
    }
    if (req.query.from) { where.push('date(created_at) >= ?'); args.push(String(req.query.from)); }
    if (req.query.to) { where.push('date(created_at) <= ?'); args.push(String(req.query.to)); }
    const page = Math.max(1, Number(req.query.page) || 1);
    const size = 25;
    const total = db.prepare(`SELECT COUNT(*) n FROM bookings WHERE ${where.join(' AND ')}`).get(...args).n;
    const rows = db.prepare(`SELECT id, ref, type, title, travel_date, contact_name, contact_email, contact_phone, total, paid_amount,
      status, payment_status, payment_method, ticket_status, pnr, source, created_at FROM bookings WHERE ${where.join(' AND ')}
      ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args, size, (page - 1) * size);
    res.json({ total, page, pages: Math.ceil(total / size), rows });
  });

  r.post('/bookings', ah(async (req, res) => {
    const b = await bookings.create(db, req.body || {}, { source: 'office', createdBy: req.user.id });
    res.status(201).json({ ref: b.ref, paymentLink: notify.link(b) });
  }));

  const byRef = (ref) => {
    const b = db.prepare('SELECT * FROM bookings WHERE ref = ?').get(String(ref).toUpperCase());
    if (!b) throw new AppError('Booking not found.', { status: 404 });
    return b;
  };

  r.get('/bookings/:ref', (req, res) => {
    const b = byRef(req.params.ref);
    res.json({
      ...bookings.view(db, b),
      source: b.source,
      paymentLink: notify.link(b),
      allPayments: db.prepare('SELECT id, provider, provider_ref, amount, refunded_amount, status, sandbox, created_at FROM payments WHERE booking_id = ? ORDER BY id').all(b.id),
      activity: db.prepare(`SELECT a.action, a.detail, a.created_at, u.name user FROM activity_log a LEFT JOIN users u ON u.id = a.user_id
        WHERE a.booking_id = ? ORDER BY a.id DESC`).all(b.id),
      messages: db.prepare('SELECT channel, recipient, subject, created_at FROM notifications WHERE booking_id = ? ORDER BY id DESC').all(b.id),
    });
  });

  r.patch('/bookings/:ref/status', (req, res) => {
    const b = bookings.setStatus(db, byRef(req.params.ref), String(req.body?.status), req.user.id);
    res.json({ status: b.status });
  });

  r.patch('/bookings/:ref/notes', (req, res) => {
    const b = byRef(req.params.ref);
    db.prepare("UPDATE bookings SET notes = ?, updated_at = datetime('now') WHERE id = ?").run(String(req.body?.notes || '').slice(0, 4000), b.id);
    dbm.logActivity(db, { userId: req.user.id, bookingId: b.id, action: 'booking.notes_updated' });
    res.json({ ok: true });
  });

  r.post('/bookings/:ref/payments', (req, res) => {
    const { method, amount, reference } = req.body || {};
    const b = payments.recordOffline(db, byRef(req.params.ref), { method, amount: toHalalas(amount), reference, userId: req.user.id });
    res.status(201).json({ paymentStatus: b.payment_status, status: b.status });
  });

  // Airline ticketing
  r.post('/bookings/:ref/ticket/issue', ah(async (req, res) => {
    const b = byRef(req.params.ref);
    if (b.type !== 'flight' || b.payment_status !== 'paid') throw new AppError('Only fully paid flight bookings can be ticketed.');
    const fresh = await ticketing.issue(db, b.id, { userId: req.user.id });
    res.json({ ticketStatus: fresh.ticket_status, pnr: fresh.pnr });
  }));

  r.post('/bookings/:ref/ticket/manual', (req, res) => {
    const b = byRef(req.params.ref);
    if (b.type !== 'flight') throw new AppError('Not a flight booking.');
    const fresh = ticketing.recordManual(db, b, req.body || {}, req.user.id);
    res.json({ ticketStatus: fresh.ticket_status, pnr: fresh.pnr });
  });

  r.post('/bookings/:ref/resend', ah(async (req, res) => {
    const b = byRef(req.params.ref);
    if (b.payment_status === 'paid') await notify.bookingConfirmed(db, b); else notify.bookingCreated(db, b);
    res.json({ ok: true });
  }));

  // ---------- Payments ----------
  r.get('/payments', (req, res) => {
    const where = ['1=1'];
    const args = [];
    if (req.query.status) { where.push('p.status = ?'); args.push(String(req.query.status)); }
    if (req.query.provider) { where.push('p.provider = ?'); args.push(String(req.query.provider)); }
    res.json(db.prepare(`SELECT p.id, p.provider, p.provider_ref, p.amount, p.refunded_amount, p.status, p.sandbox, p.created_at,
      b.ref, b.contact_name FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE ${where.join(' AND ')}
      ORDER BY p.id DESC LIMIT 200`).all(...args));
  });

  r.post('/payments/:id/confirm-transfer', (req, res) => {
    const p = db.prepare("SELECT * FROM payments WHERE id = ? AND provider = 'bank_transfer' AND status = 'initiated'").get(Number(req.params.id));
    if (!p) throw new AppError('No pending bank transfer with that id.', { status: 404 });
    const b = db.prepare('SELECT * FROM bookings WHERE id = ?').get(p.booking_id);
    const due = payments.outstanding(b);
    if (due <= 0) throw new AppError('This booking is already fully paid.');
    if (p.amount !== due) db.prepare('UPDATE payments SET amount = ? WHERE id = ?').run(due, p.id);
    payments.markPaid(db, p.id, { userId: req.user.id });
    res.json({ ok: true });
  });

  r.post('/payments/:id/verify', ah(async (req, res) => {
    const p = db.prepare('SELECT * FROM payments WHERE id = ?').get(Number(req.params.id));
    if (!p || !payments.ONLINE.includes(p.provider)) throw new AppError('Only online payments can be re-verified.', { status: 404 });
    const b = await payments.confirm(db, p.provider, p.provider_ref);
    res.json({ paymentStatus: b.payment_status });
  }));

  r.post('/payments/:id/refund', adminOnly, ah(async (req, res) => {
    const b = await payments.refund(db, Number(req.params.id), toHalalas(req.body?.amount), { userId: req.user.id, reason: String(req.body?.reason || '') });
    res.json({ paymentStatus: b.payment_status, status: b.status });
  }));

  // ---------- Catalogue ----------
  r.get('/packages', (_req, res) => res.json(db.prepare('SELECT * FROM packages ORDER BY id DESC').all()
    .map((p) => ({ ...p, itinerary: JSON.parse(p.itinerary), includes: JSON.parse(p.includes) }))));

  function packageFields(body) {
    const b = body || {};
    const req = ['slug', 'category', 'title_en', 'title_ar', 'destination_en', 'destination_ar'];
    for (const k of req) if (!String(b[k] || '').trim()) throw new AppError(`Field "${k}" is required.`);
    if (!/^[a-z0-9-]{3,80}$/.test(b.slug)) throw new AppError('Slug may only contain lowercase letters, numbers and dashes.');
    const lines = (v) => (Array.isArray(v) ? v : []).map((x) => ({ en: String(x.en || ''), ar: String(x.ar || '') })).filter((x) => x.en || x.ar);
    return [
      b.slug, b.category, b.title_en, b.title_ar, b.destination_en, b.destination_ar, b.summary_en || '', b.summary_ar || '',
      Math.max(1, Number(b.duration_days) || 1), toHalalas(b.price), b.old_price ? toHalalas(b.old_price) : null,
      ['mosque', 'city', 'mountain', 'beach', 'desert'].includes(b.scene) ? b.scene : 'city', Number(b.hue) || 200,
      J(lines(b.itinerary)), J(lines(b.includes)), Math.max(0, Number(b.seats) || 0), b.featured ? 1 : 0, b.active === false ? 0 : 1,
    ];
  }

  r.post('/packages', adminOnly, (req, res) => {
    const f = packageFields(req.body);
    const out = db.prepare(`INSERT INTO packages (slug, category, title_en, title_ar, destination_en, destination_ar, summary_en, summary_ar,
      duration_days, price, old_price, scene, hue, itinerary, includes, seats, featured, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(...f);
    res.status(201).json({ id: Number(out.lastInsertRowid) });
  });

  r.put('/packages/:id', adminOnly, (req, res) => {
    const f = packageFields(req.body);
    db.prepare(`UPDATE packages SET slug=?, category=?, title_en=?, title_ar=?, destination_en=?, destination_ar=?, summary_en=?, summary_ar=?,
      duration_days=?, price=?, old_price=?, scene=?, hue=?, itinerary=?, includes=?, seats=?, featured=?, active=? WHERE id=?`).run(...f, Number(req.params.id));
    res.json({ ok: true });
  });

  r.delete('/packages/:id', adminOnly, (req, res) => {
    db.prepare('UPDATE packages SET active = 0 WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true });
  });

  r.get('/hotels', (_req, res) => res.json(db.prepare('SELECT * FROM hotels ORDER BY city_en, name').all()));
  r.put('/hotels/:id', adminOnly, (req, res) => {
    db.prepare('UPDATE hotels SET price_per_night = ?, active = ? WHERE id = ?')
      .run(toHalalas(req.body?.price), req.body?.active === false ? 0 : 1, Number(req.params.id));
    res.json({ ok: true });
  });

  r.get('/visas', (_req, res) => res.json(db.prepare('SELECT * FROM visas ORDER BY id').all()));
  r.put('/visas/:id', adminOnly, (req, res) => {
    db.prepare('UPDATE visas SET price = ?, processing_days = ?, active = ? WHERE id = ?')
      .run(toHalalas(req.body?.price), String(req.body?.processing || ''), req.body?.active === false ? 0 : 1, Number(req.params.id));
    res.json({ ok: true });
  });


  // ---------- Promo codes ----------
  r.get('/promos', (_req, res) => res.json(db.prepare('SELECT * FROM promo_codes ORDER BY code').all()));
  r.post('/promos', adminOnly, (req, res) => {
    const b = req.body || {};
    const code = String(b.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw new AppError('Code must be 3–30 letters/numbers.');
    if (!['percent', 'fixed'].includes(b.kind)) throw new AppError('Kind must be percent or fixed.');
    const value = b.kind === 'percent' ? Math.min(100, Math.max(1, Math.round(Number(b.value)))) : toHalalas(b.value);
    db.prepare(`INSERT INTO promo_codes (code, kind, value, min_amount, max_discount, max_uses, expires_at, active) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(code) DO UPDATE SET kind=excluded.kind, value=excluded.value, min_amount=excluded.min_amount,
      max_discount=excluded.max_discount, max_uses=excluded.max_uses, expires_at=excluded.expires_at, active=excluded.active`)
      .run(code, b.kind, value, toHalalas(b.min_amount || 0), b.max_discount ? toHalalas(b.max_discount) : null,
        b.max_uses ? Math.round(Number(b.max_uses)) : null, b.expires_at || null, b.active === false ? 0 : 1);
    res.status(201).json({ ok: true });
  });
  r.delete('/promos/:code', adminOnly, (req, res) => {
    db.prepare('UPDATE promo_codes SET active = 0 WHERE code = ?').run(req.params.code);
    res.json({ ok: true });
  });

  // ---------- Customers & staff ----------
  r.get('/customers', (req, res) => {
    const q = `%${String(req.query.q || '').slice(0, 60)}%`;
    res.json(db.prepare(`SELECT c.email, MAX(c.contact_name) name, MAX(c.contact_phone) phone, COUNT(*) bookings,
      SUM(c.paid_amount) spent, MAX(c.created_at) last_booking, MAX(u.id) user_id FROM bookings c
      LEFT JOIN users u ON u.email = c.contact_email
      WHERE c.contact_email LIKE ? OR c.contact_name LIKE ? OR c.contact_phone LIKE ?
      GROUP BY c.contact_email ORDER BY spent DESC LIMIT 200`).all(q, q, q).map(({ email, ...rest }) => ({ email, ...rest })));
  });

  r.get('/staff', adminOnly, (_req, res) => res.json(db.prepare("SELECT id, name, email, phone, role, active, created_at FROM users WHERE role IN ('agent','admin') ORDER BY id").all()));

  r.post('/staff', adminOnly, (req, res) => {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || String(password || '').length < 10) throw new AppError('Name, email and a password of at least 10 characters are required.');
    if (!['agent', 'admin'].includes(role)) throw new AppError('Role must be agent or admin.');
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).trim());
    if (existing) throw new AppError('A user with this email already exists.', { status: 409 });
    db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(String(name).trim(), String(email).trim().toLowerCase(), auth.hashPassword(String(password)), role);
    res.status(201).json({ ok: true });
  });

  r.patch('/staff/:id', adminOnly, (req, res) => {
    const id = Number(req.params.id);
    if (id === req.user.id) throw new AppError('You cannot change your own account here.');
    if (req.body?.active !== undefined) db.prepare('UPDATE users SET active = ? WHERE id = ?').run(req.body.active ? 1 : 0, id);
    if (['agent', 'admin'].includes(req.body?.role)) db.prepare("UPDATE users SET role = ? WHERE id = ? AND role IN ('agent','admin')").run(req.body.role, id);
    if (req.body?.active === false) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    res.json({ ok: true });
  });

  // ---------- Inquiries, reviews, outbox ----------
  r.get('/inquiries', (_req, res) => res.json(db.prepare('SELECT * FROM inquiries ORDER BY id DESC LIMIT 200').all()));
  r.patch('/inquiries/:id', (req, res) => {
    if (!['new', 'in_progress', 'closed'].includes(req.body?.status)) throw new AppError('Invalid status.');
    db.prepare('UPDATE inquiries SET status = ? WHERE id = ?').run(req.body.status, Number(req.params.id));
    res.json({ ok: true });
  });

  r.get('/reviews', (_req, res) => res.json(db.prepare(`SELECT r.*, p.title_en FROM reviews r LEFT JOIN packages p ON p.id = r.package_id
    ORDER BY r.approved ASC, r.id DESC LIMIT 200`).all()));
  r.patch('/reviews/:id', (req, res) => {
    db.prepare('UPDATE reviews SET approved = ? WHERE id = ?').run(req.body?.approved ? 1 : 0, Number(req.params.id));
    res.json({ ok: true });
  });
  r.delete('/reviews/:id', adminOnly, (req, res) => {
    db.prepare('DELETE FROM reviews WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true });
  });

  r.get('/notifications', (_req, res) => res.json({
    provider: require('../mailer').provider(),
    rows: db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 200').all(),
  }));
  r.get('/subscribers', (_req, res) => res.json(db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all()));

  // ---------- Settings ----------
  r.get('/settings', (_req, res) => {
    const status = (m) => (payments.isLive(m) ? 'live' : payments.isSandbox(m) ? 'sandbox' : 'disabled');
    res.json({
      company: config.company,
      paymentsMode: config.paymentsMode,
      providers: { card: status('card'), tabby: status('tabby'), tamara: status('tamara') },
      paymentLimits: dbm.getSetting(db, 'payment_limits', {}),
      bankTransfer: dbm.getSetting(db, 'bank_transfer', {}),
      flightProvider: flights.provider(),
      flightFees: dbm.getSetting(db, 'flight_fees', { perPassenger: 0 }),
      fxRates: config.fxRates,
    });
  });

  r.put('/settings', adminOnly, (req, res) => {
    const { paymentLimits, bankTransfer, flightFees } = req.body || {};
    if (flightFees) dbm.setSetting(db, 'flight_fees', { perPassenger: Math.max(0, toHalalas(flightFees.perPassenger || 0)) });
    if (paymentLimits) {
      const clean = {};
      for (const m of ['tabby', 'tamara']) {
        const l = paymentLimits[m];
        if (l) clean[m] = { min: toHalalas(l.min), max: toHalalas(l.max) };
      }
      dbm.setSetting(db, 'payment_limits', clean);
    }
    if (bankTransfer) {
      dbm.setSetting(db, 'bank_transfer', {
        enabled: !!bankTransfer.enabled, bank: String(bankTransfer.bank || ''), accountName: String(bankTransfer.accountName || ''),
        iban: String(bankTransfer.iban || '').toUpperCase(),
      });
    }
    dbm.logActivity(db, { userId: req.user.id, action: 'settings.updated' });
    res.json({ ok: true });
  });

  // ---------- Reports ----------
  r.get('/reports/bookings.csv', (req, res) => {
    const from = String(req.query.from || '2000-01-01');
    const to = String(req.query.to || '2999-12-31');
    const rows = db.prepare(`SELECT ref, invoice_no, invoiced_at, created_at, type, title, travel_date, contact_name, contact_email, contact_phone,
      adults, children, infants, subtotal, discount, promo_code, total, vat, paid_amount, status, payment_status, payment_method, source
      FROM bookings WHERE date(created_at) BETWEEN ? AND ? ORDER BY id`).all(from, to);
    const money = new Set(['subtotal', 'discount', 'total', 'vat', 'paid_amount']);
    const cols = rows.length ? Object.keys(rows[0]) : ['ref'];
    const body = [cols.join(','), ...rows.map((row) => cols.map((c) => csvCell(money.has(c) ? (row[c] / 100).toFixed(2) : row[c])).join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ezhar-bookings-${from}-to-${to}.csv"`);
    res.send(`﻿${body}`);
  });

  return r;
};
