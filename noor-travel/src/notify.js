'use strict';
// Customer notifications. Every message is written to the `notifications`
// outbox (visible in the back-office). Plug an email/SMS/WhatsApp provider
// into `deliver` (e.g. SMTP, Unifonic, Taqnyat, WhatsApp Business API).

const config = require('./config');
const { format } = require('./money');

async function deliver(_msg) {
  // Intentionally a no-op until a provider is configured.
}

function send(db, { channel = 'email', recipient, subject, body, bookingId = null }) {
  db.prepare('INSERT INTO notifications (channel, recipient, subject, body, booking_id) VALUES (?, ?, ?, ?, ?)')
    .run(channel, recipient, subject, body, bookingId);
  deliver({ channel, recipient, subject, body }).catch((err) => console.error('[notify] delivery failed', err));
}

const link = (b) => `${config.baseUrl}/booking.html?ref=${b.ref}&t=${b.access_token}`;

function bookingCreated(db, b) {
  send(db, {
    recipient: b.contact_email,
    bookingId: b.id,
    subject: `Booking ${b.ref} received — Noor Travel`,
    body: `Dear ${b.contact_name},\n\nThank you for choosing Noor Travel. Your booking ${b.ref} for "${b.title}" `
      + `(${format(b.total)}) has been received.\n\nComplete or review your payment here: ${link(b)}\n\nNoor Travel Agency, Riyadh`,
  });
}

function bookingConfirmed(db, b) {
  send(db, {
    recipient: b.contact_email,
    bookingId: b.id,
    subject: `Booking ${b.ref} confirmed — Noor Travel`,
    body: `Dear ${b.contact_name},\n\nYour payment was received and booking ${b.ref} is confirmed.\n`
      + `Tax invoice: ${config.baseUrl}/invoice.html?ref=${b.ref}&t=${b.access_token}\n\nHave a wonderful trip!\nNoor Travel Agency`,
  });
  send(db, {
    channel: 'whatsapp',
    recipient: b.contact_phone,
    bookingId: b.id,
    subject: `Booking ${b.ref} confirmed`,
    body: `Noor Travel: booking ${b.ref} confirmed ✅ Total ${format(b.total)}. Details: ${link(b)}`,
  });
}

function bookingStatusChanged(db, b, status) {
  send(db, {
    recipient: b.contact_email,
    bookingId: b.id,
    subject: `Booking ${b.ref} update — ${status.replace('_', ' ')}`,
    body: `Dear ${b.contact_name},\n\nThe status of your booking ${b.ref} is now: ${status.replace('_', ' ')}.\n${link(b)}\n\nNoor Travel Agency`,
  });
}

module.exports = { send, bookingCreated, bookingConfirmed, bookingStatusChanged, link };
