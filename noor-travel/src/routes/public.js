'use strict';
const express = require('express');
const config = require('../config');
const flights = require('../flights');
const airports = require('../airports');
const duffel = require('../flights-duffel');
const pricing = require('../pricing');
const payments = require('../payments');
const { AppError } = require('../errors');
const { rateLimit } = require('../auth');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function pkgOut(p, full = false) {
  const out = {
    id: p.id, slug: p.slug, category: p.category,
    title: { en: p.title_en, ar: p.title_ar },
    destination: { en: p.destination_en, ar: p.destination_ar },
    summary: { en: p.summary_en, ar: p.summary_ar },
    durationDays: p.duration_days, price: p.price, oldPrice: p.old_price,
    scene: p.scene, hue: p.hue, seats: p.seats, featured: !!p.featured,
    rating: p.rating ? Number(p.rating.toFixed(1)) : null, reviewCount: p.review_count || 0,
  };
  if (full) {
    out.itinerary = JSON.parse(p.itinerary);
    out.includes = JSON.parse(p.includes);
  }
  return out;
}

const PKG_SELECT = `SELECT p.*, (SELECT AVG(rating) FROM reviews r WHERE r.package_id = p.id AND r.approved = 1) AS rating,
  (SELECT COUNT(*) FROM reviews r WHERE r.package_id = p.id AND r.approved = 1) AS review_count FROM packages p`;

