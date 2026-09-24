(async function () {
  const { t, L, esc, $, $$, api, art, icons, money, addDays, pkgCard, stars } = Noor;
  const { site } = await Noor.init('nav_home');

  $('#hero-art').innerHTML = art('mosque', 160, 3);
  $$('[data-icon]').forEach((el) => { el.innerHTML = icons[el.dataset.icon] || ''; });

  // Search tabs
  $$('.tab').forEach((tab) => tab.addEventListener('click', () => {
    $$('.tab').forEach((x) => x.classList.toggle('active', x === tab));
    $$('[data-pane]').forEach((p) => p.classList.toggle('hidden', p.dataset.pane !== tab.dataset.tab));
  }));

  // Airports & cabins
  $$('select.airport').forEach((sel) => {
    sel.innerHTML = Object.entries(site.airports).map(([code, a]) => `<option value="${code}">${esc(L(a))} (${code})</option>`).join('');
    sel.value = sel.dataset.default;
  });
  $('#cabin-sel').innerHTML = Object.entries(site.cabins).map(([k, c]) => `<option value="${k}">${esc(L(c))}</option>`).join('');

  // Sensible default dates
  const min = addDays(1);
  $$('input[type=date]').forEach((i) => { i.min = min; });
  $('#umrah-date').value = addDays(14);
  $('[data-pane=flights] [name=date]').value = addDays(10);
  $('[data-pane=hotels] [name=date]').value = addDays(10);
  $('[data-pane=hotels] [name=endDate]').value = addDays(14);

  // Content
  const [umrah, featured, reviews] = await Promise.all([
    api('/packages?category=umrah'), api('/packages?featured=1'), api('/reviews/featured'),
  ]);
  $('#umrah-grid').innerHTML = umrah.slice(0, 3).map(pkgCard).join('');
  $('#featured-grid').innerHTML = featured.filter((p) => p.category !== 'umrah').slice(0, 6).map(pkgCard).join('');

  const dests = [
    ['Makkah & Madinah', 'مكة والمدينة', 'mosque', 45, '/packages.html?category=umrah'],
    ['Türkiye', 'تركيا', 'mosque', 205, '/packages.html?q=Türkiye'],
    ['Maldives', 'المالديف', 'beach', 185, '/packages.html?category=honeymoon'],
    ['Switzerland', 'سويسرا', 'mountain', 215, '/packages.html?q=Switzerland'],
    ['AlUla', 'العلا', 'desert', 25, '/packages.html?category=domestic'],
    ['Azerbaijan', 'أذربيجان', 'city', 265, '/packages.html?q=Azerbaijan'],
    ['Georgia', 'جورجيا', 'mountain', 130, '/packages.html?q=Georgia'],
    ['Malaysia', 'ماليزيا', 'city', 20, '/packages.html?q=Malaysia'],
  ];
  $('#dest-grid').innerHTML = dests.map(([en, ar, scene, hue, href], i) => `<a class="dest-tile" href="${href}">${art(scene, hue, i + 2)}
    <span class="cap"><strong>${esc(L({ en, ar }))}</strong></span></a>`).join('');

  const demoTotal = 858000;
  $('#bnpl-demo-total').textContent = money(demoTotal);
  $('#bnpl-demo-plan').innerHTML = [0, 1, 2, 3].map((i) => `<div><strong class="num">${money(demoTotal / 4)}</strong>${i === 0 ? esc(t('today')) : esc(t('in_months', { n: i }))}</div>`).join('');

  $('#reviews-grid').innerHTML = reviews.slice(0, 3).map((r) => `<div class="card review-card">
    <div class="stars" aria-label="${r.rating}/5">${stars(r.rating)}</div>
    <blockquote>“${esc(r.comment)}”</blockquote>
    <div class="flex"><div class="avatar">${esc(r.name[0])}</div><div><strong>${esc(r.name)}</strong><div class="small muted">${esc(L({ en: r.title_en, ar: r.title_ar }))}</div></div></div>
  </div>`).join('');
})();
