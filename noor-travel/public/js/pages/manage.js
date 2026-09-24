(async function () {
  const { $, api, busy } = Noor;
  await Noor.init('nav_manage');
  $('#lookup').addEventListener('submit', (e) => {
    e.preventDefault();
    busy(e.submitter || $('#lookup button'), async () => {
      try {
        const r = await api('/bookings/lookup', { method: 'POST', body: { ref: $('#m-ref').value, email: $('#m-email').value } });
        location.href = `/booking.html?ref=${r.ref}&t=${r.token}`;
      } catch (err) {
        $('#m-err').textContent = err.message;
        $('#m-err').classList.remove('hidden');
      }
    });
  });
})();
