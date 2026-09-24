/* Noor Travel back-office (single page, hash routed). */
(async function () {
  'use strict';
  const { esc, $, $$, api, money, fmtDate, toast, busy, addDays } = Noor;
  const { site, me } = await Noor.init();
  const SAR = (h) => money(h, { decimals: 2 });
  const dt = (s) => (s ? new Date(`${s.replace(' ', 'T')}Z`).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  const isAdmin = me?.role === 'admin';
  const badge = (v) => `<span class="status s-${esc(v)}">${esc(String(v).replace(/_/g, ' '))}</span>`;
  const methodName = { card: 'Card (Moyasar)', tabby: 'Tabby', tamara: 'Tamara', bank_transfer: 'Bank transfer', cash: 'Cash', pos: 'POS terminal' };

  // ------------------------------------------------------------ login
  if (!me || !['admin', 'agent'].includes(me.role)) {
    const box = $('#login');
    box.classList.remove('hidden');
    box.innerHTML = `<div class="login-wrap"><form class="card panel" id="lf" style="width:min(420px,100%)">
      <div class="logo"><span class="logo-mark"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 2.5l2.3 5.2 5.7.6-4.3 3.8 1.2 5.6L12 14.9l-4.9 2.8 1.2-5.6L4 8.3l5.7-.6z" fill="#c9a24a"/></svg></span><span>Noor Travel<small>Back-office</small></span></div>
      <h2 class="mt-3" style="font-size:1.4rem">Staff sign in</h2>
      ${me ? '<div class="alert alert-warn">Your account does not have back-office access.</div>' : ''}
      <div class="field mt-2"><label>Email</label><input class="input" name="email" type="email" required autocomplete="username"></div>
      <div class="field mt-2"><label>Password</label><input class="input" name="password" type="password" required autocomplete="current-password"></div>
      <div class="alert alert-error hidden mt-2" id="lerr"></div>
      <button class="btn btn-primary btn-block mt-3">Sign in</button></form></div>`;
    $('#lf').onsubmit = (e) => {
      e.preventDefault();
      busy($('#lf button'), async () => {
        try { await api('/account/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); location.reload(); } catch (err) { $('#lerr').textContent = err.message; $('#lerr').classList.remove('hidden'); }
      });
    };
    return;
  }
  $('#shell').classList.remove('hidden');

  // ------------------------------------------------------------ shell
  const NAV = [
    ['dashboard', 'Dashboard'], ['bookings', 'Bookings'], ['new', 'New booking'], ['payments', 'Payments'],
    ['sep', 'Catalogue'], ['packages', 'Packages'], ['inventory', 'Hotels · Flights · Visas'], ['promos', 'Promo codes'],
    ['sep', 'Customers'], ['customers', 'Customers'], ['inquiries', 'Inquiries'], ['reviews', 'Reviews'], ['messages', 'Messages outbox'],
    ['sep', 'System'], ['staff', 'Staff', true], ['settings', 'Settings'],
  ];
  $('#side-nav').innerHTML = NAV.filter(([, , adm]) => !adm || isAdmin).map(([k, label]) => (k === 'sep'
    ? `<div class="sep">${esc(label)}</div>`
    : `<a href="#/${k}" data-k="${k}">${esc(label)}<span class="count hidden" id="cnt-${k}"></span></a>`)).join('');
  $('#side-user').innerHTML = `<div><strong style="color:#fff">${esc(me.name)}</strong><div>${esc(me.role)}</div></div>
    <button class="btn btn-ghost btn-sm" id="logout" style="padding-inline:0">Sign out</button>`;
  $('#logout').onclick = async () => { await api('/account/logout', { method: 'POST', body: {} }); location.href = '/admin/'; };
  $('#side-toggle').onclick = () => $('#side').classList.toggle('open');

  const view = $('#view');
  let lastPage = 'dashboard';
  const setTitle = (t, actions = '') => { $('#page-title').textContent = t; $('#bar-actions').innerHTML = actions; document.title = `${t} | Noor back-office`; };

  function modal(html) {
    $('#modal-body').innerHTML = html;
    $('#modal').classList.remove('hidden');
  }
  const closeModal = () => {
    $('#modal').classList.add('hidden');
    if (location.hash.startsWith('#/booking/')) history.replaceState(null, '', `#/${lastPage}`);
  };
  $('#modal-x').onclick = closeModal;
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  const guard = (fn) => async (...a) => { try { await fn(...a); } catch (err) { toast(err.message, 'error'); } };

  // ------------------------------------------------------------ dashboard
  function barChart(rows, days) {
    // Fill missing days so the time axis is continuous.
    const byDay = Object.fromEntries(rows.map((r) => [r.d, r]));
    const series = Array.from({ length: days }, (_, i) => {
      const d = addDays(i - days + 1);
      return { d, revenue: byDay[d]?.revenue || 0, bookings: byDay[d]?.bookings || 0 };
    });
    const W = 720; const H = 240; const pl = 56; const pb = 24; const pt = 10;
    const max = Math.max(1, ...series.map((s) => s.revenue));
    const nice = 10 ** Math.floor(Math.log10(max / 100)) * 100;
    const top = Math.ceil(max / nice) * nice || 100;
    const bw = (W - pl) / series.length;
    const y = (v) => H - pb - ((H - pb - pt) * v) / top;
    const ticks = [0, 0.5, 1].map((f) => top * f);
    const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Revenue per day">
      ${ticks.map((v) => `<line class="grid" x1="${pl}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${pl - 8}" y="${y(v) + 4}" text-anchor="end">${(v / 100).toLocaleString('en-US', { notation: 'compact' })}</text>`).join('')}
      ${series.map((s, i) => {
        const x = pl + i * bw;
        const h = H - pb - y(s.revenue);
        const w = Math.max(2, bw - 2);
        const r = Math.min(4, w / 2, h);
        const path = h > 0 ? `M${x + 1} ${H - pb} V${y(s.revenue) + r} q0 -${r} ${r} -${r} H${x + 1 + w - r} q${r} 0 ${r} ${r} V${H - pb}Z` : '';
        return `<g data-i="${i}">${path ? `<path class="bar-mark" d="${path}"/>` : ''}<rect class="bar-hit" x="${x}" y="${pt}" width="${bw}" height="${H - pt - pb}"/></g>`;
      }).join('')}
      ${series.map((s, i) => (i % Math.ceil(series.length / 6) === 0 ? `<text class="axis" x="${pl + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${fmtDate(s.d, { day: 'numeric', month: 'short' })}</text>` : '')).join('')}
    </svg>`;
    return { svg, series };
  }

  async function dashboard() {
    setTitle('Dashboard', `<select class="input" id="days" style="height:40px;width:auto"><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option></select>`);
    const days = Number($('#days')?.value || 30);
    const render = async (d) => {
      const s = await api(`/admin/stats?days=${d}`);
      const k = s.kpi;
      const chart = barChart(s.daily, d);
      const totalMix = s.byMethod.reduce((a, r) => a + r.v, 0) || 1;
      view.innerHTML = `
        ${site.paymentsMode === 'sandbox' ? '<div class="alert alert-warn mb-0" style="margin-bottom:16px">Payments are in <strong>sandbox mode</strong>. Add Moyasar / Tabby / Tamara keys in the environment to go live.</div>' : ''}
        <div class="kpis">
          <div class="card kpi"><span>Revenue collected</span><strong>${SAR(k.revenue)}</strong><em>last ${d} days</em></div>
          <div class="card kpi"><span>Bookings</span><strong>${k.bookings}</strong><em>${k.confirmed} confirmed · ${k.conversion}% paid</em></div>
          <div class="card kpi"><span>Average order</span><strong>${SAR(k.avgOrder)}</strong><em>paid bookings</em></div>
          <div class="card kpi"><span>VAT collected</span><strong>${SAR(k.vatCollected)}</strong><em>15% output VAT</em></div>
          <div class="card kpi"><span>Awaiting payment</span><strong>${k.pendingPayment}</strong><em>${k.awaitingTransfer} bank transfers to verify</em></div>
          <div class="card kpi"><span>New inquiries</span><strong>${k.newInquiries}</strong><em>${k.customers} registered customers</em></div>
        </div>
        <div class="two mt-2">
          <div class="card panel"><div class="flex between"><h3 class="mb-0">Revenue per day (SAR)</h3><button class="btn btn-ghost btn-sm" id="as-table">Table view</button></div>
            <div class="chart mt-2" id="chart">${chart.svg}<div class="tip hidden" id="tip"></div></div>
            <div class="table-wrap hidden" id="chart-table" style="max-height:260px"><table class="table"><thead><tr><th>Date</th><th class="r">Bookings</th><th class="r">Revenue</th></tr></thead>
              <tbody>${chart.series.slice().reverse().map((r) => `<tr><td>${fmtDate(r.d)}</td><td class="r">${r.bookings}</td><td class="r">${SAR(r.revenue)}</td></tr>`).join('')}</tbody></table></div></div>
          <div class="card panel"><h3>Payment mix</h3>
            ${s.byMethod.length ? s.byMethod.map((r) => `<div class="hbar"><span>${esc(methodName[r.k] || r.k)}</span><div class="track"><div class="fill" style="width:${Math.max(2, (r.v / totalMix) * 100)}%"></div></div><span class="num">${SAR(r.v)}</span></div>`).join('') : '<p class="muted">No payments yet.</p>'}
            <h3 class="mt-3">By product</h3>
            ${s.byType.map((r) => `<div class="hbar"><span style="text-transform:capitalize">${esc(r.k)}</span><span class="muted small">${r.n} bookings</span><span class="num">${SAR(r.v || 0)}</span></div>`).join('') || '<p class="muted">—</p>'}
          </div>
        </div>
        <div class="two mt-2">
          <div class="card"><div class="panel" style="padding-bottom:0"><h3>Recent bookings</h3></div><div class="table-wrap">${bookingTable(s.recent)}</div></div>
          <div class="card panel"><h3>Departures · next 14 days</h3>${s.upcoming.length ? s.upcoming.map((u) => `<div class="hbar" style="grid-template-columns:70px 1fr auto"><strong>${fmtDate(u.travel_date, { day: 'numeric', month: 'short' })}</strong><a href="#/booking/${esc(u.ref)}">${esc(u.title)}</a><span class="muted small">${u.pax} pax</span></div>`).join('') : '<p class="muted">No confirmed departures.</p>'}</div>
        </div>`;
      $('#as-table').onclick = () => { $('#chart').classList.toggle('hidden'); $('#chart-table').classList.toggle('hidden'); };
      const tip = $('#tip');
      $$('#chart g[data-i]').forEach((g) => {
        g.addEventListener('mouseenter', () => {
          const r = chart.series[g.dataset.i];
          g.classList.add('hover');
          const box = g.getBoundingClientRect();
          const host = $('#chart').getBoundingClientRect();
          tip.innerHTML = `<strong>${fmtDate(r.d)}</strong><br>${SAR(r.revenue)} · ${r.bookings} booking${r.bookings === 1 ? '' : 's'}`;
          tip.style.left = `${box.left - host.left + box.width / 2}px`;
          tip.style.top = `${Math.max(40, box.top - host.top + 20)}px`;
          tip.classList.remove('hidden');
        });
        g.addEventListener('mouseleave', () => { g.classList.remove('hover'); tip.classList.add('hidden'); });
      });
    };
    $('#days').onchange = (e) => render(Number(e.target.value));
    await render(days);
  }

  function bookingTable(rows) {
    if (!rows.length) return '<div class="empty">No bookings found.</div>';
    return `<table class="table"><thead><tr><th>Ref</th><th>Customer</th><th>Item</th><th>Status</th><th class="r">Total</th><th>Created</th></tr></thead><tbody>
      ${rows.map((b) => `<tr class="click" data-ref="${esc(b.ref)}"><td class="mono"><strong>${esc(b.ref)}</strong></td>
        <td>${esc(b.contact_name)}${b.contact_phone ? `<div class="small muted">${esc(b.contact_phone)}</div>` : ''}</td>
        <td>${esc(b.title)}${b.travel_date ? `<div class="small muted">${fmtDate(b.travel_date)}</div>` : ''}</td>
        <td>${badge(b.status)} ${badge(b.payment_status)}${b.payment_method ? `<div class="small muted">${esc(methodName[b.payment_method] || b.payment_method)}</div>` : ''}</td>
        <td class="r num">${SAR(b.total)}</td><td class="small muted">${fmtDate(b.created_at)}</td></tr>`).join('')}</tbody></table>`;
  }
  view.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-ref]');
    if (tr && !e.target.closest('button,a')) location.hash = `#/booking/${tr.dataset.ref}`;
  });

  // ------------------------------------------------------------ bookings
  const bState = { page: 1 };
  async function bookings() {
    setTitle('Bookings', `<a class="btn btn-outline btn-sm" id="csv" href="#">Export CSV</a><a class="btn btn-primary btn-sm" href="#/new">+ New booking</a>`);
    view.innerHTML = `<div class="toolbar">
      <input class="input" id="bq" placeholder="Search ref, name, email, phone…" value="${esc(bState.q || '')}" style="min-width:260px">
      <select class="input" id="bs"><option value="">All statuses</option>${['pending_payment', 'confirmed', 'completed', 'cancelled', 'refunded'].map((s) => `<option ${bState.status === s ? 'selected' : ''} value="${s}">${s.replace('_', ' ')}</option>`).join('')}</select>
      <select class="input" id="bp"><option value="">All payments</option>${['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded'].map((s) => `<option ${bState.payment_status === s ? 'selected' : ''} value="${s}">${s.replace('_', ' ')}</option>`).join('')}</select>
      <select class="input" id="bt"><option value="">All products</option>${['package', 'flight', 'hotel', 'visa'].map((s) => `<option ${bState.type === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <input class="input" type="date" id="bf" value="${esc(bState.from || '')}" title="From"><input class="input" type="date" id="bto" value="${esc(bState.to || '')}" title="To">
    </div><div class="card table-wrap" id="bl"></div>`;
    let timer;
    const load = async () => {
      Object.assign(bState, { q: $('#bq').value, status: $('#bs').value, payment_status: $('#bp').value, type: $('#bt').value, from: $('#bf').value, to: $('#bto').value });
      const p = new URLSearchParams(Object.entries(bState).filter(([, v]) => v));
      const r = await api(`/admin/bookings?${p}`);
      $('#bl').innerHTML = bookingTable(r.rows) + `<div class="pager"><span class="muted">${r.total} bookings · page ${r.page} of ${Math.max(1, r.pages)}</span>
        <button class="btn btn-outline btn-sm" id="prev" ${r.page <= 1 ? 'disabled' : ''}>‹</button><button class="btn btn-outline btn-sm" id="next" ${r.page >= r.pages ? 'disabled' : ''}>›</button></div>`;
      $('#prev').onclick = () => { bState.page--; load(); };
      $('#next').onclick = () => { bState.page++; load(); };
    };
    $$('.toolbar select, .toolbar input[type=date]').forEach((el) => { el.onchange = () => { bState.page = 1; load(); }; });
    $('#bq').oninput = () => { clearTimeout(timer); timer = setTimeout(() => { bState.page = 1; load(); }, 300); };
    $('#csv').onclick = (e) => { e.preventDefault(); location.href = `/api/admin/reports/bookings.csv?from=${$('#bf').value || ''}&to=${$('#bto').value || ''}`; };
    await load();
  }

  async function bookingDetail(ref) {
    const b = await api(`/admin/bookings/${encodeURIComponent(ref)}`);
    const next = { pending_payment: ['cancelled'], confirmed: ['completed', 'cancelled'] }[b.status] || [];
    if (b.status === 'pending_payment' && b.paymentStatus === 'paid') next.unshift('confirmed');
    modal(`<div class="flex between"><div><div class="mono muted">${esc(b.ref)} · ${esc(b.source)}</div><h2 style="font-size:1.35rem" class="mb-0">${esc(b.title)}</h2></div><div>${badge(b.status)} ${badge(b.paymentStatus)}</div></div>
      <div class="kv mt-2">
        <div><span>Customer</span><strong>${esc(b.contact.name)}</strong><div class="small"><a href="mailto:${esc(b.contact.email)}">${esc(b.contact.email)}</a></div>
          <div class="small"><a href="https://wa.me/${esc(b.contact.phone.replace('+', ''))}" target="_blank" rel="noopener">${esc(b.contact.phone)} (WhatsApp)</a></div></div>
        <div><span>Dates</span><strong>${fmtDate(b.travelDate)}${b.endDate ? ` → ${fmtDate(b.endDate)}` : ''}</strong></div>
        <div><span>Pax</span><strong>${b.adults} A · ${b.children} C · ${b.infants} I</strong></div>
        <div><span>Total / paid</span><strong>${SAR(b.total)}</strong><div class="small muted">paid ${SAR(b.paid)} · due ${SAR(b.outstanding)}</div></div>
        <div><span>Invoice</span><strong>${b.invoiceNo ? `<a target="_blank" href="/invoice.html?ref=${esc(b.ref)}&t=${esc(b.token)}">${esc(b.invoiceNo)}</a>` : '—'}</strong></div>
      </div>
      <div class="flex mt-2">
        ${next.map((s) => `<button class="btn btn-outline btn-sm" data-status="${s}">Mark ${s.replace('_', ' ')}</button>`).join('')}
        <button class="btn btn-outline btn-sm" id="copy-link">Copy payment link</button>
        <button class="btn btn-outline btn-sm" id="resend">Resend email/WhatsApp</button>
        <a class="btn btn-ghost btn-sm" target="_blank" href="${esc(b.paymentLink)}">Open customer view ↗</a>
      </div>
      <h3 class="mt-3">Lines</h3>
      <table class="table"><tbody>${b.lines.map((l) => `<tr><td>${esc(l.en)}</td><td class="r">× ${l.qty}</td><td class="r num">${SAR(l.amount)}</td></tr>`).join('')}
      ${b.discount ? `<tr><td>Discount ${esc(b.promo || '')}</td><td></td><td class="r num">−${SAR(b.discount)}</td></tr>` : ''}
      <tr><td><strong>Total</strong> <span class="small muted">VAT ${SAR(b.vat)}</span></td><td></td><td class="r"><strong>${SAR(b.total)}</strong></td></tr></tbody></table>
      ${b.travelers.length ? `<h3 class="mt-3">Travelers</h3><table class="table"><thead><tr><th>Name</th><th>Type</th><th>DOB</th><th>Nationality</th><th>Passport</th></tr></thead><tbody>
        ${b.travelers.map((t) => `<tr><td>${esc({ mr: 'Mr', mrs: 'Mrs', ms: 'Ms' }[t.title] || '')} ${esc(t.firstName)} ${esc(t.lastName)}</td><td>${esc(t.type)}</td><td>${esc(t.dob || '—')}</td><td>${esc(t.nationality || '—')}</td><td class="mono">${esc(t.passport || '—')}</td></tr>`).join('')}</tbody></table>` : ''}
      <h3 class="mt-3">Payments</h3>
      <table class="table"><thead><tr><th>#</th><th>Method</th><th>Reference</th><th>Status</th><th class="r">Amount</th><th></th></tr></thead><tbody>
      ${b.allPayments.map((p) => `<tr><td>${p.id}</td><td>${esc(methodName[p.provider] || p.provider)}${p.sandbox ? ' <span class="badge badge-soft">test</span>' : ''}</td><td class="mono small">${esc(p.provider_ref || '')}</td>
        <td>${badge(p.status)}</td><td class="r num">${SAR(p.amount)}${p.refunded_amount ? `<div class="small muted">refunded ${SAR(p.refunded_amount)}</div>` : ''}</td>
        <td class="r">${p.provider === 'bank_transfer' && p.status === 'initiated' ? `<button class="btn btn-primary btn-sm" data-confirm="${p.id}">Confirm received</button>` : ''}
          ${['card', 'tabby', 'tamara'].includes(p.provider) && ['initiated', 'authorized'].includes(p.status) ? `<button class="btn btn-outline btn-sm" data-verify="${p.id}">Re-check</button>` : ''}
          ${isAdmin && ['paid', 'partially_refunded'].includes(p.status) ? `<button class="btn btn-outline btn-sm" data-refund="${p.id}" data-max="${p.amount - p.refunded_amount}">Refund</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No payments yet.</td></tr>'}</tbody></table>
      ${b.outstanding > 0 && !['cancelled', 'refunded'].includes(b.status) ? `<form class="toolbar mt-2" id="offline"><strong>Record office payment:</strong>
        <select class="input" name="method"><option value="cash">Cash</option><option value="pos">POS terminal (mada)</option><option value="bank_transfer">Bank transfer</option></select>
        <input class="input" name="amount" type="number" step="0.01" min="0.01" max="${b.outstanding / 100}" value="${(b.outstanding / 100).toFixed(2)}" style="width:130px">
        <input class="input" name="reference" placeholder="Receipt / reference"><button class="btn btn-primary btn-sm">Record</button></form>` : ''}
      <h3 class="mt-3">Internal notes</h3>
      <textarea class="input" id="notes">${esc(b.notes)}</textarea><button class="btn btn-outline btn-sm mt-1" id="save-notes">Save notes</button>
      <div class="two mt-3"><div><h3>Activity</h3><div class="log">${b.activity.map((a) => `<div><strong>${esc(a.action)}</strong> ${esc(a.detail)}<div class="muted">${dt(a.created_at)}${a.user ? ` · ${esc(a.user)}` : ''}</div></div>`).join('')}</div></div>
        <div><h3>Messages sent</h3><div class="log">${b.messages.map((m) => `<div>${esc(m.channel)} → ${esc(m.recipient)}<div class="muted">${esc(m.subject)}</div></div>`).join('') || '<p class="muted">—</p>'}</div></div></div>`);

    const reload = () => bookingDetail(ref);
    const body = $('#modal-body');
    $$('[data-status]', body).forEach((btn) => { btn.onclick = guard(async () => { await api(`/admin/bookings/${ref}/status`, { method: 'PATCH', body: { status: btn.dataset.status } }); toast('Status updated', 'success'); reload(); }); });
    $$('[data-confirm]', body).forEach((btn) => { btn.onclick = guard(async () => { if (!confirm('Confirm the bank transfer has been received in full?')) return; await api(`/admin/payments/${btn.dataset.confirm}/confirm-transfer`, { method: 'POST', body: {} }); toast('Payment confirmed', 'success'); reload(); }); });
    $$('[data-verify]', body).forEach((btn) => { btn.onclick = guard(async () => { const r = await api(`/admin/payments/${btn.dataset.verify}/verify`, { method: 'POST', body: {} }); toast(`Payment status: ${r.paymentStatus}`); reload(); }); });
    $$('[data-refund]', body).forEach((btn) => {
      btn.onclick = guard(async () => {
        const max = Number(btn.dataset.max) / 100;
        const amt = prompt(`Refund amount in SAR (max ${max.toFixed(2)}):`, max.toFixed(2));
        if (!amt) return;
        const reason = prompt('Reason (optional):') || '';
        await api(`/admin/payments/${btn.dataset.refund}/refund`, { method: 'POST', body: { amount: Number(amt), reason } });
        toast('Refund issued', 'success');
        reload();
      });
    });
    $('#copy-link', body).onclick = () => navigator.clipboard?.writeText(b.paymentLink).then(() => toast('Payment link copied'));
    $('#resend', body).onclick = guard(async () => { await api(`/admin/bookings/${ref}/resend`, { method: 'POST', body: {} }); toast('Sent', 'success'); });
    $('#save-notes', body).onclick = guard(async () => { await api(`/admin/bookings/${ref}/notes`, { method: 'PATCH', body: { notes: $('#notes').value } }); toast('Saved', 'success'); });
    const off = $('#offline', body);
    if (off) off.onsubmit = guard(async (e) => { e.preventDefault(); await api(`/admin/bookings/${ref}/payments`, { method: 'POST', body: Object.fromEntries(new FormData(off)) }); toast('Payment recorded', 'success'); reload(); });
  }

  // ------------------------------------------------------------ new booking (walk-in / phone)
  async function newBooking() {
    setTitle('New booking');
    const [pkgs, hotels, visas] = await Promise.all([api('/packages'), api('/hotels'), api('/visas')]);
    view.innerHTML = `<div class="layout-main"><form class="card panel" id="nb">
      <p class="muted">Create a booking for a walk-in or phone customer. The customer receives a secure payment link (card, Tabby, Tamara) — or record cash/POS payment afterwards.</p>
      <div class="form-grid">
        <div class="field"><label>Product</label><select class="input" name="type" id="nb-type"><option value="package">Package</option><option value="hotel">Hotel</option><option value="visa">Visa</option><option value="flight">Flight</option></select></div>
        <div class="field" id="nb-item-f"><label>Item</label><select class="input" name="id" id="nb-item"></select></div>
        <div class="field" id="nb-date-f"><label>Travel / check-in date</label><input class="input" type="date" name="date" value="${addDays(21)}"></div>
        <div class="field" id="nb-end-f"><label>Check-out date</label><input class="input" type="date" name="endDate" value="${addDays(25)}"></div>
        <div class="field" id="nb-rooms-f"><label>Rooms</label><input class="input" type="number" name="rooms" value="1" min="1" max="5"></div>
        <div class="field"><label>Adults</label><input class="input" type="number" name="adults" value="2" min="1" max="9"></div>
        <div class="field"><label>Children</label><input class="input" type="number" name="children" value="0" min="0" max="8"></div>
        <div class="field"><label>Infants</label><input class="input" type="number" name="infants" value="0" min="0" max="4"></div>
        <div class="field"><label>Promo code</label><input class="input" name="promo"></div>
        <div class="field full"><hr style="border:0;border-top:1px solid var(--line)"></div>
        <div class="field"><label>Customer name</label><input class="input" name="name" required></div>
        <div class="field"><label>Mobile</label><input class="input" name="phone" required placeholder="05XXXXXXXX"></div>
        <div class="field full"><label>Email</label><input class="input" name="email" type="email" required></div>
        <div class="field full"><label>Traveler names (one per line, "First Last")</label><textarea class="input" name="travelers" placeholder="Mohammed Alqahtani&#10;Sara Alqahtani"></textarea></div>
        <div class="field full"><label>Internal notes</label><textarea class="input" name="notes"></textarea></div>
      </div>
      <div class="alert alert-error hidden mt-2" id="nb-err"></div>
      <div class="flex mt-3"><button class="btn btn-primary" type="submit">Create booking</button><button class="btn btn-outline" type="button" id="nb-quote">Preview price</button></div>
    </form><aside class="card summary sticky" id="nb-sum"><h3>Quote</h3><p class="muted">Press “Preview price”.</p></aside></div>`;
    const f = $('#nb');
    const opts = {
      package: pkgs.map((p) => [p.slug, `${p.title.en} — ${SAR(p.price)}`]),
      hotel: hotels.map((h) => [h.id, `${h.name}, ${h.city.en} — ${SAR(h.pricePerNight)}/night`]),
      visa: visas.map((v) => [v.id, `${v.country.en} ${v.type.en} — ${SAR(v.price)}`]),
    };
    const sync = () => {
      const t = f.type.value;
      $('#nb-item-f').classList.toggle('hidden', t === 'flight');
      $('#nb-end-f').classList.toggle('hidden', t !== 'hotel');
      $('#nb-rooms-f').classList.toggle('hidden', t !== 'hotel');
      if (t === 'flight') { $('#nb-err').className = 'alert alert-info mt-2'; $('#nb-err').innerHTML = 'For flights, search on the <a href="/flights.html" target="_blank">flights page</a> and complete checkout with the customer’s details (choose bank transfer or send them the link).'; return; }
      $('#nb-err').className = 'alert alert-error hidden mt-2';
      $('#nb-item').innerHTML = opts[t].map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
    };
    f.type.onchange = sync;
    sync();
    const payload = () => {
      const d = Object.fromEntries(new FormData(f));
      const travelers = d.travelers.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [first, ...rest] = l.split(/\s+/); return { firstName: first, lastName: rest.join(' ') || first }; });
      const pax = Number(d.adults) + Number(d.children) + Number(d.infants);
      while (travelers.length < pax) travelers.push({ firstName: 'TBA', lastName: `Traveler ${travelers.length + 1}` });
      travelers.forEach((t, i) => { t.type = i < d.adults ? 'adult' : i < Number(d.adults) + Number(d.children) ? 'child' : 'infant'; });
      return { type: d.type, id: d.id, date: d.date, endDate: d.endDate, rooms: d.rooms, adults: d.adults, children: d.children, infants: d.infants, promo: d.promo, travelers, notes: d.notes, contact: { name: d.name, phone: d.phone, email: d.email } };
    };
    const err = (m) => { $('#nb-err').className = 'alert alert-error mt-2'; $('#nb-err').textContent = m; };
    $('#nb-quote').onclick = async () => {
      try {
        const q = await api('/quote', { method: 'POST', body: payload() });
        $('#nb-sum').innerHTML = `<h3>Quote</h3><div style="font-weight:700">${esc(q.title)}</div>${q.lines.map((l) => `<div class="summary-row"><span class="l">${esc(l.en)} × ${l.qty}</span><span>${SAR(l.amount)}</span></div>`).join('')}
          ${q.discount ? `<div class="summary-row"><span>Discount</span><span>−${SAR(q.discount)}</span></div>` : ''}<div class="summary-row total"><span>Total</span><span>${SAR(q.total)}</span></div><div class="small muted">incl. VAT ${SAR(q.vat)}</div>`;
      } catch (e) { err(e.message); }
    };
    f.onsubmit = (e) => {
      e.preventDefault();
      busy(f.querySelector('[type=submit]'), async () => {
        try {
          const r = await api('/admin/bookings', { method: 'POST', body: payload() });
          toast(`Booking ${r.ref} created`, 'success');
          location.hash = `#/booking/${r.ref}`;
        } catch (e2) { err(e2.message); }
      });
    };
  }

  // ------------------------------------------------------------ payments
  async function paymentsView() {
    setTitle('Payments');
    view.innerHTML = `<div class="toolbar"><select class="input" id="pp"><option value="">All methods</option>${Object.entries(methodName).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <select class="input" id="ps"><option value="">All statuses</option>${['initiated', 'paid', 'failed', 'refunded', 'partially_refunded'].map((s) => `<option>${s}</option>`).join('')}</select></div><div class="card table-wrap" id="pl"></div>`;
    const load = async () => {
      const rows = await api(`/admin/payments?provider=${$('#pp').value}&status=${$('#ps').value}`);
      $('#pl').innerHTML = rows.length ? `<table class="table"><thead><tr><th>#</th><th>Booking</th><th>Method</th><th>Reference</th><th>Status</th><th class="r">Amount</th><th>Date</th></tr></thead><tbody>
        ${rows.map((p) => `<tr class="click" data-ref="${esc(p.ref)}"><td>${p.id}</td><td class="mono">${esc(p.ref)}<div class="small muted">${esc(p.contact_name)}</div></td><td>${esc(methodName[p.provider] || p.provider)}${p.sandbox ? ' <span class="badge badge-soft">test</span>' : ''}</td>
          <td class="mono small">${esc(p.provider_ref || '')}</td><td>${badge(p.status)}</td><td class="r num">${SAR(p.amount)}${p.refunded_amount ? `<div class="small muted">−${SAR(p.refunded_amount)}</div>` : ''}</td><td class="small muted">${fmtDate(p.created_at)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">No payments.</div>';
    };
    $('#pp').onchange = load; $('#ps').onchange = load;
    await load();
  }

  // ------------------------------------------------------------ packages
  async function packages() {
    setTitle('Packages', isAdmin ? '<button class="btn btn-primary btn-sm" id="add-pkg">+ Add package</button>' : '');
    const rows = await api('/admin/packages');
    view.innerHTML = `<div class="card table-wrap"><table class="table"><thead><tr><th>Package</th><th>Category</th><th>Days</th><th class="r">Price</th><th>Seats</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map((p) => `<tr><td><strong>${esc(p.title_en)}</strong><div class="small muted" dir="rtl" style="text-align:left">${esc(p.title_ar)}</div></td><td>${esc(p.category)}</td><td>${p.duration_days}</td>
        <td class="r num">${SAR(p.price)}</td><td>${p.seats}</td><td>${p.active ? badge('confirmed').replace('confirmed', 'active') : badge('cancelled').replace('cancelled', 'hidden')}${p.featured ? ' ★' : ''}</td>
        <td class="r">${isAdmin ? `<button class="btn btn-outline btn-sm" data-edit="${p.id}">Edit</button>` : ''} <a class="btn btn-ghost btn-sm" target="_blank" href="/package.html?slug=${esc(p.slug)}">View ↗</a></td></tr>`).join('')}</tbody></table></div>`;
    const form = (p = {}) => {
      const lines = (arr) => (arr || []).map((x) => `${x.en} | ${x.ar}`).join('\n');
      modal(`<h2 style="font-size:1.3rem">${p.id ? 'Edit' : 'New'} package</h2><form id="pf" class="form-grid mt-2">
        <div class="field"><label>Title (English)</label><input class="input" name="title_en" required value="${esc(p.title_en || '')}"></div>
        <div class="field"><label>Title (Arabic)</label><input class="input" name="title_ar" dir="rtl" required value="${esc(p.title_ar || '')}"></div>
        <div class="field"><label>Slug (URL)</label><input class="input" name="slug" required pattern="[a-z0-9-]{3,80}" value="${esc(p.slug || '')}"></div>
        <div class="field"><label>Category</label><select class="input" name="category">${['umrah', 'international', 'domestic', 'honeymoon'].map((c) => `<option ${p.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Destination (English)</label><input class="input" name="destination_en" required value="${esc(p.destination_en || '')}"></div>
        <div class="field"><label>Destination (Arabic)</label><input class="input" name="destination_ar" dir="rtl" required value="${esc(p.destination_ar || '')}"></div>
        <div class="field"><label>Price per adult (SAR, incl. VAT)</label><input class="input" name="price" type="number" step="1" required value="${p.price ? p.price / 100 : ''}"></div>
        <div class="field"><label>Old price (SAR, optional)</label><input class="input" name="old_price" type="number" step="1" value="${p.old_price ? p.old_price / 100 : ''}"></div>
        <div class="field"><label>Duration (days)</label><input class="input" name="duration_days" type="number" min="1" required value="${p.duration_days || 5}"></div>
        <div class="field"><label>Seats available</label><input class="input" name="seats" type="number" min="0" value="${p.seats ?? 30}"></div>
        <div class="field"><label>Artwork</label><select class="input" name="scene">${['mosque', 'city', 'mountain', 'beach', 'desert'].map((c) => `<option ${p.scene === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Colour hue (0–360)</label><input class="input" name="hue" type="number" min="0" max="360" value="${p.hue ?? 200}"></div>
        <div class="field full"><label>Summary (English)</label><textarea class="input" name="summary_en">${esc(p.summary_en || '')}</textarea></div>
        <div class="field full"><label>Summary (Arabic)</label><textarea class="input" name="summary_ar" dir="rtl">${esc(p.summary_ar || '')}</textarea></div>
        <div class="field full"><label>Itinerary — one day per line: English | Arabic</label><textarea class="input" name="itinerary" style="min-height:140px">${esc(lines(p.itinerary))}</textarea></div>
        <div class="field full"><label>Inclusions — one per line: English | Arabic</label><textarea class="input" name="includes">${esc(lines(p.includes))}</textarea></div>
        <label class="check"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}> Featured on homepage</label>
        <label class="check"><input type="checkbox" name="active" ${p.active !== 0 ? 'checked' : ''}> Visible on website</label>
        <div class="full"><button class="btn btn-primary">Save package</button></div></form>`);
      $('#pf').onsubmit = guard(async (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        const split = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [en, ar] = l.split('|').map((x) => (x || '').trim()); return { en, ar: ar || en }; });
        const body = { ...d, itinerary: split(d.itinerary), includes: split(d.includes), featured: !!d.featured, active: !!d.active };
        await api(p.id ? `/admin/packages/${p.id}` : '/admin/packages', { method: p.id ? 'PUT' : 'POST', body });
        toast('Package saved', 'success'); closeModal(); packages();
      });
    };
    $('#add-pkg')?.addEventListener('click', () => form());
    $$('[data-edit]').forEach((b) => { b.onclick = () => form(rows.find((p) => String(p.id) === b.dataset.edit)); });
  }

  // ------------------------------------------------------------ inventory
  async function inventory() {
    setTitle('Hotels · Flights · Visas');
    const [hotels, flights, visas] = await Promise.all([api('/admin/hotels'), api('/admin/flights'), api('/admin/visas')]);
    const dis = isAdmin ? '' : 'disabled';
    view.innerHTML = `<div class="card table-wrap"><div class="panel" style="padding-bottom:0"><h3>Hotels</h3></div><table class="table"><thead><tr><th>Hotel</th><th>City</th><th>★</th><th>Price / night (SAR)</th><th>Active</th><th></th></tr></thead><tbody>
      ${hotels.map((h) => `<tr data-kind="hotels" data-id="${h.id}"><td>${esc(h.name)}</td><td>${esc(h.city_en)}</td><td>${h.stars}</td><td><input class="input" style="height:36px;width:120px" type="number" name="price" value="${h.price_per_night / 100}" ${dis}></td>
        <td><input type="checkbox" name="active" ${h.active ? 'checked' : ''} ${dis}></td><td>${isAdmin ? '<button class="btn btn-outline btn-sm" data-save>Save</button>' : ''}</td></tr>`).join('')}</tbody></table></div>
      <div class="card table-wrap mt-2"><div class="panel" style="padding-bottom:0"><h3>Visa services</h3></div><table class="table"><thead><tr><th>Visa</th><th>Processing</th><th>Price (SAR)</th><th>Active</th><th></th></tr></thead><tbody>
      ${visas.map((v) => `<tr data-kind="visas" data-id="${v.id}"><td>${esc(v.flag)} ${esc(v.country_en)} — ${esc(v.type_en)}</td><td><input class="input" style="height:36px" name="processing" value="${esc(v.processing_days)}" ${dis}></td>
        <td><input class="input" style="height:36px;width:110px" type="number" name="price" value="${v.price / 100}" ${dis}></td><td><input type="checkbox" name="active" ${v.active ? 'checked' : ''} ${dis}></td><td>${isAdmin ? '<button class="btn btn-outline btn-sm" data-save>Save</button>' : ''}</td></tr>`).join('')}</tbody></table></div>
      <div class="card table-wrap mt-2"><div class="panel" style="padding-bottom:0"><h3>Flight schedules</h3><p class="muted small">Fares are derived from the base economy fare with date, demand and cabin multipliers. Connect a GDS (Amadeus/Sabre) for live airline inventory.</p></div>
      <table class="table"><thead><tr><th>Flight</th><th>Route</th><th>Departs</th><th>Duration</th><th>Base fare (SAR)</th><th>Active</th><th></th></tr></thead><tbody>
      ${flights.map((f) => `<tr data-kind="flights" data-id="${f.id}"><td>${esc(f.airline)} <span class="mono">${esc(f.flight_no)}</span></td><td>${f.origin} → ${f.destination}</td><td>${f.depart_time}</td><td>${Math.floor(f.duration_min / 60)}h ${f.duration_min % 60}m</td>
        <td><input class="input" style="height:36px;width:110px" type="number" name="baseFare" value="${f.base_fare / 100}" ${dis}></td><td><input type="checkbox" name="active" ${f.active ? 'checked' : ''} ${dis}></td><td>${isAdmin ? '<button class="btn btn-outline btn-sm" data-save>Save</button>' : ''}</td></tr>`).join('')}</tbody></table></div>`;
    $$('[data-save]').forEach((b) => {
      b.onclick = guard(async () => {
        const tr = b.closest('tr');
        const body = { active: tr.querySelector('[name=active]').checked };
        $$('input.input', tr).forEach((i) => { body[i.name] = i.type === 'number' ? Number(i.value) : i.value; });
        await api(`/admin/${tr.dataset.kind}/${tr.dataset.id}`, { method: 'PUT', body });
        toast('Saved', 'success');
      });
    });
  }

  // ------------------------------------------------------------ promos
  async function promos() {
    setTitle('Promo codes');
    const rows = await api('/admin/promos');
    view.innerHTML = `${isAdmin ? `<form class="card panel toolbar" id="pf" style="margin-bottom:16px">
        <input class="input" name="code" placeholder="CODE" required style="text-transform:uppercase;width:140px">
        <select class="input" name="kind"><option value="percent">% off</option><option value="fixed">SAR off</option></select>
        <input class="input" name="value" type="number" placeholder="Value" required style="width:100px">
        <input class="input" name="min_amount" type="number" placeholder="Min spend SAR" style="width:140px">
        <input class="input" name="max_discount" type="number" placeholder="Max discount SAR" style="width:160px">
        <input class="input" name="max_uses" type="number" placeholder="Max uses" style="width:110px">
        <input class="input" name="expires_at" type="date" title="Expires">
        <button class="btn btn-primary btn-sm">Save code</button></form>` : ''}
      <div class="card table-wrap"><table class="table"><thead><tr><th>Code</th><th>Discount</th><th>Min spend</th><th>Cap</th><th>Used</th><th>Expires</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map((p) => `<tr><td class="mono"><strong>${esc(p.code)}</strong></td><td>${p.kind === 'percent' ? `${p.value}%` : SAR(p.value)}</td><td>${SAR(p.min_amount)}</td><td>${p.max_discount ? SAR(p.max_discount) : '—'}</td>
        <td>${p.used}${p.max_uses ? ` / ${p.max_uses}` : ''}</td><td>${p.expires_at ? fmtDate(p.expires_at) : '—'}</td><td>${p.active ? '<span class="status s-confirmed">active</span>' : '<span class="status s-cancelled">disabled</span>'}</td>
        <td>${isAdmin && p.active ? `<button class="btn btn-ghost btn-sm" data-off="${esc(p.code)}">Disable</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
    $('#pf')?.addEventListener('submit', guard(async (e) => { e.preventDefault(); await api('/admin/promos', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast('Saved', 'success'); promos(); }));
    $$('[data-off]').forEach((b) => { b.onclick = guard(async () => { await api(`/admin/promos/${encodeURIComponent(b.dataset.off)}`, { method: 'DELETE' }); promos(); }); });
  }

  // ------------------------------------------------------------ customers / inquiries / reviews / messages
  async function customers() {
    setTitle('Customers', '<a class="btn btn-outline btn-sm" href="#" id="subs">Newsletter subscribers</a>');
    view.innerHTML = '<div class="toolbar"><input class="input" id="cq" placeholder="Search name, email, phone…" style="min-width:280px"></div><div class="card table-wrap" id="cl"></div>';
    const load = async () => {
      const rows = await api(`/admin/customers?q=${encodeURIComponent($('#cq').value)}`);
      $('#cl').innerHTML = rows.length ? `<table class="table"><thead><tr><th>Customer</th><th>Phone</th><th>Account</th><th class="r">Bookings</th><th class="r">Spent</th><th>Last booking</th></tr></thead><tbody>
        ${rows.map((c) => `<tr><td><strong>${esc(c.name)}</strong><div class="small muted">${esc(c.email)}</div></td><td><a href="https://wa.me/${esc(String(c.phone || '').replace('+', ''))}" target="_blank" rel="noopener">${esc(c.phone || '')}</a></td>
          <td>${c.user_id ? 'Registered' : 'Guest'}</td><td class="r">${c.bookings}</td><td class="r num">${SAR(c.spent || 0)}</td><td class="small muted">${fmtDate(c.last_booking)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">No customers yet.</div>';
    };
    let tmr;
    $('#cq').oninput = () => { clearTimeout(tmr); tmr = setTimeout(load, 300); };
    $('#subs').onclick = guard(async (e) => {
      e.preventDefault();
      const s = await api('/admin/subscribers');
      modal(`<h2 style="font-size:1.3rem">Newsletter subscribers (${s.length})</h2><textarea class="input" readonly style="min-height:300px">${esc(s.map((x) => x.email).join('\n'))}</textarea>`);
    });
    await load();
  }

  async function inquiries() {
    setTitle('Inquiries');
    const rows = await api('/admin/inquiries');
    view.innerHTML = `<div class="card table-wrap">${rows.length ? `<table class="table"><thead><tr><th>From</th><th>Subject</th><th>Message</th><th>Status</th><th>Received</th></tr></thead><tbody>
      ${rows.map((q) => `<tr><td><strong>${esc(q.name)}</strong><div class="small"><a href="mailto:${esc(q.email)}">${esc(q.email)}</a></div>${q.phone ? `<div class="small"><a target="_blank" rel="noopener" href="https://wa.me/${esc(q.phone.replace(/\D/g, ''))}">${esc(q.phone)}</a></div>` : ''}</td>
        <td>${esc(q.subject)}</td><td style="max-width:380px"><pre class="msg">${esc(q.message)}</pre></td>
        <td><select class="input" style="height:36px" data-inq="${q.id}">${['new', 'in_progress', 'closed'].map((s) => `<option ${q.status === s ? 'selected' : ''} value="${s}">${s.replace('_', ' ')}</option>`).join('')}</select></td>
        <td class="small muted">${fmtDate(q.created_at)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">No inquiries.</div>'}</div>`;
    $$('[data-inq]').forEach((s) => { s.onchange = guard(async () => { await api(`/admin/inquiries/${s.dataset.inq}`, { method: 'PATCH', body: { status: s.value } }); toast('Updated', 'success'); counts(); }); });
  }

  async function reviews() {
    setTitle('Reviews');
    const rows = await api('/admin/reviews');
    view.innerHTML = `<div class="card table-wrap">${rows.length ? `<table class="table"><thead><tr><th>Package</th><th>Reviewer</th><th>Rating</th><th>Comment</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(r.title_en || '—')}</td><td>${esc(r.name)}</td><td class="stars">${'★'.repeat(r.rating)}</td><td style="max-width:360px">${esc(r.comment)}</td>
        <td>${r.approved ? '<span class="status s-confirmed">published</span>' : '<span class="status s-pending">pending</span>'}</td>
        <td class="r"><button class="btn btn-outline btn-sm" data-rev="${r.id}" data-ap="${r.approved ? 0 : 1}">${r.approved ? 'Hide' : 'Approve'}</button>
          ${isAdmin ? `<button class="btn btn-ghost btn-sm" data-del="${r.id}">Delete</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">No reviews.</div>'}</div>`;
    $$('[data-rev]').forEach((b) => { b.onclick = guard(async () => { await api(`/admin/reviews/${b.dataset.rev}`, { method: 'PATCH', body: { approved: b.dataset.ap === '1' } }); reviews(); }); });
    $$('[data-del]').forEach((b) => { b.onclick = guard(async () => { if (confirm('Delete review?')) { await api(`/admin/reviews/${b.dataset.del}`, { method: 'DELETE' }); reviews(); } }); });
  }

  async function messages() {
    setTitle('Messages outbox');
    const rows = await api('/admin/notifications');
    view.innerHTML = `<div class="alert alert-info" style="margin-bottom:16px">Every customer email / WhatsApp message is logged here. Connect an email (SMTP) or WhatsApp Business provider in <code>src/notify.js</code> to deliver them.</div>
      <div class="card table-wrap">${rows.length ? `<table class="table"><thead><tr><th>When</th><th>Channel</th><th>To</th><th>Message</th></tr></thead><tbody>
      ${rows.map((m) => `<tr><td class="small muted nowrap">${dt(m.created_at)}</td><td>${esc(m.channel)}</td><td class="small">${esc(m.recipient)}</td>
        <td><strong>${esc(m.subject)}</strong><details><summary class="small muted" style="cursor:pointer">Show</summary><pre class="msg">${esc(m.body)}</pre></details></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No messages yet.</div>'}</div>`;
  }

  // ------------------------------------------------------------ staff & settings
  async function staff() {
    setTitle('Staff');
    const rows = await api('/admin/staff');
    view.innerHTML = `<form class="card panel toolbar" id="sf" style="margin-bottom:16px"><input class="input" name="name" placeholder="Full name" required><input class="input" name="email" type="email" placeholder="Email" required>
      <input class="input" name="password" type="password" placeholder="Temporary password (10+)" minlength="10" required><select class="input" name="role"><option value="agent">Agent</option><option value="admin">Admin</option></select>
      <button class="btn btn-primary btn-sm">Add staff</button></form>
      <div class="card table-wrap"><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${u.active ? '<span class="status s-confirmed">active</span>' : '<span class="status s-cancelled">disabled</span>'}</td>
        <td class="r">${u.id !== me.id ? `<button class="btn btn-outline btn-sm" data-u="${u.id}" data-a="${u.active ? 0 : 1}">${u.active ? 'Disable' : 'Enable'}</button>` : '<span class="muted small">you</span>'}</td></tr>`).join('')}</tbody></table></div>
      <p class="muted small mt-2">Agents can manage bookings, payments, inquiries and reviews. Admins can also refund, edit the catalogue, promo codes, staff and settings.</p>`;
    $('#sf').onsubmit = guard(async (e) => { e.preventDefault(); await api('/admin/staff', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast('Staff added', 'success'); staff(); });
    $$('[data-u]').forEach((b) => { b.onclick = guard(async () => { await api(`/admin/staff/${b.dataset.u}`, { method: 'PATCH', body: { active: b.dataset.a === '1' } }); staff(); }); });
  }

  async function settings() {
    setTitle('Settings');
    const s = await api('/admin/settings');
    const st = (v) => `<span class="status ${v === 'live' ? 's-confirmed' : v === 'sandbox' ? 's-pending' : 's-cancelled'}">${v}</span>`;
    const lim = s.paymentLimits;
    const dis = isAdmin ? '' : 'disabled';
    view.innerHTML = `<div class="two"><form class="card panel" id="setf">
      <h3>Instalment limits (SAR)</h3><p class="muted small">Tabby / Tamara are only offered when the booking total is within these limits. The provider still makes the final approval decision.</p>
      <div class="form-grid">
        <div class="field"><label>Tabby minimum</label><input class="input" name="tabby_min" type="number" value="${(lim.tabby?.min || 0) / 100}" ${dis}></div>
        <div class="field"><label>Tabby maximum</label><input class="input" name="tabby_max" type="number" value="${(lim.tabby?.max || 0) / 100}" ${dis}></div>
        <div class="field"><label>Tamara minimum</label><input class="input" name="tamara_min" type="number" value="${(lim.tamara?.min || 0) / 100}" ${dis}></div>
        <div class="field"><label>Tamara maximum</label><input class="input" name="tamara_max" type="number" value="${(lim.tamara?.max || 0) / 100}" ${dis}></div>
      </div>
      <h3 class="mt-3">Bank transfer</h3>
      <label class="check"><input type="checkbox" name="bt_enabled" ${s.bankTransfer.enabled ? 'checked' : ''} ${dis}> Offer bank transfer at checkout</label>
      <div class="form-grid mt-2">
        <div class="field"><label>Bank</label><input class="input" name="bt_bank" value="${esc(s.bankTransfer.bank || '')}" ${dis}></div>
        <div class="field"><label>Account name</label><input class="input" name="bt_name" value="${esc(s.bankTransfer.accountName || '')}" ${dis}></div>
        <div class="field full"><label>IBAN</label><input class="input mono" name="bt_iban" value="${esc(s.bankTransfer.iban || '')}" ${dis}></div>
      </div>
      ${isAdmin ? '<button class="btn btn-primary mt-3">Save settings</button>' : ''}
    </form>
    <div class="card panel"><h3>Payment gateways</h3><p class="muted small">Mode: <strong>${esc(s.paymentsMode)}</strong>. Keys are configured through environment variables (never stored in the database).</p>
      <table class="table"><tbody>
        <tr><td>Cards · mada · Apple Pay · STC Pay <div class="small muted">Moyasar — MOYASAR_PUBLISHABLE_KEY, MOYASAR_SECRET_KEY</div></td><td>${st(s.providers.card)}</td></tr>
        <tr><td>Tabby <div class="small muted">TABBY_PUBLIC_KEY, TABBY_SECRET_KEY, TABBY_MERCHANT_CODE</div></td><td>${st(s.providers.tabby)}</td></tr>
        <tr><td>Tamara <div class="small muted">TAMARA_API_TOKEN, TAMARA_NOTIFICATION_KEY</div></td><td>${st(s.providers.tamara)}</td></tr>
      </tbody></table>
      <h3 class="mt-3">Webhook URLs</h3><p class="small muted">Register these in each provider dashboard:</p>
      <div class="mono small" style="display:grid;gap:6px;word-break:break-all">
        <div>Moyasar: ${esc(location.origin)}/api/pay/webhook/moyasar</div><div>Tabby: ${esc(location.origin)}/api/pay/webhook/tabby</div><div>Tamara: ${esc(location.origin)}/api/pay/webhook/tamara</div></div>
      <h3 class="mt-3">Company</h3><div class="small">${esc(s.company.nameEn)} · ${esc(s.company.nameAr)}<br>VAT ${esc(s.company.vatNumber)} · CR ${esc(s.company.crNumber)}<br>${esc(s.company.address)}</div>
    </div></div>`;
    $('#setf').onsubmit = guard(async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      await api('/admin/settings', { method: 'PUT', body: {
        paymentLimits: { tabby: { min: Number(d.tabby_min), max: Number(d.tabby_max) }, tamara: { min: Number(d.tamara_min), max: Number(d.tamara_max) } },
        bankTransfer: { enabled: !!d.bt_enabled, bank: d.bt_bank, accountName: d.bt_name, iban: d.bt_iban },
      } });
      toast('Settings saved', 'success');
    });
  }

  // ------------------------------------------------------------ router
  async function counts() {
    try {
      const s = await api('/admin/stats?days=7');
      const set = (k, n) => { const el = $(`#cnt-${k}`); if (el) { el.textContent = n; el.classList.toggle('hidden', !n); } };
      set('bookings', s.kpi.pendingPayment);
      set('inquiries', s.kpi.newInquiries);
    } catch { /* ignore */ }
  }

  const routes = { dashboard, bookings, new: newBooking, payments: paymentsView, packages, inventory, promos, customers, inquiries, reviews, messages, staff, settings };
  async function route() {
    const [, page = 'dashboard', arg] = location.hash.split('/');
    $('#side').classList.remove('open');
    if (page === 'booking' && arg) {
      if (!view.innerHTML) await routes[lastPage]();
      try { await bookingDetail(decodeURIComponent(arg)); } catch (err) { toast(err.message, 'error'); }
      return;
    }
    closeModal();
    const fn = routes[page] || dashboard;
    lastPage = routes[page] ? page : 'dashboard';
    $$('#side-nav a').forEach((a) => a.classList.toggle('active', a.dataset.k === lastPage));
    view.innerHTML = '<div class="skeleton" style="height:320px"></div>';
    try { await fn(); } catch (err) { view.innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`; }
  }
  window.addEventListener('hashchange', route);
  counts();
  route();
})();
