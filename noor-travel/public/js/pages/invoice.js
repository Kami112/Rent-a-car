(async function () {
  // Bilingual simplified tax invoice (فاتورة ضريبية مبسطة) with ZATCA QR.
  const { esc, $, qs, api, money } = Noor;
  await Noor.init();
  const q = qs();
  let inv;
  try {
    inv = await api(`/bookings/${encodeURIComponent(q.ref || '')}/invoice?t=${encodeURIComponent(q.t || '')}`);
  } catch (err) {
    $('#root').innerHTML = `<div class="card empty">${esc(err.message)}</div>`;
    return;
  }
  const s = inv.seller;
  const sar = (h) => (h / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const exVat = inv.total - inv.vat;
  const qr = window.qrcode ? (() => { const c = window.qrcode(0, 'M'); c.addData(inv.qr); c.make(); return c.createSvgTag({ cellSize: 4, margin: 0 }); })() : '';
  const when = new Date(inv.invoiceDate);
  const dateStr = `${when.toISOString().slice(0, 10)} ${when.toTimeString().slice(0, 5)}`;

  $('#root').innerHTML = `<div class="card" style="padding:36px">
    <div class="flex between" style="align-items:flex-start">
      <div><div class="logo"><span class="logo-mark"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2.5l2.3 5.2 5.7.6-4.3 3.8 1.2 5.6L12 14.9l-4.9 2.8 1.2-5.6L4 8.3l5.7-.6z" fill="#c9a24a"/></svg></span>
        <span>${esc(s.nameEn)}<small>${esc(s.nameAr)}</small></span></div>
        <p class="small muted mt-1 mb-0">${esc(s.address)}<br>${esc(s.phone)} · ${esc(s.email)}</p></div>
      <div style="text-align:end"><h2 class="mb-0" style="font-size:1.4rem">Simplified Tax Invoice</h2><div dir="rtl" style="font-weight:800;font-size:1.2rem">فاتورة ضريبية مبسطة</div></div>
    </div>
    <div class="kv mt-3" style="border-block:1px solid var(--line);padding-block:16px">
      <div><span>Invoice No. · رقم الفاتورة</span><strong class="num">${esc(inv.invoiceNo)}</strong></div>
      <div><span>Issue date · تاريخ الإصدار</span><strong class="num">${esc(dateStr)}</strong></div>
      <div><span>VAT No. · الرقم الضريبي</span><strong class="num">${esc(s.vatNumber)}</strong></div>
      <div><span>CR · السجل التجاري</span><strong class="num">${esc(s.crNumber)}</strong></div>
      <div><span>Booking · رقم الحجز</span><strong class="num">${esc(inv.ref)}</strong></div>
      <div><span>Customer · العميل</span><strong>${esc(inv.contact.name)}</strong></div>
    </div>
    <div class="table-wrap mt-3"><table class="table">
      <thead><tr><th>Description · الوصف</th><th class="r">Qty · الكمية</th><th class="r">Unit price · سعر الوحدة</th><th class="r">Total · الإجمالي</th></tr></thead>
      <tbody>${inv.lines.map((l) => `<tr><td>${esc(l.en)}<div class="small muted" dir="rtl">${esc(l.ar)}</div></td><td class="r num">${l.qty}</td><td class="r num">${sar(l.unit)}</td><td class="r num">${sar(l.amount)}</td></tr>`).join('')}</tbody>
    </table></div>
    <div class="flex between mt-3" style="align-items:flex-end">
      <div style="width:150px">${qr}</div>
      <div style="min-width:320px">
        ${inv.discount ? `<div class="summary-row"><span>Discount · الخصم</span><span class="num">−${sar(inv.discount)}</span></div>` : ''}
        <div class="summary-row"><span>Total excl. VAT · الإجمالي غير شامل الضريبة</span><span class="num">${sar(exVat)}</span></div>
        <div class="summary-row"><span>VAT ${inv.vatRate}% · ضريبة القيمة المضافة</span><span class="num">${sar(inv.vat)}</span></div>
        <div class="summary-row total"><span>Total incl. VAT · الإجمالي شامل الضريبة</span><span class="num">${money(inv.total, { decimals: 2 })}</span></div>
      </div>
    </div>
    <p class="small muted mt-3 mb-0">Paid via ${esc(inv.paymentMethod || '—')} · Thank you for travelling with Noor · شكراً لسفركم مع نور</p>
    <div class="flex mt-3 no-print"><button class="btn btn-primary" onclick="print()">Print / Save PDF · طباعة</button>
      <a class="btn btn-outline" href="/booking.html?ref=${esc(inv.ref)}&t=${esc(q.t)}">←</a></div>
  </div>`;
})();
