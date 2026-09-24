'use strict';
// Outgoing email. Provider is chosen from the environment:
//   RESEND_API_KEY            → Resend HTTPS API (works on any host, incl. Render)
//   SMTP_HOST (+ user/pass)   → any SMTP server (Google Workspace, Microsoft 365, Zoho, Brevo, SendGrid…)
//   neither                   → emails are only recorded in the back-office outbox

const config = require('./config');
const { request } = require('./payments/http');

let transport = null;

function provider() {
  if (config.mail.resendApiKey) return 'resend';
  if (config.mail.smtp.host) return 'smtp';
  return null;
}

async function sendResend(msg) {
  const res = await request('resend', 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.mail.resendApiKey}` },
    body: {
      from: config.mail.from,
      to: [msg.to],
      reply_to: config.mail.replyTo || undefined,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      attachments: (msg.attachments || []).map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString('base64') })),
    },
  });
  return res.id;
}

async function sendSmtp(msg) {
  if (!transport) {
    const nodemailer = require('nodemailer');
    const s = config.mail.smtp;
    transport = nodemailer.createTransport({
      host: s.host, port: s.port, secure: s.port === 465,
      auth: s.user ? { user: s.user, pass: s.pass } : undefined,
    });
  }
  const info = await transport.sendMail({
    from: config.mail.from, to: msg.to, replyTo: config.mail.replyTo || undefined,
    subject: msg.subject, html: msg.html, text: msg.text,
    attachments: (msg.attachments || []).map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
  });
  return info.messageId;
}

/** Send one email. Resolves to the provider message id; rejects on failure. */
async function send(msg) {
  const p = provider();
  if (p === 'resend') return sendResend(msg);
  if (p === 'smtp') return sendSmtp(msg);
  return null;
}

// Test hook
function _setTransport(t) { transport = t; }

module.exports = { send, provider, _setTransport };
