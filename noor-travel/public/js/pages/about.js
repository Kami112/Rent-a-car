(async function () {
  const { t, L, esc, $, art } = Noor;
  const { site } = await Noor.init('nav_about');
  const c = site.company;
  const blocks = [
    { en: 'Our story', ar: 'قصتنا' },
    { en: 'Ezhar Travel and Tourism crafts journeys built on trust, comfort and excellence. From our head office in As Suwaidi and our branches across Riyadh we arrange flights, hotels, tours, Umrah programmes, cargo and visas — tailored travel solutions that blend comfort, convenience and cultural immersion, proudly aligned with Saudi Vision 2030.',
      ar: 'تصمم إزهار للسفر والسياحة رحلات قائمة على الثقة والراحة والتميز. من مكتبنا الرئيسي في السويدي وفروعنا في أنحاء الرياض نرتب الطيران والفنادق والجولات وبرامج العمرة والشحن والتأشيرات — حلول سفر مصممة لك تجمع بين الراحة والسهولة والتجربة الثقافية، بما يتماشى مع رؤية المملكة 2030.' },
    { en: 'Our mission', ar: 'رسالتنا' },
    { en: 'To deliver world-class travel solutions with honesty, efficiency and care — from your first inquiry to your safe return.',
      ar: 'تقديم حلول سفر عالمية المستوى بأمانة وكفاءة واهتمام — من أول استفسار حتى عودتك بسلام.' },
  ];
  $('#root').innerHTML = `<div class="layout-main">
    <div class="card panel"><h2>${esc(L(blocks[0]))}</h2><p>${esc(L(blocks[1]))}</p><h2 class="mt-3">${esc(L(blocks[2]))}</h2><p>${esc(L(blocks[3]))}</p>
      <div class="stats-strip mt-3"><div><strong class="num">8</strong>${esc(t('stat1'))}</div><div><strong class="num">80+</strong>${esc(t('stat2'))}</div>
      <div><strong class="num">6</strong>${esc(t('stat3'))}</div><div><strong class="num">5</strong>${esc(t('stat4'))}</div></div>
      <h2 class="mt-3">${esc(L({ en: 'Our offices in Riyadh', ar: 'مكاتبنا في الرياض' }))}</h2>
      <div class="chips">${[{ en: 'Head office — As Suwaidi', ar: 'المكتب الرئيسي — السويدي' }, ...c.branches].map((b) => `<span class="chip">${esc(L(b))}</span>`).join('')}</div></div>
    <aside class="card" style="overflow:hidden"><div style="aspect-ratio:4/3">${art('city', 220, 7)}</div><div class="panel">
      <div class="kv">${[['cr', c.crNumber], ['vat_no', c.vatNumber], ['license', c.tourismLicense]].filter(([, v]) => v).map(([k, v]) => `<div><span>${esc(t(k))}</span><strong class="num">${esc(v)}</strong></div>`).join('')}</div>
      <p class="mt-2 muted small">${esc(Noor.lang === 'ar' && c.addressAr ? c.addressAr : c.address)}</p><a class="btn btn-primary" href="/contact.html">${esc(t('nav_contact'))}</a></div></aside>
  </div>`;
})();
