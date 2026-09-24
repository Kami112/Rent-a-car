(async function () {
  const { t, L, esc, $, qs, api, money, addDays, fmtDate } = Noor;
  const { site } = await Noor.init('nav_flights');
  const form = $('#fs');
  const q = qs();
  const colors = { SV: '#0a6b50', XY: '#6b2c91', F3: '#c3d600', EK: '#d71921', QR: '#5c0632', TK: '#c70a0c' };

  const opts = Object.entries(site.airports).map(([c, a]) => `<option value="${c}">${esc(L(a))} (${c})</option>`).join('');
  $('#fs-from').innerHTML = opts;
  $('#fs-to').innerHTML = opts;
  $('#fs-cabin').innerHTML = Object.entries(site.cabins).map(([k, c]) => `<option value="${k}">${esc(L(c))}</option>`).join('');
  form.date.min = addDays(0);
  form.returnDate.min = addDays(0);
  form.from.value = q.from || 'RUH';
  form.to.value = q.to || 'JED';
  form.date.value = q.date || addDays(10);
  form.returnDate.value = q.returnDate || '';
  form.adults.value = q.adults || '1';
  form.children.value = q.children || '0';
  form.infants.value = q.infants || '0';
  form.cabin.value = q.cabin || 'economy';

  let sel = { out: null, in: null };
  let last = null;

  const dur = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;
  function row(f, leg) {
    const chosen = sel[leg]?.id === f.id;
    return `<div class="flight-row ${chosen ? 'selected' : ''}">
      <div class="airline"><span class="airline-logo" style="background:${colors[f.airlineCode] || 'var(--brand)'}">${esc(f.airlineCode)}</span>
        <div><strong>${esc(f.airline)}</strong><div class="small muted num">${esc(f.flightNo)}</div></div></div>
      <div class="route">
        <div><strong class="num">${f.departTime}</strong><span class="small muted">${f.origin}</span></div>
        <div><div class="line"></div><div class="dur num">${dur(f.durationMin)} · ${f.stops ? `${f.stops} ${esc(t('stop'))}` : esc(t('direct'))}</div></div>
        <div><strong class="num">${f.arriveTime}${f.arriveDayOffset ? `<sup>+${f.arriveDayOffset}</sup>` : ''}</strong><span class="small muted">${f.destination}</span></div>
      </div>
      <div style="text-align:end"><div class="price num">${money(f.fare)}</div><div class="small muted">${esc(t('per_adult'))}</div>
        <button type="button" class="btn ${chosen ? 'btn-primary' : 'btn-outline'} btn-sm mt-1" data-leg="${leg}" data-id="${esc(f.id)}">${esc(chosen ? t('selected') : t('select'))}</button></div>
    </div>`;
  }

  function render() {
    const { outbound, inbound } = last;
    const hdr = (h, leg, list) => {
      h.classList.remove('hidden');
      const f = list[0];
      h.innerHTML = `${esc(t(leg === 'out' ? 'outbound' : 'inbound'))} · ${f ? `${esc(L(f.originCity))} → ${esc(L(f.destinationCity))} · ${fmtDate(f.date)}` : ''}`;
    };
    hdr($('#out-h'), 'out', outbound);
    $('#out-list').classList.remove('hidden');
    $('#out-list').innerHTML = outbound.length ? outbound.map((f) => row(f, 'out')).join('') : `<div class="empty">${esc(t('no_results'))}</div>`;
    const wantReturn = Boolean(form.returnDate.value);
    $('#in-h').classList.toggle('hidden', !wantReturn);
    $('#in-list').classList.toggle('hidden', !wantReturn);
    if (wantReturn) {
      hdr($('#in-h'), 'in', inbound);
      $('#in-list').innerHTML = inbound.length ? inbound.map((f) => row(f, 'in')).join('') : `<div class="empty">${esc(t('no_results'))}</div>`;
    }
    const ready = sel.out && (!wantReturn || sel.in);
    $('#f-bar').classList.toggle('hidden', !ready);
    if (ready) quote();
  }

  async function quote() {
    try {
      const body = { type: 'flight', id: sel.out.id, returnId: sel.in?.id, cabin: form.cabin.value, adults: form.adults.value, children: form.children.value, infants: form.infants.value };
      const qt = await api('/quote', { method: 'POST', body });
      $('#f-total').textContent = money(qt.total);
      $('#f-go').disabled = false;
    } catch (err) {
      $('#f-total').textContent = err.message;
      $('#f-go').disabled = true;
    }
  }

  async function search() {
    const params = new URLSearchParams(new FormData(form));
    if (!params.get('returnDate')) params.delete('returnDate');
    history.replaceState(null, '', `?${params}`);
    sel = { out: null, in: null };
    $('#f-alert').innerHTML = '';
    $('#out-list').classList.remove('hidden');
    $('#out-list').innerHTML = '<div class="skeleton" style="height:240px"></div>';
    try {
      last = await api(`/flights/search?${params}`);
      render();
    } catch (err) {
      $('#out-list').classList.add('hidden');
      $('#f-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-leg]');
    if (!b) return;
    const list = b.dataset.leg === 'out' ? last.outbound : last.inbound;
    sel[b.dataset.leg] = list.find((f) => f.id === b.dataset.id);
    render();
    if (b.dataset.leg === 'out' && form.returnDate.value && !sel.in) $('#in-h').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  form.addEventListener('submit', (e) => { e.preventDefault(); search(); });
  $('#f-go').addEventListener('click', () => {
    const p = new URLSearchParams({ type: 'flight', id: sel.out.id, cabin: form.cabin.value, adults: form.adults.value, children: form.children.value, infants: form.infants.value });
    if (sel.in) p.set('returnId', sel.in.id);
    location.href = `/checkout.html?${p}`;
  });

  search();
})();
