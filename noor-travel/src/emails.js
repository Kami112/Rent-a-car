'use strict';
// Transactional email templates (bilingual EN/AR, table layout + inline styles
// so they render in Gmail, Outlook and Apple Mail).

const config = require('./config');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sar = (h) => (h / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const BRAND = '#0b5d52';
const GOLD = '#c9a24a';

function layout({ preheader = '', body }) {
  const c = config.company;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f1f4f3;font-family:Tahoma,Arial,sans-serif;color:#0f1f1c">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f4f3;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden">
  <tr><td style="background:${BRAND};padding:22px 28px;color:#fff">
    <table role="presentation" width="100%"><tr>
      <td style="font-size:20px;font-weight:bold"><span style="color:${GOLD}">✿</span> ${esc(c.nameEn)}</td>
      <td align="right" dir="rtl" style="font-size:16px;font-weight:bold">${esc(c.nameAr)}</td></tr></table>
  </td></tr>
  <tr><td style="padding:28px">${body}</td></tr>
  <tr><td style="background:#f7f9f8;padding:18px 28px;font-size:12px;color:#6b7b77;line-height:1.6">
    ${esc(c.address)}<br>☎ ${[c.phone, c.phone2].filter(Boolean).map(esc).join(' · ')} · WhatsApp +${esc(c.whatsapp)} · ${esc(c.email)}
    ${[['VAT', c.vatNumber], ['CR', c.crNumber], ['Tourism licence', c.tourismLicense]].filter(([, v]) => v).map(([k, v]) => `${k} ${esc(v)}`).join(' · ') ? `<br>${[['VAT', c.vatNumber], ['CR', c.crNumber], ['Tourism licence', c.tourismLicense]].filter(([, v]) => v).map(([k, v]) => `${k} ${esc(v)}`).join(' · ')}` : ''}
  </td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href, label) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0"><tr><td style="background:${BRAND};border-radius:999px">
  <a href="${esc(href)}" style="display:inline-block;padding:12px 26px;color:#fff;text-decoration:none;font-weight:bold">${label}</a></td></tr></table>`;

const both = (en, ar) => `<p style="margin:0 0 6px">${en}</p><p dir="rtl" style="margin:0 0 14px;color:#3c4d49">${ar}</p>`;

const bookingLink = (b) => `${config.baseUrl}/booking.html?ref=${b.ref}&t=${b.access_token}`;
const invoiceLink = (b) => `${config.baseUrl}/invoice.html?ref=${b.ref}&t=${b.access_token}`;

function summaryTable(b) {
  const rows = [
    ['Booking reference · رقم الحجز', `<strong style="font-size:18px;letter-spacing:2px">${esc(b.ref)}</strong>`],
    ['Service · الخدمة', esc(b.title)],
    b.travel_date ? ['Travel date · تاريخ السفر', `${esc(b.travel_date)}${b.end_date ? ` → ${esc(b.end_date)}` : ''}`] : null,
    ['Travellers · المسافرون', String(b.adults + b.children + b.infants)],
    ['Total · الإجمالي', `<strong>SAR ${sar(b.total)}</strong>`],
  ].filter(Boolean);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e9e7;border-radius:10px;margin:10px 0 6px">
    ${rows.map(([k, v]) => `<tr><td style="padding:10px 14px;border-bottom:1px solid #eef2f1;color:#6b7b77;font-size:13px">${k}</td><td style="padding:10px 14px;border-bottom:1px solid #eef2f1;text-align:right">${v}</td></tr>`).join('')}
  </table>`;
}

