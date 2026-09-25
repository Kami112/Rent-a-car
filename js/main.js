document.addEventListener('DOMContentLoaded', function () {
  /* ---------- Mobile nav ---------- */
  var navToggle = document.querySelector('.nav-toggle');
  var mainNav = document.querySelector('.main-nav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      mainNav.classList.toggle('mobile-open');
    });
  }

  /* ---------- Sticky header shadow ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.style.boxShadow = window.scrollY > 10 ? '0 4px 16px rgba(15,21,34,0.08)' : 'none';
    });
  }

  /* ---------- Back to top ---------- */
  var backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', function () {
      backToTop.classList.toggle('show', window.scrollY > 400);
    });
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Search widget tabs ---------- */
  var searchTabs = document.querySelectorAll('.search-tabs button');
  searchTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      searchTabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
    });
  });

  /* ---------- Booking / search form -> redirect to fleet with query ---------- */
  var searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var params = new URLSearchParams(new FormData(searchForm));
      window.location.href = 'fleet.html?' + params.toString();
    });
  }

  /* ---------- Fleet filter tabs ---------- */
  var filterTabs = document.querySelectorAll('.filter-tabs button');
  var carCards = document.querySelectorAll('[data-category]');
  filterTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      filterTabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var cat = tab.getAttribute('data-filter');
      carCards.forEach(function (card) {
        var show = cat === 'all' || card.getAttribute('data-category') === cat;
        card.style.display = show ? '' : 'none';
      });
    });
  });

  /* ---------- FAQ accordion ---------- */
  var faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function (item) {
    var question = item.querySelector('.faq-question');
    question.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      faqItems.forEach(function (i) { i.classList.remove('open'); });
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ---------- Car detail tabs ---------- */
  var detailTabs = document.querySelectorAll('.detail-tabs button');
  detailTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-tab');
      detailTabs.forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.detail-panel').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(target).classList.add('active');
    });
  });

  /* ---------- Car detail gallery ---------- */
  var thumbs = document.querySelectorAll('.gallery-thumb');
  var mainTile = document.getElementById('gallery-main-tile');
  thumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      thumbs.forEach(function (t) { t.classList.remove('active'); });
      thumb.classList.add('active');
      if (mainTile) mainTile.className = 'illus-tile ' + thumb.getAttribute('data-illus');
    });
  });

  /* ---------- Booking summary calculator ---------- */
  var pickupDate = document.getElementById('booking-pickup-date');
  var returnDate = document.getElementById('booking-return-date');
  var dayRateEl = document.querySelector('[data-day-rate]');
  var summaryDays = document.getElementById('summary-days');
  var summaryTotal = document.getElementById('summary-total');
  function recalcBooking() {
    if (!pickupDate || !returnDate || !dayRateEl) return;
    var rate = parseFloat(dayRateEl.getAttribute('data-day-rate')) || 0;
    var start = new Date(pickupDate.value);
    var end = new Date(returnDate.value);
    var days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (!days || days < 1 || isNaN(days)) days = 1;
    if (summaryDays) summaryDays.textContent = window.I18N ? I18N.days(days) : days + (days === 1 ? ' day' : ' days');
    if (summaryTotal) summaryTotal.textContent = window.I18N ? I18N.money(days * rate) : 'SAR ' + (days * rate).toLocaleString();
    return { days: days, rate: rate, total: days * rate };
  }
  [pickupDate, returnDate].forEach(function (el) {
    if (el) el.addEventListener('change', recalcBooking);
  });
  recalcBooking();

  /* ---------- Contact / booking form success message ---------- */
  document.querySelectorAll('form[data-fake-submit]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.id === 'booking-form') saveBooking(form);
      var success = form.parentElement.querySelector('.form-success');
      if (success) {
        success.classList.add('show');
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      form.reset();
      recalcBooking();
    });
  });

  /* ---------- Bookings: saved in this browser so the admin dashboard can show them ---------- */
  function bookingDetails(form) {
    var calc = recalcBooking() || { days: 1, rate: 0, total: 0 };
    var loc = document.getElementById('booking-pickup-loc');
    return {
      car: form.getAttribute('data-car') || '',
      customer: (document.getElementById('booking-name') || {}).value || '',
      phone: (document.getElementById('booking-phone') || {}).value || '',
      city: loc ? (loc.selectedIndex > 0 ? loc.options[loc.selectedIndex].text : '') : '',
      pickup: pickupDate ? pickupDate.value : '',
      dropoff: returnDate ? returnDate.value : '',
      days: calc.days,
      total: calc.total
    };
  }

  function saveBooking(form) {
    var b = bookingDetails(form);
    b.id = 'BK-' + Date.now().toString().slice(-6);
    b.status = 'Pending';
    b.source = 'Website';
    b.created = new Date().toISOString();
    try {
      var list = JSON.parse(localStorage.getItem('drivenow_bookings') || '[]');
      list.unshift(b);
      localStorage.setItem('drivenow_bookings', JSON.stringify(list));
    } catch (err) { /* storage unavailable: booking still shows the success message */ }
  }

  /* ---------- WhatsApp ---------- */
  var WHATSAPP_NUMBER = '966500000000'; // replace with the business number (country code, no +)
  function openWhatsApp(text) {
    window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }

  var waBooking = document.getElementById('booking-whatsapp');
  var bookingForm = document.getElementById('booking-form');
  if (waBooking && bookingForm) {
    waBooking.addEventListener('click', function () {
      var b = bookingDetails(bookingForm);
      var ar = window.I18N && I18N.lang === 'ar';
      var lines = ar ? [
        'مرحباً، أرغب في حجز سيارة:',
        'السيارة: ' + b.car,
        b.city && 'المدينة: ' + b.city,
        b.pickup && 'من: ' + b.pickup + ' إلى: ' + b.dropoff,
        'المدة: ' + I18N.days(b.days) + ' — الإجمالي: ' + I18N.money(b.total),
        b.customer && 'الاسم: ' + b.customer
      ] : [
        'Hello, I would like to book a car:',
        'Car: ' + b.car,
        b.city && 'City: ' + b.city,
        b.pickup && 'From: ' + b.pickup + ' to: ' + b.dropoff,
        'Duration: ' + b.days + (b.days === 1 ? ' day' : ' days') + ' — Total: SAR ' + b.total.toLocaleString(),
        b.customer && 'Name: ' + b.customer
      ];
      openWhatsApp(lines.filter(Boolean).join('\n'));
    });
  }

  var waFloat = document.createElement('a');
  waFloat.className = 'whatsapp-float';
  waFloat.href = 'https://wa.me/' + WHATSAPP_NUMBER;
  waFloat.target = '_blank';
  waFloat.rel = 'noopener';
  waFloat.setAttribute('aria-label', window.I18N ? I18N.t('Chat on WhatsApp') : 'Chat on WhatsApp');
  waFloat.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';
  document.body.appendChild(waFloat);

  /* ---------- Admin dashboard link in the footer ---------- */
  var footerBottom = document.querySelector('.footer-bottom > span');
  if (footerBottom) {
    var adminLink = document.createElement('a');
    adminLink.href = 'admin.html';
    adminLink.className = 'footer-admin-link';
    adminLink.textContent = window.I18N ? I18N.t('Admin') : 'Admin';
    footerBottom.appendChild(document.createTextNode(' · '));
    footerBottom.appendChild(adminLink);
  }

  /* ---------- Set min date to today on date inputs ---------- */
  var today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(function (input) {
    if (!input.getAttribute('min')) input.setAttribute('min', today);
  });
});
