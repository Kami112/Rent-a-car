/* Flight search widget: trip type, airport autocomplete with swap, dates,
   travellers & cabin popover. Used on the homepage and the results page. */
(function () {
  'use strict';
  const { t, L, esc, api, addDays } = Noor;
  const DEFAULTS = { trip: 'return', from: 'RUH', to: 'JED', date: addDays(14), returnDate: addDays(21), adults: 1, children: 0, infants: 0, cabin: 'economy' };

  function airportLabel(code) {
    const a = Noor.site.airports[code];
    return a ? `${L({ en: a.en, ar: a.ar })} (${code})` : code;
  }

  function mount(root, initial = {}) {
    const s = { ...DEFAULTS, ...initial };
    if (!initial.returnDate && initial.date && !initial.trip) s.trip = 'oneway';
    if (initial.returnDate) s.trip = 'return';
    ['adults', 'children', 'infants'].forEach((k) => { s[k] = Number(s[k]) || DEFAULTS[k]; });
    if (!initial.adults) s.adults = 1;
    s.children = Number(initial.children) || 0;
    s.infants = Number(initial.infants) || 0;

    root.classList.add('fsw');
    root.innerHTML = `
      <div class="fsw-trip" role="radiogroup">
        <label class="pill"><input type="radio" name="trip" value="return"> <span>${esc(t('round_trip'))}</span></label>
        <label class="pill"><input type="radio" name="trip" value="oneway"> <span>${esc(t('one_way'))}</span></label>
      </div>
      <form class="fsw-grid" autocomplete="off">
        <div class="fsw-od">
          <div class="fsw-field ac" data-k="from"><label>${esc(t('from'))}</label><input class="fsw-input" data-ac="from" required><small class="fsw-sub"></small><div class="ac-list" hidden></div></div>
          <button type="button" class="fsw-swap" aria-label="${esc(t('swap'))}" title="${esc(t('swap'))}">⇄</button>
          <div class="fsw-field ac" data-k="to"><label>${esc(t('to'))}</label><input class="fsw-input" data-ac="to" required><small class="fsw-sub"></small><div class="ac-list" hidden></div></div>
        </div>
        <div class="fsw-dates">
          <div class="fsw-field"><label>${esc(t('depart'))}</label><input class="fsw-input" type="date" name="date" required></div>
          <div class="fsw-field fsw-ret"><label>${esc(t('return'))}</label><input class="fsw-input" type="date" name="returnDate"></div>
        </div>
        <div class="fsw-field fsw-pax"><label>${esc(t('travellers_class'))}</label>
          <button type="button" class="fsw-input fsw-pax-btn" aria-haspopup="dialog"></button>
          <div class="fsw-pop" hidden>
            ${[['adults', 'adults_12'], ['children', 'children'], ['infants', 'infants']].map(([k, lbl]) => `<div class="fsw-row"><span>${esc(t(lbl))}</span><div data-step="${k}"></div></div>`).join('')}
            <div class="fsw-cabins">${Object.entries(Noor.site.cabins).map(([k, c]) => `<label class="pill"><input type="radio" name="cabin" value="${k}"> <span>${esc(L(c))}</span></label>`).join('')}</div>
            <button type="button" class="btn btn-primary btn-sm btn-block fsw-done">${esc(t('done'))}</button>
          </div></div>
        <button class="btn btn-gold btn-lg fsw-go" type="submit">${esc(t('search_flights'))}</button>
      </form>`;

    const $ = (sel) => root.querySelector(sel);
    const form = $('form');
    const setTrip = (v) => {
      s.trip = v;
      root.querySelectorAll('[name=trip]').forEach((r) => { r.checked = r.value === v; });
      root.classList.toggle('is-oneway', v === 'oneway');
      form.returnDate.required = v === 'return';
    };
    root.querySelectorAll('[name=trip]').forEach((r) => r.addEventListener('change', () => setTrip(r.value)));
    setTrip(s.trip);

    // Airports
    const setAirport = (k, code) => {
      s[k] = code;
      const field = $(`[data-k=${k}]`);
      const a = Noor.site.airports[code];
      field.querySelector('input').value = a ? L({ en: a.en, ar: a.ar }) : code;
      field.querySelector('.fsw-sub').textContent = a ? `${code} · ${a.name}` : code;
    };
    setAirport('from', s.from);
    setAirport('to', s.to);
    $('.fsw-swap').addEventListener('click', () => { const f = s.from; setAirport('from', s.to); setAirport('to', f); });

    root.querySelectorAll('.ac').forEach((field) => {
      const k = field.dataset.k;
      const input = field.querySelector('input');
      const list = field.querySelector('.ac-list');
      let seq = 0; let items = []; let active = -1;
      const render = () => {
        list.hidden = !items.length;
        list.innerHTML = items.map((a, i) => `<button type="button" class="ac-item ${i === active ? 'active' : ''}" data-i="${i}">
          <span class="ac-code">${esc(a.code)}</span><span><strong>${esc(L(a.city))}</strong><small>${esc(a.name)} · ${esc(L(a.country))}</small></span></button>`).join('');
      };
      const load = async () => {
        const mine = ++seq;
        const res = await api(`/airports?q=${encodeURIComponent(input.value.trim())}`).catch(() => []);
        if (mine !== seq) return;
        items = res; active = 0; render();
      };
      const pick = (a) => {
        if (!Noor.site.airports[a.code]) Noor.site.airports[a.code] = { en: a.city.en, ar: a.city.ar, name: a.name };
        setAirport(k, a.code); items = []; render();
        if (k === 'from') root.querySelector('[data-k=to] input').focus();
        else form.date.focus();
      };
      input.addEventListener('focus', () => { input.select(); load(); });
      input.addEventListener('input', load);
      input.addEventListener('keydown', (e) => {
        if (list.hidden) return;
        if (e.key === 'ArrowDown') { active = Math.min(items.length - 1, active + 1); render(); e.preventDefault(); }
        if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); render(); e.preventDefault(); }
        if (e.key === 'Enter' && items[active]) { pick(items[active]); e.preventDefault(); }
        if (e.key === 'Escape') { items = []; render(); }
      });
      input.addEventListener('blur', () => setTimeout(() => { items = []; render(); setAirport(k, s[k]); }, 180));
      list.addEventListener('mousedown', (e) => { const b = e.target.closest('[data-i]'); if (b) pick(items[b.dataset.i]); });
    });

    // Dates
    form.date.min = addDays(0);
    form.returnDate.min = addDays(0);
    form.date.value = s.date;
    form.returnDate.value = s.returnDate || addDays(7, new Date(s.date));
    form.date.addEventListener('change', () => {
      form.returnDate.min = form.date.value;
      if (form.returnDate.value < form.date.value) form.returnDate.value = addDays(7, new Date(form.date.value));
    });

    // Travellers & cabin
    const btn = $('.fsw-pax-btn');
    const pop = $('.fsw-pop');
    const summary = () => {
      const n = s.adults + s.children + s.infants;
      btn.innerHTML = `<span>${n} ${esc(t(n === 1 ? 'traveller' : 'travellers_n'))}</span><small>${esc(L(Noor.site.cabins[s.cabin]))}</small>`;
    };
    const steppers = {};
    steppers.adults = Noor.stepper(root.querySelector('[data-step=adults]'), { min: 1, max: 9, value: s.adults, onChange: (v) => { s.adults = v; if (s.infants > v) { s.infants = v; steppers.infants.set(v); } steppers.infants.setMax(v); steppers.children.setMax(9 - v); summary(); } });
    steppers.children = Noor.stepper(root.querySelector('[data-step=children]'), { min: 0, max: 9 - s.adults, value: s.children, onChange: (v) => { s.children = v; steppers.adults.setMax(9 - v); summary(); } });
    steppers.infants = Noor.stepper(root.querySelector('[data-step=infants]'), { min: 0, max: s.adults, value: s.infants, onChange: (v) => { s.infants = v; summary(); } });
    root.querySelectorAll('[name=cabin]').forEach((r) => {
      r.checked = r.value === s.cabin;
      r.addEventListener('change', () => { s.cabin = r.value; summary(); });
    });
    summary();
    btn.addEventListener('click', () => { pop.hidden = !pop.hidden; });
    $('.fsw-done').addEventListener('click', () => { pop.hidden = true; });
    document.addEventListener('click', (e) => { if (!e.target.closest('.fsw-pax')) pop.hidden = true; });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (s.from === s.to) { Noor.toast(t('same_airports'), 'error'); return; }
      const p = new URLSearchParams({ from: s.from, to: s.to, date: form.date.value, adults: s.adults, children: s.children, infants: s.infants, cabin: s.cabin });
      if (s.trip === 'return') p.set('returnDate', form.returnDate.value);
      try {
        const recent = JSON.parse(localStorage.getItem('noor_recent') || '[]').filter((r) => r.q !== p.toString());
        recent.unshift({ q: p.toString(), from: s.from, to: s.to, date: form.date.value });
        localStorage.setItem('noor_recent', JSON.stringify(recent.slice(0, 4)));
      } catch { /* storage unavailable */ }
      location.href = `/flights.html?${p}`;
    });
    return { state: s, airportLabel };
  }


  // ---------------------------------------------------------- shared flight UI
  const COLORS = { SV: '#0a6b50', XY: '#6b2c91', F3: '#8fa300', EK: '#d71921', QR: '#5c0632', EY: '#b08d57', TK: '#c70a0c', GF: '#a0864a', WY: '#8a6d3b', MS: '#0b3b7a', RJ: '#1f2a44', ZZ: '#3d3d3d' };
  const hm = (iso) => iso.slice(11, 16);
  const dur = (m) => `<bdi>${Math.floor(m / 60)}${t('h')} ${String(m % 60).padStart(2, '0')}${t('m')}</bdi>`;
  const dayDiff = (a, b) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 864e5);
  const city = (code) => { const a = Noor.site.airports[code]; return a ? L({ en: a.en, ar: a.ar }) : code; };

  function logo(owner) {
    const badge = `<span class="airline-logo" style="background:${COLORS[owner.code] || 'var(--brand)'}">${esc(owner.code || '✈')}</span>`;
    return owner.logo ? `<img class="airline-img" src="${esc(owner.logo)}" alt="" loading="lazy" onerror="this.outerHTML='${badge.replace(/"/g, '&quot;')}'">` : badge;
  }

  function sliceRow(sl) {
    const plus = dayDiff(sl.departAt, sl.arriveAt);
    const stops = sl.stops ? `${sl.stops} ${t(sl.stops === 1 ? 'stop' : 'stops_n')} · ${sl.layovers.map((l) => l.airport).join(', ')}` : t('direct');
    return `<div class="fl-slice">
      <div class="fl-t"><strong class="num">${hm(sl.departAt)}</strong><span>${esc(sl.origin)}</span></div>
      <div class="fl-mid"><span class="small muted">${dur(sl.durationMin)}</span><div class="fl-line ${sl.stops ? 'has-stop' : ''}">${sl.layovers.map(() => '<i></i>').join('')}</div><span class="small ${sl.stops ? 'stop-txt' : 'direct-txt'}">${esc(stops)}</span></div>
      <div class="fl-t"><strong class="num">${hm(sl.arriveAt)}${plus ? `<sup>+${plus}</sup>` : ''}</strong><span>${esc(sl.destination)}</span></div>
    </div>`;
  }

  function sliceDetails(sl, label) {
    const segs = sl.segments.map((g, i) => {
      const lay = i > 0 ? sl.layovers[i - 1] : null;
      return `${lay ? `<div class="fl-layover">⏱ ${esc(t('layover'))} ${dur(lay.durationMin)} · ${esc(L({ en: lay.city, ar: lay.cityAr }))} (${esc(lay.airport)})</div>` : ''}
        <div class="fl-seg">
          <div class="fl-seg-times"><strong class="num">${hm(g.departAt)}</strong><span class="muted small">${dur(g.durationMin)}</span><strong class="num">${hm(g.arriveAt)}</strong></div>
          <div class="fl-seg-track"><i></i><b></b><i></i></div>
          <div class="fl-seg-info"><div><strong>${esc(city(g.origin))}</strong> <span class="muted">(${esc(g.origin)}) · ${Noor.fmtDate(g.departAt.slice(0, 10), { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
            <div class="small muted">${esc(g.carrierName)} · <span class="num">${esc(g.flightNo)}</span>${g.aircraft ? ` · ${esc(g.aircraft)}` : ''}${g.operatedBy ? ` · ${esc(t('operated_by'))} ${esc(g.operatedBy)}` : ''}</div>
            <div><strong>${esc(city(g.destination))}</strong> <span class="muted">(${esc(g.destination)}) · ${Noor.fmtDate(g.arriveAt.slice(0, 10), { weekday: 'short', day: 'numeric', month: 'short' })}</span></div></div>
        </div>`;
    }).join('');
    return `<div class="fl-detail"><div class="fl-detail-h"><strong>${esc(label)}</strong> · ${esc(city(sl.origin))} → ${esc(city(sl.destination))} · ${Noor.fmtDate(sl.departAt.slice(0, 10), { weekday: 'short', day: 'numeric', month: 'short' })}</div>${segs}</div>`;
  }

  function perks(o) {
    return `<span class="perk ${o.baggage.checked ? 'ok' : 'no'}">🧳 ${o.baggage.checked ? `${o.baggage.checked} × 23${t('kg')}` : esc(t('no_checked_bag'))}</span>
      <span class="perk ok">👜 ${esc(t('cabin_bag'))}</span>
      <span class="perk ${o.refundable ? 'ok' : 'no'}">${o.refundable ? '↺ ' + esc(t('refundable')) : '✕ ' + esc(t('non_refundable'))}</span>`;
  }

  Noor.flightUI = { logo, sliceRow, sliceDetails, perks, dur, hm, city };

  Noor.flightSearch = mount;
  Noor.airportLabel = airportLabel;
})();
