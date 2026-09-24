'use strict';
process.env.DB_PATH = ':memory:';
process.env.PAYMENTS_MODE = 'sandbox';
process.env.ADMIN_EMAIL = 'admin@test.sa';
process.env.ADMIN_PASSWORD = 'Admin@12345';
process.env.BASE_URL = 'http://noor.test';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');
const dbm = require('../src/db');
const { seed } = require('../src/seed');
const { createApp } = require('../server');
const zatca = require('../src/zatca');
const { vatFromInclusive } = require('../src/money');

let db; let server; let base;
const realFetch = globalThis.fetch;
let providerMock = null; // (url, init) => {status, body} for provider hosts

const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

before(async () => {
  db = dbm.open(':memory:');
  seed(db);
  server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (providerMock && /tabby\.ai|tamara\.co|moyasar\.com/.test(u)) {
      const { status = 200, body = {} } = await providerMock(u, init || {});
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    }
    return realFetch(url, init);
  };
});
after(() => { server.close(); globalThis.fetch = realFetch; });
beforeEach(() => {
  providerMock = null;
  Object.assign(config.tabby, { secretKey: '', merchantCode: '' });
  config.tamara.apiToken = '';
  Object.assign(config.moyasar, { publishableKey: '', secretKey: '' });
});

function client() {
  let cookie = '';
  return async (path, { method = 'GET', body, redirect = 'follow' } = {}) => {
    const res = await realFetch(`${base}${path}`, {
      method, redirect,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data, headers: res.headers };
  };
}
const call = client();

const PKG = { type: 'package', id: 'istanbul-bursa-6-days', date: future(30), adults: 2, children: 1, infants: 0 };
const CONTACT = { name: 'Mohammed Alqahtani', email: 'mo@example.com', phone: '0551234567' };
const TRAVELERS = [{ firstName: 'Mohammed', lastName: 'Alqahtani' }, { firstName: 'Sara', lastName: 'Alqahtani' }, { firstName: 'Omar', lastName: 'Alqahtani', type: 'child' }];

async function book(extra = {}) {
  const r = await call('/api/bookings', { method: 'POST', body: { ...PKG, contact: CONTACT, travelers: TRAVELERS, acceptTerms: true, ...extra } });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data;
}

test('VAT is extracted from VAT-inclusive totals', () => {
  assert.equal(vatFromInclusive(11500), 1500);
  assert.equal(vatFromInclusive(100000), 13043);
});

test('quote prices adults, children (75%), add-ons and promo on the server', async () => {
  const r = await call('/api/quote', { method: 'POST', body: { ...PKG, addons: ['insurance', 'bogus'], promo: 'WELCOME10' } });
  assert.equal(r.status, 200);
  const q = r.data;
  // 2 × 4290 + 1 × 3217.50 + 3 × 75 insurance
  assert.equal(q.subtotal, 2 * 429000 + 321750 + 3 * 7500);
  assert.equal(q.discount, 50000, 'WELCOME10 is capped at SAR 500');
  assert.equal(q.total, q.subtotal - 50000);
  assert.equal(q.vat, vatFromInclusive(q.total));
  assert.deepEqual(q.addons, ['insurance']);
  assert.ok(q.paymentMethods.some((m) => m.key === 'tabby'));
});

test('quote rejects invalid input', async () => {
  const bad = [
    { ...PKG, date: future(1) },
    { ...PKG, adults: 0 },
    { ...PKG, infants: 3 },
    { ...PKG, promo: 'NOPE' },
    { type: 'hotel', id: 1, date: future(5), endDate: future(5) },
    { type: 'flight', id: '99999@2030-01-01' },
  ];
  for (const body of bad) {
    const r = await call('/api/quote', { method: 'POST', body });
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.ok(r.data.error);
  }
});

test('flight search returns priced offers and round-trip quotes', async () => {
  const s = await call(`/api/flights/search?from=RUH&to=IST&date=${future(20)}&returnDate=${future(27)}&cabin=business`);
  assert.equal(s.status, 200);
  assert.ok(s.data.outbound.length && s.data.inbound.length);
  const q = await call('/api/quote', { method: 'POST', body: { type: 'flight', id: s.data.outbound[0].id, returnId: s.data.inbound[0].id, cabin: 'business', adults: 1 } });
  assert.equal(q.data.total, s.data.outbound[0].fare + s.data.inbound[0].fare);
});

test('booking requires contact details, traveler names and accepted terms', async () => {
  const r = await call('/api/bookings', { method: 'POST', body: { ...PKG, contact: CONTACT, travelers: TRAVELERS } });
  assert.equal(r.status, 400);
  const r2 = await call('/api/bookings', { method: 'POST', body: { ...PKG, contact: { ...CONTACT, phone: '123' }, travelers: TRAVELERS, acceptTerms: true } });
  assert.equal(r2.status, 400);
});

test('sandbox Tabby payment confirms booking, issues invoice, uses promo and seats', async () => {
  const seatsBefore = db.prepare("SELECT seats FROM packages WHERE slug = 'istanbul-bursa-6-days'").get().seats;
  const b = await book({ promo: 'NOOR250' });
  const view = await call(`/api/bookings/${b.ref}`);
  assert.equal(view.status, 404, 'booking is private without its token');

  const start = await call(`/api/bookings/${b.ref}/pay`, { method: 'POST', body: { t: b.token, method: 'tabby' } });
  assert.equal(start.data.action, 'redirect');
  const ref = new URL(start.data.url, base).searchParams.get('ref');
  const sim = await call(`/api/pay/sandbox/${ref}`, { method: 'POST', body: { outcome: 'approve' } });
  const ret = await call(sim.data.redirect, { redirect: 'manual' });
  assert.equal(ret.status, 303);
  assert.match(ret.headers.get('location'), /payment=success/);

  const after = await call(`/api/bookings/${b.ref}?t=${b.token}`);
  assert.equal(after.data.status, 'confirmed');
  assert.equal(after.data.paymentStatus, 'paid');
  assert.equal(after.data.paid, after.data.total);
  assert.match(after.data.invoiceNo, /^INV-\d{4}-\d{6}$/);
  assert.equal(db.prepare("SELECT used FROM promo_codes WHERE code = 'NOOR250'").get().used, 1);
  assert.equal(db.prepare("SELECT seats FROM packages WHERE slug = 'istanbul-bursa-6-days'").get().seats, seatsBefore - 3);

  // Replaying the return URL is idempotent.
  await call(sim.data.redirect, { redirect: 'manual' });
  assert.equal(db.prepare("SELECT paid_amount FROM bookings WHERE ref = ?").get(b.ref).paid_amount, after.data.total);

  const inv = await call(`/api/bookings/${b.ref}/invoice?t=${b.token}`);
  const tlv = zatca.decode(inv.data.qr);
  assert.equal(tlv[2], config.company.vatNumber);
  assert.equal(tlv[4], (after.data.total / 100).toFixed(2));
  assert.equal(tlv[5], (after.data.vat / 100).toFixed(2));
});

test('declined sandbox card leaves booking unpaid and payable again', async () => {
  const b = await book();
  const start = await call(`/api/bookings/${b.ref}/pay`, { method: 'POST', body: { t: b.token, method: 'card' } });
  const ref = new URL(start.data.url, base).searchParams.get('ref');
  const sim = await call(`/api/pay/sandbox/${ref}`, { method: 'POST', body: { outcome: 'approve', last4: '0002' } });
  const ret = await call(sim.data.redirect, { redirect: 'manual' });
  assert.match(ret.headers.get('location'), /payment=failed/);
  const v = await call(`/api/bookings/${b.ref}?t=${b.token}`);
  assert.equal(v.data.paymentStatus, 'failed');
  assert.equal(v.data.status, 'pending_payment');
  assert.ok(v.data.paymentMethods.length > 0);
});

test('live Tabby: checkout, verify, capture — and rejects amount tampering', async () => {
  Object.assign(config.tabby, { secretKey: 'sk_test', merchantCode: 'noor' });
  const b = await book();
  const total = db.prepare('SELECT total FROM bookings WHERE ref = ?').get(b.ref).total;
  const calls = [];
  let remoteAmount = (total / 100).toFixed(2);
  providerMock = (url, init) => {
    calls.push(`${init.method || 'GET'} ${url.replace(config.tabby.apiUrl, '')}`);
    if (url.endsWith('/checkout')) {
      const body = JSON.parse(init.body);
      assert.equal(body.payment.amount, (total / 100).toFixed(2));
      assert.equal(body.payment.order.reference_id, b.ref);
      assert.equal(init.headers.Authorization, 'Bearer sk_test');
      return { body: { status: 'created', payment: { id: 'tby_1' }, configuration: { available_products: { installments: [{ web_url: 'https://checkout.tabby.ai/x' }] } } } };
    }
    if (url.endsWith('/payments/tby_1')) return { body: { id: 'tby_1', status: 'AUTHORIZED', amount: remoteAmount, currency: 'SAR', order: { reference_id: b.ref } } };
    if (url.endsWith('/captures')) return { body: { status: 'CLOSED' } };
    return { status: 404 };
  };
  const start = await call(`/api/bookings/${b.ref}/pay`, { method: 'POST', body: { t: b.token, method: 'tabby' } });
  assert.equal(start.data.url, 'https://checkout.tabby.ai/x');

  // Tampered amount → no capture, marked failed.
  remoteAmount = '1.00';
  await call(`/api/pay/return/tabby?payment_id=tby_1&booking=${b.ref}`, { redirect: 'manual' });
  assert.ok(!calls.some((c) => c.includes('/captures')));
  assert.equal(db.prepare('SELECT payment_status FROM bookings WHERE ref = ?').get(b.ref).payment_status, 'failed');

  // Genuine retry succeeds.
  db.prepare("UPDATE payments SET status = 'initiated' WHERE provider_ref = 'tby_1'").run();
  remoteAmount = (total / 100).toFixed(2);
  const ret = await call(`/api/pay/return/tabby?payment_id=tby_1&booking=${b.ref}`, { redirect: 'manual' });
  assert.match(ret.headers.get('location'), /payment=success/);
  assert.ok(calls.includes('POST /payments/tby_1/captures'));
});

test('live Tamara: approved order is authorised then captured', async () => {
  config.tamara.apiToken = 'tamara_test';
  const b = await book();
  const total = db.prepare('SELECT total FROM bookings WHERE ref = ?').get(b.ref).total;
  const seen = [];
  providerMock = (url, init) => {
    const path = url.replace(config.tamara.apiUrl, '');
    seen.push(`${init.method || 'GET'} ${path}`);
    if (path === '/checkout') {
      const body = JSON.parse(init.body);
      assert.equal(body.instalments, 3);
      assert.equal(body.total_amount.amount, total / 100);
      return { body: { order_id: 'tmr_1', checkout_id: 'c1', checkout_url: 'https://checkout.tamara.co/x' } };
    }
    if (path === '/orders/tmr_1') return { body: { order_id: 'tmr_1', status: 'approved', order_reference_id: b.ref, total_amount: { amount: total / 100, currency: 'SAR' } } };
    if (path === '/orders/tmr_1/authorise') return { body: { status: 'authorised' } };
    if (path === '/payments/capture') return { body: { capture_id: 'cap1' } };
    return { status: 404 };
  };
  const start = await call(`/api/bookings/${b.ref}/pay`, { method: 'POST', body: { t: b.token, method: 'tamara', instalments: 3 } });
  assert.equal(start.data.url, 'https://checkout.tamara.co/x');
  const ret = await call(`/api/pay/return/tamara?orderId=tmr_1&paymentStatus=approved&booking=${b.ref}`, { redirect: 'manual' });
  assert.match(ret.headers.get('location'), /payment=success/);
  assert.deepEqual(seen.slice(1), ['GET /orders/tmr_1', 'POST /orders/tmr_1/authorise', 'POST /payments/capture']);
});

test('live Moyasar card payment is adopted from the callback and verified', async () => {
  Object.assign(config.moyasar, { publishableKey: 'pk_test', secretKey: 'sk_test' });
  const b = await book();
  const total = db.prepare('SELECT total FROM bookings WHERE ref = ?').get(b.ref).total;
  const start = await call(`/api/bookings/${b.ref}/pay`, { method: 'POST', body: { t: b.token, method: 'card' } });
  assert.equal(start.data.action, 'moyasar');
  assert.equal(start.data.config.amount, total);
  assert.equal(start.data.config.publishable_api_key, 'pk_test');
  providerMock = (url) => (url.endsWith('/payments/mys_1')
    ? { body: { id: 'mys_1', status: 'paid', amount: total, currency: 'SAR', metadata: { booking_ref: b.ref } } }
    : { status: 404 });
  const ret = await call('/api/pay/return/card?id=mys_1&status=paid', { redirect: 'manual' });
  assert.match(ret.headers.get('location'), /payment=success/);
});

test('staff back-office: auth, walk-in booking, office payment, refund', async () => {
  const guest = await call('/api/admin/stats');
  assert.equal(guest.status, 401);

  const cust = client();
  await cust('/api/account/register', { method: 'POST', body: { name: 'Test Customer', email: 'c@example.com', password: 'password123' } });
  assert.equal((await cust('/api/admin/stats')).status, 403);

  const admin = client();
  const login = await admin('/api/account/login', { method: 'POST', body: { email: 'admin@test.sa', password: 'Admin@12345' } });
  assert.equal(login.status, 200);
  const created = await admin('/api/admin/bookings', { method: 'POST', body: { type: 'visa', id: 1, adults: 2, contact: CONTACT, travelers: TRAVELERS.slice(0, 2) } });
  assert.equal(created.status, 201);
  assert.match(created.data.paymentLink, /booking\.html\?ref=/);

  const detail = await admin(`/api/admin/bookings/${created.data.ref}`);
  const due = detail.data.outstanding;
  const paid = await admin(`/api/admin/bookings/${created.data.ref}/payments`, { method: 'POST', body: { method: 'pos', amount: due / 100, reference: 'R1' } });
  assert.equal(paid.data.paymentStatus, 'paid');

  const pay = db.prepare("SELECT id FROM payments WHERE provider = 'pos' ORDER BY id DESC").get();
  const over = await admin(`/api/admin/payments/${pay.id}/refund`, { method: 'POST', body: { amount: due / 100 + 1 } });
  assert.equal(over.status, 400);
  const part = await admin(`/api/admin/payments/${pay.id}/refund`, { method: 'POST', body: { amount: 100 } });
  assert.equal(part.data.paymentStatus, 'partially_refunded');
  const rest = await admin(`/api/admin/payments/${pay.id}/refund`, { method: 'POST', body: { amount: due / 100 - 100 } });
  assert.equal(rest.data.status, 'refunded');

  const stats = await admin('/api/admin/stats?days=30');
  assert.ok(stats.data.kpi.bookings >= 1);
  const csv = await admin('/api/admin/reports/bookings.csv');
  assert.match(csv.data, /ref,invoice_no/);
});

test('guest lookup needs matching reference and email; JSON-only writes', async () => {
  const b = await book();
  assert.equal((await call('/api/bookings/lookup', { method: 'POST', body: { ref: b.ref, email: 'x@y.com' } })).status, 404);
  const ok = await call('/api/bookings/lookup', { method: 'POST', body: { ref: b.ref.toLowerCase(), email: 'MO@example.com' } });
  assert.equal(ok.data.token, b.token);
  const form = await realFetch(`${base}/api/bookings/lookup`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'ref=x' });
  assert.equal(form.status, 415);
});

test('Tamara webhook token is verified when a notification key is set', async () => {
  const crypto = require('node:crypto');
  const tamara = require('../src/payments/tamara');
  config.tamara.notificationKey = 'secret';
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const h = enc({ alg: 'HS256', typ: 'JWT' });
  const p = enc({ exp: Math.floor(Date.now() / 1000) + 60 });
  const sig = crypto.createHmac('sha256', 'secret').update(`${h}.${p}`).digest('base64url');
  assert.equal(tamara.verifyNotificationToken(`${h}.${p}.${sig}`), true);
  assert.equal(tamara.verifyNotificationToken(`${h}.${p}.bad`), false);
  config.tamara.notificationKey = '';
});
