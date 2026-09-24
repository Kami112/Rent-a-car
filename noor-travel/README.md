# Noor Travel Agency — Website & Back-office

Bilingual (Arabic / English) online booking website and agency management software for
**Noor Travel Agency, Riyadh**. Customers book Umrah programmes, holiday packages, flights,
hotels and visa services and pay online. Staff run the business from the back-office.

## Features

**Customer website** (`/`)
- Arabic (RTL) and English, switchable on every page; mobile-first design
- Umrah & holiday packages with itinerary, inclusions, reviews and live pricing
- Flight search (one-way / return, cabins, adults/children/infants)
- Hotels (Makkah, Madinah, Riyadh, Jeddah, Dubai, Istanbul…) and visa services
- Checkout with traveler details, add-ons (insurance, transfers, eSIM, baggage, express visa), promo codes
- **Payments:** mada / Visa / Mastercard / Apple Pay / STC Pay (Moyasar), **Tabby** (split in 4),
  **Tamara** (split in 3 or 4), bank transfer, and cash/POS at the office
- Booking page with status, retry payment, cancel unpaid booking
- **ZATCA simplified tax invoice** (bilingual, with Phase-1 TLV QR code) issued automatically when paid
- Customer accounts, guest "Manage my booking" lookup, contact form, newsletter, WhatsApp button

**Back-office** (`/admin/`)
- Dashboard: revenue, bookings, conversion, VAT collected, payment mix, upcoming departures
- Bookings: search/filter, detail view, status changes, internal notes, activity log, CSV export
- **Walk-in / phone bookings** that generate a secure payment link for the customer
- Record office payments (cash, POS, bank transfer), confirm transfers, re-verify online payments, refunds
- Catalogue: packages (bilingual editor), hotel/visa/flight pricing, promo codes
- Customers, inquiries, review moderation, messages outbox, staff accounts (admin / agent roles), settings

## Run locally

Requires **Node.js 22.13+** (uses the built-in `node:sqlite` — no database server needed).

```bash
cd noor-travel
npm install
cp .env.example .env     # optional
npm start                # http://localhost:3000
npm test                 # 13 automated tests
```

Back-office: <http://localhost:3000/admin/> — default dev login `admin@noortravel.sa` / `Admin@12345`
(set `ADMIN_EMAIL` / `ADMIN_PASSWORD` for production).

### Sandbox payments

With no provider keys, `PAYMENTS_MODE=sandbox` routes every method through a built-in simulator
(`/pay-sandbox.html`) so you can test the whole flow. Test card `4111 1111 1111 1111` approves;
any card ending `0002` is declined. In production (`PAYMENTS_MODE=live`) a method without keys is hidden.

## Going live — checklist

1. **Moyasar** (cards, mada, Apple Pay, STC Pay): set `MOYASAR_PUBLISHABLE_KEY`, `MOYASAR_SECRET_KEY`;
   register webhook `https://YOUR-DOMAIN/api/pay/webhook/moyasar`; complete Apple Pay domain verification in Moyasar.
2. **Tabby**: set `TABBY_PUBLIC_KEY`, `TABBY_SECRET_KEY`, `TABBY_MERCHANT_CODE`; webhook `…/api/pay/webhook/tabby`.
3. **Tamara**: set `TAMARA_API_TOKEN`, `TAMARA_NOTIFICATION_KEY`, `TAMARA_API_URL=https://api.tamara.co`;
   notification URL is sent automatically per order.
4. Set real company details (`COMPANY_*`), `BASE_URL` (https) and a strong `ADMIN_PASSWORD`.
5. Replace the placeholder bank IBAN in **Back-office → Settings**.
6. Connect email / WhatsApp delivery in `src/notify.js` (every message is already logged in the outbox).
7. Have the terms/cancellation/privacy wording in `public/js/pages/policies.js` reviewed by your legal advisor.
8. For live airline inventory, replace `src/flights.js` with a GDS/NDC connector (Amadeus, Sabre, Travelport);
   for ZATCA Phase 2 (e-invoice integration), connect a certified EGS solution.

Security design: all prices are computed on the server; payments are always re-verified with the
provider API (browser redirects and webhooks are never trusted), amount and booking reference are
checked before capture, card data never touches this server, passwords use scrypt, sessions are
httpOnly cookies, and state-changing API calls require JSON (CSRF protection).

## Deploy

`render.yaml` in this folder is a Render Blueprint (Node web service + 1 GB persistent disk for SQLite).
Any Node host works: run `npm ci && npm start` with the environment variables above and a persistent `DB_PATH`.

## Structure

```
server.js              Express app
src/
  config.js db.js      configuration, SQLite schema & helpers
  pricing.js           server-side quote engine (VAT-inclusive, promos, add-ons)
  bookings.js          booking lifecycle, invoices
  flights.js           flight schedules & fares
  zatca.js             ZATCA QR (TLV) payload
  notify.js            customer notifications (outbox)
  payments/            Moyasar, Tabby, Tamara adapters + orchestration
  routes/              public, bookings/payments, account, admin APIs
public/                website pages, CSS, JS; public/admin = back-office
test/                  node:test suite
```
