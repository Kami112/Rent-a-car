(async function () {
  // NOTE: template wording — have it reviewed by your legal advisor before launch.
  const { L, esc, $ } = Noor;
  await Noor.init();
  const sections = [
    [{ en: 'Booking & payment', ar: 'الحجز والدفع' }, {
      en: 'All prices are in Saudi Riyals and include 15% VAT. A booking is confirmed once full payment is received. Payments by card are processed by a SAMA-licensed gateway; instalment payments are provided by Tabby or Tamara under their own terms. Bank transfers must be received within 24 hours or the booking may be released.',
      ar: 'جميع الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة 15%. يتم تأكيد الحجز عند استلام كامل المبلغ. تتم مدفوعات البطاقات عبر بوابة مرخصة من البنك المركزي السعودي، وخدمات التقسيط مقدمة من تابي أو تمارا وفق شروطهما. يجب استلام التحويلات البنكية خلال 24 ساعة وإلا قد يتم إلغاء الحجز.' }],
    [{ en: 'Cancellation & refunds', ar: 'الإلغاء والاسترداد' }, {
      en: 'Packages: free cancellation up to 14 days before departure; 50% charge between 13 and 7 days; non-refundable within 7 days. Flights and hotels follow the airline or hotel fare rules shown at booking. Visa service fees are non-refundable once the application is submitted. Refunds are returned to the original payment method within 14 working days (instalment plans are reduced or cancelled by the provider).',
      ar: 'الباقات: إلغاء مجاني حتى 14 يوماً قبل المغادرة؛ رسوم 50% بين 13 و7 أيام؛ غير قابلة للاسترداد خلال 7 أيام. تخضع تذاكر الطيران والفنادق لشروط شركة الطيران أو الفندق الموضحة عند الحجز. رسوم خدمة التأشيرة غير مستردة بعد تقديم الطلب. تتم المبالغ المستردة إلى وسيلة الدفع الأصلية خلال 14 يوم عمل (ويتم تخفيض أو إلغاء خطط التقسيط من قبل المزود).' }],
    [{ en: 'Travel documents', ar: 'وثائق السفر' }, {
      en: 'Travellers are responsible for valid passports (6+ months), visas and health requirements. Names must match passports exactly; name changes may incur airline fees.',
      ar: 'يتحمل المسافرون مسؤولية صلاحية جوازات السفر (6 أشهر على الأقل) والتأشيرات والمتطلبات الصحية. يجب أن تطابق الأسماء جواز السفر تماماً، وقد يترتب على تعديل الأسماء رسوم من شركة الطيران.' }],
    [{ en: 'Privacy', ar: 'الخصوصية' }, {
      en: 'We process your personal data in line with the Saudi Personal Data Protection Law (PDPL) only to deliver your booking, meet legal obligations and — with your consent — send offers. Card details are handled by our payment providers and never stored by Ezhar Travel.',
      ar: 'نعالج بياناتك الشخصية وفق نظام حماية البيانات الشخصية السعودي فقط لتنفيذ حجزك والوفاء بالالتزامات النظامية، ولإرسال العروض بموافقتك. تتم معالجة بيانات البطاقات لدى مزودي الدفع ولا تحتفظ بها إزهار للسفر والسياحة.' }],
  ];
  $('#root').innerHTML = sections.map(([h, p]) => `<h2 style="font-size:1.35rem" class="mt-3">${esc(L(h))}</h2><p class="muted">${esc(L(p))}</p>`).join('')
    + '<p class="small muted mt-3">Airport data © <a href="https://openflights.org/data" target="_blank" rel="noopener">OpenFlights.org</a>, available under the Open Database License (ODbL).</p>';
})();
