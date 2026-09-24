(async function () {
  const { t, esc, $, qs, api, pkgCard } = Noor;
  const q = qs();
  await Noor.init(q.category === 'umrah' ? 'nav_umrah' : 'nav_packages');

  const state = { category: q.category || '', q: q.q || '', maxPrice: q.maxPrice || '', sort: q.sort || '' };
  const cats = ['', 'umrah', 'international', 'domestic', 'honeymoon'];
  $('#f-q').value = state.q;
  $('#f-max').value = state.maxPrice;
  $('#f-sort').value = state.sort;

  function renderChips() {
    $('#f-cat').innerHTML = cats.map((c) => `<button type="button" class="chip ${state.category === c ? 'active' : ''}" data-c="${c}">${esc(c ? t(`cat_${c}`) : t('all'))}</button>`).join('');
  }

  let timer;
  async function load() {
    const params = new URLSearchParams(Object.entries(state).filter(([, v]) => v));
    history.replaceState(null, '', `?${params}`);
    $('#grid').innerHTML = '<div class="skeleton" style="height:380px"></div>'.repeat(3);
    const rows = await api(`/packages?${params}`);
    $('#count').textContent = `${rows.length} ${t('results')}`;
    $('#grid').innerHTML = rows.length ? rows.map(pkgCard).join('') : `<div class="empty card" style="grid-column:1/-1">${esc(t('no_results'))}</div>`;
  }

  $('#f-cat').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    state.category = b.dataset.c;
    renderChips();
    load();
  });
  $('#f-q').addEventListener('input', (e) => { state.q = e.target.value.trim(); clearTimeout(timer); timer = setTimeout(load, 300); });
  $('#f-max').addEventListener('change', (e) => { state.maxPrice = e.target.value; load(); });
  $('#f-sort').addEventListener('change', (e) => { state.sort = e.target.value; load(); });

  renderChips();
  load();
})();
