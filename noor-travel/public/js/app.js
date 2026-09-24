/* Noor Travel — shared browser runtime (no framework). */
(function () {
  'use strict';

  // ------------------------------------------------------------------ i18n
  const DICT = {
    en: {
      brand: 'Noor Travel', brandSub: 'Travel & Tourism · Riyadh',
      nav_home: 'Home', nav_umrah: 'Umrah', nav_packages: 'Holidays', nav_flights: 'Flights', nav_hotels: 'Hotels',
      nav_visas: 'Visas', nav_manage: 'My Booking', nav_contact: 'Contact', nav_about: 'About',
      sign_in: 'Sign in', my_account: 'My account', book_now: 'Book now', lang_switch: 'عربي',
      licensed: 'Licensed by the Ministry of Tourism', call_us: 'Call us', open_hours: 'Sun–Thu 9am–10pm · Sat 4pm–10pm',
      // home
      hero_eyebrow: 'Riyadh’s trusted travel partner since 2009',
      hero_title: 'Journeys of faith and discovery, <em>beautifully arranged</em>',
      hero_lead: 'Umrah programmes, holidays, flights, hotels and visas — book online in minutes and pay by mada, card, Apple Pay, or split it with Tabby and Tamara.',
      hero_b1: 'Best price guarantee', hero_b2: '24/7 Arabic & English support', hero_b3: 'Secure payments',
      tab_packages: 'Holidays', tab_umrah: 'Umrah', tab_flights: 'Flights', tab_hotels: 'Hotels', tab_visas: 'Visas',
      where_to: 'Where to?', any_destination: 'Search destination or package', category: 'Category', all: 'All',
      from: 'From', to: 'To', depart: 'Departure', return: 'Return', optional: 'optional', travelers: 'Travelers',
      cabin: 'Cabin', city: 'City', check_in: 'Check-in', check_out: 'Check-out', rooms: 'Rooms', guests: 'Guests',
      search: 'Search', search_flights: 'Search flights', search_hotels: 'Search hotels', browse_visas: 'Browse visa services',
      featured_title: 'Featured journeys', featured_sub: 'Hand-picked programmes our travellers love — updated every season.',
      view_all: 'View all', umrah_title: 'Umrah programmes', umrah_sub: 'Economy to VIP, fully organised from Riyadh with licensed religious guides.',
      why_title: 'Why travel with Noor', why_sub: 'Fifteen years of arranging journeys for families, pilgrims and companies across the Kingdom.',
      why1_t: 'Licensed & trusted', why1_d: 'Licensed by the Ministry of Tourism with a registered VAT number and ZATCA-compliant invoices.',
      why2_t: 'Pay your way', why2_d: 'mada, Visa, Mastercard, Apple Pay, STC Pay, bank transfer — or split into 4 interest-free payments.',
      why3_t: 'Real people, 24/7', why3_d: 'A dedicated travel consultant on WhatsApp before, during and after your trip.',
      why4_t: 'Best price guarantee', why4_d: 'Found it cheaper within 24 hours? We refund the difference.',
      dest_title: 'Popular destinations', dest_sub: 'From the Two Holy Mosques to the Alps.',
      split_title: 'Travel now, pay later — with zero interest',
      split_sub: 'Split any booking into 4 monthly payments with Tabby or 3–4 payments with Tamara. No fees, no hidden charges, Sharia-compliant.',
      reviews_title: 'What our travellers say', stat1: 'Happy travellers', stat2: 'Umrah trips organised', stat3: 'Destinations', stat4: 'Average rating',
      newsletter_title: 'Get exclusive offers', newsletter_sub: 'Seasonal deals and Umrah departures, straight to your inbox.', subscribe: 'Subscribe', your_email: 'Your email',
      // listing
      packages_title: 'Holiday & Umrah packages', packages_sub: 'Complete programmes with flights, hotels, transfers and guides.',
      cat_umrah: 'Umrah', cat_international: 'International', cat_domestic: 'Saudi Arabia', cat_honeymoon: 'Honeymoon',
      sort: 'Sort', sort_featured: 'Recommended', sort_price_asc: 'Price: low to high', sort_price_desc: 'Price: high to low', sort_duration: 'Shortest first',
      max_price: 'Max price (SAR)', results: 'results', no_results: 'No results match your search. Try different filters.',
      days: 'days', per_person: 'per person', from_price: 'from', seats_left: 'seats left', reviews: 'reviews', view_details: 'View details',
      or_split: 'or 4 payments of', with: 'with',
      // detail
      overview: 'Overview', itinerary: 'Itinerary', includes: 'What’s included', guest_reviews: 'Guest reviews', day: 'Day',
      travel_date: 'Travel date', adults: 'Adults', children: 'Children (2–11)', infants: 'Infants (<2)', total: 'Total',
      continue_booking: 'Continue to booking', free_cancel: 'Free cancellation up to 14 days before departure',
      vat_incl: 'Prices include 15% VAT', write_review: 'Write a review', your_name: 'Your name', rating: 'Rating', comment: 'Comment', submit: 'Submit',
      review_thanks: 'Thank you! Your review will appear after moderation.',
      // flights/hotels/visas
      flights_title: 'Book flights', flights_sub: 'Domestic and international flights with Saudia, flynas, flyadeal, Emirates, Qatar Airways and Turkish Airlines.',
      outbound: 'Outbound', inbound: 'Return', direct: 'Direct', stop: 'stop', select: 'Select', selected: 'Selected',
      choose_return: 'Now choose your return flight', per_adult: 'per adult', continue: 'Continue',
      hotels_title: 'Hotels', hotels_sub: 'Hand-picked hotels near the Haramain and in top destinations.', per_night: 'per night', nights: 'nights',
      visas_title: 'Visa services', visas_sub: 'We prepare your file, book appointments and track your application end-to-end.',
      processing: 'Processing', requirements: 'Requirements', apply_now: 'Apply now', per_applicant: 'per applicant', applicants: 'Applicants',
      // checkout
      checkout: 'Checkout', step_details: 'Traveler details', step_extras: 'Extras', step_payment: 'Payment',
      lead_contact: 'Contact details', full_name: 'Full name', email: 'Email', mobile: 'Mobile number',
      traveler: 'Traveler', adult: 'Adult', child: 'Child', infant: 'Infant', first_name: 'First name (as in passport)', last_name: 'Last name',
      dob: 'Date of birth', nationality: 'Nationality', passport_no: 'Passport number', title_mr: 'Mr', title_mrs: 'Mrs', title_ms: 'Ms',
      special_requests: 'Special requests (optional)', extras: 'Enhance your trip', per_traveler: 'per traveler', per_booking: 'per booking',
      payment_method: 'Payment method', pay_card: 'Credit / debit card', pay_card_d: 'mada, Visa, Mastercard, Apple Pay, STC Pay',
      pay_tabby: 'Split in 4 with Tabby', pay_tabby_d: 'Pay 25% today, the rest over 3 months. No interest, no fees.',
      pay_tamara: 'Split with Tamara', pay_tamara_d: 'Split in 3 or 4 interest-free payments. Sharia-compliant.',
      pay_bank: 'Bank transfer', pay_bank_d: 'Transfer to our SNB account; we confirm within 2 working hours.',
      instalments: 'instalments', today: 'Today', month: 'Month', in_months: 'in {n} months',
      order_summary: 'Booking summary', subtotal: 'Subtotal', discount: 'Discount', vat_included: 'VAT included', promo_code: 'Promo code', apply: 'Apply', remove: 'Remove',
      accept_terms: 'I agree to the <a href="/policies.html" target="_blank">terms & cancellation policy</a>.',
      pay_now: 'Pay', confirm_booking: 'Confirm booking', secure_note: 'Payments are encrypted and processed by licensed Saudi payment providers. We never store your card details.',
      sandbox_note: 'Test mode — no real money will be charged.',
      // booking
      booking_ref: 'Booking reference', status: 'Status', payment: 'Payment', paid: 'Paid', outstanding: 'Outstanding', lead_traveler: 'Lead traveler',
      pay_success_t: 'Payment successful — your booking is confirmed!', pay_success_d: 'A confirmation and tax invoice have been sent to your email and WhatsApp.',
      pay_failed_t: 'Payment was not completed', pay_failed_d: 'No money was taken. You can try again or choose another payment method.',
      pay_pending_t: 'Booking received — awaiting payment', pay_pending_d: 'Complete your payment below to confirm your booking.',
      pay_cancelled_t: 'Payment cancelled', view_invoice: 'Tax invoice', print: 'Print', complete_payment: 'Complete payment', cancel_booking: 'Cancel booking',
      bank_details: 'Bank transfer details', bank: 'Bank', account_name: 'Account name', iban: 'IBAN', transfer_ref: 'Use this reference',
      bank_after: 'After transferring, send the receipt on WhatsApp — we will confirm your booking right away.',
      st_pending_payment: 'Pending payment', st_confirmed: 'Confirmed', st_completed: 'Completed', st_cancelled: 'Cancelled', st_refunded: 'Refunded',
      ps_unpaid: 'Unpaid', ps_pending: 'Pending', ps_paid: 'Paid', ps_failed: 'Failed', ps_refunded: 'Refunded', ps_partially_refunded: 'Partially refunded',
      m_card: 'Card', m_tabby: 'Tabby', m_tamara: 'Tamara', m_bank_transfer: 'Bank transfer', m_cash: 'Cash', m_pos: 'POS',
      manage_title: 'Manage your booking', manage_sub: 'Enter your booking reference and email to view, pay or download your invoice.', find_booking: 'Find booking',
      // account
      login_title: 'Welcome back', register_title: 'Create your account', password: 'Password', no_account: 'New to Noor Travel?', have_account: 'Already have an account?',
      create_account: 'Create account', sign_out: 'Sign out', my_bookings: 'My bookings', no_bookings: 'You have no bookings yet.', open: 'Open',
      // contact
      contact_title: 'Contact us', contact_sub: 'Visit our head office in Riyadh or reach us any time on WhatsApp.', subject: 'Subject', message: 'Message', send: 'Send message',
      inquiry_thanks: 'Thank you! A travel consultant will contact you shortly.', head_office: 'Head office', working_hours: 'Working hours', faq: 'Frequently asked questions',
      // footer
      footer_about: 'Noor Travel Agency is a Riyadh-based travel and tourism company offering Umrah programmes, holidays, flights, hotels and visa services across the Kingdom.',
      quick_links: 'Explore', support: 'Support', policies: 'Terms & policies', privacy: 'Privacy', rights: 'All rights reserved.',
      cr: 'CR', vat_no: 'VAT No.', license: 'Tourism licence', we_accept: 'We accept',
      round_trip: 'Round trip', one_way: 'One way', swap: 'Swap', travellers_class: 'Travellers & class', adults_12: 'Adults (12+)', done: 'Done',
      traveller: 'Traveller', travellers_n: 'Travellers', same_airports: 'Departure and arrival airports must differ.', h: 'h', m: 'm',
      stops_n: 'stops', layover: 'Layover', operated_by: 'Operated by', kg: 'kg', no_checked_bag: 'No checked bag', cabin_bag: 'Cabin bag',
      refundable: 'Refundable', non_refundable: 'Non-refundable', modify_search: 'Modify search', searching: 'Searching the best fares across airlines…',
      prev_day: 'Previous day', next_day: 'Next day', no_flights: 'No flights found', no_flights_d: 'Try different dates or nearby airports.',
      filters: 'Filters', reset: 'Reset', stops: 'Stops', one_stop: '1 stop', two_stops: '2+ stops', price: 'Price', departure_time: 'Departure time (outbound)',
      t_early: 'Early morning', t_morning: 'Morning', t_afternoon: 'Afternoon', t_evening: 'Evening', airlines: 'Airlines', more: 'More options',
      baggage_included: 'Checked baggage included', refundable_only: 'Refundable fares only', show_results: 'Show results',
      sort_cheapest: 'Cheapest', sort_best: 'Recommended', sort_fastest: 'Fastest', total_for: 'Total for', person: 'person', per_person_total: 'Total price incl. taxes',
      hide_details: 'Hide details', flight_details: 'Flight details', fare_rules: 'Fare rules', rule_refund: 'Refundable (airline fees may apply)',
      rule_norefund: 'Non-refundable', rule_change: 'Changes allowed (fees + fare difference)', rule_nochange: 'No changes', flights_found: 'flights found',
      demo_fares: 'demo fares', show_more: 'Show more flights', no_filter_results: 'No flights match these filters.',
      gender: 'Gender', male: 'Male', female: 'Female', passport_expiry: 'Passport expiry', select_country: 'Select', name_hint: 'English letters exactly as in the passport',
      flight_summary: 'Your flight', fare_expires: 'Price held for', pnr: 'Airline reference (PNR)', e_tickets: 'E-ticket numbers',
      tk_pending: 'Ticket being issued', tk_held: 'Seats reserved', tk_issued: 'Ticket issued', tk_manual: 'Ticket being issued by our team', tk_failed: 'Our team is issuing your ticket',
      tk_note: 'Your e-ticket will be sent to your email and WhatsApp within minutes after payment.',
      popular_routes: 'Popular flights from Riyadh', recent_searches: 'Your recent searches', flights_hero_title: 'Book flights to 80+ destinations, <em>pay your way</em>',
      flights_hero_lead: 'Compare Saudia, flynas, flyadeal, Emirates, Qatar Airways, Turkish Airlines and more — then pay by mada, Apple Pay or split with Tabby & Tamara.',
      auth_gate_title: 'Sign in to complete your booking', auth_gate_sub: 'Your booking, tax invoice and e-ticket are saved to your account and emailed to you.',
      forgot_password: 'Forgot password?', send_reset_link: 'Send reset link', reset_sent: 'If an account exists for this email, a reset link has been sent. Please check your inbox.',
      new_password: 'New password', set_password: 'Save new password', reset_title: 'Choose a new password', back_to_signin: 'Back to sign in',
      loading: 'Loading…', error_generic: 'Something went wrong. Please try again.', required: 'This field is required',
    },
    ar: {
      brand: 'نور للسفر', brandSub: 'للسفر والسياحة · الرياض',
      nav_home: 'الرئيسية', nav_umrah: 'العمرة', nav_packages: 'العطلات', nav_flights: 'الطيران', nav_hotels: 'الفنادق',
      nav_visas: 'التأشيرات', nav_manage: 'حجزي', nav_contact: 'تواصل معنا', nav_about: 'من نحن',
      sign_in: 'تسجيل الدخول', my_account: 'حسابي', book_now: 'احجز الآن', lang_switch: 'EN',
      licensed: 'مرخصة من وزارة السياحة', call_us: 'اتصل بنا', open_hours: 'الأحد–الخميس 9ص–10م · السبت 4م–10م',
      hero_eyebrow: 'شريك السفر الموثوق في الرياض منذ 2009',
      hero_title: 'رحلات إيمانية واستكشافية <em>بتنظيم يليق بك</em>',
      hero_lead: 'برامج العمرة والعطلات والطيران والفنادق والتأشيرات — احجز أونلاين خلال دقائق وادفع بمدى أو البطاقة أو Apple Pay، أو قسّمها مع تابي وتمارا.',
      hero_b1: 'ضمان أفضل سعر', hero_b2: 'دعم 24/7 بالعربية والإنجليزية', hero_b3: 'مدفوعات آمنة',
      tab_packages: 'العطلات', tab_umrah: 'العمرة', tab_flights: 'الطيران', tab_hotels: 'الفنادق', tab_visas: 'التأشيرات',
      where_to: 'إلى أين؟', any_destination: 'ابحث عن وجهة أو باقة', category: 'الفئة', all: 'الكل',
      from: 'من', to: 'إلى', depart: 'المغادرة', return: 'العودة', optional: 'اختياري', travelers: 'المسافرون',
      cabin: 'الدرجة', city: 'المدينة', check_in: 'تاريخ الوصول', check_out: 'تاريخ المغادرة', rooms: 'الغرف', guests: 'الضيوف',
      search: 'بحث', search_flights: 'ابحث عن رحلات', search_hotels: 'ابحث عن فنادق', browse_visas: 'تصفح خدمات التأشيرات',
      featured_title: 'رحلات مميزة', featured_sub: 'برامج مختارة بعناية يحبها مسافرونا — تُحدَّث كل موسم.',
      view_all: 'عرض الكل', umrah_title: 'برامج العمرة', umrah_sub: 'من الاقتصادية إلى VIP، بتنظيم كامل من الرياض مع مرشدين دينيين معتمدين.',
      why_title: 'لماذا تسافر مع نور', why_sub: 'خمسة عشر عاماً في تنظيم الرحلات للعائلات والمعتمرين والشركات في أنحاء المملكة.',
      why1_t: 'مرخصون وموثوقون', why1_d: 'مرخصون من وزارة السياحة برقم ضريبي مسجل وفواتير متوافقة مع هيئة الزكاة والضريبة والجمارك.',
      why2_t: 'ادفع بطريقتك', why2_d: 'مدى وفيزا وماستركارد وApple Pay وSTC Pay والتحويل البنكي — أو قسّمها على 4 دفعات بدون فوائد.',
      why3_t: 'فريق حقيقي على مدار الساعة', why3_d: 'مستشار سفر مخصص عبر واتساب قبل رحلتك وأثناءها وبعدها.',
      why4_t: 'ضمان أفضل سعر', why4_d: 'وجدت سعراً أقل خلال 24 ساعة؟ نعيد لك الفرق.',
      dest_title: 'وجهات شائعة', dest_sub: 'من الحرمين الشريفين إلى جبال الألب.',
      split_title: 'سافر الآن وادفع لاحقاً — بدون فوائد',
      split_sub: 'قسّم أي حجز على 4 دفعات شهرية مع تابي أو 3–4 دفعات مع تمارا. بدون رسوم أو تكاليف خفية ومتوافق مع الشريعة.',
      reviews_title: 'ماذا يقول مسافرونا', stat1: 'مسافر سعيد', stat2: 'رحلة عمرة منظمة', stat3: 'وجهة', stat4: 'متوسط التقييم',
      newsletter_title: 'احصل على عروض حصرية', newsletter_sub: 'عروض موسمية ومواعيد رحلات العمرة مباشرة إلى بريدك.', subscribe: 'اشترك', your_email: 'بريدك الإلكتروني',
      packages_title: 'باقات العطلات والعمرة', packages_sub: 'برامج متكاملة تشمل الطيران والفنادق والتنقلات والمرشدين.',
      cat_umrah: 'العمرة', cat_international: 'دولية', cat_domestic: 'داخل المملكة', cat_honeymoon: 'شهر العسل',
      sort: 'ترتيب', sort_featured: 'الموصى بها', sort_price_asc: 'السعر: من الأقل', sort_price_desc: 'السعر: من الأعلى', sort_duration: 'الأقصر أولاً',
      max_price: 'أقصى سعر (ريال)', results: 'نتيجة', no_results: 'لا توجد نتائج مطابقة. جرّب فلاتر مختلفة.',
      days: 'أيام', per_person: 'للشخص', from_price: 'ابتداءً من', seats_left: 'مقعد متبقٍ', reviews: 'تقييم', view_details: 'عرض التفاصيل',
      or_split: 'أو 4 دفعات بقيمة', with: 'مع',
      overview: 'نظرة عامة', itinerary: 'برنامج الرحلة', includes: 'تشمل الباقة', guest_reviews: 'تقييمات الضيوف', day: 'اليوم',
      travel_date: 'تاريخ السفر', adults: 'البالغون', children: 'الأطفال (2–11)', infants: 'الرضّع (أقل من سنتين)', total: 'الإجمالي',
      continue_booking: 'متابعة الحجز', free_cancel: 'إلغاء مجاني حتى 14 يوماً قبل المغادرة',
      vat_incl: 'الأسعار شاملة ضريبة القيمة المضافة 15%', write_review: 'اكتب تقييماً', your_name: 'اسمك', rating: 'التقييم', comment: 'التعليق', submit: 'إرسال',
      review_thanks: 'شكراً لك! سيظهر تقييمك بعد المراجعة.',
      flights_title: 'حجز الطيران', flights_sub: 'رحلات داخلية ودولية مع السعودية وطيران ناس وطيران أديل والإمارات والقطرية والتركية.',
      outbound: 'رحلة الذهاب', inbound: 'رحلة العودة', direct: 'مباشرة', stop: 'توقف', select: 'اختيار', selected: 'تم الاختيار',
      choose_return: 'اختر الآن رحلة العودة', per_adult: 'للبالغ', continue: 'متابعة',
      hotels_title: 'الفنادق', hotels_sub: 'فنادق مختارة قرب الحرمين وفي أفضل الوجهات.', per_night: 'لليلة', nights: 'ليالٍ',
      visas_title: 'خدمات التأشيرات', visas_sub: 'نجهّز ملفك ونحجز المواعيد ونتابع طلبك حتى النهاية.',
      processing: 'مدة المعالجة', requirements: 'المتطلبات', apply_now: 'قدّم الآن', per_applicant: 'لكل متقدم', applicants: 'المتقدمون',
      checkout: 'إتمام الحجز', step_details: 'بيانات المسافرين', step_extras: 'الإضافات', step_payment: 'الدفع',
      lead_contact: 'بيانات التواصل', full_name: 'الاسم الكامل', email: 'البريد الإلكتروني', mobile: 'رقم الجوال',
      traveler: 'المسافر', adult: 'بالغ', child: 'طفل', infant: 'رضيع', first_name: 'الاسم الأول (كما في الجواز)', last_name: 'اسم العائلة',
      dob: 'تاريخ الميلاد', nationality: 'الجنسية', passport_no: 'رقم الجواز', title_mr: 'السيد', title_mrs: 'السيدة', title_ms: 'الآنسة',
      special_requests: 'طلبات خاصة (اختياري)', extras: 'أضف إلى رحلتك', per_traveler: 'لكل مسافر', per_booking: 'لكل حجز',
      payment_method: 'طريقة الدفع', pay_card: 'بطاقة ائتمانية / مدى', pay_card_d: 'مدى، فيزا، ماستركارد، Apple Pay، STC Pay',
      pay_tabby: 'قسّمها على 4 مع تابي', pay_tabby_d: 'ادفع 25% اليوم والباقي على 3 أشهر. بدون فوائد أو رسوم.',
      pay_tamara: 'قسّمها مع تمارا', pay_tamara_d: 'قسّمها على 3 أو 4 دفعات بدون فوائد. متوافق مع الشريعة.',
      pay_bank: 'تحويل بنكي', pay_bank_d: 'حوّل إلى حسابنا في البنك الأهلي وسنؤكد خلال ساعتي عمل.',
      instalments: 'دفعات', today: 'اليوم', month: 'الشهر', in_months: 'بعد {n} أشهر',
      order_summary: 'ملخص الحجز', subtotal: 'المجموع الفرعي', discount: 'الخصم', vat_included: 'شامل ضريبة القيمة المضافة', promo_code: 'رمز الخصم', apply: 'تطبيق', remove: 'إزالة',
      accept_terms: 'أوافق على <a href="/policies.html" target="_blank">الشروط وسياسة الإلغاء</a>.',
      pay_now: 'ادفع', confirm_booking: 'تأكيد الحجز', secure_note: 'المدفوعات مشفرة وتتم عبر مزودي دفع سعوديين مرخصين. لا نحتفظ ببيانات بطاقتك.',
      sandbox_note: 'وضع الاختبار — لن يتم خصم أي مبالغ حقيقية.',
      booking_ref: 'رقم الحجز', status: 'الحالة', payment: 'الدفع', paid: 'المدفوع', outstanding: 'المتبقي', lead_traveler: 'المسافر الرئيسي',
      pay_success_t: 'تم الدفع بنجاح — حجزك مؤكد!', pay_success_d: 'أرسلنا التأكيد والفاتورة الضريبية إلى بريدك الإلكتروني وواتساب.',
      pay_failed_t: 'لم تكتمل عملية الدفع', pay_failed_d: 'لم يتم خصم أي مبلغ. يمكنك المحاولة مرة أخرى أو اختيار طريقة دفع أخرى.',
      pay_pending_t: 'تم استلام الحجز — بانتظار الدفع', pay_pending_d: 'أكمل الدفع أدناه لتأكيد حجزك.',
      pay_cancelled_t: 'تم إلغاء الدفع', view_invoice: 'الفاتورة الضريبية', print: 'طباعة', complete_payment: 'إكمال الدفع', cancel_booking: 'إلغاء الحجز',
      bank_details: 'بيانات التحويل البنكي', bank: 'البنك', account_name: 'اسم الحساب', iban: 'الآيبان', transfer_ref: 'استخدم هذا المرجع',
      bank_after: 'بعد التحويل أرسل الإيصال عبر واتساب وسنؤكد حجزك فوراً.',
      st_pending_payment: 'بانتظار الدفع', st_confirmed: 'مؤكد', st_completed: 'مكتمل', st_cancelled: 'ملغي', st_refunded: 'مسترد',
      ps_unpaid: 'غير مدفوع', ps_pending: 'قيد الانتظار', ps_paid: 'مدفوع', ps_failed: 'فشل', ps_refunded: 'مسترد', ps_partially_refunded: 'مسترد جزئياً',
      m_card: 'بطاقة', m_tabby: 'تابي', m_tamara: 'تمارا', m_bank_transfer: 'تحويل بنكي', m_cash: 'نقداً', m_pos: 'نقاط البيع',
      manage_title: 'إدارة حجزك', manage_sub: 'أدخل رقم الحجز والبريد الإلكتروني لعرض الحجز أو الدفع أو تنزيل الفاتورة.', find_booking: 'ابحث عن الحجز',
      login_title: 'مرحباً بعودتك', register_title: 'أنشئ حسابك', password: 'كلمة المرور', no_account: 'جديد في نور للسفر؟', have_account: 'لديك حساب بالفعل؟',
      create_account: 'إنشاء حساب', sign_out: 'تسجيل الخروج', my_bookings: 'حجوزاتي', no_bookings: 'لا توجد لديك حجوزات بعد.', open: 'فتح',
      contact_title: 'تواصل معنا', contact_sub: 'زر مكتبنا الرئيسي في الرياض أو تواصل معنا في أي وقت عبر واتساب.', subject: 'الموضوع', message: 'الرسالة', send: 'إرسال الرسالة',
      inquiry_thanks: 'شكراً لك! سيتواصل معك مستشار السفر قريباً.', head_office: 'المكتب الرئيسي', working_hours: 'ساعات العمل', faq: 'الأسئلة الشائعة',
      footer_about: 'وكالة نور للسفر والسياحة شركة مقرها الرياض، تقدم برامج العمرة والعطلات والطيران والفنادق وخدمات التأشيرات في جميع أنحاء المملكة.',
      quick_links: 'استكشف', support: 'الدعم', policies: 'الشروط والسياسات', privacy: 'الخصوصية', rights: 'جميع الحقوق محفوظة.',
      cr: 'السجل التجاري', vat_no: 'الرقم الضريبي', license: 'ترخيص السياحة', we_accept: 'نقبل',
      round_trip: 'ذهاب وعودة', one_way: 'ذهاب فقط', swap: 'تبديل', travellers_class: 'المسافرون والدرجة', adults_12: 'البالغون (12+)', done: 'تم',
      traveller: 'مسافر', travellers_n: 'مسافرين', same_airports: 'يجب أن يختلف مطار المغادرة عن مطار الوصول.', h: 'س', m: 'د',
      stops_n: 'توقفات', layover: 'توقف', operated_by: 'تشغلها', kg: 'كجم', no_checked_bag: 'بدون أمتعة مسجلة', cabin_bag: 'حقيبة يد',
      refundable: 'قابلة للاسترداد', non_refundable: 'غير قابلة للاسترداد', modify_search: 'تعديل البحث', searching: 'نبحث عن أفضل الأسعار لدى شركات الطيران…',
      prev_day: 'اليوم السابق', next_day: 'اليوم التالي', no_flights: 'لا توجد رحلات', no_flights_d: 'جرّب تواريخ مختلفة أو مطارات قريبة.',
      filters: 'الفلاتر', reset: 'إعادة تعيين', stops: 'التوقفات', one_stop: 'توقف واحد', two_stops: 'توقفان أو أكثر', price: 'السعر', departure_time: 'وقت المغادرة (الذهاب)',
      t_early: 'فجراً', t_morning: 'صباحاً', t_afternoon: 'ظهراً', t_evening: 'مساءً', airlines: 'شركات الطيران', more: 'خيارات إضافية',
      baggage_included: 'تشمل أمتعة مسجلة', refundable_only: 'الأسعار القابلة للاسترداد فقط', show_results: 'عرض النتائج',
      sort_cheapest: 'الأرخص', sort_best: 'الموصى بها', sort_fastest: 'الأسرع', total_for: 'الإجمالي لـ', person: 'شخص', per_person_total: 'السعر الإجمالي شامل الضرائب',
      hide_details: 'إخفاء التفاصيل', flight_details: 'تفاصيل الرحلة', fare_rules: 'شروط السعر', rule_refund: 'قابلة للاسترداد (قد تُطبق رسوم شركة الطيران)',
      rule_norefund: 'غير قابلة للاسترداد', rule_change: 'يُسمح بالتعديل (رسوم + فرق السعر)', rule_nochange: 'لا يُسمح بالتعديل', flights_found: 'رحلة متاحة',
      demo_fares: 'أسعار تجريبية', show_more: 'عرض المزيد من الرحلات', no_filter_results: 'لا توجد رحلات مطابقة لهذه الفلاتر.',
      gender: 'الجنس', male: 'ذكر', female: 'أنثى', passport_expiry: 'تاريخ انتهاء الجواز', select_country: 'اختر', name_hint: 'بالأحرف الإنجليزية كما في جواز السفر',
      flight_summary: 'رحلتك', fare_expires: 'السعر محجوز لمدة', pnr: 'رقم حجز شركة الطيران (PNR)', e_tickets: 'أرقام التذاكر الإلكترونية',
      tk_pending: 'جارٍ إصدار التذكرة', tk_held: 'تم حجز المقاعد', tk_issued: 'تم إصدار التذكرة', tk_manual: 'فريقنا يصدر تذكرتك الآن', tk_failed: 'فريقنا يصدر تذكرتك الآن',
      tk_note: 'ستصلك التذكرة الإلكترونية على بريدك وواتساب خلال دقائق بعد الدفع.',
      popular_routes: 'رحلات شائعة من الرياض', recent_searches: 'عمليات البحث الأخيرة', flights_hero_title: 'احجز رحلتك إلى أكثر من 80 وجهة <em>وادفع بطريقتك</em>',
      flights_hero_lead: 'قارن بين السعودية وطيران ناس وطيران أديل والإمارات والقطرية والتركية وغيرها — وادفع بمدى أو Apple Pay أو قسّمها مع تابي وتمارا.',
      auth_gate_title: 'سجّل الدخول لإتمام حجزك', auth_gate_sub: 'يُحفظ حجزك وفاتورتك الضريبية وتذكرتك في حسابك وتُرسل إلى بريدك الإلكتروني.',
      forgot_password: 'نسيت كلمة المرور؟', send_reset_link: 'إرسال رابط إعادة التعيين', reset_sent: 'إذا كان هناك حساب بهذا البريد فقد أرسلنا رابط إعادة التعيين. يرجى مراجعة بريدك.',
      new_password: 'كلمة المرور الجديدة', set_password: 'حفظ كلمة المرور', reset_title: 'اختر كلمة مرور جديدة', back_to_signin: 'العودة لتسجيل الدخول',
      loading: 'جارٍ التحميل…', error_generic: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.', required: 'هذا الحقل مطلوب',
    },
  };

  const stored = (() => { try { return localStorage.getItem('noor_lang'); } catch { return null; } })();
  const lang = window.NOOR_FORCE_LANG || stored || ((navigator.language || '').startsWith('ar') ? 'ar' : 'en');
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  const t = (key, vars) => {
    let s = DICT[lang][key] ?? DICT.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  };
  const L = (obj) => (obj && typeof obj === 'object' ? obj[lang] || obj.en : obj);

  function applyI18n(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    root.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  }

  function setLang(next) {
    try { localStorage.setItem('noor_lang', next); } catch { /* storage unavailable */ }
    location.reload();
  }

  // --------------------------------------------------------------- helpers
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const qs = () => Object.fromEntries(new URLSearchParams(location.search));

  function money(halalas, { decimals } = {}) {
    const v = halalas / 100;
    const d = decimals ?? (Number.isInteger(v) ? 0 : 2);
    const n = v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    return lang === 'ar' ? `${n} ر.س` : `SAR ${n}`;
  }

  function fmtDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
    if (!iso) return '—';
    const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso.replace(' ', 'T') + (iso.includes('Z') || iso.length === 10 ? '' : 'Z'));
    return d.toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', opts);
  }

  const addDays = (n, from = new Date()) => { const d = new Date(from); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  async function api(path, { method = 'GET', body, raw } = {}) {
    const res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    if (raw) return res;
    let data = null;
    try { data = await res.json(); } catch { /* empty */ }
    if (!res.ok) {
      const err = new Error((lang === 'ar' && data?.error_ar) || data?.error || t('error_generic'));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function toast(msg, type = '') {
    let wrap = $('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; wrap.setAttribute('role', 'status'); document.body.append(wrap); }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    wrap.append(el);
    setTimeout(() => el.remove(), 4200);
  }

  async function busy(btn, fn) {
    const html = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
  }

  const stars = (n) => '★★★★★☆☆☆☆☆'.slice(5 - Math.round(n), 10 - Math.round(n));

  // ------------------------------------------------------------ scene art
  // Self-contained SVG illustrations (no stock photos needed).
  function art(scene = 'city', hue = 200, seed = 1) {
    const h = Number(hue) || 200;
    const id = `g${scene}${h}${seed}${Math.random().toString(36).slice(2, 7)}`;
    const sky = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="hsl(${h},55%,28%)"/><stop offset=".6" stop-color="hsl(${(h + 25) % 360},60%,55%)"/>
      <stop offset="1" stop-color="hsl(${(h + 45) % 360},75%,78%)"/></linearGradient></defs>
      <rect width="800" height="500" fill="url(#${id})"/>
      <circle cx="${560 + (seed % 5) * 30}" cy="130" r="54" fill="hsl(45,95%,85%)" opacity=".85"/>`;
    const dark = `hsl(${h},45%,14%)`;
    const mid = `hsl(${h},35%,24%)`;
    let fg = '';
    if (scene === 'mosque') {
      fg = `<path d="M0 420 Q200 390 400 410 T800 400 V500 H0Z" fill="${mid}"/>
        <g fill="${dark}"><rect x="250" y="300" width="300" height="140"/><path d="M290 300 Q400 170 510 300Z"/>
        <rect x="200" y="200" width="22" height="240"/><path d="M198 200 L211 160 L224 200Z"/><rect x="578" y="200" width="22" height="240"/><path d="M576 200 L589 160 L602 200Z"/>
        <rect x="150" y="340" width="100" height="100"/><path d="M160 340 Q200 290 240 340Z"/><rect x="550" y="340" width="100" height="100"/><path d="M560 340 Q600 290 640 340Z"/>
        <circle cx="400" cy="205" r="6"/></g>
        <g fill="hsl(45,90%,70%)" opacity=".7"><rect x="330" y="360" width="16" height="30" rx="8"/><rect x="392" y="360" width="16" height="30" rx="8"/><rect x="454" y="360" width="16" height="30" rx="8"/></g>
        <rect y="440" width="800" height="60" fill="${dark}"/>`;
    } else if (scene === 'mountain') {
      fg = `<path d="M0 380 L140 220 L240 320 L380 150 L520 330 L640 230 L800 360 V500 H0Z" fill="${mid}"/>
        <path d="M380 150 L425 205 L400 200 L380 222 L360 198 L335 205Z" fill="#fff" opacity=".85"/>
        <path d="M140 220 L170 255 L140 250 L120 262Z" fill="#fff" opacity=".7"/>
        <path d="M0 430 L180 330 L330 420 L500 340 L800 440 V500 H0Z" fill="${dark}"/>
        <g fill="${dark}">${[60, 100, 690, 730, 760].map((x, i) => `<path d="M${x} ${470 - i * 4} l14 -48 l14 48Z"/>`).join('')}</g>`;
    } else if (scene === 'beach') {
      fg = `<rect y="330" width="800" height="170" fill="hsl(${(h + 5) % 360},70%,45%)"/>
        <path d="M0 360 Q100 350 200 360 T400 360 T600 360 T800 360" stroke="#fff" stroke-opacity=".35" fill="none" stroke-width="3"/>
        <path d="M0 420 Q300 380 800 430 V500 H0Z" fill="hsl(42,65%,78%)"/>
        <g fill="${dark}"><path d="M150 430 Q160 330 190 260" stroke="${dark}" stroke-width="10" fill="none"/>
        <path d="M190 260 q-60 -10 -90 30 q50 -20 90 -30Z"/><path d="M190 260 q60 -20 90 20 q-50 -25 -90 -20Z"/><path d="M190 260 q-20 -50 -70 -60 q40 20 70 60Z"/><path d="M190 260 q30 -45 80 -45 q-45 15 -80 45Z"/></g>
        <g fill="hsl(${h},30%,90%)">${[520, 580, 640].map((x) => `<rect x="${x}" y="318" width="40" height="18"/><path d="M${x - 4} 318 L${x + 20} 302 L${x + 44} 318Z"/><rect x="${x + 18}" y="336" width="4" height="22"/>`).join('')}</g>`;
    } else if (scene === 'desert') {
      fg = `<path d="M0 360 Q200 300 420 350 T800 330 V500 H0Z" fill="hsl(28,55%,52%)"/>
        <path d="M0 420 Q250 370 500 420 T800 410 V500 H0Z" fill="hsl(24,55%,40%)"/>
        <g fill="hsl(20,45%,30%)"><path d="M480 360 Q470 250 520 220 Q600 200 610 270 Q620 330 600 360Z"/><path d="M515 225 q-18 -20 -8 -40 q12 18 30 20Z" opacity=".8"/></g>
        <g fill="${dark}"><path d="M120 400 h40 v-18 h8 v18 h30 v-10 q10 -18 18 0 v10 h6 v10 h-102z"/></g>`;
    } else {
      fg = `<g fill="${mid}">${[0, 70, 120, 200, 260, 330, 420, 500, 560, 640, 720].map((x, i) => {
        const hh = 120 + ((i * 53 + seed * 17) % 170);
        return `<rect x="${x}" y="${440 - hh}" width="${55 + (i % 3) * 10}" height="${hh}"/>`;
      }).join('')}</g>
        <g fill="${dark}"><rect x="360" y="110" width="40" height="330"/><path d="M360 110 L380 40 L400 110Z"/><rect x="410" y="160" width="40" height="280"/><path d="M410 160 L430 90 L450 160Z"/>
        ${[30, 150, 240, 480, 600, 700].map((x, i) => `<rect x="${x}" y="${330 - (i % 3) * 30}" width="70" height="${110 + (i % 3) * 30}"/>`).join('')}</g>
        <g fill="hsl(45,90%,72%)" opacity=".55">${Array.from({ length: 26 }, (_, i) => `<rect x="${40 + ((i * 97) % 720)}" y="${320 + ((i * 41) % 100)}" width="6" height="8"/>`).join('')}</g>
        <rect y="440" width="800" height="60" fill="${dark}"/>`;
    }
    return `<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${sky}${fg}</svg>`;
  }

  const icons = {
    clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4a3.5 3.5 0 0 1 0 7M22 20c0-3-2-5-5-5.7"/></svg>',
    shield: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    card: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>',
    chat: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
    tag: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
    lock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    plane: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>',
    bed: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18V6M3 13h18v5M21 13a4 4 0 0 0-4-4h-6v4"/><circle cx="7" cy="10" r="2"/></svg>',
    globe: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    doc: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>',
    moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
    wa: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.6 2.1 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.2z"/></svg>',
  };

  const payLogos = () => `<div class="pay-logos" aria-label="${esc(t('we_accept'))}">
    <span class="pay-logo mada">ma<b>da</b></span><span class="pay-logo visa">VISA</span><span class="pay-logo mc"><i></i><i></i></span>
    <span class="pay-logo apple">Apple Pay</span><span class="pay-logo stc">stc pay</span><span class="pay-logo tabby">tabby</span><span class="pay-logo tamara">tamara</span></div>`;

  // --------------------------------------------------------- header/footer
  let site = null;
  let me = null;

  function header(active) {
    const nav = [['/', 'nav_home'], ['/packages.html?category=umrah', 'nav_umrah'], ['/packages.html', 'nav_packages'],
      ['/flights.html', 'nav_flights'], ['/hotels.html', 'nav_hotels'], ['/visas.html', 'nav_visas'], ['/manage.html', 'nav_manage'], ['/contact.html', 'nav_contact']];
    const c = site.company;
    return `<div class="topbar"><div class="container">
        <div class="flex"><a href="tel:${esc(c.phone.replace(/\s/g, ''))}" class="num">☎ ${esc(c.phone)}</a><a href="mailto:${esc(c.email)}" class="hide-sm">✉ ${esc(c.email)}</a></div>
        <div class="flex"><span class="hide-sm">✓ ${esc(t('licensed'))} · ${esc(t('license'))} <span class="num">${esc(c.tourismLicense)}</span></span></div>
      </div></div>
      <header class="site-header"><div class="container">
        <a href="/" class="logo" aria-label="${esc(t('brand'))}">
          <span class="logo-mark"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2.5l2.3 5.2 5.7.6-4.3 3.8 1.2 5.6L12 14.9l-4.9 2.8 1.2-5.6L4 8.3l5.7-.6z" fill="#c9a24a"/><circle cx="12" cy="11" r="2.2" fill="#fff"/></svg></span>
          <span>${esc(t('brand'))}<small>${esc(t('brandSub'))}</small></span>
        </a>
        <nav class="main-nav" id="main-nav">${nav.map(([h, k]) => `<a href="${h}" class="${active === k ? 'active' : ''}">${esc(t(k))}</a>`).join('')}</nav>
        <div class="header-actions">
          <button class="btn btn-outline btn-sm lang-toggle" id="lang-btn" type="button" lang="${lang === 'ar' ? 'en' : 'ar'}">${esc(t('lang_switch'))}</button>
          <a class="btn btn-ghost btn-sm" href="/account.html" id="acct-link">${esc(me ? me.name.split(' ')[0] : t('sign_in'))}</a>
          <a class="btn btn-primary btn-sm" href="/packages.html">${esc(t('book_now'))}</a>
          <button class="nav-toggle" id="nav-toggle" aria-label="Menu" aria-controls="main-nav" aria-expanded="false"><span></span><span></span><span></span></button>
        </div>
      </div></header>`;
  }

  function footer() {
    const c = site.company;
    return `<footer class="site-footer"><div class="container">
      <div class="footer-grid">
        <div><a href="/" class="logo" style="color:#fff"><span class="logo-mark"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2.5l2.3 5.2 5.7.6-4.3 3.8 1.2 5.6L12 14.9l-4.9 2.8 1.2-5.6L4 8.3l5.7-.6z" fill="#c9a24a"/></svg></span>${esc(t('brand'))}</a>
          <p class="mt-2">${esc(t('footer_about'))}</p>${payLogos()}</div>
        <div><h4>${esc(t('quick_links'))}</h4><ul>
          <li><a href="/packages.html?category=umrah">${esc(t('nav_umrah'))}</a></li><li><a href="/packages.html">${esc(t('nav_packages'))}</a></li>
          <li><a href="/flights.html">${esc(t('nav_flights'))}</a></li><li><a href="/hotels.html">${esc(t('nav_hotels'))}</a></li><li><a href="/visas.html">${esc(t('nav_visas'))}</a></li></ul></div>
        <div><h4>${esc(t('support'))}</h4><ul>
          <li><a href="/manage.html">${esc(t('nav_manage'))}</a></li><li><a href="/account.html">${esc(t('my_account'))}</a></li>
          <li><a href="/contact.html">${esc(t('nav_contact'))}</a></li><li><a href="/about.html">${esc(t('nav_about'))}</a></li><li><a href="/policies.html">${esc(t('policies'))}</a></li></ul></div>
        <div><h4>${esc(t('head_office'))}</h4><p>${esc(c.address)}</p>
          <p><a href="tel:${esc(c.phone.replace(/\s/g, ''))}" class="num">${esc(c.phone)}</a><br><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>
          <form class="newsletter" id="nl-form"><label class="sr-only" for="nl-email">${esc(t('your_email'))}</label><input class="input" id="nl-email" type="email" required placeholder="${esc(t('your_email'))}"><button class="btn btn-gold">${esc(t('subscribe'))}</button></form></div>
      </div>
      <div class="footer-bottom"><span>© ${new Date().getFullYear()} ${esc(lang === 'ar' ? c.nameAr : c.nameEn)}. ${esc(t('rights'))}</span>
        <span class="footer-legal"><span>${esc(t('cr'))}: <span class="num">${esc(c.crNumber)}</span></span><span>${esc(t('vat_no'))}: <span class="num">${esc(c.vatNumber)}</span></span><span>${esc(t('license'))}: <span class="num">${esc(c.tourismLicense)}</span></span></span></div>
    </div></footer>
    <a class="wa-float" href="https://wa.me/${esc(c.whatsapp)}" target="_blank" rel="noopener" aria-label="WhatsApp">${icons.wa}</a>`;
  }

  async function init(active) {
    applyI18n();
    [site, me] = await Promise.all([api('/site'), api('/account/me').catch(() => null)]);
    const h = $('#site-header');
    const f = $('#site-footer');
    if (h) h.outerHTML = header(active);
    if (f) f.outerHTML = footer();
    $('#lang-btn')?.addEventListener('click', () => setLang(lang === 'ar' ? 'en' : 'ar'));
    $('#nav-toggle')?.addEventListener('click', (e) => {
      const open = $('#main-nav').classList.toggle('open');
      e.currentTarget.setAttribute('aria-expanded', String(open));
    });
    $('#nl-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await api('/newsletter', { method: 'POST', body: { email: $('#nl-email').value } }); toast('✓', 'success'); e.target.reset(); } catch (err) { toast(err.message, 'error'); }
    });
    return { site, me };
  }

  function stepper(el, { min = 0, max = 9, value = 0, onChange } = {}) {
    el.classList.add('stepper');
    el.innerHTML = '<button type="button" aria-label="-">−</button><output></output><button type="button" aria-label="+">+</button>';
    const [dec, inc] = el.querySelectorAll('button');
    const out = el.querySelector('output');
    const api_ = {
      get value() { return value; },
      set(v) { value = Math.max(min, Math.min(max, v)); out.textContent = value; dec.disabled = value <= min; inc.disabled = value >= max; },
      setMax(m) { max = m; api_.set(value); },
    };
    dec.onclick = () => { api_.set(value - 1); onChange?.(value); };
    inc.onclick = () => { api_.set(value + 1); onChange?.(value); };
    api_.set(value);
    return api_;
  }

  function pkgCard(p) {
    const cat = t(`cat_${p.category}`);
    return `<a class="card pkg-card" href="/package.html?slug=${encodeURIComponent(p.slug)}">
      <div class="pkg-media">${art(p.scene, p.hue, p.id)}<span class="badge">${esc(cat)}</span>
        ${p.rating ? `<span class="fav">★ ${p.rating} <span class="muted">(${p.reviewCount})</span></span>` : ''}</div>
      <div class="pkg-body">
        <div class="pkg-meta"><span>${icons.pin}${esc(L(p.destination))}</span><span>${icons.clock}<span class="num">${p.durationDays}</span> ${esc(t('days'))}</span></div>
        <h3 class="mb-0">${esc(L(p.title))}</h3>
        <p class="muted small mb-0">${esc(L(p.summary)).slice(0, 110)}…</p>
        <div class="pkg-foot"><div>
          <div class="small muted">${esc(t('from_price'))} ${p.oldPrice ? `<span class="old-price num">${money(p.oldPrice)}</span>` : ''}</div>
          <div class="price num">${money(p.price)} <small>/ ${esc(t('per_person'))}</small></div>
          <div class="bnpl-hint">${esc(t('or_split'))} <strong class="num">${money(Math.ceil(p.price / 4), { decimals: 2 })}</strong> <span class="pay-logo tabby" style="height:20px;font-size:.7rem;padding:0 6px">tabby</span></div>
        </div><span class="btn btn-outline btn-sm">${esc(t('view_details'))}</span></div>
      </div></a>`;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const el = document.createElement('script');
      el.src = src; el.onload = resolve; el.onerror = () => reject(new Error(t('error_generic')));
      document.head.append(el);
    });
  }

  /** Start (or retry) payment for a booking and follow the provider's next step. */
  async function startPayment(ref, token, method, { instalments, box } = {}) {
    const r = await api(`/bookings/${encodeURIComponent(ref)}/pay`, { method: 'POST', body: { t: token, method, instalments, lang } });
    if (r.action === 'redirect') { location.href = r.url; return; }
    if (r.action === 'bank_transfer') { location.href = `/booking.html?ref=${ref}&t=${token}&payment=bank`; return; }
    if (r.action === 'moyasar') {
      const v = site.moyasarFormVersion;
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = `https://cdn.moyasar.com/mpf/${v}/moyasar.css`;
      document.head.append(css);
      await loadScript(`https://cdn.moyasar.com/mpf/${v}/moyasar.js`);
      box.innerHTML = '<div class="mysr-form"></div>';
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.Moyasar.init({ element: box.querySelector('.mysr-form'), ...r.config });
    }
  }

  const statusBadge = (kind, v) => `<span class="status s-${esc(v)}">${esc(t(`${kind}_${v}`))}</span>`;

  window.Noor = { pkgCard, statusBadge, startPayment, lang, t, L, esc, $, $$, qs, money, fmtDate, addDays, api, toast, busy, stars, art, icons, payLogos, init, applyI18n, stepper, get site() { return site; }, get me() { return me; } };
})();
