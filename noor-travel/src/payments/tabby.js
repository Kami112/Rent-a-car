'use strict';
// Tabby — "Split in 4, interest-free" BNPL. Docs: https://docs.tabby.ai
// Flow: create checkout session → redirect customer to web_url → on return,
// fetch payment (AUTHORIZED) → capture full amount → CLOSED.

const config = require('../config');
const { request, halalas } = require('./http');
const { toSar } = require('../money');
const { AppError } = require('../errors');

const cfg = () => config.tabby;
const isConfigured = () => Boolean(cfg().secretKey && cfg().merchantCode);
const auth = () => ({ Authorization: `Bearer ${cfg().secretKey}` });

function buyerHistory(customer) {
  return {
    registered_since: customer?.created_at ? new Date(`${customer.created_at}Z`).toISOString() : new Date().toISOString(),
    loyalty_level: customer?.completedOrders || 0,
  };
}

async function createCheckout(booking, amount, { lang, customer }) {
  const returnUrl = `${config.baseUrl}/api/pay/return/tabby?booking=${encodeURIComponent(booking.ref)}`;
  const body = {
    payment: {
      amount: toSar(amount),
      currency: 'SAR',
      description: booking.title,
      buyer: { name: booking.contact_name, email: booking.contact_email, phone: booking.contact_phone },
      buyer_history: buyerHistory(customer),
      shipping_address: { city: 'Riyadh', address: 'Digital travel service — no shipping', zip: '12211' },
      order: {
        reference_id: booking.ref,
        tax_amount: toSar(booking.vat),
        shipping_amount: '0.00',
        discount_amount: toSar(booking.discount),
        items: [{
          title: booking.title,
          quantity: 1,
          unit_price: toSar(amount),
          reference_id: `${booking.type}-${booking.item_id}`,
          category: 'Travel',
        }],
      },
      order_history: [],
    },
    lang: lang === 'ar' ? 'ar' : 'en',
    merchant_code: cfg().merchantCode,
    merchant_urls: {
      success: `${returnUrl}&result=success`,
      cancel: `${returnUrl}&result=cancel`,
      failure: `${returnUrl}&result=failure`,
    },
  };
  const session = await request('tabby', `${cfg().apiUrl}/checkout`, { method: 'POST', headers: auth(), body });
  const url = session?.configuration?.available_products?.installments?.[0]?.web_url;
  if (session.status === 'rejected' || !url) {
    throw new AppError('Sorry, Tabby is unable to approve this purchase. Please use an alternative payment method.', {
      ar: 'نأسف، تابي غير قادرة على الموافقة على عملية الشراء هذه. يرجى استخدام طريقة دفع أخرى.',
    });
  }
  return { providerRef: session.payment.id, redirectUrl: url, raw: session };
}

async function fetchPayment(id) {
  const p = await request('tabby', `${cfg().apiUrl}/payments/${encodeURIComponent(id)}`, { headers: auth() });
  const s = String(p.status || '').toUpperCase();
  return {
    id: p.id,
    status: s === 'CLOSED' ? 'paid' : s === 'AUTHORIZED' ? 'authorized' : s === 'CREATED' ? 'initiated' : 'failed',
    amount: halalas(p.amount),
    currency: p.currency,
    reference: p.order?.reference_id,
    raw: p,
  };
}

async function capture(id, amount) {
  return request('tabby', `${cfg().apiUrl}/payments/${encodeURIComponent(id)}/captures`, {
    method: 'POST', headers: auth(), body: { amount: toSar(amount) },
  });
}

async function refund(id, amount) {
  return request('tabby', `${cfg().apiUrl}/payments/${encodeURIComponent(id)}/refunds`, {
    method: 'POST', headers: auth(), body: { amount: toSar(amount) },
  });
}

module.exports = { isConfigured, createCheckout, fetchPayment, capture, refund };
