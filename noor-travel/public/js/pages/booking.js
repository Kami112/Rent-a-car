(async function () {
  const { t, lang, L, esc, $, $$, qs, api, money, fmtDate, statusBadge, busy, toast } = Noor;
  await Noor.init('nav_manage');
  const q = qs();
  let b;
  try {
    b = await api(`/bookings/${encodeURIComponent(q.ref || '')}?t=${encodeURIComponent(q.t || '')}`);
  } catch (err) {
    $('#root').innerHTML = `<div class="card empty"><p>${esc(err.message)}</p><a class="btn btn-primary" href="/manage.html">${esc(t('find_booking'))}</a></div>`;
    return;
  }

  const bank = q.payment === 'bank' || (b.paymentMethod === 'bank_transfer' && b.paymentStatus === 'pending');
  let hero;
  if (b.paymentStatus === 'paid') hero = ['ok', '✓', 'pay_success_t', 'pay_success_d'];
  else if (bank) hero = ['wait', '⏳', 'pay_pending_t', 'bank_after'];
  else if (q.payment === 'failed' || q.payment === 'error' || b.paymentStatus === 'failed') hero = ['bad', '!', 'pay_failed_t', 'pay_failed_d'];
  else if (q.payment === 'cancelled') hero = ['bad', '×', 'pay_cancelled_t', 'pay_failed_d'];
  else hero = ['wait', '⏳', 'pay_pending_t', 'pay_pending_d'];
  if (['cancelled', 'refunded'].includes(b.status)) hero = ['bad', '×', `st_${b.status}`, 'contact_sub'];

  const canPay = b.outstanding > 0 && !['cancelled', 'refunded'].includes(b.status);
  const methods = (b.paymentMethods || []).filter((m) => m.key !== 'bank_transfer' || !bank);

  $('#root').innerHTML = `
    <div class="card result-hero">
      <div class="result-ico ${hero[0]}">${hero[1]}</div>
      <h1 style="font-size:1.7rem">${esc(t(hero[2]))}</h1>
      <p class="muted">${esc(q.msg && hero[0] === 'bad' ? q.msg : t(hero[3]))}</p>
      <div class="flex" style="justify-content:center">
        <span class="muted">${esc(t('booking_ref'))}</span><strong class="num" style="font-size:1.4rem;letter-spacing:.08em">${esc(b.ref)}</strong>
        <button class="btn btn-ghost btn-sm" id="copy-ref" type="button">⧉</button></div>
    </div>
    <div id="bank-box"></div>
    <div id="flight-box"></div>
    <div class="card panel mt-3">
      <div class="flex between"><h3 class="mb-0">${esc(lang === 'ar' ? b.titleAr || b.title : b.title)}</h3>
        <div class="flex">${statusBadge('st', b.status)} ${statusBadge('ps', b.paymentStatus)}</div></div>
      <div class="kv mt-2">
        <div><span>${esc(t('travel_date'))}</span><strong>${fmtDate(b.travelDate)}${b.endDate ? ` → ${fmtDate(b.endDate)}` : ''}</strong></div>
        <div><span>${esc(t('lead_traveler'))}</span><strong>${esc(b.contact.name)}</strong></div>
        <div><span>${esc(t('travelers'))}</span><strong class="num">${b.adults + b.children + b.infants}</strong></div>
        <div><span>${esc(t('payment'))}</span><strong>${b.paymentMethod ? esc(t(`m_${b.paymentMethod}`)) : '—'}</strong></div>
      </div>
      <div class="table-wrap mt-3"><table class="table">
        <thead><tr><th>${esc(t('order_summary'))}</th><th class="r">×</th><th class="r">${esc(t('total'))}</th></tr></thead>
        <tbody>${b.lines.map((l) => `<tr><td>${esc(L(l))}</td><td class="r num">${l.qty}</td><td class="r num">${money(l.amount)}</td></tr>`).join('')}
        ${b.discount ? `<tr><td>${esc(t('discount'))} (${esc(b.promo)})</td><td></td><td class="r num">−${money(b.discount)}</td></tr>` : ''}
        <tr><td><strong>${esc(t('total'))}</strong> <span class="small muted">(${esc(t('vat_included'))}: <span class="num">${money(b.vat, { decimals: 2 })}</span>)</span></td><td></td><td class="r"><strong class="num">${money(b.total)}</strong></td></tr>
        <tr><td>${esc(t('paid'))}</td><td></td><td class="r num">${money(b.paid)}</td></tr>
        <tr><td><strong>${esc(t('outstanding'))}</strong></td><td></td><td class="r"><strong class="num">${money(b.outstanding)}</strong></td></tr></tbody></table></div>
      ${b.travelers.length ? `<h4 class="mt-3">${esc(t('travelers'))}</h4><ul class="muted">${b.travelers.map((x) => `<li>${esc(t(`title_${x.title || 'mr'}`))} ${esc(x.firstName)} ${esc(x.lastName)} <span class="small">(${esc(t(x.type))})</span></li>`).join('')}</ul>` : ''}
      <div class="flex mt-3 no-print">
        ${b.invoiceNo ? `<a class="btn btn-primary" href="/invoice.html?ref=${esc(b.ref)}&t=${esc(q.t || b.token)}">🧾 ${esc(t('view_invoice'))}</a>` : ''}
        <button class="btn btn-outline" onclick="print()">${esc(t('print'))}</button>
        ${b.status === 'pending_payment' && b.paid === 0 ? `<button class="btn btn-ghost" id="cancel-btn" style="color:var(--danger)">${esc(t('cancel_booking'))}</button>` : ''}
      </div>
    </div>
    ${canPay && methods.length ? `<div class="card panel mt-3 no-print" id="pay-panel"><h3>${esc(t('complete_payment'))} · <span class="num">${money(b.outstanding)}</span></h3>
      <div class="flex">${methods.map((m) => `<button class="btn btn-outline" data-m="${m.key}">${esc(t(`m_${m.key}`))}</button>`).join('')}</div>
      <div id="moyasar-box"></div></div>` : ''}`;

  if (b.type === 'flight' && b.meta?.slices) {
    const F = Noor.flightUI;
    const m = b.meta;
    Noor.addPlaces(m.places);
    const tk = b.ticketStatus || 'pending';
    const ticket = b.pnr && tk === 'issued'
      ? `<div class="ticket-box"><div><div class="small muted">${esc(t('pnr'))}</div><div class="pnr">${esc(b.pnr)}</div></div>
          ${b.tickets.length ? `<div><div class="small muted">${esc(t('e_tickets'))}</div><strong class="num">${b.tickets.map(esc).join('<br>')}</strong></div>` : ''}
          <span class="status s-confirmed" style="margin-inline-start:auto">✓ ${esc(t('tk_issued'))}</span></div>`
      : `<div class="alert ${b.paymentStatus === 'paid' ? 'alert-info' : 'alert-warn'}"><strong>${esc(t(b.paymentStatus === 'paid' ? `tk_${tk}` : (tk === 'held' ? 'tk_held' : 'pay_pending_t')))}</strong>${b.pnr ? ` · PNR <span class="num">${esc(b.pnr)}</span>` : ''}<div class="small">${esc(t('tk_note'))}</div></div>`;
    $('#flight-box').innerHTML = `<div class="card panel mt-3"><h3>✈ ${esc(t('flight_summary'))}</h3>${ticket}
      <div class="fl-box mt-2"><div class="fl-main"><div class="fl-airline">${F.logo(m.owner)}<div><strong>${esc(m.owner.name)}</strong><div class="small muted">${esc(L(Noor.site.cabins[m.cabin] || Noor.site.cabins.economy))}</div></div></div>
        <div class="fl-slices">${m.slices.map(F.sliceRow).join('')}</div></div>
        <div class="fl-details">${m.slices.map((sl, i) => F.sliceDetails(sl, t(i ? 'inbound' : 'outbound'))).join('')}</div>
        <div class="fl-foot"><div class="perks">${F.perks({ baggage: m.baggage, refundable: m.refundable })}</div></div></div></div>`;
  }

  $('#copy-ref').addEventListener('click', () => navigator.clipboard?.writeText(b.ref).then(() => toast('✓')));
  $('#cancel-btn')?.addEventListener('click', async () => {
    if (!confirm(t('cancel_booking') + '?')) return;
    try { await api(`/bookings/${b.ref}/cancel`, { method: 'POST', body: { t: q.t } }); location.reload(); } catch (err) { toast(err.message, 'error'); }
  });
  $$('[data-m]').forEach((btn) => btn.addEventListener('click', () => busy(btn, async () => {
    try { await Noor.startPayment(b.ref, q.t || b.token, btn.dataset.m, { box: $('#moyasar-box') }); } catch (err) { toast(err.message, 'error'); }
  })));

  // Bank transfer instructions
  if (bank && canPay && b.bankTransfer) {
    const d = b.bankTransfer;
    $('#bank-box').innerHTML = `<div class="card panel mt-3"><h3>🏦 ${esc(t('bank_details'))}</h3><div class="kv">
      <div><span>${esc(t('bank'))}</span><strong>${esc(d.bank)}</strong></div>
      <div><span>${esc(t('account_name'))}</span><strong>${esc(d.accountName)}</strong></div>
      <div><span>${esc(t('iban'))}</span><strong class="num">${esc(d.iban)}</strong></div>
      <div><span>${esc(t('transfer_ref'))}</span><strong class="num">${esc(b.ref)}</strong></div>
      <div><span>${esc(t('total'))}</span><strong class="num">${money(b.outstanding)}</strong></div></div>
      <a class="btn btn-gold mt-3" target="_blank" rel="noopener" href="https://wa.me/${esc(Noor.site.company.whatsapp)}?text=${encodeURIComponent(`Bank transfer receipt for booking ${b.ref}`)}">WhatsApp</a></div>`;
  }
})();
