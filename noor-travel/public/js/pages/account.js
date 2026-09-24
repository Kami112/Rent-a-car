(async function () {
  const { t, esc, $, api, money, fmtDate, statusBadge, busy } = Noor;
  const { me } = await Noor.init();
  const root = $('#root');

  const next = (() => { const n = new URLSearchParams(location.search).get('next'); return n && /^\/[^/\\]/.test(n) ? n : null; })();

  function authView(mode = 'login') {
    if (mode === 'forgot' || mode === 'reset') return recoverView(mode);
    const reg = mode === 'register';
    root.innerHTML = `<div class="card panel" style="max-width:460px;margin:0 auto">
      <h1 style="font-size:1.8rem">${esc(t(reg ? 'register_title' : 'login_title'))}</h1>
      ${next ? `<div class="alert alert-info">${esc(t('auth_gate_sub'))}</div>` : ''}
      <form id="auth" class="mt-2" style="display:grid;gap:14px">
        ${reg ? `<div class="field"><label>${esc(t('full_name'))}</label><input class="input" name="name" required autocomplete="name"></div>
                 <div class="field"><label>${esc(t('mobile'))}</label><input class="input num" name="phone" type="tel" placeholder="05XXXXXXXX" autocomplete="tel"></div>` : ''}
        <div class="field"><label>${esc(t('email'))}</label><input class="input" name="email" type="email" required autocomplete="email"></div>
        <div class="field"><label>${esc(t('password'))}</label><input class="input" name="password" type="password" required minlength="${reg ? 8 : 1}" autocomplete="${reg ? 'new-password' : 'current-password'}"></div>
        ${reg ? '' : `<a href="#" id="forgot" class="small">${esc(t('forgot_password'))}</a>`}
        <div class="alert alert-error hidden" id="a-err"></div>
        <button class="btn btn-primary btn-block">${esc(t(reg ? 'create_account' : 'sign_in'))}</button>
      </form>
      <p class="mt-2 small muted">${esc(t(reg ? 'have_account' : 'no_account'))} <a href="#" id="swap">${esc(t(reg ? 'sign_in' : 'create_account'))}</a></p>
    </div>`;
    $('#swap').onclick = (e) => { e.preventDefault(); authView(reg ? 'login' : 'register'); };
    $('#forgot')?.addEventListener('click', (e) => { e.preventDefault(); authView('forgot'); });
    $('#auth').onsubmit = (e) => {
      e.preventDefault();
      busy($('#auth button'), async () => {
        try {
          const u = await api(`/account/${reg ? 'register' : 'login'}`, { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
          location.href = next || (['admin', 'agent'].includes(u.role) ? '/admin/' : '/account.html');
        } catch (err) { $('#a-err').textContent = err.message; $('#a-err').classList.remove('hidden'); }
      });
    };
  }

  function recoverView(mode) {
    const token = (location.hash.match(/reset=([\w-]+)/) || [])[1];
    const reset = mode === 'reset' && token;
    root.innerHTML = `<div class="card panel" style="max-width:460px;margin:0 auto">
      <h1 style="font-size:1.6rem">${esc(t(reset ? 'reset_title' : 'forgot_password'))}</h1>
      <form id="rec" class="mt-2" style="display:grid;gap:14px">
        ${reset ? `<div class="field"><label>${esc(t('new_password'))}</label><input class="input" name="password" type="password" minlength="8" required autocomplete="new-password"></div>`
    : `<div class="field"><label>${esc(t('email'))}</label><input class="input" name="email" type="email" required autocomplete="email"></div>`}
        <div class="alert hidden" id="r-msg"></div>
        <button class="btn btn-primary btn-block">${esc(t(reset ? 'set_password' : 'send_reset_link'))}</button>
      </form>
      <p class="mt-2 small"><a href="/account.html">${esc(t('back_to_signin'))}</a></p></div>`;
    $('#rec').onsubmit = (e) => {
      e.preventDefault();
      const msg = $('#r-msg');
      busy($('#rec button'), async () => {
        try {
          const body = Object.fromEntries(new FormData(e.target));
          if (reset) { await api('/account/reset', { method: 'POST', body: { ...body, token } }); location.href = '/account.html'; return; }
          await api('/account/forgot', { method: 'POST', body });
          msg.className = 'alert alert-success'; msg.textContent = t('reset_sent');
        } catch (err) { msg.className = 'alert alert-error'; msg.textContent = err.message; }
      });
    };
  }

  async function dashboard() {
    const rows = await api('/account/bookings');
    root.innerHTML = `<div class="flex between"><div><h1 style="font-size:1.8rem" class="mb-0">${esc(t('my_bookings'))}</h1><p class="muted">${esc(me.name)} · ${esc(me.email)}</p></div>
      <div class="flex">${['admin', 'agent'].includes(me.role) ? '<a class="btn btn-gold" href="/admin/">Back-office</a>' : ''}<button class="btn btn-outline" id="logout">${esc(t('sign_out'))}</button></div></div>
      <div class="card mt-2 table-wrap">${rows.length ? `<table class="table"><thead><tr><th>${esc(t('booking_ref'))}</th><th></th><th>${esc(t('travel_date'))}</th><th>${esc(t('status'))}</th><th class="r">${esc(t('total'))}</th><th></th></tr></thead><tbody>
        ${rows.map((b) => `<tr><td class="num"><strong>${esc(b.ref)}</strong></td><td>${esc(b.title)}</td><td>${fmtDate(b.travel_date)}</td>
          <td>${statusBadge('st', b.status)} ${statusBadge('ps', b.payment_status)}</td><td class="r num">${money(b.total)}</td>
          <td class="r"><a class="btn btn-outline btn-sm" href="/booking.html?ref=${esc(b.ref)}&t=${esc(b.token)}">${esc(t('open'))}</a></td></tr>`).join('')}
        </tbody></table>` : `<div class="empty">${esc(t('no_bookings'))}<div class="mt-2"><a class="btn btn-primary" href="/packages.html">${esc(t('book_now'))}</a></div></div>`}</div>`;
    $('#logout').onclick = async () => { await api('/account/logout', { method: 'POST', body: {} }); location.href = '/'; };
  }

  if (location.hash.startsWith('#reset=')) authView('reset');
  else if (me && next) location.href = next;
  else if (me) dashboard();
  else authView(location.hash === '#register' ? 'register' : 'login');
})();
