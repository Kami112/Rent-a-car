(async function () {
  const { t, L, esc, $, qs, api, art, icons, money, addDays } = Noor;
  await Noor.init('nav_hotels');
  const form = $('#hs');
  const q = qs();
  const amenityNames = {
    wifi: { en: 'Free Wi-Fi', ar: 'واي فاي مجاني' }, breakfast: { en: 'Breakfast', ar: 'إفطار' }, pool: { en: 'Pool', ar: 'مسبح' },
    gym: { en: 'Gym', ar: 'نادي رياضي' }, parking: { en: 'Parking', ar: 'مواقف' }, family_rooms: { en: 'Family rooms', ar: 'غرف عائلية' },
    prayer_room: { en: 'Prayer room', ar: 'مصلى' }, airport_shuttle: { en: 'Airport shuttle', ar: 'نقل من المطار' },
  };

  const all = await api('/hotels');
  const cities = [...new Map(all.map((h) => [h.city.en, h.city])).values()];
  $('#hs-city').innerHTML += cities.map((c) => `<option value="${esc(c.en)}">${esc(L(c))}</option>`).join('');
  form.city.value = q.city || '';
  form.date.min = addDays(0);
  form.endDate.min = addDays(1);
  form.date.value = q.date || addDays(10);
  form.endDate.value = q.endDate || addDays(14);
  form.rooms.value = q.rooms || '1';
  form.adults.value = q.adults || '2';

  const nights = () => Math.round((Date.parse(form.endDate.value) - Date.parse(form.date.value)) / 864e5);

  function render() {
    const list = all.filter((h) => !form.city.value || h.city.en === form.city.value);
    const n = nights();
    const rooms = Number(form.rooms.value);
    history.replaceState(null, '', `?${new URLSearchParams(new FormData(form))}`);
    $('#list').innerHTML = list.map((h) => `<div class="card hotel-row">
      <div class="pkg-media">${art(h.scene, h.hue, h.id)}</div>
      <div class="pkg-body">
        <div class="flex between"><span class="stars">${'★'.repeat(h.stars)}</span><span class="badge badge-soft">${esc(L(h.city))}</span></div>
        <h3 class="mb-0">${esc(h.name)}</h3>
        <div class="pkg-meta"><span>${icons.pin}${esc(L(h.distance))}</span></div>
        <div class="amen">${h.amenities.map((a) => `<span>${esc(L(amenityNames[a] || { en: a }))}</span>`).join('')}</div>
        <div class="pkg-foot"><div><div class="price num">${money(h.pricePerNight)} <small>/ ${esc(t('per_night'))}</small></div>
          ${n > 0 ? `<div class="small muted"><span class="num">${n}</span> ${esc(t('nights'))} · <span class="num">${rooms}</span> ${esc(t('rooms'))}: <strong class="num">${money(h.pricePerNight * n * rooms)}</strong></div>` : ''}</div>
          <button class="btn btn-primary btn-sm" data-id="${h.id}" ${n > 0 ? '' : 'disabled'}>${esc(t('book_now'))}</button></div>
      </div></div>`).join('') || `<div class="empty">${esc(t('no_results'))}</div>`;
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); render(); });
  form.addEventListener('change', render);
  $('#list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    const p = new URLSearchParams({ type: 'hotel', id: b.dataset.id, date: form.date.value, endDate: form.endDate.value, rooms: form.rooms.value, adults: form.adults.value });
    location.href = `/checkout.html?${p}`;
  });
  render();
})();
