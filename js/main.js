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
  var thumbs = document.querySelectorAll('.gallery-thumbs img');
  var mainImg = document.querySelector('.gallery-main img');
  thumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      thumbs.forEach(function (t) { t.classList.remove('active'); });
      thumb.classList.add('active');
      if (mainImg) mainImg.src = thumb.src;
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
    if (summaryDays) summaryDays.textContent = days + (days === 1 ? ' day' : ' days');
    if (summaryTotal) summaryTotal.textContent = '$' + (days * rate).toLocaleString();
  }
  [pickupDate, returnDate].forEach(function (el) {
    if (el) el.addEventListener('change', recalcBooking);
  });
  recalcBooking();

  /* ---------- Contact / booking form success message ---------- */
  document.querySelectorAll('form[data-fake-submit]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var success = form.parentElement.querySelector('.form-success');
      if (success) {
        success.classList.add('show');
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      form.reset();
      recalcBooking();
    });
  });

  /* ---------- Set min date to today on date inputs ---------- */
  var today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(function (input) {
    if (!input.getAttribute('min')) input.setAttribute('min', today);
  });
});