function flightBlock(b) {
  if (b.type !== 'flight') return '';
  const d = JSON.parse(b.details || '{}').meta || {};
  if (!d.slices) return '';
  const tickets = JSON.parse(b.tickets || '[]');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8f4f1;border-radius:10px;margin:14px 0"><tr><td style="padding:14px 16px">
    <div style="font-weight:bold;margin-bottom:6px">✈ ${esc(d.owner?.name || '')}</div>
    ${d.slices.map((s) => `<div style="font-size:14px;margin:4px 0">${esc(s.origin)} ${esc(s.departAt.replace('T', ' '))} → ${esc(s.destination)} ${esc(s.arriveAt.slice(11))} · ${s.segments.map((g) => esc(g.flightNo)).join(', ')}${s.stops ? ` · ${s.stops} stop(s)` : ''}</div>`).join('')}
    ${b.pnr ? `<div style="margin-top:10px">PNR: <strong style="font-family:monospace;font-size:18px;letter-spacing:2px">${esc(b.pnr)}</strong></div>` : ''}
    ${tickets.length ? `<div>E-ticket · التذكرة: <strong style="font-family:monospace">${tickets.map(esc).join(', ')}</strong></div>` : ''}
  </td></tr></table>`;
}

/** Bilingual simplified tax invoice (used in the email body and as an attached file). */
function invoiceHtml(inv, { qrSrc, standalone = false } = {}) {
  const s = inv.seller;
  const when = new Date(inv.invoiceDate);
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e9e7;border-radius:10px;font-size:13px">
    <tr><td colspan="2" style="padding:14px;border-bottom:1px solid #e3e9e7">
      <strong style="font-size:16px">Simplified Tax Invoice</strong> · <strong dir="rtl">فاتورة ضريبية مبسطة</strong><br>
      <span style="color:#6b7b77">${esc(s.nameEn)} · ${esc(s.nameAr)} · VAT ${esc(s.vatNumber)} · CR ${esc(s.crNumber)}</span></td></tr>
    <tr><td style="padding:10px 14px;color:#6b7b77">Invoice No. · رقم الفاتورة</td><td style="padding:10px 14px;text-align:right"><strong>${esc(inv.invoiceNo)}</strong></td></tr>
    <tr><td style="padding:10px 14px;color:#6b7b77">Date · التاريخ</td><td style="padding:10px 14px;text-align:right">${when.toLocaleString('en-GB', { timeZone: 'Asia/Riyadh', dateStyle: 'medium', timeStyle: 'short' })} (Riyadh)</td></tr>
    <tr><td style="padding:10px 14px;color:#6b7b77">Customer · العميل</td><td style="padding:10px 14px;text-align:right">${esc(inv.contact.name)}</td></tr>
    ${inv.lines.map((l) => `<tr><td style="padding:10px 14px;border-top:1px solid #eef2f1">${esc(l.en)} × ${l.qty}<br><span dir="rtl" style="color:#6b7b77">${esc(l.ar)}</span> <span style="color:#6b7b77">(VAT ${l.vatRate ?? inv.vatRate}%)</span></td>
      <td style="padding:10px 14px;border-top:1px solid #eef2f1;text-align:right;white-space:nowrap">${sar(l.amount)}</td></tr>`).join('')}
    ${inv.discount ? `<tr><td style="padding:10px 14px">Discount · الخصم</td><td style="padding:10px 14px;text-align:right">−${sar(inv.discount)}</td></tr>` : ''}
    <tr><td style="padding:10px 14px;border-top:1px solid #e3e9e7">Total excl. VAT · الإجمالي غير شامل الضريبة</td><td style="padding:10px 14px;border-top:1px solid #e3e9e7;text-align:right">${sar(inv.total - inv.vat)}</td></tr>
    <tr><td style="padding:10px 14px">VAT · ضريبة القيمة المضافة</td><td style="padding:10px 14px;text-align:right">${sar(inv.vat)}</td></tr>
    <tr><td style="padding:12px 14px;background:#f7f9f8"><strong>Total incl. VAT · الإجمالي شامل الضريبة</strong></td><td style="padding:12px 14px;background:#f7f9f8;text-align:right"><strong>SAR ${sar(inv.total)}</strong></td></tr>
    ${qrSrc ? `<tr><td colspan="2" style="padding:14px;text-align:center"><img src="${esc(qrSrc)}" width="150" height="150" alt="ZATCA QR"></td></tr>` : ''}
  </table>`;
  if (!standalone) return table;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.invoiceNo)}</title></head>
    <body style="font-family:Tahoma,Arial,sans-serif;max-width:720px;margin:24px auto;color:#0f1f1c">${table}
    <p style="font-size:12px;color:#6b7b77">${esc(s.address)} · ${esc(s.phone)} · ${esc(s.email)}</p></body></html>`;
}

// ------------------------------------------------------------------ templates
function bookingReceived(b) {
  return {
    subject: `Booking ${b.ref} received — complete your payment | تم استلام حجزك`,
    html: layout({
      preheader: `Your booking ${b.ref} is reserved — complete payment to confirm.`,
      body: both(`Dear ${esc(b.contact_name)},<br>Thank you for booking with Ezhar Travel. Your booking is reserved and awaiting payment.`,
        `عزيزنا ${esc(b.contact_name)}،<br>شكراً لحجزك مع إزهار للسفر والسياحة. تم حجز طلبك وهو بانتظار الدفع.`)
        + summaryTable(b) + flightBlock(b) + button(bookingLink(b), 'Complete payment · أكمل الدفع'),
    }),
    text: `Booking ${b.ref} received. Total SAR ${sar(b.total)}. Complete payment: ${bookingLink(b)}`,
  };
}

function paymentConfirmed(b, inv) {
  return {
    subject: `Booking confirmed ${b.ref} — tax invoice ${inv.invoiceNo} | تأكيد الحجز والفاتورة الضريبية`,
    html: layout({
      preheader: `Payment received — booking ${b.ref} is confirmed. Your tax invoice is attached.`,
      body: `<div style="text-align:center;font-size:40px;color:#17804d">✓</div>`
        + both(`Dear ${esc(b.contact_name)},<br><strong>We have received your payment and your booking is confirmed.</strong> Your tax invoice is below and attached to this email.`,
          `عزيزنا ${esc(b.contact_name)}،<br><strong>تم استلام الدفع وتأكيد حجزك.</strong> تجد الفاتورة الضريبية أدناه ومرفقة بهذه الرسالة.`)
        + summaryTable(b) + flightBlock(b)
        + (b.type === 'flight' && b.ticket_status !== 'issued' ? both('Your e-ticket will follow in a separate email as soon as it is issued.', 'ستصلك التذكرة الإلكترونية في رسالة منفصلة فور إصدارها.') : '')
        + button(bookingLink(b), 'View my booking · عرض حجزي')
        + invoiceHtml(inv, { qrSrc: `${config.baseUrl}/api/bookings/${b.ref}/invoice-qr.png?t=${b.access_token}` })
        + `<p style="font-size:13px;margin-top:14px"><a href="${esc(invoiceLink(b))}" style="color:${BRAND}">Open / print the tax invoice · فتح الفاتورة وطباعتها</a></p>`,
    }),
    text: `Payment received — booking ${b.ref} confirmed. Tax invoice ${inv.invoiceNo}, total SAR ${sar(inv.total)} (VAT SAR ${sar(inv.vat)}). Invoice: ${invoiceLink(b)}`,
  };
}

function ticketIssued(b) {
  const tickets = JSON.parse(b.tickets || '[]');
  return {
    subject: `Your e-ticket — PNR ${b.pnr} (${b.ref}) | تذكرتك الإلكترونية`,
    html: layout({
      preheader: `Your flight is ticketed. PNR ${b.pnr}.`,
      body: both(`Dear ${esc(b.contact_name)},<br><strong>Your flight is ticketed.</strong> Please keep your airline reference (PNR) and e-ticket number(s) for check-in.`,
        `عزيزنا ${esc(b.contact_name)}،<br><strong>تم إصدار تذكرتك.</strong> يرجى الاحتفاظ برقم الحجز لدى شركة الطيران ورقم التذكرة لإنهاء إجراءات السفر.`)
        + flightBlock(b)
        + both('Please arrive at the airport at least 3 hours before international flights and 2 hours before domestic flights, with your passport or national ID.',
          'يرجى الحضور إلى المطار قبل 3 ساعات من الرحلات الدولية وساعتين من الرحلات الداخلية مع جواز السفر أو الهوية الوطنية.')
        + button(bookingLink(b), 'View my trip · عرض رحلتي'),
    }),
    text: `Your flight is ticketed. PNR ${b.pnr}. Tickets: ${tickets.join(', ')}. ${bookingLink(b)}`,
  };
}

function statusChanged(b, status) {
  const label = { confirmed: ['confirmed', 'مؤكد'], completed: ['completed', 'مكتمل'], cancelled: ['cancelled', 'ملغي'], refunded: ['refunded', 'مسترد'] }[status] || [status, status];
  return {
    subject: `Booking ${b.ref} — ${label[0]} | تحديث الحجز`,
    html: layout({ body: both(`Dear ${esc(b.contact_name)},<br>Your booking <strong>${esc(b.ref)}</strong> is now <strong>${label[0]}</strong>.`, `عزيزنا ${esc(b.contact_name)}،<br>حالة حجزك <strong>${esc(b.ref)}</strong> الآن: <strong>${label[1]}</strong>.`) + summaryTable(b) + button(bookingLink(b), 'View booking · عرض الحجز') }),
    text: `Booking ${b.ref} is now ${label[0]}. ${bookingLink(b)}`,
  };
}

function refundIssued(b, amount) {
  return {
    subject: `Refund issued — booking ${b.ref} | تم إصدار استرداد`,
    html: layout({ body: both(`Dear ${esc(b.contact_name)},<br>A refund of <strong>SAR ${sar(amount)}</strong> has been issued for booking ${esc(b.ref)}. Depending on your bank or instalment provider it may take 5–14 working days to appear.`,
      `عزيزنا ${esc(b.contact_name)}،<br>تم إصدار استرداد بمبلغ <strong>${sar(amount)} ريال</strong> للحجز ${esc(b.ref)}. قد يستغرق ظهوره من 5 إلى 14 يوم عمل حسب البنك أو مزود التقسيط.`) }),
    text: `Refund of SAR ${sar(amount)} issued for booking ${b.ref}.`,
  };
}

function welcome(user) {
  return {
    subject: 'Welcome to Ezhar Travel | أهلاً بك في إزهار للسفر والسياحة',
    html: layout({ body: both(`Welcome ${esc(user.name)}!<br>Your Ezhar Travel account is ready. Book flights, Umrah programmes, holidays, hotels and visas — and manage every trip in one place.`,
      `أهلاً ${esc(user.name)}!<br>حسابك في إزهار للسفر والسياحة جاهز. احجز الطيران وبرامج العمرة والعطلات والفنادق والتأشيرات وأدر جميع رحلاتك في مكان واحد.`) + button(`${config.baseUrl}/`, 'Start booking · ابدأ الحجز') }),
    text: `Welcome to Ezhar Travel, ${user.name}! ${config.baseUrl}/`,
  };
}

function passwordReset(user, link) {
  return {
    subject: 'Reset your password | إعادة تعيين كلمة المرور',
    html: layout({ body: both(`Hello ${esc(user.name)},<br>We received a request to reset your password. The link is valid for 1 hour. If you did not request this, you can ignore this email.`,
      `مرحباً ${esc(user.name)}،<br>تلقينا طلباً لإعادة تعيين كلمة المرور. الرابط صالح لمدة ساعة واحدة. إذا لم تطلب ذلك يمكنك تجاهل هذه الرسالة.`) + button(link, 'Reset password · إعادة تعيين كلمة المرور') }),
    text: `Reset your password (valid 1 hour): ${link}`,
  };
}

function staffNewPaidBooking(b) {
  return {
    subject: `💰 Paid booking ${b.ref} — SAR ${sar(b.total)} — ${b.title}`,
    html: layout({ body: `<p>New paid booking via ${esc(b.payment_method || '')}.</p>${summaryTable(b)}${flightBlock(b)}
      <p>Customer: ${esc(b.contact_name)} · ${esc(b.contact_email)} · ${esc(b.contact_phone)}</p>
      ${b.type === 'flight' && b.ticket_status !== 'issued' ? '<p style="color:#c0392b"><strong>Action: ticket this booking in the back-office.</strong></p>' : ''}
      ${button(`${config.baseUrl}/admin/#/booking/${b.ref}`, 'Open in back-office')}` }),
    text: `Paid booking ${b.ref} SAR ${sar(b.total)} ${b.title}`,
  };
}

module.exports = {
  bookingReceived, paymentConfirmed, ticketIssued, statusChanged, refundIssued, welcome, passwordReset, staffNewPaidBooking, invoiceHtml, bookingLink,
};
