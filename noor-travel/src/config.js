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
  dbPath: env.DB_PATH || path.join(__dirname, '..', 'data', 'noor.db'), // file name kept for existing installs

  admin: {
    email: env.ADMIN_EMAIL || 'admin@ezhartravels.com',
    password: env.ADMIN_PASSWORD || (isProd ? '' : 'Admin@12345'),
  },

  company: {
    nameEn: env.COMPANY_NAME_EN || 'Ezhar Travel and Tourism',
    nameAr: env.COMPANY_NAME_AR || 'إزهار للسفر والسياحة',
    website: env.COMPANY_WEBSITE || 'https://ezhartravels.com',
    // Legal numbers: left empty until provided — the site hides empty values.
    vatNumber: env.COMPANY_VAT_NUMBER || '',
    crNumber: env.COMPANY_CR_NUMBER || '',
    tourismLicense: env.COMPANY_TOURISM_LICENSE || '',
    address: env.COMPANY_ADDRESS || 'Badi Al Zaman Al Hamdhani, Al Zahrah District, As Suwaidi, Riyadh 12986, Saudi Arabia',
    addressAr: env.COMPANY_ADDRESS_AR || 'شارع بديع الزمان الهمذاني، حي الزهرة، السويدي، الرياض 12986، المملكة العربية السعودية',
    phone: env.COMPANY_PHONE || '+966 59 365 8904',
    phone2: env.COMPANY_PHONE_2 || '+966 59 353 5610',
    whatsapp: env.COMPANY_WHATSAPP || '966593658904',
    email: env.COMPANY_EMAIL || 'info@ezhartravels.com',
    logo: env.COMPANY_LOGO || '/img/logo.svg',
    branches: [
      { en: 'Al Aziziyah', ar: 'العزيزية' }, { en: 'Al Mansourah', ar: 'المنصورة' }, { en: 'Al Nadwa', ar: 'الندوة' },
      { en: 'Al Naheel', ar: 'النخيل' }, { en: 'Exit 25', ar: 'مخرج 25' }, { en: 'Al Shumaisi', ar: 'الشميسي' }, { en: 'Exit 29', ar: 'مخرج 29' },
    ],
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
  mail: {
    from: env.MAIL_FROM || 'Ezhar Travel <no-reply@ezhartravels.com>',
    replyTo: env.MAIL_REPLY_TO || env.COMPANY_EMAIL || 'info@ezhartravels.com',
    agencyInbox: env.AGENCY_NOTIFY_EMAIL || '', // staff copy of every paid booking
    resendApiKey: env.RESEND_API_KEY || '',
    smtp: {
      host: env.SMTP_HOST || '',
      port: Number(env.SMTP_PORT) || 587,
      user: env.SMTP_USER || '',
      pass: env.SMTP_PASS || '',
    },
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
