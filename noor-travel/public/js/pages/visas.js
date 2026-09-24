(async function () {
  const { t, L, esc, $, api, money } = Noor;
  await Noor.init('nav_visas');
  const list = await api('/visas');
  $('#list').innerHTML = list.map((v) => `<div class="card pkg-body" style="padding:24px">
    <div class="flex"><span style="font-size:2.2rem" aria-hidden="true">${esc(v.flag)}</span>
      <div><h3 class="mb-0">${esc(L(v.country))}</h3><div class="muted small">${esc(L(v.type))}</div></div></div>
    <div class="small"><strong>${esc(t('processing'))}:</strong> ${esc(v.processing)}</div>
    <details><summary class="small" style="cursor:pointer;color:var(--brand);font-weight:700">${esc(t('requirements'))}</summary>
      <ul class="small muted" style="padding-inline-start:18px">${v.requirements.map((r) => `<li>${esc(L(r))}</li>`).join('')}</ul></details>
    <div class="pkg-foot"><div><div class="price num">${money(v.price)}</div><div class="small muted">${esc(t('per_applicant'))}</div></div>
      <a class="btn btn-primary btn-sm" href="/checkout.html?type=visa&id=${v.id}&adults=1">${esc(t('apply_now'))}</a></div>
  </div>`).join('');
})();
