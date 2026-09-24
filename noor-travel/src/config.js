'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Minimal .env loader (avoids a dependency). Real env vars always win.
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const env = process.env;
const isProd = env.NODE_ENV === 'production';

const config = {
  isProd,
  port: Number(env.PORT) || 3000,
  baseUrl: (env.BASE_URL || `http://localhost:${Number(env.PORT) || 3000}`).replace(/\/$/, ''),
  dbPath: env.DB_PATH || path.join(__dirname, '..', 'data', 'noor.db'),

  admin: {
    email: env.ADMIN_EMAIL || 'admin@noortravel.sa',
    password: env.ADMIN_PASSWORD || (isProd ? '' : 'Admin@12345'),
  },

  company: {
    nameEn: 'Noor Travel Agency',
    nameAr: 'وكالة نور للسفر والسياحة',
    vatNumber: env.COMPANY_VAT_NUMBER || '300000000000003',
    crNumber: env.COMPANY_CR_NUMBER || '1010000000',
    tourismLicense: env.COMPANY_TOURISM_LICENSE || '73100000',
    address: env.COMPANY_ADDRESS || 'King Fahd Road, Al Olaya District, Riyadh 12211, Saudi Arabia',
    phone: env.COMPANY_PHONE || '+966 11 000 0000',
    whatsapp: env.COMPANY_WHATSAPP || '966500000000',
    email: env.COMPANY_EMAIL || 'info@noortravel.sa',
  },

  vatRate: 15, // KSA standard VAT rate (%)

  // 'sandbox' lets every method run through the built-in simulator when a
  // provider has no keys. 'live' disables any provider that lacks keys.
  paymentsMode: env.PAYMENTS_MODE || (isProd ? 'live' : 'sandbox'),

  moyasar: {
    publishableKey: env.MOYASAR_PUBLISHABLE_KEY || '',
    secretKey: env.MOYASAR_SECRET_KEY || '',
    apiUrl: env.MOYASAR_API_URL || 'https://api.moyasar.com/v1',
    formVersion: env.MOYASAR_FORM_VERSION || '1.14.0',
  },
  tabby: {
    publicKey: env.TABBY_PUBLIC_KEY || '',
    secretKey: env.TABBY_SECRET_KEY || '',
    merchantCode: env.TABBY_MERCHANT_CODE || '',
    apiUrl: env.TABBY_API_URL || 'https://api.tabby.ai/api/v2',
  },
  duffel: {
    accessToken: env.DUFFEL_ACCESS_TOKEN || '',
  },
  // SAR per 1 unit of foreign currency, for converting airline fares. Override with FX_RATES='{"USD":3.75,...}'.
  fxRates: {
    SAR: 1, USD: 3.75, EUR: 4.1, GBP: 4.95, AED: 1.021, QAR: 1.03, BHD: 9.95, KWD: 12.2, OMR: 9.74,
    EGP: 0.078, TRY: 0.11, JOD: 5.29, INR: 0.045, PKR: 0.0135, MYR: 0.85, CHF: 4.3,
    ...JSON.parse(env.FX_RATES || '{}'),
  },
  tamara: {
    apiToken: env.TAMARA_API_TOKEN || '',
    notificationKey: env.TAMARA_NOTIFICATION_KEY || '',
    apiUrl: env.TAMARA_API_URL || (isProd ? 'https://api.tamara.co' : 'https://api-sandbox.tamara.co'),
  },
};

if (isProd && !config.admin.password) {
  console.warn('[config] ADMIN_PASSWORD is not set — the default admin account will not be created.');
}

module.exports = config;
