(async function () {
  const { t, L, esc, $, art } = Noor;
  const { site } = await Noor.init('nav_about');
  const c = site.company;
  const blocks = [
    { en: 'Our story', ar: 'قصتنا' },
    { en: 'Noor Travel Agency was founded in Riyadh to make travel simple, trustworthy and beautifully organised — from the first Umrah of a young family to corporate delegations and once-in-a-lifetime honeymoons. Our head office on King Fahd Road serves travellers across the Kingdom, online and in person.',
      ar: 'تأسست وكالة نور للسفر والسياحة في الرياض لتجعل السفر سهلاً وموثوقاً ومنظماً بإتقان — من أول عمرة لعائلة شابة إلى الوفود الرسمية ورحلات شهر العسل. يخدم مكتبنا الرئيسي على طريق الملك فهد المسافرين في جميع أنحاء المملكة، إلكترونياً وحضورياً.' },
    { en: 'Our promise', ar: 'وعدنا' },
    { en: 'Transparent VAT-inclusive prices, licensed partners only, and a real consultant who answers on WhatsApp — before, during and after your journey.',
      ar: 'أسعار واضحة شاملة الضريبة، وشركاء مرخصون فقط، ومستشار حقيقي يرد عليك عبر واتساب قبل رحلتك وأثناءها وبعدها.' },
  ];
  $('#root').innerHTML = `<div class="layout-main">
    <div class="card panel"><h2>${esc(L(blocks[0]))}</h2><p>${esc(L(blocks[1]))}</p><h2 class="mt-3">${esc(L(blocks[2]))}</h2><p>${esc(L(blocks[3]))}</p>
      <div class="stats-strip mt-3"><div><strong class="num">15+</strong>${esc(L({ en: 'Years', ar: 'عاماً' }))}</div><div><strong class="num">48k+</strong>${esc(t('stat1'))}</div>
      <div><strong class="num">60+</strong>${esc(t('stat3'))}</div><div><strong class="num">4.9</strong>${esc(t('stat4'))}</div></div></div>
    <aside class="card" style="overflow:hidden"><div style="aspect-ratio:4/3">${art('city', 220, 7)}</div><div class="panel">
      <div class="kv"><div><span>${esc(t('cr'))}</span><strong class="num">${esc(c.crNumber)}</strong></div><div><span>${esc(t('vat_no'))}</span><strong class="num">${esc(c.vatNumber)}</strong></div>
      <div><span>${esc(t('license'))}</span><strong class="num">${esc(c.tourismLicense)}</strong></div></div>
      <p class="mt-2 muted small">${esc(c.address)}</p><a class="btn btn-primary" href="/contact.html">${esc(t('nav_contact'))}</a></div></aside>
  </div>`;
})();
