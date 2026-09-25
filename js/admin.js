/* ===================== DriveNow admin dashboard =====================
   A front-end demo: bookings, fleet and customers live in localStorage.
   Bookings made on car-details.html land in the same store, so a booking
   made on the website shows up here straight away (same browser).          */
(function () {
  var t = function (s) { return window.I18N ? I18N.t(s) : s; };
  var money = function (n) { return window.I18N ? I18N.money(n) : 'SAR ' + n.toLocaleString('en'); };

  if (window.I18N) I18N.extend({
    'Admin Dashboard | DriveNow Rentals': 'لوحة التحكم | درايف ناو',
    'Overview': 'نظرة عامة', 'Bookings': 'الحجوزات', 'Fleet': 'الأسطول', 'Customers': 'العملاء',
    '← Back to website': '→ العودة للموقع',
    'Demo data is stored in this browser only.': 'بيانات تجريبية محفوظة في هذا المتصفح فقط.',
    'Reset demo data': 'إعادة تعيين البيانات',
    'Revenue this month': 'إيرادات هذا الشهر', 'Active rentals': 'إيجارات نشطة', 'Cars on the road now': 'سيارات على الطريق الآن',
    'Pending requests': 'طلبات معلّقة', 'Waiting for confirmation': 'بانتظار التأكيد', 'Fleet utilization': 'نسبة استخدام الأسطول',
    'Revenue, last 6 months': 'الإيرادات، آخر 6 أشهر', 'Bookings by city': 'الحجوزات حسب المدينة',
    'Latest bookings': 'أحدث الحجوزات', 'View all →': 'عرض الكل ←',
    'Search customer, car or booking ID': 'ابحث بالعميل أو السيارة أو رقم الحجز',
    'All statuses': 'كل الحالات', 'Pending': 'معلّق', 'Confirmed': 'مؤكد', 'Active': 'نشط', 'Completed': 'مكتمل', 'Cancelled': 'ملغي',
    'Export CSV': 'تصدير CSV', '+ New booking': '+ حجز جديد', 'Vehicles': 'السيارات', '+ Add vehicle': '+ إضافة سيارة',
    'New booking': 'حجز جديد', 'Car': 'السيارة', 'City': 'المدينة', 'Cancel': 'إلغاء', 'Save booking': 'حفظ الحجز',
    'Add vehicle': 'إضافة سيارة', 'Category': 'الفئة', 'Plate number': 'رقم اللوحة', 'Save vehicle': 'حفظ السيارة',
    'Booking': 'الحجز', 'Customer': 'العميل', 'Dates': 'التواريخ', 'Total': 'الإجمالي', 'Status': 'الحالة', 'Source': 'المصدر',
    'Website': 'الموقع', 'Phone': 'هاتف', 'WhatsApp': 'واتساب', 'Plate': 'اللوحة', 'Rentals': 'مرات التأجير', 'Revenue': 'الإيرادات',
    'Available': 'متاحة', 'Rented': 'مؤجرة', 'Maintenance': 'صيانة', 'Last booking': 'آخر حجز', 'Total spent': 'إجمالي الإنفاق',
    'No bookings found.': 'لا توجد حجوزات.', 'vs last month': 'مقارنة بالشهر الماضي', 'cars rented or active': 'سيارات مؤجرة أو نشطة',
    'Remove': 'حذف', 'Reset all demo data? Your changes in this browser will be lost.': 'إعادة تعيين كل البيانات؟ ستفقد تعديلاتك في هذا المتصفح.',
    'Hello, this is DriveNow about your booking': 'مرحباً، معك درايف ناو بخصوص حجزك'
  });

  var STATUSES = ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'];
  var KEYS = { bookings: 'drivenow_bookings', fleet: 'drivenow_fleet', seeded: 'drivenow_seeded' };

  /* ---------- Storage ---------- */
  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v || fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked: changes last until reload */ }
  }

  /* ---------- Demo data ---------- */
  var SEED_FLEET = [
    { id: 'C1', name: 'Toyota Corolla', category: 'Economy', plate: 'RUA 4821', rate: 145, status: 'Available' },
    { id: 'C2', name: 'Volkswagen Golf', category: 'Economy', plate: 'JDA 1190', rate: 160, status: 'Available' },
    { id: 'C3', name: 'Range Rover Sport', category: 'SUV', plate: 'RUA 7002', rate: 450, status: 'Rented' },
    { id: 'C4', name: 'Honda CR-V', category: 'SUV', plate: 'DMM 3317', rate: 245, status: 'Available' },
    { id: 'C5', name: 'Audi A4 Premium', category: 'Luxury', plate: 'DXB 55120', rate: 335, status: 'Rented' },
    { id: 'C6', name: 'Mercedes-Benz C-Class', category: 'Luxury', plate: 'AUH 20931', rate: 410, status: 'Maintenance' },
    { id: 'C7', name: 'Ford Mustang GT', category: 'Convertible', plate: 'DXB 77341', rate: 355, status: 'Available' },
    { id: 'C8', name: 'Chevrolet Suburban', category: 'Van', plate: 'JDA 6604', rate: 320, status: 'Rented' }
  ];
  var SEED_CUSTOMERS = [
    ['Abdullah Al-Qahtani', '+966 55 214 8830'], ['Sara Al-Mansouri', '+971 50 332 1904'], ['Faisal Al-Harbi', '+966 54 771 0452'],
    ['Noura Al-Dosari', '+966 56 908 1173'], ['Khalid Al-Shehri', '+966 50 446 2291'], ['Mariam Al-Suwaidi', '+971 55 610 7328'],
    ['Omar Farouk', '+966 53 120 6647'], ['Hessa Al-Mazrouei', '+971 52 874 0519'], ['Turki Al-Mutairi', '+966 59 301 4486'],
    ['Aisha Rahman', '+971 54 219 3375']
  ];
  var CITIES = ['Riyadh', 'Jeddah', 'Dammam', 'Dubai', 'Abu Dhabi'];

  function isoDate(d) { return d.toISOString().slice(0, 10); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }

  function seedBookings() {
    var today = new Date(); today.setHours(12, 0, 0, 0);
    var list = [];
    for (var i = 0; i < 34; i++) {
      var car = SEED_FLEET[(i * 5 + 3) % SEED_FLEET.length];
      var cust = SEED_CUSTOMERS[(i * 7) % SEED_CUSTOMERS.length];
      var start = addDays(today, -Math.round(i * 5.3) + 6);
      var days = 1 + ((i * 3) % 6);
      if (i >= 2 && i <= 4) { // cars marked Rented in the seed fleet are out on these bookings
        car = SEED_FLEET.filter(function (c) { return c.status === 'Rented'; })[i - 2];
        start = addDays(today, 1 - i);
        days = 4;
      }
      var end = addDays(start, days);
      var status = end < today ? (i % 9 === 4 ? 'Cancelled' : 'Completed')
        : start > today ? (i % 2 ? 'Pending' : 'Confirmed') : 'Active';
      list.push({
        id: 'BK-' + String(240100 + 34 - i),
        customer: cust[0], phone: cust[1], car: car.name,
        city: CITIES[(i * 3) % CITIES.length],
        pickup: isoDate(start), dropoff: isoDate(end), days: days, total: days * car.rate,
        status: status, source: ['Website', 'WhatsApp', 'Phone'][i % 3],
        created: new Date(Math.min(+addDays(start, -3), +today - (i + 1) * 36e5)).toISOString(), seed: true
      });
    }
    return list;
  }

  var state = {};
  function init(reset) {
    var website = reset ? [] : load(KEYS.bookings, []).filter(function (b) { return !b.seed; });
    if (reset || !load(KEYS.seeded, false)) {
      state.bookings = website.concat(seedBookings());
      state.fleet = SEED_FLEET.slice();
      save(KEYS.bookings, state.bookings);
      save(KEYS.fleet, state.fleet);
      save(KEYS.seeded, true);
    } else {
      state.bookings = load(KEYS.bookings, []);
      state.fleet = load(KEYS.fleet, SEED_FLEET.slice());
    }
  }

  /* ---------- Helpers ---------- */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function fmtDate(s) {
    if (!s) return '–';
    var d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString(window.I18N && I18N.lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { day: 'numeric', month: 'short' });
  }
  function badge(status) { return el('span', { class: 'status status-' + status.toLowerCase(), text: t(status) }); }
  function waLink(phone, text) {
    return 'https://wa.me/' + String(phone).replace(/\D/g, '') + '?text=' + encodeURIComponent(text);
  }
  function table(id, headers, rows) {
    var tbl = document.getElementById(id);
    tbl.innerHTML = '';
    tbl.appendChild(el('thead', {}, [el('tr', {}, headers.map(function (h) { return el('th', { text: t(h) }); }))]));
    var body = el('tbody');
    if (!rows.length) body.appendChild(el('tr', {}, [el('td', { colspan: headers.length, class: 'empty', text: t('No bookings found.') })]));
    rows.forEach(function (r) { body.appendChild(el('tr', {}, r.map(function (c) { return el('td', {}, [c == null ? '' : typeof c === 'object' ? c : String(c)]); }))); });
    tbl.appendChild(body);
  }
  function persist() { save(KEYS.bookings, state.bookings); save(KEYS.fleet, state.fleet); render(); }

  /* ---------- Overview ---------- */
  function monthKey(d) { return d.getFullYear() + '-' + d.getMonth(); }
  function revenueByMonth() {
    var now = new Date(), months = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: d.toLocaleDateString(window.I18N && I18N.lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { month: 'short' }), total: 0 });
    }
    state.bookings.forEach(function (b) {
      if (b.status === 'Cancelled' || !b.pickup) return;
      var m = months.filter(function (x) { return x.key === monthKey(new Date(b.pickup + 'T00:00:00')); })[0];
      if (m) m.total += Number(b.total) || 0;
    });
    return months;
  }

  function renderOverview() {
    var months = revenueByMonth();
    var cur = months[5].total, prev = months[4].total;
    document.getElementById('kpi-revenue').textContent = money(cur);
    var delta = prev ? Math.round((cur - prev) / prev * 100) : 0;
    var deltaEl = document.getElementById('kpi-revenue-delta');
    deltaEl.textContent = (delta >= 0 ? '▲ ' : '▼ ') + Math.abs(delta) + '% ' + t('vs last month');
    deltaEl.className = delta >= 0 ? 'up' : 'down';

    var count = function (s) { return state.bookings.filter(function (b) { return b.status === s; }).length; };
    document.getElementById('kpi-active').textContent = count('Active');
    document.getElementById('kpi-pending').textContent = count('Pending');
    var busy = state.fleet.filter(function (c) { return c.status === 'Rented'; }).length;
    document.getElementById('kpi-util').textContent = state.fleet.length ? Math.round(busy / state.fleet.length * 100) + '%' : '0%';
    document.getElementById('kpi-util-note').textContent = busy + ' / ' + state.fleet.length + ' ' + t('cars rented or active');

    // Revenue bar chart
    var max = Math.max.apply(null, months.map(function (m) { return m.total; }).concat([1]));
    var chart = document.getElementById('revenue-chart');
    chart.innerHTML = '';
    months.forEach(function (m, i) {
      var bar = el('div', { class: 'bar' + (i === 5 ? ' current' : ''), style: 'height:' + Math.max(4, m.total / max * 100) + '%', title: money(m.total) });
      chart.appendChild(el('div', { class: 'bar-col' }, [
        el('span', { class: 'bar-value', text: m.total >= 1000 ? Math.round(m.total / 1000) + 'k' : String(m.total) }),
        el('div', { class: 'bar-track' }, [bar]),
        el('span', { class: 'bar-label', text: m.label })
      ]));
    });

    // City breakdown
    var byCity = {};
    state.bookings.forEach(function (b) { if (b.city) byCity[b.city] = (byCity[b.city] || 0) + 1; });
    var cities = Object.keys(byCity).sort(function (a, b) { return byCity[b] - byCity[a]; });
    var top = byCity[cities[0]] || 1;
    var list = document.getElementById('city-list');
    list.innerHTML = '';
    cities.forEach(function (c) {
      list.appendChild(el('div', { class: 'city-row' }, [
        el('span', { class: 'city-name', text: t(c) }),
        el('div', { class: 'city-track' }, [el('div', { class: 'city-fill', style: 'width:' + (byCity[c] / top * 100) + '%' })]),
        el('strong', { text: String(byCity[c]) })
      ]));
    });

    var recent = sortedBookings().slice(0, 6);
    table('recent-table', ['Booking', 'Customer', 'Car', 'Dates', 'Total', 'Status'], recent.map(function (b) {
      return [b.id, b.customer, b.car, fmtDate(b.pickup) + ' → ' + fmtDate(b.dropoff), money(Number(b.total) || 0), badge(b.status)];
    }));
  }

  /* ---------- Bookings ---------- */
  function sortedBookings() {
    return state.bookings.slice().sort(function (a, b) { return (b.created || '').localeCompare(a.created || ''); });
  }
  function renderBookings() {
    var q = document.getElementById('booking-search').value.trim().toLowerCase();
    var st = document.getElementById('booking-status-filter').value;
    var rows = sortedBookings().filter(function (b) {
      if (st && b.status !== st) return false;
      return !q || [b.id, b.customer, b.car, b.phone, b.city].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    table('bookings-table', ['Booking', 'Customer', 'Car', 'City', 'Dates', 'Total', 'Source', 'Status', ''], rows.map(function (b) {
      var select = el('select', { class: 'status-select status-' + b.status.toLowerCase(), 'aria-label': t('Status') },
        STATUSES.map(function (s) { var o = el('option', { value: s, text: t(s) }); if (s === b.status) o.selected = true; return o; }));
      select.addEventListener('change', function () { b.status = select.value; syncFleet(b); persist(); });
      var wa = b.phone ? el('a', { class: 'icon-btn wa', href: waLink(b.phone, t('Hello, this is DriveNow about your booking') + ' ' + b.id), target: '_blank', rel: 'noopener', 'aria-label': t('WhatsApp'), title: t('WhatsApp'), text: '💬' }) : null;
      return [
        el('strong', { text: b.id }),
        el('div', {}, [el('div', { text: b.customer || '–' }), el('small', { dir: 'ltr', text: b.phone || '' })]),
        b.car, t(b.city || '–'),
        fmtDate(b.pickup) + ' → ' + fmtDate(b.dropoff),
        money(Number(b.total) || 0), t(b.source || 'Website'), select, wa
      ];
    }));
  }

  // Keep a car's status in step with its latest booking.
  function syncFleet(b) {
    var car = state.fleet.filter(function (c) { return c.name === b.car; })[0];
    if (!car || car.status === 'Maintenance') return;
    if (b.status === 'Active') car.status = 'Rented';
    else if (b.status === 'Completed' || b.status === 'Cancelled') car.status = 'Available';
  }

  function exportCsv() {
    var cols = ['id', 'customer', 'phone', 'car', 'city', 'pickup', 'dropoff', 'days', 'total', 'source', 'status'];
    var lines = [cols.join(',')].concat(sortedBookings().map(function (b) {
      return cols.map(function (c) { return '"' + String(b[c] == null ? '' : b[c]).replace(/"/g, '""') + '"'; }).join(',');
    }));
    var blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = el('a', { href: URL.createObjectURL(blob), download: 'drivenow-bookings.csv' });
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- Fleet ---------- */
  function renderFleet() {
    table('fleet-table', ['Car', 'Category', 'Plate', 'Daily Rate', 'Rentals', 'Revenue', 'Status', ''], state.fleet.map(function (c) {
      var done = state.bookings.filter(function (b) { return b.car === c.name && b.status !== 'Cancelled'; });
      var revenue = done.reduce(function (s, b) { return s + (Number(b.total) || 0); }, 0);
      var select = el('select', { class: 'status-select status-' + c.status.toLowerCase(), 'aria-label': t('Status') },
        ['Available', 'Rented', 'Maintenance'].map(function (s) { var o = el('option', { value: s, text: t(s) }); if (s === c.status) o.selected = true; return o; }));
      select.addEventListener('change', function () { c.status = select.value; persist(); });
      var remove = el('button', { type: 'button', class: 'icon-btn', title: t('Remove'), 'aria-label': t('Remove'), text: '✕' });
      remove.addEventListener('click', function () { state.fleet = state.fleet.filter(function (x) { return x !== c; }); persist(); });
      return [el('strong', { text: c.name }), t(c.category), el('span', { dir: 'ltr', text: c.plate }), money(Number(c.rate) || 0), done.length, money(revenue), select, remove];
    }));
  }

  /* ---------- Customers ---------- */
  function renderCustomers() {
    var map = {};
    sortedBookings().forEach(function (b) {
      var key = (b.phone || b.customer || '').replace(/\s/g, '');
      if (!key) return;
      var c = map[key] || (map[key] = { name: b.customer, phone: b.phone, count: 0, spent: 0, last: b.pickup, city: b.city });
      c.count++;
      if (b.status !== 'Cancelled') c.spent += Number(b.total) || 0;
      if (b.pickup > c.last) c.last = b.pickup;
    });
    var list = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.spent - a.spent; });
    table('customers-table', ['Customer', 'Phone', 'City', 'Bookings', 'Total spent', 'Last booking', ''], list.map(function (c) {
      return [el('strong', { text: c.name || '–' }), el('span', { dir: 'ltr', text: c.phone || '' }), t(c.city || '–'), c.count, money(c.spent), fmtDate(c.last),
        c.phone ? el('a', { class: 'icon-btn wa', href: waLink(c.phone, ''), target: '_blank', rel: 'noopener', title: t('WhatsApp'), 'aria-label': t('WhatsApp'), text: '💬' }) : null];
    }));
  }

  /* ---------- Views & wiring ---------- */
  var currentView = 'overview';
  function render() {
    if (currentView === 'overview') renderOverview();
    if (currentView === 'bookings') renderBookings();
    if (currentView === 'fleet') renderFleet();
    if (currentView === 'customers') renderCustomers();
  }
  function show(view) {
    currentView = view;
    document.querySelectorAll('.admin-view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + view); });
    document.querySelectorAll('.admin-nav button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-view') === view); });
    var labels = { overview: 'Overview', bookings: 'Bookings', fleet: 'Fleet', customers: 'Customers' };
    document.getElementById('admin-title').textContent = t(labels[view]);
    document.getElementById('admin-sidebar').classList.remove('open');
    try { sessionStorage.setItem('admin_view', view); } catch (e) {}
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    init(false);

    document.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { show(b.getAttribute('data-view')); });
    });
    document.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { show(b.getAttribute('data-goto')); });
    });
    document.getElementById('admin-menu').addEventListener('click', function () {
      document.getElementById('admin-sidebar').classList.toggle('open');
    });
    document.getElementById('booking-search').addEventListener('input', renderBookings);
    document.getElementById('booking-status-filter').addEventListener('change', renderBookings);
    document.getElementById('export-csv').addEventListener('click', exportCsv);
    document.getElementById('reset-demo').addEventListener('click', function () {
      if (confirm(t('Reset all demo data? Your changes in this browser will be lost.'))) { init(true); render(); }
    });

    // Dialogs
    document.querySelectorAll('.admin-dialog [data-close]').forEach(function (b) {
      b.addEventListener('click', function () { b.closest('dialog').close(); });
    });

    var bookingDialog = document.getElementById('booking-dialog');
    document.getElementById('new-booking').addEventListener('click', function () {
      var sel = document.getElementById('nb-car');
      sel.innerHTML = '';
      state.fleet.forEach(function (c) { sel.appendChild(el('option', { value: c.name, text: c.name + ' — ' + money(Number(c.rate) || 0) })); });
      document.getElementById('booking-dialog-form').reset();
      bookingDialog.showModal();
    });
    document.getElementById('booking-dialog-form').addEventListener('submit', function (e) {
      var start = document.getElementById('nb-pickup').value, end = document.getElementById('nb-dropoff').value;
      var days = Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000) || 1);
      var carName = document.getElementById('nb-car').value;
      var car = state.fleet.filter(function (c) { return c.name === carName; })[0] || { rate: 0 };
      var citySel = document.getElementById('nb-city');
      state.bookings.push({
        id: 'BK-' + Date.now().toString().slice(-6),
        customer: document.getElementById('nb-customer').value, phone: document.getElementById('nb-phone').value,
        car: carName, city: CITIES[citySel.selectedIndex] || citySel.value, pickup: start, dropoff: end, days: days,
        total: days * (Number(car.rate) || 0), status: 'Confirmed', source: 'Phone', created: new Date().toISOString()
      });
      persist();
    });

    var carDialog = document.getElementById('car-dialog');
    document.getElementById('new-car').addEventListener('click', function () {
      document.getElementById('car-dialog-form').reset();
      carDialog.showModal();
    });
    document.getElementById('car-dialog-form').addEventListener('submit', function () {
      var catSel = document.getElementById('nc-cat');
      state.fleet.push({
        id: 'C' + Date.now(), name: document.getElementById('nc-name').value,
        category: ['Economy', 'SUV', 'Luxury', 'Van', 'Convertible'][catSel.selectedIndex],
        plate: document.getElementById('nc-plate').value, rate: Number(document.getElementById('nc-rate').value) || 0, status: 'Available'
      });
      persist();
    });

    var saved;
    try { saved = sessionStorage.getItem('admin_view'); } catch (e) {}
    show(saved && document.getElementById('view-' + saved) ? saved : 'overview');
  });
})();
