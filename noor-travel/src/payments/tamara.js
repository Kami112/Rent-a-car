'use strict';
// Tamara — "Split in 3/4, no interest" BNPL. Docs: https://docs.tamara.co
// Flow: create checkout → redirect → order approved → authorise → capture.

const crypto = require('node:crypto');
const config = require('../config');
const { request, halalas } = require('./http');
const { AppError } = require('../errors');

const cfg = () => config.tamara;
const isConfigured = () => Boolean(cfg().apiToken);
const auth = () => ({ Authorization: `Bearer ${cfg().apiToken}` });
const money = (h) => ({ amount: Number((h / 100).toFixed(2)), currency: 'SAR' });

function splitName(full) {
  const parts = String(full).trim().split(/\s+/);
  return { first: parts[0] || 'Customer', last: parts.slice(1).join(' ') || parts[0] || 'Customer' };
}

async function createCheckout(booking, amount, { lang, instalments = 4 }) {
  const name = splitName(booking.contact_name);
  const returnUrl = `${config.baseUrl}/api/pay/return/tamara?booking=${encodeURIComponent(booking.ref)}`;
  const address = {
    first_name: name.first, last_name: name.last, line1: 'Digital travel service', city: 'Riyadh',
    country_code: 'SA', phone_number: booking.contact_phone,
  };
  const body = {
    order_reference_id: booking.ref,
    order_number: booking.ref,
    total_amount: money(amount),
    tax_amount: money(booking.vat),
    shipping_amount: money(0),
    discount: booking.discount ? { name: booking.promo_code || 'Discount', amount: money(booking.discount) } : undefined,
    description: booking.title.slice(0, 256),
    country_code: 'SA',
    payment_type: 'PAY_BY_INSTALMENTS',
    instalments,
    locale: lang === 'ar' ? 'ar_SA' : 'en_US',
    items: [{
      name: booking.title.slice(0, 255),
      type: 'Digital',
      reference_id: `${booking.type}-${booking.item_id}`,
      sku: `${booking.type}-${booking.item_id}`.slice(0, 128),
      quantity: 1,
      unit_price: money(amount),
      total_amount: money(amount),
    }],
    consumer: { first_name: name.first, last_name: name.last, phone_number: booking.contact_phone, email: booking.contact_email },
    billing_address: address,
    shipping_address: address,
    merchant_url: {
      success: `${returnUrl}&result=success`,
      failure: `${returnUrl}&result=failure`,
      cancel: `${returnUrl}&result=cancel`,
      notification: `${config.baseUrl}/api/pay/webhook/tamara`,
    },
    platform: 'Noor Travel Web',
    is_mobile: false,
  };
  const res = await request('tamara', `${cfg().apiUrl}/checkout`, { method: 'POST', headers: auth(), body });
  if (!res.checkout_url || !res.order_id) {
    throw new AppError('Sorry, Tamara is unable to approve this purchase. Please use an alternative payment method.', {
      ar: 'نأسف، تمارا غير قادرة على الموافقة على عملية الشراء هذه. يرجى استخدام طريقة دفع أخرى.',
    });
  }
  return { providerRef: res.order_id, redirectUrl: res.checkout_url, raw: res };
}

async function fetchPayment(orderId) {
  const o = await request('tamara', `${cfg().apiUrl}/orders/${encodeURIComponent(orderId)}`, { headers: auth() });
  const s = String(o.status || '').toLowerCase();
  const map = {
    fully_captured: 'paid', partially_captured: 'authorized', authorised: 'authorized', approved: 'approved',
    new: 'initiated', declined: 'failed', expired: 'failed', canceled: 'cancelled', fully_refunded: 'refunded',
  };
  return {
    id: o.order_id || orderId,
    status: map[s] || 'failed',
    amount: halalas(o.total_amount?.amount),
    currency: o.total_amount?.currency,
    reference: o.order_reference_id,
    raw: o,
  };
}

async function authorise(orderId) {
  return request('tamara', `${cfg().apiUrl}/orders/${encodeURIComponent(orderId)}/authorise`, { method: 'POST', headers: auth() });
}

async function capture(orderId, amount) {
  return request('tamara', `${cfg().apiUrl}/payments/capture`, {
    method: 'POST',
    headers: auth(),
    body: {
      order_id: orderId,
      total_amount: money(amount),
      shipping_info: { shipped_at: new Date().toISOString(), shipping_company: 'Digital delivery' },
    },
  });
}

async function refund(orderId, amount) {
  return request('tamara', `${cfg().apiUrl}/payments/simplified-refund/${encodeURIComponent(orderId)}`, {
    method: 'POST', headers: auth(), body: { total_amount: money(amount), comment: 'Refund issued by Noor Travel' },
  });
}

/** Verify the HS256 `tamaraToken` JWT attached to webhook notifications. */
function verifyNotificationToken(token) {
  const key = cfg().notificationKey;
  if (!key) return true; // not configured — rely on re-fetching the order
  const [h, p, sig] = String(token || '').split('.');
  if (!h || !p || !sig) return false;
  const expected = crypto.createHmac('sha256', key).update(`${h}.${p}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

module.exports = { isConfigured, createCheckout, fetchPayment, authorise, capture, refund, verifyNotificationToken };
