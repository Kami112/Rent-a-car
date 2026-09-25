'use strict';
const path = require('node:path');
const express = require('express');
const config = require('./src/config');
const dbm = require('./src/db');
const { seed } = require('./src/seed');
const auth = require('./src/auth');
const { AppError } = require('./src/errors');

function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=(self "https://api.moyasar.com")');
    if (config.isProd) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  app.use(express.json({ limit: '200kb' }));
  app.use(auth.loadUser(db));

  // JSON API writes must be sent as JSON: blocks classic cross-site form posts
  // (CSRF) since browsers cannot send application/json cross-origin without CORS.
  app.use('/api', (req, res, next) => {
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (write && !req.path.startsWith('/pay/webhook/') && !req.is('application/json')) {
      return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', require('./src/routes/public')(db));
  app.use('/api/account', require('./src/routes/account')(db));
  app.use('/api/bookings', require('./src/routes/bookings')(db));
  app.use('/api/pay', require('./src/routes/bookings').paymentRoutes(db));
  app.use('/api/admin', require('./src/routes/admin')(db));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: config.isProd ? '1h' : 0 }));
  app.use((_req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    if (err instanceof AppError) return res.status(err.status).json({ error: err.message, error_ar: err.ar });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    if (err.provider === 'duffel') {
      console.error('[duffel]', err.message);
      return res.status(502).json({
        error: 'The airline system did not respond. Please try again in a moment.',
        error_ar: 'لم يستجب نظام شركة الطيران. يرجى المحاولة بعد قليل.',
      });
    }
    if (err.provider) {
      console.error(`[${err.provider}]`, err.message);
      return res.status(502).json({
        error: 'The payment provider could not process the request. Please try again or choose another method.',
        error_ar: 'تعذّر على مزود الدفع معالجة الطلب. يرجى المحاولة مرة أخرى أو اختيار طريقة أخرى.',
      });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.', error_ar: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' });
  });

  return app;
}

if (require.main === module) {
  const db = dbm.open();
  seed(db);
  createApp(db).listen(config.port, () => {
    console.log(`Ezhar Travel running on ${config.baseUrl} (payments: ${config.paymentsMode})`);
  });
}

module.exports = { createApp };
