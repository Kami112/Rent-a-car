(async function () {
  const { t, L, esc, $, $$, qs, api, money, fmtDate } = Noor;
  await Noor.init('nav_flights');
  const F = Noor.flightUI;
  const q = qs();
  const has = q.from && q.to && q.date;
  const search = Noor.flightSearch($('#fl-search'), has ? q : {});
  const pax = { adults: Number(q.adults) || 1, children: Number(q.children) || 0, infants: Number(q.infants) || 0 };
  const nPax = pax.adults + pax.children + pax.infants;

  // ---- summary bar
  const renderSummary = () => { $('#fl-summary').innerHTML = has ? `<div class="fl-route"><strong>${esc(F.city(q.from))} <span class="num muted">${esc(q.from)}</span> ${q.returnDate ? '⇄' : '→'} ${esc(F.city(q.to))} <span class="num muted">${esc(q.to)}</span></strong>
      <span class="small">${fmtDate(q.date, { weekday: 'short', day: 'numeric', month: 'short' })}${q.returnDate ? ` – ${fmtDate(q.returnDate, { weekday: 'short', day: 'numeric', month: 'short' })}` : ''} · ${nPax} ${esc(t(nPax === 1 ? 'traveller' : 'travellers_n'))} · ${esc(L(Noor.site.cabins[q.cabin] || Noor.site.cabins.economy))}</span></div>
      <button class="btn btn-gold btn-sm" id="modify" type="button">${esc(t('modify_search'))}</button>` : '';
    $('#modify')?.addEventListener('click', () => $('#fl-search').classList.toggle('hidden'));
  };
  renderSummary();
  if (!has) $('#fl-search').classList.remove('hidden');

  if (!has) {
    $('#fl-list').innerHTML = `<div class="card empty">${esc(t('flights_sub'))}</div>`;
    $('.fl-layout').classList.add('no-filters');
    return;
  }

  // ---- state
  const st = { sort: 'cheapest', stops: new Set(), airlines: new Set(), times: new Set(), maxPrice: null, bags: false, refundable: false, open: new Set(), limit: 15 };
  let data;
  $('#fl-list').innerHTML = `<div class="fl-loading card"><div class="plane">✈</div><p>${esc(t('searching'))}</p></div>` + '<div class="skeleton" style="height:150px;margin-top:14px"></div>'.repeat(3);
  try {
    data = await api(`/flights/search?${new URLSearchParams(q)}`);
    Noor.addPlaces(data.places);
    renderSummary();
  } catch (err) {
    $('#fl-list').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    return;
  }
  const offers = data.offers;
  const bestScore = (o) => o.total / 100 + o.slices.reduce((s, sl) => s + sl.durationMin * 1.2 + sl.stops * 90, 0);
  const minBy = (list, f) => (list.length ? list.reduce((a, b) => (f(b) < f(a) ? b : a)) : null);

  // ---- fare calendar
  if (data.calendar?.length) {
    const lowest = Math.min(...data.calendar.filter((c) => c.price).map((c) => c.price));
    $('#fl-cal').innerHTML = data.calendar.map((c) => {
      const p = new URLSearchParams({ ...q, date: c.date });
      return `<a class="fl-day ${c.date === q.date ? 'active' : ''} ${c.price === lowest ? 'low' : ''}" href="?${p}">
        <span>${fmtDate(c.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span><strong class="num">${c.price ? money(c.price) : '—'}</strong></a>`;
    }).join('');
  } else {
    const shift = (n) => { const d = new Date(`${q.date}T00:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    $('#fl-cal').innerHTML = `<a class="fl-day" href="?${new URLSearchParams({ ...q, date: shift(-1) })}">‹ ${esc(t('prev_day'))}</a>
      <span class="fl-day active"><strong>${fmtDate(q.date, { weekday: 'short', day: 'numeric', month: 'short' })}</strong></span>
      <a class="fl-day" href="?${new URLSearchParams({ ...q, date: shift(1) })}">${esc(t('next_day'))} ›</a>`;
  }

  if (!offers.length) {
    $('#fl-list').innerHTML = `<div class="card empty"><h3>${esc(t('no_flights'))}</h3><p>${esc(t('no_flights_d'))}</p></div>`;
    $('.fl-layout').classList.add('no-filters');
    return;
  }

  // ---- filters
  const bucket = (iso) => { const h = Number(iso.slice(11, 13)); return h < 6 ? 'early' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; };
  const airlineMin = new Map();
  for (const o of offers) {
    const cur = airlineMin.get(o.owner.code);
    if (!cur || o.total < cur.total) airlineMin.set(o.owner.code, { name: o.owner.name, total: o.total });
  }
  const stopKey = (o) => Math.min(2, Math.max(...o.slices.map((s) => s.stops)));
  const stopMin = [0, 1, 2].map((k) => minBy(offers.filter((o) => stopKey(o) === k), (o) => o.total));
  const maxAll = Math.max(...offers.map((o) => o.total));
  const minAll = Math.min(...offers.map((o) => o.total));
  st.maxPrice = maxAll;

  $('#fl-filters').innerHTML = `<div class="flex between"><h3 class="mb-0">${esc(t('filters'))}</h3><button class="btn btn-ghost btn-sm" id="f-reset" type="button">${esc(t('reset'))}</button></div>
    <div class="f-group"><h4>${esc(t('stops'))}</h4>${['direct', 'one_stop', 'two_stops'].map((k, i) => (stopMin[i] ? `<label class="check f-row"><input type="checkbox" data-f="stops" value="${i}"><span class="grow">${esc(t(k))}</span><span class="num small muted">${money(stopMin[i].total)}</span></label>` : '')).join('')}</div>
    <div class="f-group"><h4>${esc(t('price'))}</h4><input type="range" id="f-price" min="${minAll}" max="${maxAll}" step="500" value="${maxAll}" style="width:100%;accent-color:var(--brand)">
      <div class="flex between small"><span class="num">${money(minAll)}</span><span class="num" id="f-price-v">${money(maxAll)}</span></div></div>
    <div class="f-group"><h4>${esc(t('departure_time'))}</h4><div class="f-times">${[['early', '00–06', '🌙'], ['morning', '06–12', '🌅'], ['afternoon', '12–18', '☀️'], ['evening', '18–24', '🌆']].map(([k, r, ic]) => `<label class="f-time"><input type="checkbox" data-f="times" value="${k}"><span>${ic}<b>${esc(t(`t_${k}`))}</b><small class="num">${r}</small></span></label>`).join('')}</div></div>
    <div class="f-group"><h4>${esc(t('airlines'))}</h4>${[...airlineMin.entries()].sort((a, b) => a[1].total - b[1].total).map(([code, a]) => `<label class="check f-row"><input type="checkbox" data-f="airlines" value="${esc(code)}"><span class="grow">${esc(a.name)}</span><span class="num small muted">${money(a.total)}</span></label>`).join('')}</div>
    <div class="f-group"><h4>${esc(t('more'))}</h4>
      <label class="check f-row"><input type="checkbox" id="f-bags"><span>${esc(t('baggage_included'))}</span></label>
      <label class="check f-row"><input type="checkbox" id="f-ref"><span>${esc(t('refundable_only'))}</span></label></div>
    <button class="btn btn-primary btn-block fl-apply" type="button">${esc(t('show_results'))}</button>`;

  $('#fl-filters').addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.f) { const set = st[el.dataset.f]; if (el.checked) set.add(el.value); else set.delete(el.value); }
    if (el.id === 'f-bags') st.bags = el.checked;
    if (el.id === 'f-ref') st.refundable = el.checked;
    st.limit = 15;
    render();
  });
  $('#f-price').addEventListener('input', (e) => { st.maxPrice = Number(e.target.value); $('#f-price-v').textContent = money(st.maxPrice); render(); });
  $('#f-reset').addEventListener('click', () => {
    st.stops.clear(); st.airlines.clear(); st.times.clear(); st.bags = false; st.refundable = false; st.maxPrice = maxAll;
    $$('#fl-filters input[type=checkbox]').forEach((i) => { i.checked = false; });
    $('#f-price').value = maxAll; $('#f-price-v').textContent = money(maxAll);
    render();
  });
  const toggleFilters = (open) => { $('#fl-filters').classList.toggle('open', open); document.body.classList.toggle('no-scroll', open); };
  $('#fl-filter-btn').textContent = `⚙ ${t('filters')}`;
  $('#fl-filter-btn').addEventListener('click', () => toggleFilters(true));
  $('.fl-apply').addEventListener('click', () => toggleFilters(false));

  // ---- sorting
  const filtered = () => offers.filter((o) => (!st.stops.size || st.stops.has(String(stopKey(o))))
    && (!st.airlines.size || st.airlines.has(o.owner.code))
    && (!st.times.size || st.times.has(bucket(o.slices[0].departAt)))
    && o.total <= st.maxPrice && (!st.bags || o.baggage.checked > 0) && (!st.refundable || o.refundable));
  const sorters = {
    cheapest: (a, b) => a.total - b.total,
    fastest: (a, b) => a.slices.reduce((s, x) => s + x.durationMin, 0) - b.slices.reduce((s, x) => s + x.durationMin, 0),
    best: (a, b) => bestScore(a) - bestScore(b),
    earliest: (a, b) => a.slices[0].departAt.localeCompare(b.slices[0].departAt),
  };

  function renderSort(list) {
    const pick = (k) => minBy(list, (o) => (k === 'cheapest' ? o.total : k === 'fastest' ? o.slices.reduce((s, x) => s + x.durationMin, 0) : bestScore(o)));
    $('#fl-sort').innerHTML = ['cheapest', 'best', 'fastest'].map((k) => {
      const o = pick(k);
      return `<button type="button" role="tab" class="fl-sort-tab ${st.sort === k ? 'active' : ''}" data-sort="${k}"><span>${esc(t(`sort_${k}`))}</span>
        ${o ? `<strong class="num">${money(o.total)}</strong><small>${F.dur(o.slices.reduce((s, x) => s + x.durationMin, 0))}</small>` : ''}</button>`;
    }).join('');
  }
  $('#fl-sort').addEventListener('click', (e) => { const b = e.target.closest('[data-sort]'); if (b) { st.sort = b.dataset.sort; render(); } });

  function card(o) {
    const open = st.open.has(o.id);
    return `<article class="card fl-card ${open ? 'open' : ''}">
      <div class="fl-main">
        <div class="fl-airline">${F.logo(o.owner)}<div><strong>${esc(o.owner.name)}</strong><div class="small muted">${[...new Set(o.slices.flatMap((s) => s.segments.map((g) => g.flightNo)))].slice(0, 2).map(esc).join(' · ')}</div></div></div>
        <div class="fl-slices">${o.slices.map(F.sliceRow).join('')}</div>
        <div class="fl-price">
          <div class="price num">${money(o.total)}</div>
          <div class="small muted">${nPax > 1 ? `${esc(t('total_for'))} ${nPax} · ${money(Math.round(o.total / nPax))} / ${esc(t('person'))}` : esc(t('per_person_total'))}</div>
          <a class="btn btn-primary btn-block mt-1" href="/checkout.html?${new URLSearchParams({ type: 'flight', id: o.id, ...pax })}">${esc(t('select'))}</a>
        </div>
      </div>
      <div class="fl-foot"><div class="perks">${F.perks(o)}</div><button class="btn btn-ghost btn-sm" data-open="${esc(o.id)}" type="button">${esc(t(open ? 'hide_details' : 'flight_details'))} ${open ? '▴' : '▾'}</button></div>
      ${open ? `<div class="fl-details">${o.slices.map((s, i) => F.sliceDetails(s, t(i ? 'inbound' : 'outbound'))).join('')}
        <div class="fl-fare"><span>${esc(t('fare_rules'))}:</span> ${o.refundable ? esc(t('rule_refund')) : esc(t('rule_norefund'))} · ${o.changeable ? esc(t('rule_change')) : esc(t('rule_nochange'))}</div></div>` : ''}
    </article>`;
  }

  function render() {
    const list = filtered().sort(sorters[st.sort]);
    renderSort(filtered());
    $('#fl-count').textContent = `${list.length} ${t('flights_found')}${data.provider === 'demo' ? ` · ${t('demo_fares')}` : ''}`;
    $('#fl-list').innerHTML = list.length
      ? list.slice(0, st.limit).map(card).join('') + (list.length > st.limit ? `<button class="btn btn-outline btn-block mt-2" id="more" type="button">${esc(t('show_more'))} (${list.length - st.limit})</button>` : '')
      : `<div class="card empty">${esc(t('no_filter_results'))}</div>`;
    $('#more')?.addEventListener('click', () => { st.limit += 15; render(); });
  }
  $('#fl-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (!b) return;
    if (st.open.has(b.dataset.open)) st.open.delete(b.dataset.open); else st.open.add(b.dataset.open);
    render();
  });
  void search;
  render();
})();
