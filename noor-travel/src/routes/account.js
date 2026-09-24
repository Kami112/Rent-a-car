'use strict';
const express = require('express');
const auth = require('../auth');
const bookings = require('../bookings');
const { AppError } = require('../errors');
const { EMAIL } = require('./public');

module.exports = function accountRoutes(db) {
  const r = express.Router();

  r.post('/register', auth.rateLimit({ max: 10, windowMs: 3600e3 }), (req, res) => {
    const { name, email, phone, password } = req.body || {};
    if (!name || String(name).trim().length < 3) throw new AppError('Please enter your full name.', { ar: 'يرجى إدخال الاسم الكامل.' });
    if (!EMAIL.test(String(email || ''))) throw new AppError('Please enter a valid email.', { ar: 'يرجى إدخال بريد إلكتروني صحيح.' });
    if (String(password || '').length < 8) throw new AppError('Password must be at least 8 characters.', { ar: 'يجب ألا تقل كلمة المرور عن 8 أحرف.' });
    const normPhone = phone ? bookings.normalisePhone(phone) : null;
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(String(email).trim())) {
      throw new AppError('An account with this email already exists. Please sign in.', { status: 409, ar: 'يوجد حساب بهذا البريد الإلكتروني. يرجى تسجيل الدخول.' });
    }
    const r2 = db.prepare('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
      .run(String(name).trim().slice(0, 120), String(email).trim().toLowerCase(), normPhone, auth.hashPassword(String(password)));
    const userId = Number(r2.lastInsertRowid);
    // Guest bookings are not auto-attached by email (the address is unverified);
    // they can be claimed with their private link via POST /bookings/claim.
    auth.createSession(db, res, userId);
    res.status(201).json({ id: userId, name, email, role: 'customer' });
  });

  r.post('/login', auth.rateLimit({ max: 10 }), (req, res) => {
    const { email, password } = req.body || {};
    const u = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(String(email || '').trim());
    if (!u || !auth.verifyPassword(String(password || ''), u.password_hash)) {
      throw new AppError('Incorrect email or password.', { status: 401, ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
    }
    auth.createSession(db, res, u.id);
    res.json({ id: u.id, name: u.name, email: u.email, role: u.role });
  });

  r.post('/logout', (req, res) => {
    auth.destroySession(db, req, res);
    res.json({ ok: true });
  });

  r.get('/me', (req, res) => res.json(req.user || null));

  r.put('/me', auth.requireUser, (req, res) => {
    const { name, phone, currentPassword, newPassword } = req.body || {};
    if (name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(name).trim().slice(0, 120), req.user.id);
    if (phone) db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(bookings.normalisePhone(phone), req.user.id);
    if (newPassword) {
      const u = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
      if (!auth.verifyPassword(String(currentPassword || ''), u.password_hash)) throw new AppError('Current password is incorrect.', { ar: 'كلمة المرور الحالية غير صحيحة.' });
      if (String(newPassword).length < 8) throw new AppError('Password must be at least 8 characters.', { ar: 'يجب ألا تقل كلمة المرور عن 8 أحرف.' });
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(auth.hashPassword(String(newPassword)), req.user.id);
    }
    res.json({ ok: true });
  });

  r.get('/bookings', auth.requireUser, (req, res) => {
    const rows = db.prepare(`SELECT ref, access_token, type, title, travel_date, total, paid_amount, status, payment_status, created_at
      FROM bookings WHERE user_id = ? ORDER BY id DESC`).all(req.user.id);
    res.json(rows.map((b) => ({ ...b, token: b.access_token, access_token: undefined })));
  });

  // Attach a guest booking to the signed-in account using its private link token.
  r.post('/bookings/claim', auth.requireUser, (req, res) => {
    const b = bookings.findAccessible(db, req.body?.ref, { token: req.body?.t });
    if (!b) throw new AppError('Booking not found.', { status: 404, ar: 'لم يتم العثور على الحجز.' });
    if (b.user_id && b.user_id !== req.user.id) throw new AppError('This booking belongs to another account.', { status: 409 });
    db.prepare('UPDATE bookings SET user_id = ? WHERE id = ?').run(req.user.id, b.id);
    res.json({ ok: true });
  });

  return r;
};
