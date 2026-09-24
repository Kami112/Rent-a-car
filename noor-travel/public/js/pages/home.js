(async function () {
  const { t, L, esc, $, $$, api, art, icons, money, addDays, pkgCard, stars } = Noor;
  const { site } = await Noor.init('nav_home');

  $('#hero-art').innerHTML = art('city', 200, 5);
  $$('[data-icon]').forEach((el) => { el.innerHTML = icons[el.dataset.icon] || ''; });

  Noor.flightSearch($('#flight-search'));
  try {
    const recent = JSON.parse(localStorage.getItem('noor_recent') || '[]');
    if (recent.length) {
      $('#recent').innerHTML = `<span class="muted">${esc(t('recent_searches'))}:</span>` + recent.map((r) => `<a href="/flights.html?${esc(r.q)}">${esc(r.from)} → ${esc(r.to)} · ${Noor.fmtDate(r.date, { day: 'numeric', month: 'short' })}</a>`).join('');
    }
  } catch { /* storage unavailable */ }

  const routes = [['JED', 'mosque', 45], ['MED', 'mosque', 150], ['DXB', 'city', 260], ['CAI', 'desert', 35], ['IST', 'mosque', 205], ['LHR', 'city', 230], ['KUL', 'city', 20], ['MLE', 'beach', 185], ['GYD', 'city', 265], ['TBS', 'mountain', 130], ['DMM', 'beach', 195], ['AHB', 'mountain', 110]];
  const when = addDays(14);
  $('#routes').innerHTML = routes.map(([code, scene, hue], i) => {
    const a = site.airports[code];
    return `<a class="route-card" href="/flights.html?from=RUH&to=${code}&date=${when}&adults=1&cabin=economy">
      <span class="rc-art">${art(scene, hue, i + 1)}</span>
      <span><small class="muted">${esc(L({ en: site.airports.RUH.en, ar: site.airports.RUH.ar }))} →</small><strong>${esc(L({ en: a.en, ar: a.ar }))}</strong><small class="muted">${esc(L(a.countryName))}</small></span></a>`;
  }).join('');

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
