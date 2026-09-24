(async function () {
  // Test-mode stand-in for the Moyasar / Tabby / Tamara hosted pages. Card
  // numbers typed here never leave the browser — only the last 4 digits are sent.
  const { t, lang, esc, $, qs, api, money, busy } = Noor;
  await Noor.init();
  const { ref } = qs();
  let p;
  try {
    p = await api(`/pay/sandbox/${encodeURIComponent(ref || '')}`);
  } catch (err) {
    $('#root').innerHTML = `<p class="alert alert-error">${esc(err.message)}</p>`;
    return;
  }
  const n = p.provider === 'tabby' ? 4 : p.provider === 'tamara' ? p.instalments : 1;
  const brand = { card: 'mada · Visa · Mastercard', tabby: 'tabby', tamara: 'tamara' }[p.provider];
  const ar = lang === 'ar';

  $('#root').innerHTML = `
    <div class="flex between"><span class="pay-logo ${p.provider === 'card' ? 'mada' : p.provider}">${esc(brand)}</span><span class="badge badge-soft">TEST</span></div>
    <h2 class="mt-2" style="font-size:1.4rem">${esc(p.booking.title)}</h2>
    <div class="summary-row total"><span>${esc(t('total'))}</span><span class="num">${money(p.amount, { decimals: 2 })}</span></div>
    ${n > 1 ? `<div class="plan" style="grid-template-columns:repeat(${n},1fr)">${Array.from({ length: n }, (_, i) => `<div><strong class="num">${money(Math.round(p.amount / n), { decimals: 2 })}</strong>${esc(i ? t('in_months', { n: i }) : t('today'))}</div>`).join('')}</div>` : ''}
    ${p.provider === 'card' ? `<form id="card" class="mt-3" autocomplete="off">
        <div class="field"><label>${ar ? 'رقم البطاقة (اختباري)' : 'Card number (test)'}</label><input class="input num" id="pan" inputmode="numeric" value="4111 1111 1111 1111" maxlength="23"></div>
        <div class="form-grid mt-2"><div class="field"><label>MM/YY</label><input class="input num" value="12/30"></div><div class="field"><label>CVC</label><input class="input num" value="123"></div></div>
        <p class="small muted mt-1">${ar ? 'استخدم 4111 1111 1111 1111 للنجاح أو بطاقة تنتهي بـ 0002 للرفض.' : 'Use 4111 1111 1111 1111 to approve, or any card ending 0002 to decline.'}</p></form>`
      : `<p class="muted mt-2">${ar ? `محاكاة صفحة ${brand} — اختر النتيجة.` : `Simulated ${brand} checkout — choose an outcome.`}</p>`}
    <div class="alert alert-error hidden mt-2" id="err"></div>
    <div class="flex mt-3">
      <button class="btn btn-primary grow" data-o="approve">${ar ? 'موافقة ودفع' : 'Approve & pay'}</button>
      <button class="btn btn-outline" data-o="decline">${ar ? 'رفض' : 'Decline'}</button>
      <button class="btn btn-ghost" data-o="cancel">${ar ? 'إلغاء' : 'Cancel'}</button>
    </div>`;

  const luhn = (num) => {
    let sum = 0;
    [...num].reverse().forEach((d, i) => { let v = Number(d); if (i % 2) { v *= 2; if (v > 9) v -= 9; } sum += v; });
    return num.length >= 12 && sum % 10 === 0;
  };

  $('#root').addEventListener('click', (e) => {
    const b = e.target.closest('[data-o]');
    if (!b) return;
    busy(b, async () => {
      let last4 = '';
      if (p.provider === 'card' && b.dataset.o === 'approve') {
        const pan = $('#pan').value.replace(/\D/g, '');
        if (!luhn(pan)) { $('#err').textContent = ar ? 'رقم البطاقة غير صالح.' : 'Invalid card number.'; $('#err').classList.remove('hidden'); return; }
        last4 = pan.slice(-4);
      }
      const r = await api(`/pay/sandbox/${encodeURIComponent(ref)}`, { method: 'POST', body: { outcome: b.dataset.o, last4 } });
      location.href = r.redirect;
    });
  });
})();
