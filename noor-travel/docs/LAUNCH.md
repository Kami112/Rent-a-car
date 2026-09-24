# Noor Travel — Go-Live Guide

This is the step-by-step path from the current demo (https://noor-travel.onrender.com) to a live
business taking real bookings and payments. Items marked **(you)** need the agency's documents or
accounts; everything else is configuration.

---

## 1. Hosting (Render)

| Step | How |
|---|---|
| Upgrade the service | Render dashboard → `noor-travel` → **Settings → Instance type → Starter** (≈ $7/month). Free instances sleep after 15 min, lose data on every deploy and **block outgoing SMTP email**. |
| Keep data | **Disks → Add disk**: mount path `/var/data`, 1 GB. Then **Environment**: `DB_PATH=/var/data/noor.db`. Render snapshots disks daily. |
| Production mode | Environment: `NODE_ENV=production`, `PAYMENTS_MODE=live` (hides any payment method without live keys). |
| Deploy from `main` | Merge branch `claude/bold-knuth-4ksku4` into `main`, then **Settings → Branch → main**. Every push to `main` redeploys automatically. |
| Admin password | Change it after first login (**My account**) or set `ADMIN_PASSWORD` before the first deploy on the new disk. |

**Data residency:** Render runs in Frankfurt (closest region to Riyadh). If you need data hosted
inside the Kingdom (PDPL / government clients), the same app runs unchanged on any Saudi cloud VM
(e.g. Google Cloud Dammam, Oracle Cloud Jeddah, STC Cloud): install Node 22, `npm ci`, run
`npm start` behind Nginx with HTTPS, and back up the `DB_PATH` file daily.

## 2. Your domain (e.g. `noortravel.sa`) (you)

1. Buy the domain (`.sa` domains are registered through SaudiNIC-accredited registrars).
2. Render → **Settings → Custom domains → Add** `noortravel.sa` and `www.noortravel.sa`.
3. At your DNS provider add the records Render shows (CNAME for `www`, A/ALIAS for the root). HTTPS is issued automatically.
4. Environment: `BASE_URL=https://noortravel.sa` (used in email links, payment callbacks and invoice QR links).

## 3. Email — confirmations, tax invoices, e-tickets, password resets

The app sends: welcome email, *booking received*, *payment confirmed + tax invoice* (in the email
and attached), *e-ticket (PNR)*, status changes, refunds, password reset, and a staff copy of every
paid booking. Every message and its delivery status appears in **Back-office → Messages outbox**.

**Recommended: Resend** (HTTPS API — works on every Render plan):
1. Create an account at resend.com → **Domains → Add** `noortravel.sa`.
2. Add the SPF/DKIM DNS records it shows; wait for "Verified".
3. **API Keys → Create** → set in Render Environment:
   ```
   RESEND_API_KEY=re_xxxxxxxx
   MAIL_FROM=Noor Travel <bookings@noortravel.sa>
   MAIL_REPLY_TO=info@noortravel.sa
   AGENCY_NOTIFY_EMAIL=bookings@noortravel.sa     # staff copy of paid bookings
   ```

**Alternative: your existing mailbox via SMTP** (Google Workspace, Microsoft 365, Zoho) — requires a
**paid** Render instance (port 587):
```
SMTP_HOST=smtp.gmail.com   # or smtp.office365.com / smtp.zoho.sa
SMTP_PORT=587
SMTP_USER=bookings@noortravel.sa
SMTP_PASS=<app password>
MAIL_FROM=Noor Travel <bookings@noortravel.sa>
```
Test: sign up on the site with your own email — you should receive the welcome email within seconds.

## 4. Payments (you)

| Provider | Apply at | You'll need | Environment variables |
|---|---|---|---|
| **Moyasar** — mada, Visa, Mastercard, Apple Pay, STC Pay | moyasar.com | CR, VAT certificate, IBAN letter, owner ID, live website with policies | `MOYASAR_PUBLISHABLE_KEY`, `MOYASAR_SECRET_KEY`, `MOYASAR_WEBHOOK_SECRET` |
| **Tabby** — split in 4 | tabby.ai/business | CR, VAT certificate, IBAN | `TABBY_PUBLIC_KEY`, `TABBY_SECRET_KEY`, `TABBY_MERCHANT_CODE` |
| **Tamara** — split in 3/4 | tamara.co/business | CR, VAT certificate, IBAN | `TAMARA_API_TOKEN`, `TAMARA_NOTIFICATION_KEY`, `TAMARA_API_URL=https://api.tamara.co` |

After the keys are set, register the webhook URLs shown in **Back-office → Settings**, and for Apple
Pay complete domain verification in the Moyasar dashboard. Test each method with a small real
payment and refund it from the back-office.

## 5. Company details shown on the site and tax invoices (you)

```
COMPANY_VAT_NUMBER=3xxxxxxxxxxxxx3
COMPANY_CR_NUMBER=10xxxxxxxx
COMPANY_TOURISM_LICENSE=xxxxxxxx
COMPANY_ADDRESS=..., Riyadh, Saudi Arabia
COMPANY_PHONE=+966 11 xxx xxxx
COMPANY_WHATSAPP=9665xxxxxxxx
COMPANY_EMAIL=info@noortravel.sa
```
Then in **Back-office → Settings**: bank transfer IBAN and the flight service fee.

## 6. Airline ticketing — Sabre, IATA and alternatives

The site already has a pluggable flight engine (`src/flights.js`). Today it runs on demo fares with
**manual ticketing** (staff issue in their own system and record the PNR in the back-office — the
customer is emailed automatically). To sell live fares, choose one of these routes:

### Option A — Duffel (fastest, already built in)
- Sign up at duffel.com, fund the balance, set `DUFFEL_ACCESS_TOKEN`.
- Live fares from 300+ airlines, seat holds, **automatic e-ticket issue** after payment.
- No IATA accreditation needed — Duffel is the ticketing party. Test first with a `duffel_test_…` token.

### Option B — Sabre GDS (what most Saudi agencies use)
1. **Commercial agreement (you):** sign a Sabre subscriber agreement with Sabre's Middle East office.
   You receive a **PCC** (Pseudo City Code) and Sabre Red 360 access for your agents.
2. **Ticketing authority:** Sabre only books — to *issue* tickets you need either
   - your own **IATA accreditation** (see below), or
   - a **consolidator** whose PCC issues tickets on your behalf (most new agencies start here).
3. **API access:** request Sabre APIs for your PCC at developer.sabre.com. You get test (CERT)
   credentials first, then production.
4. **Integration (we build):** a `src/flights-sabre.js` provider using
   - *Token authentication* → *Bargain Finder Max* (search & price) → *Revalidate* (re-price before payment)
   - *Create Passenger Name Record* (book / hold seats, returns the PNR)
   - *AirTicketRQ* (issue tickets after payment) → e-ticket numbers
   It plugs into the same search page, checkout, back-office and emails already in place. Send us the
   CERT credentials and PCC and it can be connected and tested end-to-end.

### Option C — Amadeus or Travelport
Same model as Sabre (agency agreement + office ID + ticketing authority). Note that Amadeus'
self-service developer APIs do not issue tickets; production ticketing needs an Amadeus agency
contract (Amadeus Enterprise / Web Services).

### IATA accreditation (to issue tickets in your own name)
- Apply through the **IATA Customer Portal** for accreditation under the **BSP Saudi Arabia**.
- Typical requirements: commercial registration + Ministry of Tourism licence, audited financial
  statements, a bank guarantee or financial security, qualified ticketing staff, and premises.
- Result: an IATA numeric code; airlines' ticket stock is issued through your GDS and settled via BSP.
- Until then, a consolidator or Duffel lets you sell tickets immediately.

### Low-cost carriers (flynas, flyadeal)
LCC fares are often not fully available in GDSs. Duffel covers many LCCs; otherwise use each
airline's agency portal / NDC API and record the booking in the back-office.

## 7. Compliance checklist (you)

- **Ministry of Tourism** travel & tourism licence number shown on the site (header/footer/invoices).
- **ZATCA:** Phase 1 QR is built in. For Phase 2 (integration), connect a ZATCA-certified e-invoicing
  solution (EGS) — invoices are generated in `src/bookings.js` / `src/zatca.js`.
- **Personal Data Protection Law (PDPL):** review the privacy text in `public/js/pages/policies.js`
  with your legal advisor; keep passport data only as long as needed.
- **E-commerce requirements:** check the current registration/display requirements for online stores
  on the Saudi Business Center (business.sa).
- Have the terms, cancellation and refund policy reviewed by your lawyer.

## 8. Launch-day test (30 minutes)

1. Sign up with a real email → welcome email received.
2. Book a domestic flight → pay with a real mada card (small amount) → confirmation + tax invoice received.
3. Back-office → ticket the booking → e-ticket email received → refund it.
4. Repeat with Tabby and Tamara (approve on the provider's page) and refund.
5. Check **Messages outbox** shows every email as **sent**.
6. Try the site on an iPhone and Android in Arabic.
