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

const base_ = () => base;
const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

before(async () => {
  db = dbm.open(':memory:');
  seed(db);
  server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (providerMock && /tabby\.ai|tamara\.co|moyasar\.com|duffel\.com/.test(u)) {
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

test('flight search returns priced offers, fare calendar and zero-rated international VAT', async () => {
  const s = await call(`/api/flights/search?from=RUH&to=IST&date=${future(20)}&returnDate=${future(27)}&cabin=business&adults=1`);
  assert.equal(s.status, 200, JSON.stringify(s.data));
  assert.equal(s.data.provider, 'demo');
  assert.ok(s.data.offers.length > 0);
  assert.ok(s.data.calendar.length >= 4);
  const offer = s.data.offers[0];
  assert.equal(offer.slices.length, 2);
  const q = await call('/api/quote', { method: 'POST', body: { type: 'flight', id: offer.id, adults: 1 } });
  assert.equal(q.status, 200, JSON.stringify(q.data));
  assert.equal(q.data.total, offer.total + 2500, 'fare + SAR 25 service fee');
  assert.equal(q.data.vat, vatFromInclusive(2500), 'international fare is zero-rated; only the fee carries VAT');
  const mismatch = await call('/api/quote', { method: 'POST', body: { type: 'flight', id: offer.id, adults: 2 } });
  assert.equal(mismatch.status, 400);
  const ac = await call('/api/airports?q=ista');
  assert.equal(ac.data[0].code, 'IST');
});

test('flight booking: passport validation, sandbox payment, manual ticketing by staff', async () => {
  const s = await call(`/api/flights/search?from=RUH&to=CAI&date=${future(15)}&adults=1`);
  const offer = s.data.offers[0];
  const base = { type: 'flight', id: offer.id, adults: 1, contact: CONTACT, acceptTerms: true };
  const pax = { type: 'adult', title: 'mr', firstName: 'Mohammed', lastName: 'Alqahtani', dob: '1990-05-01', nationality: 'SA', passport: 'A1234567', passportExpiry: future(400) };
  const noPassport = await call('/api/bookings', { method: 'POST', body: { ...base, travelers: [{ ...pax, passport: '' }] } });
  assert.equal(noPassport.status, 400);
  const arabicName = await call('/api/bookings', { method: 'POST', body: { ...base, travelers: [{ ...pax, firstName: 'محمد' }] } });
  assert.equal(arabicName.status, 400);
  const b = (await call('/api/bookings', { method: 'POST', body: { ...base, travelers: [pax] } })).data;
  assert.ok(b.ref);
  const start = await call(`/api/bookings/${b.ref}/pay`, { method: 'POST', body: { t: b.token, method: 'card' } });
  const ref = new URL(start.data.url, base_()).searchParams.get('ref');
  const sim = await call(`/api/pay/sandbox/${ref}`, { method: 'POST', body: { outcome: 'approve', last4: '1111' } });
  await call(sim.data.redirect, { redirect: 'manual' });
  await new Promise((r) => setTimeout(r, 50));
  let v = await call(`/api/bookings/${b.ref}?t=${b.token}`);
  assert.equal(v.data.paymentStatus, 'paid');
  assert.equal(v.data.ticketStatus, 'manual', 'demo fares are ticketed by staff');

  const admin = client();
  await admin('/api/account/login', { method: 'POST', body: { email: 'admin@test.sa', password: 'Admin@12345' } });
  const bad = await admin(`/api/admin/bookings/${b.ref}/ticket/manual`, { method: 'POST', body: { pnr: '!!', tickets: '' } });
  assert.equal(bad.status, 400);
  const ok = await admin(`/api/admin/bookings/${b.ref}/ticket/manual`, { method: 'POST', body: { pnr: 'abc123', tickets: '0651234567890' } });
  assert.equal(ok.data.ticketStatus, 'issued');
  v = await call(`/api/bookings/${b.ref}?t=${b.token}`);
  assert.equal(v.data.pnr, 'ABC123');
  assert.deepEqual(v.data.tickets, ['0651234567890']);
});

test('live Duffel: search, seat hold at booking, ticket issued after payment', async () => {
  config.duffel.accessToken = 'duffel_test_x';
  const dep = future(30);
  const duffelOffer = {
    id: 'off_1', total_amount: '400.00', total_currency: 'USD', tax_amount: '60.00', tax_currency: 'USD',
    expires_at: new Date(Date.now() + 3600e3).toISOString(),
    owner: { iata_code: 'SV', name: 'Saudia', logo_symbol_url: null },
    passengers: [{ id: 'pas_1', type: 'adult' }],
    conditions: { refund_before_departure: { allowed: true }, change_before_departure: { allowed: true } },
    payment_requirements: { requires_instant_payment: false },
    slices: [{ duration: 'PT4H45M', segments: [{
      marketing_carrier: { iata_code: 'SV', name: 'Saudia' }, operating_carrier: { iata_code: 'SV', name: 'Saudia' }, marketing_carrier_flight_number: '263',
      origin: { iata_code: 'RUH', city_name: 'Riyadh', iata_country_code: 'SA' }, destination: { iata_code: 'IST', city_name: 'Istanbul', iata_country_code: 'TR' },
      departing_at: `${dep}T02:40:00`, arriving_at: `${dep}T07:25:00`, duration: 'PT4H45M', aircraft: { name: 'Boeing 787' },
      passengers: [{ cabin_class: 'economy', baggages: [{ type: 'checked', quantity: 2 }, { type: 'carry_on', quantity: 1 }] }],
    }] }],
  };
  const calls = [];
  providerMock = (url, init) => {
    const path = url.replace('https://api.duffel.com', '');
    calls.push(`${init.method || 'GET'} ${path.split('?')[0]}`);
    assert.equal(init.headers['Duffel-Version'], 'v2');
    if (path.startsWith('/air/offer_requests')) return { body: { data: { offers: [duffelOffer] } } };
    if (path === '/air/offers/off_1') return { body: { data: duffelOffer } };
    if (path === '/air/orders' && JSON.parse(init.body).data.type === 'hold') return { body: { data: { id: 'ord_1', booking_reference: 'HOLD12', documents: [], payment_status: { awaiting_payment: true } } } };
    if (path === '/air/orders/ord_1') return { body: { data: { id: 'ord_1', booking_reference: 'HOLD12', total_amount: '400.00', total_currency: 'USD', documents: calls.includes('POST /air/payments') ? [{ type: 'electronic_ticket', unique_identifier: '0651111111111' }] : [] } } };
    if (path === '/air/payments') return { body: { data: { id: 'pay_1' } } };
    return { status: 404 };
  };
  try {
    const s = await call(`/api/flights/search?from=RUH&to=IST&date=${dep}&adults=1`);
    assert.equal(s.data.provider, 'duffel', JSON.stringify(s.data));
    const o = s.data.offers[0];
    assert.equal(o.total, 150000, 'USD 400 × 3.75 = SAR 1,500');
    assert.equal(o.baggage.checked, 2);
    const pax = { type: 'adult', title: 'ms', firstName: 'Sara', lastName: 'Alharbi', dob: '1992-02-02', nationality: 'SA', passport: 'B7654321', passportExpiry: future(500) };
    const b = (await call('/api/bookings', { method: 'POST', body: { type: 'flight', id: 'off_1', adults: 1, contact: CONTACT, travelers: [pax], acceptTerms: true } })).data;
    const row = db.prepare('SELECT ticket_status, pnr FROM bookings WHERE ref = ?').get(b.ref);
    assert.deepEqual({ ...row }, { ticket_status: 'held', pnr: 'HOLD12' });
    const start = await call(`/api/bookings/${b.ref}/pay`, { method: 'POST', body: { t: b.token, method: 'tabby' } });
    const ref = new URL(start.data.url, base_()).searchParams.get('ref');
    const sim = await call(`/api/pay/sandbox/${ref}`, { method: 'POST', body: { outcome: 'approve' } });
    await call(sim.data.redirect, { redirect: 'manual' });
    for (let i = 0; i < 20 && db.prepare('SELECT ticket_status FROM bookings WHERE ref = ?').get(b.ref).ticket_status !== 'issued'; i++) await new Promise((r) => setTimeout(r, 25));
    const done = await call(`/api/bookings/${b.ref}?t=${b.token}`);
    assert.equal(done.data.ticketStatus, 'issued');
    assert.deepEqual(done.data.tickets, ['0651111111111']);
    assert.ok(calls.includes('POST /air/payments'));
  } finally {
    config.duffel.accessToken = '';
  }
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
