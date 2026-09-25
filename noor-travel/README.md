# Ezhar Travel and Tourism — Website & Back-office

Bilingual (Arabic / English) online booking website and agency management software for
**Ezhar Travel and Tourism, Riyadh**. Customers book Umrah programmes, holiday packages, flights,
hotels and visa services and pay online. Staff run the business from the back-office.

## Features

**Customer website** (`/`)
- Arabic (RTL) and English, switchable on every page; mobile-first design
- Umrah & holiday packages with itinerary, inclusions, reviews and live pricing
- Flight search (one-way / return, cabins, adults/children/infants)
- **Flights (Almatar-style):** round-trip / one-way search, airport autocomplete (5,300+ airports worldwide; major ones in Arabic & English — airport data © OpenFlights.org, ODbL),
  travellers & cabin picker, fare calendar, cheapest / recommended / fastest sorting, filters (stops, price,
  departure time, airlines, baggage, refundable), expandable itineraries with layovers, airline-grade passenger
  forms (English names, gender, DOB, passport & expiry, 6-month validity check), PNR & e-ticket display
- Hotels (Makkah, Madinah, Riyadh, Jeddah, Dubai, Istanbul…) and visa services
- Checkout with traveler details, add-ons (insurance, transfers, eSIM, baggage, express visa), promo codes
- **Payments:** mada / Visa / Mastercard / Apple Pay / STC Pay (Moyasar), **Tabby** (split in 4),
  **Tamara** (split in 3 or 4), bank transfer, and cash/POS at the office
- Booking page with status, retry payment, cancel unpaid booking
- **ZATCA simplified tax invoice** (bilingual, with Phase-1 TLV QR code) issued automatically when paid
- Customers sign in / sign up before booking (with password reset by email); bookings are saved to their account
- Emails: booking received, payment confirmed with the tax invoice (inline + attached), e-ticket/PNR, refunds, status changes
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
npm test                 # 18 automated tests
```

Back-office: <http://localhost:3000/admin/> — default dev login `admin@ezhartravels.com` / `Admin@12345`
(set `ADMIN_EMAIL` / `ADMIN_PASSWORD` for production).

### Sandbox payments

With no provider keys, `PAYMENTS_MODE=sandbox` routes every method through a built-in simulator
(`/pay-sandbox.html`) so you can test the whole flow. Test card `4111 1111 1111 1111` approves;
any card ending `0002` is declined. In production (`PAYMENTS_MODE=live`) a method without keys is hidden.

## Flights & airline ticketing

| Mode | When | What happens |
|---|---|---|
| **Duffel (live)** | `DUFFEL_ACCESS_TOKEN` set | Live fares from 300+ airlines. Seats are **held** at booking when the airline allows; after payment the ticket is **issued automatically** and the PNR + e-ticket numbers are sent to the customer. The fare is re-checked before payment. |
| **Demo** | no token | Realistic schedules/fares for any route between the 80+ airports. After payment the booking shows **“Flights to ticket”** in the back-office; staff issue it in their GDS / airline portal and record the PNR + ticket numbers, which are sent to the customer. |

Duffel test tokens (`duffel_test_…`) book the fictional "Duffel Airways" — safe for end-to-end testing.
Tickets are paid from your Duffel balance in the airline's currency; set `FX_RATES` so SAR prices match your costs,
and set the agency service fee per passenger in **Back-office → Settings**. VAT: international air fares are
zero-rated, domestic fares and service fees carry 15%.

## Going live

**Full step-by-step guide: [docs/LAUNCH.md](docs/LAUNCH.md)** (hosting, domain, email, payments, Sabre/IATA ticketing, compliance).

### Checklist

1. **Moyasar** (cards, mada, Apple Pay, STC Pay): set `MOYASAR_PUBLISHABLE_KEY`, `MOYASAR_SECRET_KEY`;
   register webhook `https://YOUR-DOMAIN/api/pay/webhook/moyasar`; complete Apple Pay domain verification in Moyasar.
2. **Tabby**: set `TABBY_PUBLIC_KEY`, `TABBY_SECRET_KEY`, `TABBY_MERCHANT_CODE`; webhook `…/api/pay/webhook/tabby`.
3. **Tamara**: set `TAMARA_API_TOKEN`, `TAMARA_NOTIFICATION_KEY`, `TAMARA_API_URL=https://api.tamara.co`;
   notification URL is sent automatically per order.
4. Set real company details (`COMPANY_*`), `BASE_URL` (https) and a strong `ADMIN_PASSWORD`.
5. Replace the placeholder bank IBAN in **Back-office → Settings**.
6. Email: set `RESEND_API_KEY` (or SMTP) and `MAIL_FROM` — customers then receive confirmations, tax invoices and e-tickets. WhatsApp: connect a provider in `src/notify.js`.
7. Have the terms/cancellation/privacy wording in `public/js/pages/policies.js` reviewed by your legal advisor.
8. **Flights:** open a Duffel account (or connect your IATA/consolidator GDS), fund the balance and set `DUFFEL_ACCESS_TOKEN`.
9. For ZATCA Phase 2 (e-invoice integration), connect a certified EGS solution.

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
