(async function () {
  const { t, L, esc, $, api, busy } = Noor;
  const { site } = await Noor.init('nav_contact');
  const c = site.company;

  $('#office').innerHTML = `<h3>${esc(t('head_office'))}</h3>
    <p>${esc(Noor.lang === 'ar' && c.addressAr ? c.addressAr : c.address)}</p>
    <iframe title="Map" style="width:100%;height:220px;border:0;border-radius:12px" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
      src="https://www.google.com/maps?q=${encodeURIComponent('Ezhar Travel and Tourism, Al Zahrah, As Suwaidi, Riyadh')}&output=embed"></iframe>
    <div class="mt-2" style="display:grid;gap:8px">
      ${[c.phone, c.phone2].filter(Boolean).map((n) => `<a class="btn btn-outline" href="tel:${esc(n.replace(/\s/g, ''))}">☎ <span class="num">${esc(n)}</span></a>`).join('')}
      <a class="btn btn-outline" href="mailto:${esc(c.email)}">✉ ${esc(c.email)}</a>
      <a class="btn btn-primary" style="background:#25d366" target="_blank" rel="noopener" href="https://wa.me/${esc(c.whatsapp)}">WhatsApp</a>
    </div>
    <h4 class="mt-3">${esc(L({ en: 'Our branches', ar: 'فروعنا' }))}</h4><div class="chips">${c.branches.map((b) => `<span class="chip">${esc(L(b))}</span>`).join('')}</div>
    <h4 class="mt-3">${esc(t('working_hours'))}</h4><p class="muted">${esc(t('open_hours'))}</p>`;

  const faq = [
    [{ en: 'Can I pay in instalments?', ar: 'هل يمكنني الدفع بالتقسيط؟' },
      { en: 'Yes. At checkout choose Tabby (4 interest-free monthly payments) or Tamara (3 or 4 payments). Approval is instant and there are no fees when you pay on time.', ar: 'نعم. عند الدفع اختر تابي (4 دفعات شهرية بدون فوائد) أو تمارا (3 أو 4 دفعات). الموافقة فورية ولا توجد رسوم عند السداد في الموعد.' }],
    [{ en: 'Which cards do you accept?', ar: 'ما البطاقات التي تقبلونها؟' },
      { en: 'mada, Visa, Mastercard, Apple Pay and STC Pay, processed securely by a SAMA-licensed payment gateway. You can also pay by bank transfer or at our Riyadh office.', ar: 'مدى وفيزا وماستركارد وApple Pay وSTC Pay عبر بوابة دفع مرخصة من البنك المركزي السعودي. ويمكنك أيضاً الدفع بالتحويل البنكي أو في مكتبنا بالرياض.' }],
    [{ en: 'Will I receive a VAT invoice?', ar: 'هل سأحصل على فاتورة ضريبية؟' },
      { en: 'Yes — a ZATCA-compliant simplified tax invoice with QR code is issued automatically once your booking is paid.', ar: 'نعم — تصدر فاتورة ضريبية مبسطة متوافقة مع هيئة الزكاة والضريبة والجمارك مع رمز QR تلقائياً بعد الدفع.' }],
    [{ en: 'How do I cancel or change my booking?', ar: 'كيف ألغي أو أعدّل حجزي؟' },
      { en: 'Unpaid bookings can be cancelled from “My Booking”. For paid bookings contact us on WhatsApp; refunds follow our cancellation policy and go back to the original payment method.', ar: 'يمكن إلغاء الحجوزات غير المدفوعة من صفحة "حجزي". للحجوزات المدفوعة تواصل معنا عبر واتساب؛ ويتم الاسترداد وفق سياسة الإلغاء إلى وسيلة الدفع الأصلية.' }],
    [{ en: 'Do Umrah packages include the Nusuk permit?', ar: 'هل تشمل باقات العمرة تصريح نسك؟' },
      { en: 'Our team books your Umrah permit through Nusuk on your behalf and shares it on WhatsApp before departure.', ar: 'يقوم فريقنا بحجز تصريح العمرة عبر منصة نسك نيابةً عنك وإرساله عبر واتساب قبل السفر.' }],
  ];
  $('#faq').innerHTML = faq.map(([q, a]) => `<details><summary>${esc(L(q))}</summary><p>${esc(L(a))}</p></details>`).join('');

  $('#inq').addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = $('#inq-msg');
    busy($('#inq button'), async () => {
      try {
        await api('/inquiries', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
        msg.className = 'alert alert-success mt-2';
        msg.textContent = t('inquiry_thanks');
        e.target.reset();
      } catch (err) {
        msg.className = 'alert alert-error mt-2';
        msg.textContent = err.message;
      }
    });
  });
})();
