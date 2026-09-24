(async function () {
  const { t, lang, L, esc, $, $$, qs, api, money, fmtDate, stepper, busy, payLogos } = Noor;
  const { me } = await Noor.init();
  const q = qs();
  const type = q.type;
  const base = type === 'flight' ? { type, id: q.id } : { type, id: q.id, date: q.date, endDate: q.endDate, rooms: q.rooms };
  const pax = { adults: Number(q.adults) || 1, children: Number(q.children) || 0, infants: Number(q.infants) || 0 };
  let promo = '';
  let quote = null;

  if (me) {
    $('#c-name').value = me.name || '';
    $('#c-email').value = me.email || '';
    $('#c-phone').value = me.phone || '';
  }
  $('#sum-logos').innerHTML = payLogos();

  // ---- Travelers (hotels only need the lead guest) ----
  if (type === 'hotel') $('#travelers-panel').classList.add('hidden');
  const saved = [];
  function flightTravelers() {
    $$('.traveler').forEach((el, i) => { saved[i] = Object.fromEntries($$('input,select', el).map((x) => [x.name, x.value])); });
    const kinds = [...Array(pax.adults).fill('adult'), ...Array(pax.children).fill('child'), ...Array(pax.infants).fill('infant')];
    const intl = !quote.meta.domestic;
    const countries = Object.entries(Noor.site.countries).sort((a, b) => (a[0] === 'SA' ? -1 : b[0] === 'SA' ? 1 : L({ en: a[1][0], ar: a[1][1] }).localeCompare(L({ en: b[1][0], ar: b[1][1] }))));
    const natOpts = (v) => `<option value="">${esc(t('select_country'))}</option>` + countries.map(([code, n]) => `<option value="${code}" ${v === code ? 'selected' : ''}>${esc(L({ en: n[0], ar: n[1] }))}</option>`).join('');
    $('#travelers').innerHTML = `<p class="small muted mt-0">✎ ${esc(t('name_hint'))}</p>` + kinds.map((k, i) => {
      const sv = saved[i] || {};
      const v = (n) => esc(sv[n] || '');
      return `<div class="traveler" data-kind="${k}"><h4>${esc(t('traveler'))} ${i + 1} · <span class="muted">${esc(t(k))}</span></h4>
        <div class="form-grid">
          <div class="field"><label>${esc(t('first_name'))}</label><div class="flex" style="flex-wrap:nowrap">
            <select class="input" name="title" style="width:96px">${['mr', 'mrs', 'ms'].map((x) => `<option value="${x}" ${sv.title === x ? 'selected' : ''}>${esc(t(`title_${x}`))}</option>`).join('')}</select>
            <input class="input" name="firstName" required value="${v('firstName')}" autocomplete="off" dir="ltr" pattern="[A-Za-z][A-Za-z '\-]*"></div></div>
          <div class="field"><label>${esc(t('last_name'))}</label><input class="input" name="lastName" required value="${v('lastName')}" autocomplete="off" dir="ltr" pattern="[A-Za-z][A-Za-z '\-]*"></div>
          <div class="field"><label>${esc(t('gender'))}</label><select class="input" name="gender"><option value="m" ${sv.gender !== 'f' ? 'selected' : ''}>${esc(t('male'))}</option><option value="f" ${sv.gender === 'f' ? 'selected' : ''}>${esc(t('female'))}</option></select></div>
          <div class="field"><label>${esc(t('dob'))}</label><input class="input" type="date" name="dob" required value="${v('dob')}" max="${Noor.addDays(0)}"></div>
          <div class="field"><label>${esc(t('nationality'))}</label><select class="input" name="nationality" ${intl ? 'required' : ''}>${natOpts(sv.nationality || (i === 0 ? 'SA' : ''))}</select></div>
          ${intl ? `<div class="field"><label>${esc(t('passport_no'))}</label><input class="input num" name="passport" required value="${v('passport')}" style="text-transform:uppercase" dir="ltr"></div>
          <div class="field"><label>${esc(t('passport_expiry'))}</label><input class="input" type="date" name="passportExpiry" required value="${v('passportExpiry')}" min="${Noor.addDays(1)}"></div>` : ''}
        </div></div>`;
    }).join('');
    $$('#travelers select[name=title]').forEach((sel) => sel.addEventListener('change', () => {
      const g = sel.closest('.traveler').querySelector('[name=gender]');
      if (sel.value !== 'mr') g.value = 'f'; else g.value = 'm';
    }));
  }

  function renderFlight() {
    const F = Noor.flightUI;
    const m = quote.meta;
    const panel = $('#flight-panel');
    panel.classList.remove('hidden');
    panel.innerHTML = `<div class="flex between"><h3 class="mb-0">✈ ${esc(t('flight_summary'))}</h3><span id="fare-timer" class="small muted"></span></div>
      <div class="fl-box mt-2"><div class="fl-main"><div class="fl-airline">${F.logo(m.owner)}<div><strong>${esc(m.owner.name)}</strong><div class="small muted">${esc(L(Noor.site.cabins[m.cabin] || Noor.site.cabins.economy))}</div></div></div>
        <div class="fl-slices">${m.slices.map(F.sliceRow).join('')}</div></div>
        <div class="fl-foot"><div class="perks">${F.perks({ baggage: m.baggage, refundable: m.refundable })}</div><button class="btn btn-ghost btn-sm" type="button" id="fl-more">${esc(t('flight_details'))} ▾</button></div>
        <div class="fl-details hidden" id="fl-det">${m.slices.map((sl, i) => F.sliceDetails(sl, t(i ? 'inbound' : 'outbound'))).join('')}</div></div>`;
    $('#fl-more').onclick = () => $('#fl-det').classList.toggle('hidden');
    if (m.expiresAt) {
      const tick = () => {
        const left = Math.max(0, Date.parse(m.expiresAt) - Date.now());
        $('#fare-timer').textContent = `⏱ ${t('fare_expires')} ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
        if (!left) { clearInterval(timer); showError(Noor.lang === 'ar' ? 'انتهت صلاحية السعر. يرجى البحث مرة أخرى.' : 'This fare has expired. Please search again.'); $('#pay-btn').disabled = true; }
      };
      const timer = setInterval(tick, 1000);
      tick();
    }
  }

  function renderTravelers() {
    if (type === 'hotel') return;
    if (type === 'flight') return flightTravelers();
    $$('.traveler').forEach((el, i) => { saved[i] = Object.fromEntries($$('input,select', el).map((x) => [x.name, x.value])); });
    const kinds = [...Array(pax.adults).fill('adult'), ...Array(pax.children).fill('child'), ...Array(pax.infants).fill('infant')];
    const intl = type !== 'package' || !['domestic', 'umrah'].includes(quote?.meta?.category);
    $('#travelers').innerHTML = `<div class="form-grid mb-0" style="margin-bottom:16px">
        <div class="field"><span class="label">${esc(t(type === 'visa' ? 'applicants' : 'adults'))}</span><div id="px-adults"></div></div>
        ${type === 'visa' ? '' : `<div class="field"><span class="label">${esc(t('children'))}</span><div id="px-children"></div></div>
        <div class="field"><span class="label">${esc(t('infants'))}</span><div id="px-infants"></div></div>`}
      </div>` + kinds.map((k, i) => {
      const s = saved[i] || {};
      const v = (n) => esc(s[n] || '');
      return `<div class="traveler" data-kind="${k}"><h4>${esc(t('traveler'))} ${i + 1} · <span class="muted">${esc(t(k))}</span></h4>
        <div class="form-grid">
          <div class="field"><label>${esc(t('first_name'))}</label><div class="flex" style="flex-wrap:nowrap">
            <select class="input" name="title" style="width:92px">${['mr', 'mrs', 'ms'].map((x) => `<option value="${x}" ${s.title === x ? 'selected' : ''}>${esc(t(`title_${x}`))}</option>`).join('')}</select>
            <input class="input" name="firstName" required value="${v('firstName')}" autocomplete="off"></div></div>
          <div class="field"><label>${esc(t('last_name'))}</label><input class="input" name="lastName" required value="${v('lastName')}" autocomplete="off"></div>
          <div class="field"><label>${esc(t('dob'))}</label><input class="input" type="date" name="dob" value="${v('dob')}"></div>
          <div class="field"><label>${esc(t('nationality'))}</label><input class="input" name="nationality" value="${v('nationality') || (i === 0 ? '' : '')}" list="nat-list"></div>
          ${intl ? `<div class="field"><label>${esc(t('passport_no'))}</label><input class="input num" name="passport" value="${v('passport')}" style="text-transform:uppercase"></div>` : ''}
        </div></div>`;
    }).join('') + `<datalist id="nat-list">${['Saudi Arabia', 'Egypt', 'Pakistan', 'India', 'Jordan', 'Yemen', 'Sudan', 'Syria', 'Philippines', 'Bangladesh', 'Indonesia', 'United Kingdom', 'United States'].map((n) => `<option value="${n}">`).join('')}</datalist>`;
    stepper($('#px-adults'), { min: 1, max: 9, value: pax.adults, onChange: (v) => { pax.adults = v; pax.infants = Math.min(pax.infants, v); refresh(true); } });
    if (type !== 'visa') {
      stepper($('#px-children'), { min: 0, max: 8, value: pax.children, onChange: (v) => { pax.children = v; refresh(true); } });
      stepper($('#px-infants'), { min: 0, max: pax.adults, value: pax.infants, onChange: (v) => { pax.infants = v; refresh(true); } });
    }
  }

  // ---- Add-ons ----
  const addons = await api(`/addons/${encodeURIComponent(type || '')}`).catch(() => []);
  if (addons.length) {
    $('#addons-panel').classList.remove('hidden');
    $('#addons').innerHTML = addons.map((a) => `<label class="addon"><input type="checkbox" value="${a.key}">
      <div class="grow"><strong>${esc(L(a))}</strong><div class="small muted">${esc(t(a.per === 'booking' ? 'per_booking' : 'per_traveler'))}</div></div>
      <strong class="num">+${money(a.price)}</strong></label>`).join('');
    $('#addons').addEventListener('change', () => refresh());
  }
  const selectedAddons = () => $$('#addons input:checked').map((i) => i.value);

  // ---- Quote & summary ----
  const input = () => ({ ...base, ...pax, addons: selectedAddons(), promo });
  let seq = 0;
  async function refresh(travelersChanged = false) {
    const mine = ++seq;
    try {
      const qt = await api('/quote', { method: 'POST', body: input() });
      if (mine !== seq) return;
      const first = !quote;
      quote = qt;
      if (first && type === 'flight') renderFlight();
      if (first || travelersChanged) renderTravelers();
      renderSummary();
      renderMethods();
      $('#co-error-top').innerHTML = '';
      $('#pay-btn').disabled = false;
    } catch (err) {
      if (mine !== seq) return;
      if (!quote) {
        $('#co-error-top').innerHTML = `<div class="alert alert-error">${esc(err.message)} <a href="javascript:history.back()">←</a></div>`;
        $('#co').classList.add('hidden');
      } else {
        showError(err.message);
      }
    }
  }

  function renderSummary() {
    $('#sum-title').textContent = lang === 'ar' ? quote.titleAr : quote.title;
    $('#sum-dates').textContent = [quote.date && fmtDate(quote.date), quote.endDate && fmtDate(quote.endDate)].filter(Boolean).join(' → ');
    $('#sum-lines').innerHTML = quote.lines.map((l) => `<div class="summary-row"><span class="l">${esc(L(l))} <span class="muted num">× ${l.qty}</span></span><span class="num">${money(l.amount)}</span></div>`).join('')
      + (quote.discount ? `<div class="summary-row" style="color:var(--success)"><span>${esc(t('discount'))} (${esc(quote.promo)})</span><span class="num">−${money(quote.discount)}</span></div>` : '')
      + `<div class="summary-row total"><span>${esc(t('total'))}</span><span class="num">${money(quote.total)}</span></div>
         <div class="summary-row small muted" style="padding:0"><span>${esc(t('vat_included'))}</span><span class="num">${money(quote.vat, { decimals: 2 })}</span></div>`;
    updatePayLabel();
  }

  const methodInfo = {
    card: { title: 'pay_card', desc: 'pay_card_d', logos: '<span class="pay-logo mada">ma<b>da</b></span><span class="pay-logo visa">VISA</span><span class="pay-logo apple">Apple Pay</span>' },
    tabby: { title: 'pay_tabby', desc: 'pay_tabby_d', logos: '<span class="pay-logo tabby">tabby</span>' },
    tamara: { title: 'pay_tamara', desc: 'pay_tamara_d', logos: '<span class="pay-logo tamara">tamara</span>' },
    bank_transfer: { title: 'pay_bank', desc: 'pay_bank_d', logos: '<span class="pay-logo bank">SNB</span>' },
  };

  function plan(total, n) {
    const each = Math.floor(total / n);
    const first = total - each * (n - 1);
    return `<div class="plan" style="grid-template-columns:repeat(${n},1fr)">${Array.from({ length: n }, (_, i) => `<div><strong class="num">${money(i ? each : first, { decimals: 2 })}</strong>${esc(i ? t('in_months', { n: i }) : t('today'))}</div>`).join('')}</div>`;
  }

  function renderMethods() {
    const current = $('input[name=method]:checked')?.value;
    const tamaraN = $('#tamara-n')?.value || '4';
    const sandbox = quote.paymentMethods.some((m) => m.sandbox);
    $('#sandbox-banner').innerHTML = sandbox ? `<div class="sandbox-banner">${esc(t('sandbox_note'))}</div>` : '';
    $('#methods').innerHTML = quote.paymentMethods.map((m, i) => {
      const info = methodInfo[m.key];
      let extra = '';
      if (m.key === 'tabby') extra = plan(quote.total, 4);
      if (m.key === 'tamara') {
        extra = `<div class="flex"><label class="small" for="tamara-n">${esc(t('instalments'))}</label><select class="input" id="tamara-n" style="width:90px;height:40px">
          <option ${tamaraN === '3' ? 'selected' : ''}>3</option><option ${tamaraN === '4' ? 'selected' : ''}>4</option></select></div><div id="tamara-plan">${plan(quote.total, Number(tamaraN))}</div>`;
      }
      const checked = current ? current === m.key : i === 0;
      return `<label class="pay-method"><input type="radio" name="method" value="${m.key}" ${checked ? 'checked' : ''}>
        <div><div class="title">${esc(t(info.title))}</div><div class="desc">${esc(t(info.desc))}</div></div>
        <div class="pay-logos">${info.logos}</div>${extra ? `<div class="extra">${extra}</div>` : ''}</label>`;
    }).join('');
    $('#tamara-n')?.addEventListener('change', (e) => { $('#tamara-plan').innerHTML = plan(quote.total, Number(e.target.value)); });
    updatePayLabel();
  }

  function updatePayLabel() {
    const m = $('input[name=method]:checked')?.value;
    $('#pay-btn').innerHTML = m === 'bank_transfer' ? esc(t('confirm_booking')) : `🔒 ${esc(t('pay_now'))} <span class="num">${money(quote.total)}</span>`;
  }
  $('#methods').addEventListener('change', updatePayLabel);

  // ---- Promo ----
  $('#promo-btn').addEventListener('click', async () => {
    const code = $('#promo').value.trim();
    if (promo) { promo = ''; $('#promo').value = ''; $('#promo-btn').textContent = t('apply'); $('#promo-msg').textContent = ''; return refresh(); }
    if (!code) return;
    try {
      const r = await api('/promo/check', { method: 'POST', body: { ...input(), promo: code } });
      promo = r.promo;
      $('#promo-msg').innerHTML = `<span style="color:var(--success)">✓ −${money(r.discount)}</span>`;
      $('#promo-btn').textContent = t('remove');
      refresh();
    } catch (err) {
      $('#promo-msg').innerHTML = `<span style="color:var(--danger)">${esc(err.message)}</span>`;
    }
  });

  // ---- Submit ----
  function showError(msg) {
    const el = $('#co-err');
    el.textContent = msg;
    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  $('#co').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#co-err').classList.add('hidden');
    let bad = null;
    $$('#co [required]').forEach((el) => {
      const invalid = !el.value.trim() || (el.type === 'email' && !el.checkValidity());
      el.setAttribute('aria-invalid', String(invalid));
      if (invalid && !bad) bad = el;
    });
    if (bad) { bad.focus(); return showError(t('required')); }
    if (!$('#terms').checked) return showError(lang === 'ar' ? 'يرجى الموافقة على الشروط وسياسة الإلغاء.' : 'Please accept the terms and cancellation policy.');
    const method = $('input[name=method]:checked')?.value;
    const travelers = $$('.traveler').map((el) => ({ type: el.dataset.kind, ...Object.fromEntries($$('input,select', el).map((x) => [x.name, x.value])) }));

    await busy($('#pay-btn'), async () => {
      let booking;
      try {
        booking = await api('/bookings', {
          method: 'POST',
          body: {
            ...input(), travelers, acceptTerms: true, notes: $('#c-notes').value,
            contact: { name: $('#c-name').value, email: $('#c-email').value, phone: $('#c-phone').value },
          },
        });
      } catch (err) { return showError(err.message); }
      try {
        await Noor.startPayment(booking.ref, booking.token, method, { instalments: $('#tamara-n')?.value, box: $('#moyasar-box') });
      } catch (err) {
        // Booking exists; send the customer to it so they can retry without duplicating.
        location.href = `/booking.html?ref=${booking.ref}&t=${booking.token}&payment=failed&msg=${encodeURIComponent(err.message)}`;
      }
    });
  });

  if (!type) {
    $('#co').classList.add('hidden');
    $('#co-error-top').innerHTML = `<div class="alert alert-info">${esc(t('no_results'))} <a href="/packages.html">${esc(t('view_all'))}</a></div>`;
  } else {
    refresh();
  }
})();
