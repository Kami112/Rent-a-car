'use strict';
// Moyasar — Saudi payment gateway for mada, Visa, Mastercard, Apple Pay and
// STC Pay. Card data is captured by Moyasar's hosted form (moyasar.js) in the
// browser, so it never touches our servers (keeps us out of PCI-DSS scope).
// Docs: https://docs.moyasar.com

const config = require('../config');
const { request } = require('./http');

const cfg = () => config.moyasar;
const isConfigured = () => Boolean(cfg().publishableKey && cfg().secretKey);
const auth = () => ({ Authorization: `Basic ${Buffer.from(`${cfg().secretKey}:`).toString('base64')}` });

/** Settings the browser needs to render the Moyasar payment form. */
function formConfig(booking, amount, lang) {
  return {
    publishable_api_key: cfg().publishableKey,
    amount, // halalas
    currency: 'SAR',
    description: `Ezhar Travel booking ${booking.ref}`,
    callback_url: `${config.baseUrl}/api/pay/return/card`,
    methods: ['creditcard', 'applepay', 'stcpay'],
    supported_networks: ['mada', 'visa', 'mastercard'],
    language: lang === 'ar' ? 'ar' : 'en',
    metadata: { booking_ref: booking.ref },
    apple_pay: { country: 'SA', label: config.company.nameEn, validate_merchant_url: 'https://api.moyasar.com/v1/applepay/initiate' },
  };
}

/** Fetch the authoritative payment record. */
async function fetchPayment(id) {
  const p = await request('moyasar', `${cfg().apiUrl}/payments/${encodeURIComponent(id)}`, { headers: auth() });
  return {
    id: p.id,
    status: p.status === 'paid' || p.status === 'captured' ? 'paid' : p.status === 'authorized' ? 'authorized' : p.status === 'initiated' ? 'initiated' : 'failed',
    amount: p.amount,
    currency: p.currency,
    reference: p.metadata?.booking_ref,
    message: p.source?.message || null,
    raw: p,
  };
}

async function capture(id, amount) {
  return request('moyasar', `${cfg().apiUrl}/payments/${encodeURIComponent(id)}/capture`, { method: 'POST', headers: auth(), body: { amount } });
}

async function refund(id, amount) {
  return request('moyasar', `${cfg().apiUrl}/payments/${encodeURIComponent(id)}/refund`, { method: 'POST', headers: auth(), body: { amount } });
}

module.exports = { isConfigured, formConfig, fetchPayment, capture, refund };
