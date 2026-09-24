'use strict';
// Customer & staff notifications. Every message is recorded in the
// `notifications` outbox (back-office → Messages) with its delivery status.
// Email is delivered through src/mailer.js; WhatsApp/SMS messages are logged
// until a provider (WhatsApp Business API, Unifonic, Taqnyat…) is connected.

const QRCode = require('qrcode');
const config = require('./config');
const mailer = require('./mailer');
const emails = require('./emails');
const { format } = require('./money');

const link = emails.bookingLink;
const pending = new Set(); // in-flight deliveries (awaited by tests / graceful shutdown)

function send(db, { channel = 'email', recipient, subject, body, html = null, attachments = [], bookingId = null, storedBody = null }) {
  const id = Number(db.prepare('INSERT INTO notifications (channel, recipient, subject, body, booking_id) VALUES (?, ?, ?, ?, ?)')
    .run(channel, recipient, subject, storedBody ?? body, bookingId).lastInsertRowid);
  if (channel !== 'email' || !mailer.provider() || !recipient) return Promise.resolve(id);
  const p = mailer.send({ to: recipient, subject, html: html || undefined, text: body, attachments })
    .then((providerId) => {
      db.prepare("UPDATE notifications SET status = 'sent', provider_id = ?, sent_at = datetime('now'), error = NULL WHERE id = ?").run(providerId ? String(providerId) : null, id);
    })
    .catch((err) => {
      console.error('[mail] delivery failed:', err.message);
      db.prepare("UPDATE notifications SET status = 'failed', error = ? WHERE id = ?").run(String(err.message).slice(0, 500), id);
    })
    .then(() => id);
  pending.add(p);
  p.finally(() => pending.delete(p));
  return p;
}

const settle = () => Promise.all([...pending]);

function email(db, b, tpl, extra = {}) {
  return send(db, { recipient: b.contact_email, bookingId: b.id, subject: tpl.subject, body: tpl.text, html: tpl.html, ...extra });
}

function bookingCreated(db, b) {
  if (b.payment_status === 'paid') return;
  email(db, b, emails.bookingReceived(b));
}

async function bookingConfirmed(db, b) {
  const bookings = require('./bookings'); // lazy: avoids a require cycle
  let inv = null;
  try { inv = bookings.invoice(db, b); } catch { /* not fully paid yet */ }
  if (inv) {
    const qr = await QRCode.toDataURL(inv.qr, { margin: 1, width: 300 });
    const file = emails.invoiceHtml(inv, { qrSrc: qr, standalone: true });
    email(db, b, emails.paymentConfirmed(b, inv), {
      attachments: [{ filename: `Tax-Invoice-${inv.invoiceNo}.html`, content: file, contentType: 'text/html; charset=utf-8' }],
    });
  }
  send(db, {
    channel: 'whatsapp', recipient: b.contact_phone, bookingId: b.id, subject: `Booking ${b.ref} confirmed`,
    body: `Noor Travel: booking ${b.ref} confirmed ✅ Total ${format(b.total)}. Details & invoice: ${link(b)}`,
  });
  if (config.mail.agencyInbox) {
    const tpl = emails.staffNewPaidBooking(b);
    send(db, { recipient: config.mail.agencyInbox, bookingId: b.id, subject: tpl.subject, body: tpl.text, html: tpl.html });
  }
}

function ticketsIssued(db, b) {
  email(db, b, emails.ticketIssued(b));
  const tickets = JSON.parse(b.tickets || '[]');
  send(db, {
    channel: 'whatsapp', recipient: b.contact_phone, bookingId: b.id, subject: `E-ticket ${b.pnr}`,
    body: `Noor Travel ✈️ Your flight is ticketed. PNR: ${b.pnr}${tickets.length ? ` · Tickets: ${tickets.join(', ')}` : ''}. ${link(b)}`,
  });
}

function bookingStatusChanged(db, b, status) { email(db, b, emails.statusChanged(b, status)); }
function refundIssued(db, b, amount) { email(db, b, emails.refundIssued(b, amount)); }

function welcome(db, user) {
  const tpl = emails.welcome(user);
  send(db, { recipient: user.email, subject: tpl.subject, body: tpl.text, html: tpl.html });
}

function passwordReset(db, user, url) {
  const tpl = emails.passwordReset(user, url);
  return send(db, { recipient: user.email, subject: tpl.subject, body: tpl.text, html: tpl.html, storedBody: 'Password reset link sent (hidden).' });
}

module.exports = { send, settle, bookingCreated, bookingConfirmed, ticketsIssued, bookingStatusChanged, refundIssued, welcome, passwordReset, link };