const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = function publicRoutes(db) {
  const r = express.Router();

  r.get('/site', (_req, res) => {
    res.json({
      company: config.company,
      vatRate: config.vatRate,
      paymentsMode: config.paymentsMode,
      moyasarFormVersion: config.moyasar.formVersion,
      airports: airports.MAJOR,
      countries: airports.COUNTRIES,
      cabins: flights.CABINS,
      flightProvider: flights.provider(),
    });
  });

  r.get('/packages', (req, res) => {
    const where = ['p.active = 1'];
    const args = [];
    if (req.query.category) { where.push('p.category = ?'); args.push(String(req.query.category)); }
    if (req.query.featured) where.push('p.featured = 1');
    if (req.query.q) {
      where.push('(p.title_en LIKE ? OR p.title_ar LIKE ? OR p.destination_en LIKE ? OR p.destination_ar LIKE ?)');
      const q = `%${String(req.query.q).slice(0, 60)}%`;
      args.push(q, q, q, q);
    }
    if (req.query.maxPrice) { where.push('p.price <= ?'); args.push(Math.round(Number(req.query.maxPrice) * 100) || 0); }
    const sort = { price_asc: 'p.price ASC', price_desc: 'p.price DESC', duration: 'p.duration_days ASC' }[req.query.sort] || 'p.featured DESC, p.id ASC';
    const rows = db.prepare(`${PKG_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${sort}`).all(...args);
    res.json(rows.map((p) => pkgOut(p)));
  });

  r.get('/packages/:slug', (req, res) => {
    const p = db.prepare(`${PKG_SELECT} WHERE p.slug = ? AND p.active = 1`).get(req.params.slug);
    if (!p) return res.status(404).json({ error: 'Package not found' });
    const reviews = db.prepare('SELECT name, rating, comment, created_at FROM reviews WHERE package_id = ? AND approved = 1 ORDER BY id DESC LIMIT 20').all(p.id);
    res.json({ ...pkgOut(p, true), reviews, addons: pricing.availableAddons('package') });
  });

  r.post('/packages/:slug/reviews', rateLimit({ max: 5, windowMs: 3600e3 }), (req, res) => {
    const p = db.prepare('SELECT id FROM packages WHERE slug = ? AND active = 1').get(req.params.slug);
    if (!p) return res.status(404).json({ error: 'Package not found' });
    const { name, rating, comment } = req.body || {};
    const n = Number(rating);
    if (!name || !comment || !(n >= 1 && n <= 5)) throw new AppError('Please add your name, a rating and a comment.', { ar: 'يرجى إدخال الاسم والتقييم والتعليق.' });
    db.prepare('INSERT INTO reviews (package_id, name, rating, comment) VALUES (?, ?, ?, ?)')
      .run(p.id, String(name).slice(0, 80), Math.round(n), String(comment).slice(0, 1000));
    res.status(201).json({ ok: true });
  });

  r.get('/reviews/featured', (_req, res) => {
    res.json(db.prepare(`SELECT r.name, r.rating, r.comment, p.title_en, p.title_ar FROM reviews r
      JOIN packages p ON p.id = r.package_id WHERE r.approved = 1 AND r.rating >= 4 ORDER BY r.id DESC LIMIT 6`).all());
  });

  r.get('/hotels', (req, res) => {
    const args = [];
    let sql = 'SELECT * FROM hotels WHERE active = 1';
    if (req.query.city) { sql += ' AND (city_en = ? OR city_ar = ?)'; args.push(String(req.query.city), String(req.query.city)); }
    sql += ' ORDER BY stars DESC, price_per_night ASC';
    res.json(db.prepare(sql).all(...args).map((h) => ({
      id: h.id, name: h.name, city: { en: h.city_en, ar: h.city_ar }, stars: h.stars, pricePerNight: h.price_per_night,
      distance: { en: h.distance_en, ar: h.distance_ar }, amenities: JSON.parse(h.amenities), scene: h.scene, hue: h.hue,
    })));
  });

  r.get('/visas', (_req, res) => {
    res.json(db.prepare('SELECT * FROM visas WHERE active = 1 ORDER BY id').all().map((v) => ({
      id: v.id, country: { en: v.country_en, ar: v.country_ar }, type: { en: v.type_en, ar: v.type_ar },
      processing: v.processing_days, price: v.price, requirements: JSON.parse(v.requirements), flag: v.flag,
    })));
  });

  r.get('/airports', ah(async (req, res) => {
    const local = airports.search(req.query.q);
    const extra = local.length < 4 ? await duffel.places(req.query.q).catch(() => []) : [];
    const seen = new Set(local.map((a) => a.code));
    res.json([...local, ...extra.filter((a) => !seen.has(a.code))].map((a) => ({
      code: a.code, city: { en: a.en, ar: a.ar }, name: a.name, country: a.countryName,
    })));
  }));

  r.get('/flights/search', ah(async (req, res) => {
    const result = await flights.search(db, req.query);
    const codes = new Set(result.offers.flatMap((o) => o.slices.flatMap((sl) => sl.segments.flatMap((g) => [g.origin, g.destination]))));
    codes.add(String(req.query.from || '').toUpperCase()); codes.add(String(req.query.to || '').toUpperCase());
    res.json({ ...result, places: airports.describe(codes) });
  }));

  r.get('/addons/:type', (req, res) => res.json(pricing.availableAddons(req.params.type)));

  r.post('/quote', ah(async (req, res) => {
    const q = await pricing.quote(db, req.body || {});
    res.json({ ...q, paymentMethods: payments.listMethods(db, q.total) });
  }));

  r.post('/promo/check', ah(async (req, res) => {
    const q = await pricing.quote(db, req.body || {});
    res.json({ promo: q.promo, discount: q.discount, total: q.total });
  }));

  r.post('/inquiries', rateLimit({ max: 8, windowMs: 3600e3 }), (req, res) => {
    const { name, email, phone, subject, message } = req.body || {};
    if (!name || !EMAIL.test(String(email || '')) || !message) {
      throw new AppError('Please provide your name, a valid email and a message.', { ar: 'يرجى إدخال الاسم وبريد إلكتروني صحيح والرسالة.' });
    }
    db.prepare('INSERT INTO inquiries (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)')
      .run(String(name).slice(0, 120), String(email).slice(0, 160), String(phone || '').slice(0, 30),
        String(subject || 'General').slice(0, 120), String(message).slice(0, 4000));
    res.status(201).json({ ok: true });
  });

  r.post('/newsletter', rateLimit({ max: 10, windowMs: 3600e3 }), (req, res) => {
    const email = String(req.body?.email || '').trim();
    if (!EMAIL.test(email)) throw new AppError('Please enter a valid email.', { ar: 'يرجى إدخال بريد إلكتروني صحيح.' });
    db.prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)').run(email);
    res.status(201).json({ ok: true });
  });

  return r;
};

module.exports.EMAIL = EMAIL;
