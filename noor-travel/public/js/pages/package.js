(async function () {
  const { t, L, esc, $, qs, api, art, icons, money, addDays, stars, toast, stepper } = Noor;
  await Noor.init('nav_packages');
  const { slug } = qs();
  let p;
  try {
    p = await api(`/packages/${encodeURIComponent(slug || '')}`);
  } catch {
    $('#pkg-head').innerHTML = `<div class="empty">${esc(t('no_results'))} <a href="/packages.html">${esc(t('view_all'))}</a></div>`;
    $('#book-box').remove();
    return;
  }
  document.title = `${L(p.title)} | ${t('brand')}`;
  $('#crumb').textContent = L(p.title);
  $('#pkg-head').innerHTML = `<div class="flex between mt-2 mb-0" style="align-items:flex-end;margin-bottom:18px">
    <div><span class="badge">${esc(t(`cat_${p.category}`))}</span><h1 class="mt-1" style="font-size:clamp(1.7rem,3.5vw,2.6rem)">${esc(L(p.title))}</h1>
    <div class="pkg-meta"><span>${icons.pin}${esc(L(p.destination))}</span><span>${icons.clock}<span class="num">${p.durationDays}</span> ${esc(t('days'))}</span>
    ${p.rating ? `<span class="stars">${stars(p.rating)}</span><span>${p.rating} (${p.reviewCount} ${esc(t('reviews'))})</span>` : ''}
    <span>${icons.users}<span class="num">${p.seats}</span> ${esc(t('seats_left'))}</span></div></div></div>`;
  $('#gallery').innerHTML = art(p.scene, p.hue, p.id);
  $('#summary').textContent = L(p.summary);
  $('#includes').innerHTML = p.includes.map((i) => `<li>${esc(L(i))}</li>`).join('');
  // One entry per day → number them; otherwise entries carry their own day ranges.
  const perDay = p.itinerary.length === p.durationDays;
  $('#itinerary').innerHTML = p.itinerary.map((d, i) => (perDay
    ? `<li data-day="${i + 1}"><strong>${esc(t('day'))} ${i + 1}</strong><div class="muted">${esc(L(d))}</div></li>`
    : `<li class="dot"><div>${esc(L(d))}</div></li>`)).join('');
  $('#reviews').innerHTML = p.reviews.length ? p.reviews.map((r) => `<div style="padding:14px 0;border-bottom:1px solid var(--line)">
    <div class="flex between"><strong>${esc(r.name)}</strong><span class="stars">${stars(r.rating)}</span></div><p class="mb-0 muted">${esc(r.comment)}</p></div>`).join('')
    : `<p class="muted">—</p>`;

  // Booking box
  $('#bx-price').innerHTML = `${money(p.price)} <small class="muted" style="font-size:.8rem">/ ${esc(t('per_person'))}</small>`;
  const date = $('#bx-date');
  date.min = addDays(4);
  date.value = qs().date && qs().date >= date.min ? qs().date : addDays(21);
  const adults = stepper($('#bx-adults'), { min: 1, max: 9, value: Number(qs().adults) || 2, onChange: refresh });
  const children = stepper($('#bx-children'), { min: 0, max: 8, value: 0, onChange: refresh });
  const infants = stepper($('#bx-infants'), { min: 0, max: 4, value: 0, onChange: refresh });
  date.addEventListener('change', refresh);

  let seq = 0;
  async function refresh() {
    infants.setMax(adults.value);
    const mine = ++seq;
    const body = { type: 'package', id: p.slug, date: date.value, adults: adults.value, children: children.value, infants: infants.value };
    try {
      const q = await api('/quote', { method: 'POST', body });
      if (mine !== seq) return;
      $('#bx-err').classList.add('hidden');
      $('#bx-total').textContent = money(q.total);
      const bnpl = q.paymentMethods.filter((m) => m.key === 'tabby' || m.key === 'tamara');
      $('#bx-bnpl').innerHTML = bnpl.map((m) => `<div><span class="pay-logo ${m.key}" style="height:24px;font-size:.75rem">${m.key}</span>
        <span>${esc(t('or_split'))} <strong class="num">${money(m.perInstalment, { decimals: 2 })}</strong></span></div>`).join('');
      $('#bx-bnpl').classList.toggle('hidden', !bnpl.length);
      $('#bx-go').disabled = false;
    } catch (err) {
      if (mine !== seq) return;
      $('#bx-err').textContent = err.message;
      $('#bx-err').classList.remove('hidden');
      $('#bx-go').disabled = true;
    }
  }
  refresh();

  $('#bx-go').addEventListener('click', () => {
    const params = new URLSearchParams({ type: 'package', id: p.slug, date: date.value, adults: adults.value, children: children.value, infants: infants.value });
    location.href = `/checkout.html?${params}`;
  });

  $('#review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api(`/packages/${p.slug}/reviews`, { method: 'POST', body: Object.fromEntries(f) });
      toast(t('review_thanks'), 'success');
      e.target.reset();
      e.target.closest('details').open = false;
    } catch (err) { toast(err.message, 'error'); }
  });
})();
