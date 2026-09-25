/* ===================== Arabic / English language switch =====================
   English is written directly in the HTML. When Arabic is selected, every text
   node, placeholder, aria-label and the page <title> is looked up in the AR
   dictionary below and swapped, and the page switches to right-to-left.
   The choice is remembered in localStorage.                                     */
(function () {
  var AR = {
    /* ---- Page titles & meta ---- */
    'DriveNow Rentals | Car Rental Made Easy': 'درايف ناو | تأجير السيارات بكل سهولة',
    'Our Fleet | DriveNow Rentals': 'أسطولنا | درايف ناو لتأجير السيارات',
    'Range Rover Sport | DriveNow Rentals': 'رينج روفر سبورت | درايف ناو لتأجير السيارات',
    'About Us | DriveNow Rentals': 'من نحن | درايف ناو لتأجير السيارات',
    'Contact Us | DriveNow Rentals': 'اتصل بنا | درايف ناو لتأجير السيارات',

    /* ---- Header, nav, footer (shared) ---- */
    'Drive': 'درايف', 'Now': ' ناو',
    'Home': 'الرئيسية', 'Fleet': 'الأسطول', 'Car Details': 'تفاصيل السيارة', 'About': 'من نحن', 'Contact': 'اتصل بنا',
    'Call us anytime': 'اتصل بنا في أي وقت', 'Book Now': 'احجز الآن', 'Toggle menu': 'فتح القائمة',
    'Back to top': 'العودة للأعلى',
    'DriveNow Rentals offers a wide range of vehicles at competitive prices, with a commitment to customer satisfaction and hassle-free bookings.':
      'تقدم درايف ناو مجموعة واسعة من السيارات بأسعار تنافسية، مع التزام تام برضا العملاء وحجز سهل بدون تعقيد.',
    'Quick Links': 'روابط سريعة', 'About Us': 'من نحن', 'Fleet Categories': 'فئات الأسطول',
    'Economy Cars': 'سيارات اقتصادية', 'SUVs': 'سيارات دفع رباعي', 'Luxury Cars': 'سيارات فاخرة', 'Vans': 'فانات',
    'Contact Us': 'اتصل بنا',
    'King Fahd Road, Al Olaya, Riyadh 12211': 'طريق الملك فهد، العليا، الرياض 12211',
    'King Fahd Road, Al Olaya, Riyadh 12211, Saudi Arabia': 'طريق الملك فهد، العليا، الرياض 12211، المملكة العربية السعودية',
    '© 2026 DriveNow Rentals. All rights reserved.': '© 2026 درايف ناو لتأجير السيارات. جميع الحقوق محفوظة.',
    'mada': 'مدى',

    /* ---- Home ---- */
    '#1 Trusted Car Rental Platform': 'منصة تأجير السيارات الأكثر ثقة',
    'Find, Book & Rent a Car': 'ابحث واحجز واستأجر سيارتك',
    'Anytime, Anywhere': 'في أي وقت ومن أي مكان',
    'Choose from over 500 vehicles across 60+ locations. Transparent pricing, free cancellation, and the road-ready car you need — delivered fast.':
      'اختر من بين أكثر من 500 سيارة في أكثر من 60 موقعاً. أسعار واضحة، إلغاء مجاني، وسيارة جاهزة للطريق تصلك بسرعة.',
    'Browse Fleet': 'تصفح الأسطول', 'How It Works': 'كيف يعمل',
    'Years Experience': 'سنوات من الخبرة', 'Cars Available': 'سيارة متاحة', 'Locations': 'موقع', 'Happy Customers': 'عميل سعيد',
    'Local Rental': 'تأجير داخل المدينة', 'Outstation': 'بين المدن', 'Airport Transfer': 'توصيل المطار', 'Chauffeur': 'مع سائق',
    'Pick-up Location': 'موقع الاستلام', 'Select city': 'اختر المدينة',
    'Riyadh': 'الرياض', 'Jeddah': 'جدة', 'Dammam': 'الدمام', 'Dubai': 'دبي', 'Abu Dhabi': 'أبوظبي',
    'Drop-off Location': 'موقع التسليم', 'Same as pick-up': 'نفس موقع الاستلام',
    'Pick-up Date': 'تاريخ الاستلام', 'Return Date': 'تاريخ الإرجاع', 'Search Cars': 'ابحث عن سيارة',
    'Vehicles in Fleet': 'سيارة في الأسطول', 'Cities Covered': 'مدينة نغطيها', 'Bookings Completed': 'حجز مكتمل', 'Average Rating': 'متوسط التقييم',
    'Why Choose Us': 'لماذا تختارنا', 'The Smarter Way to Rent a Car': 'الطريقة الأذكى لاستئجار سيارة',
    'We make renting simple, transparent and reliable — from booking to drop-off.': 'نجعل التأجير بسيطاً وواضحاً وموثوقاً — من الحجز حتى التسليم.',
    '24/7 Support': 'دعم على مدار الساعة',
    'Our roadside and customer support team is available around the clock, every day of the year.': 'فريق المساعدة على الطريق وخدمة العملاء متاح على مدار الساعة طوال أيام السنة.',
    'Best Price Guarantee': 'ضمان أفضل سعر',
    "No hidden fees. Find a lower price elsewhere and we'll match it, guaranteed.": 'بدون رسوم مخفية. إذا وجدت سعراً أقل في مكان آخر سنطابقه، مضمون.',
    'Free Cancellation': 'إلغاء مجاني',
    'Plans change. Cancel or modify your booking free of charge up to 24 hours before pick-up.': 'الخطط تتغير. يمكنك إلغاء أو تعديل حجزك مجاناً حتى 24 ساعة قبل الاستلام.',
    '500+ Well-Maintained Cars': 'أكثر من 500 سيارة بصيانة ممتازة',
    'From economy hatchbacks to luxury SUVs, every vehicle is inspected and sanitized before pick-up.': 'من السيارات الاقتصادية إلى سيارات الدفع الرباعي الفاخرة، يتم فحص وتعقيم كل سيارة قبل الاستلام.',
    'Our Fleet': 'أسطولنا', 'Popular Vehicles for Every Trip': 'سيارات مميزة لكل رحلة',
    'Handpicked vehicles across every category, ready for your next journey.': 'سيارات مختارة بعناية من كل الفئات، جاهزة لرحلتك القادمة.',
    'Popular': 'الأكثر طلباً', 'New': 'جديد', 'Best Value': 'أفضل قيمة', 'Sporty': 'رياضية',
    'Luxury Sedan': 'سيدان فاخرة', 'SUV': 'دفع رباعي', 'Economy': 'اقتصادية', 'Luxury': 'فاخرة', 'Van': 'فان', 'Convertible': 'مكشوفة',
    'Van / 8-Seater': 'فان / 8 مقاعد',
    '👤 4 Seats': '👤 4 مقاعد', '👤 5 Seats': '👤 5 مقاعد', '👤 8 Seats': '👤 8 مقاعد',
    '⚙️ Automatic': '⚙️ أوتوماتيك', '⚙️ Manual': '⚙️ عادي',
    '⛽ Petrol': '⛽ بنزين', '⛽ Hybrid': '⛽ هايبرد', '⛽ Diesel': '⛽ ديزل',
    '/day': '/يوم', '/ day': '/ يوم', 'Rent Now': 'استأجر الآن', 'View Full Fleet': 'عرض الأسطول كاملاً',
    'Audi A4 sedan': 'أودي A4 سيدان', 'Range Rover Sport SUV': 'رينج روفر سبورت', 'Toyota Corolla economy car': 'تويوتا كورولا اقتصادية',
    'Simple Process': 'خطوات بسيطة', 'Rent a Car in 4 Easy Steps': 'استأجر سيارتك في 4 خطوات سهلة',
    "From search to drop-off, we've streamlined the entire rental experience.": 'من البحث حتى التسليم، سهّلنا تجربة التأجير بالكامل.',
    'Choose Location': 'اختر الموقع', 'Pick your city and preferred pick-up / drop-off points.': 'اختر مدينتك ونقاط الاستلام والتسليم المفضلة.',
    'Select Your Car': 'اختر سيارتك', 'Browse our fleet and pick the vehicle that fits your trip.': 'تصفح أسطولنا واختر السيارة المناسبة لرحلتك.',
    'Book & Confirm': 'احجز وأكّد', 'Secure your booking online with instant confirmation.': 'أكمل حجزك أونلاين مع تأكيد فوري.',
    'Pick Up & Drive': 'استلم وانطلق', "Grab your keys and hit the road — it's that simple.": 'استلم المفتاح وانطلق — بهذه البساطة.',
    'Get 15% Off Your First Booking': 'خصم 15% على أول حجز',
    'Use code': 'استخدم الكود', 'at checkout. Valid for new customers only.': 'عند الدفع. صالح للعملاء الجدد فقط.',
    'Claim Offer': 'احصل على العرض',
    'Testimonials': 'آراء العملاء', 'What Our Customers Say': 'ماذا يقول عملاؤنا', 'Real experiences from real renters.': 'تجارب حقيقية من عملاء حقيقيين.',
    '"Booking was seamless and the car was in perfect condition. Will definitely rent from DriveNow again on my next trip."':
      '"الحجز كان سهلاً جداً والسيارة كانت بحالة ممتازة. أكيد سأستأجر من درايف ناو مرة أخرى في رحلتي القادمة."',
    '"Great prices, no hidden fees, and the staff was incredibly helpful when I needed to extend my rental."':
      '"أسعار رائعة بدون رسوم مخفية، والموظفون كانوا متعاونين جداً عندما احتجت لتمديد فترة الإيجار."',
    '"The airport pick-up was fast and the SUV I rented was exactly what my family needed for our road trip."':
      '"الاستلام من المطار كان سريعاً، وسيارة الدفع الرباعي كانت بالضبط ما تحتاجه عائلتي في رحلتنا."',
    'Abdullah Al-Qahtani': 'عبدالله القحطاني', 'Sara Al-Mansouri': 'سارة المنصوري', 'Faisal Al-Harbi': 'فيصل الحربي',
    'AQ': 'ع', 'SM': 'س', 'FH': 'ف', 'NA': 'ن', 'KS': 'خ', 'OR': 'ع', 'LH': 'ل', 'YO': 'ي', 'RZ': 'ر',
    'Where We Operate': 'أين نعمل', 'Pick Up Your Car in Popular Locations': 'استلم سيارتك من أشهر المواقع',
    'Available at major airports and city centers across Saudi Arabia and the UAE.': 'متاحون في المطارات الرئيسية ووسط المدن في السعودية والإمارات.',
    'Riyadh skyline': 'أفق الرياض', 'Jeddah skyline': 'أفق جدة', 'Dammam skyline': 'أفق الدمام', 'Dubai skyline': 'أفق دبي',
    '48 cars available': '48 سيارة متاحة', '62 cars available': '62 سيارة متاحة', '35 cars available': '35 سيارة متاحة', '40 cars available': '40 سيارة متاحة',
    'FAQ': 'الأسئلة الشائعة', 'Frequently Asked Questions': 'الأسئلة الشائعة',
    'What documents do I need to rent a car?': 'ما المستندات المطلوبة لاستئجار سيارة؟',
    "You'll need a valid driver's license, a credit card in your name, and a form of government ID. International renters may also need a passport.":
      'تحتاج إلى رخصة قيادة سارية، وبطاقة ائتمان باسمك، وهوية وطنية أو إقامة. قد يحتاج الزوار من خارج الدولة إلى جواز السفر ورخصة دولية.',
    'Can I cancel or modify my booking?': 'هل يمكنني إلغاء أو تعديل حجزي؟',
    'Yes, bookings can be cancelled or modified free of charge up to 24 hours before your scheduled pick-up time.': 'نعم، يمكن إلغاء الحجز أو تعديله مجاناً حتى 24 ساعة قبل موعد الاستلام.',
    'Is there a mileage limit?': 'هل يوجد حد للكيلومترات؟',
    'Most rentals include unlimited mileage. Some specialty and luxury vehicles may have a daily mileage cap — this is shown on the car details page.':
      'معظم الإيجارات تشمل كيلومترات مفتوحة. بعض السيارات الفاخرة قد يكون لها حد يومي — ويظهر ذلك في صفحة تفاصيل السيارة.',
    'Do you offer airport pick-up and drop-off?': 'هل توفرون الاستلام والتسليم في المطار؟',
    'Yes, we operate counters at all major airports with flexible pick-up and drop-off options, including after-hours service.':
      'نعم، لدينا مكاتب في جميع المطارات الرئيسية مع خيارات مرنة للاستلام والتسليم، بما في ذلك خارج أوقات الدوام.',
    'Get Exclusive Deals in Your Inbox': 'احصل على عروض حصرية في بريدك',
    'Subscribe to our newsletter and never miss a discount.': 'اشترك في نشرتنا البريدية ولا تفوّت أي خصم.',
    'Enter your email': 'أدخل بريدك الإلكتروني', 'Subscribe': 'اشترك',

    /* ---- Fleet ---- */
    'All Cars': 'كل السيارات', 'Showing 8 of 8 vehicles': 'عرض 8 من 8 سيارات',
    'Sort by: Popularity': 'الترتيب: الأكثر طلباً', 'Price: Low to High': 'السعر: من الأقل للأعلى',
    'Price: High to Low': 'السعر: من الأعلى للأقل', 'Newest First': 'الأحدث أولاً',

    /* ---- Car details ---- */
    'Range Rover Sport front view': 'رينج روفر سبورت - منظر أمامي',
    'Front view': 'منظر أمامي', 'Side view': 'منظر جانبي', 'Interior view': 'المقصورة الداخلية', 'Dashboard view': 'لوحة القيادة',
    'SUV · Full-Size': 'دفع رباعي · حجم كبير',
    'A commanding presence with premium comfort. The Range Rover Sport combines luxury, power and all-terrain capability — ideal for family trips, business travel or exploring off the beaten path.':
      'حضور قوي وراحة فاخرة. تجمع رينج روفر سبورت بين الفخامة والقوة والقدرة على جميع الطرق — مثالية لرحلات العائلة وسفر الأعمال والرحلات البرية.',
    'Seats': 'مقاعد', 'Automatic': 'أوتوماتيك', 'Transmission': 'ناقل الحركة', 'Petrol': 'بنزين', 'Fuel Type': 'نوع الوقود',
    'Unlimited': 'مفتوح', 'Mileage': 'الكيلومترات',
    'Overview': 'نظرة عامة', 'Features': 'المميزات', 'Rental Policy': 'سياسة التأجير', 'Reviews': 'التقييمات',
    "The Range Rover Sport offers a refined blend of on-road comfort and off-road capability. With a spacious cabin, advanced infotainment, and a smooth automatic transmission, it's built for both city driving and long-distance journeys. Free cancellation up to 24 hours before pick-up, and roadside assistance is included with every booking.":
      'تقدم رينج روفر سبورت مزيجاً راقياً من الراحة على الطرق المعبدة والقدرة على الطرق الوعرة. مقصورة واسعة، ونظام ترفيه متطور، وناقل حركة أوتوماتيكي سلس — مناسبة للقيادة داخل المدينة والرحلات الطويلة. إلغاء مجاني حتى 24 ساعة قبل الاستلام، والمساعدة على الطريق مشمولة مع كل حجز.',
    'Air Conditioning': 'تكييف هواء', 'Bluetooth & Apple CarPlay': 'بلوتوث و Apple CarPlay', 'Panoramic Sunroof': 'فتحة سقف بانورامية',
    'Leather Seats': 'مقاعد جلدية', '360° Parking Camera': 'كاميرا ركن 360°', 'Adaptive Cruise Control': 'مثبت سرعة تكيفي',
    'Heated & Ventilated Seats': 'مقاعد مدفأة ومبردة', 'All-Wheel Drive': 'دفع رباعي كامل',
    "Minimum renter age: 25 years with a valid driver's license held for at least 2 years.": 'الحد الأدنى لعمر المستأجر: 25 سنة مع رخصة قيادة سارية منذ سنتين على الأقل.',
    'A refundable security deposit is required at pick-up and held on your credit card.': 'يُطلب تأمين مسترد عند الاستلام يتم حجزه على بطاقتك الائتمانية.',
    'Free cancellation up to 24 hours before your scheduled pick-up time. Late returns are charged at the hourly rate.': 'إلغاء مجاني حتى 24 ساعة قبل موعد الاستلام. التأخير في الإرجاع يُحسب بسعر الساعة.',
    'Fuel policy: full-to-full. The vehicle is provided with a full tank and should be returned full.': 'سياسة الوقود: ممتلئ مقابل ممتلئ. تُسلَّم السيارة بخزان ممتلئ ويجب إرجاعها ممتلئة.',
    '"Absolutely loved this SUV — smooth ride and plenty of space for our family road trip."': '"أعجبتني السيارة جداً — قيادة مريحة ومساحة واسعة لرحلة العائلة."',
    '"Pick-up was quick and the car was spotless. Will rent again on my next visit."': '"الاستلام كان سريعاً والسيارة نظيفة جداً. سأستأجر مرة أخرى في زيارتي القادمة."',
    'Noura A.': 'نورة أ.', 'Khalid S.': 'خالد س.', 'Verified Renter': 'مستأجر موثّق',
    'Duration': 'المدة', '1 day': 'يوم واحد', 'Daily Rate': 'السعر اليومي', 'Estimated Total': 'الإجمالي التقديري',
    'Reserve This Car': 'احجز هذه السيارة',
    "Your reservation request has been received! We'll confirm by email shortly.": 'تم استلام طلب الحجز! سنرسل لك التأكيد قريباً.',
    'You Might Also Like': 'قد يعجبك أيضاً', 'Similar Vehicles': 'سيارات مشابهة',

    /* ---- About ---- */
    'About DriveNow Rentals': 'عن درايف ناو', 'DriveNow Rentals vehicle': 'سيارة من درايف ناو',
    'Years of Service': 'سنوات من الخدمة', 'Our Story': 'قصتنا', 'Driven by Trust, Built for the Road': 'نقودها بالثقة، ونبنيها للطريق',
    'Since 2014, DriveNow Rentals has helped thousands of travelers and locals get behind the wheel with confidence. What started as a single office in Riyadh has grown into a network of 60+ pick-up points, powered by a simple idea: renting a car should be fast, fair and stress-free.':
      'منذ عام 2014، ساعدت درايف ناو آلاف المسافرين والمقيمين على القيادة بثقة. بدأنا بمكتب واحد في الرياض، واليوم لدينا شبكة من أكثر من 60 نقطة استلام، وفكرتنا بسيطة: استئجار السيارة يجب أن يكون سريعاً وعادلاً وبدون تعب.',
    "Every vehicle in our fleet is regularly inspected, professionally cleaned, and backed by 24/7 roadside support — so wherever the road takes you, we've got you covered.":
      'كل سيارة في أسطولنا تخضع لفحص دوري وتنظيف احترافي، مع مساعدة على الطريق على مدار الساعة — أينما أخذك الطريق، نحن معك.',
    'Transparent, all-inclusive pricing': 'أسعار واضحة وشاملة', '500+ regularly serviced vehicles': 'أكثر من 500 سيارة بصيانة دورية',
    '24/7 customer & roadside support': 'دعم العملاء والمساعدة على الطريق 24/7', 'Free cancellation on every booking': 'إلغاء مجاني لكل حجز',
    'Browse Our Fleet': 'تصفح أسطولنا', 'Our Mission': 'رسالتنا', 'What Drives Us': 'ما الذي يحركنا',
    'We believe getting around should never be complicated. These principles guide everything we do.': 'نؤمن أن التنقل يجب ألا يكون معقداً أبداً. هذه المبادئ توجه كل ما نقوم به.',
    'Reliability': 'الموثوقية', 'Every car is inspected before each rental so you can hit the road with confidence.': 'نفحص كل سيارة قبل كل تأجير لتنطلق بثقة.',
    'Fair Pricing': 'أسعار عادلة', 'No hidden charges — the price you see at booking is the price you pay at pick-up.': 'بدون رسوم مخفية — السعر الذي تراه عند الحجز هو ما تدفعه عند الاستلام.',
    'Customer First': 'العميل أولاً', 'Our support team is available 24/7 to help before, during and after your trip.': 'فريق الدعم متاح 24/7 لمساعدتك قبل رحلتك وخلالها وبعدها.',
    'Speed & Simplicity': 'السرعة والبساطة', 'Book in under two minutes and pick up your car with minimal paperwork.': 'احجز في أقل من دقيقتين واستلم سيارتك بأقل إجراءات.',
    'Meet The Team': 'تعرّف على الفريق', 'The People Behind DriveNow': 'الفريق خلف درايف ناو',
    'A dedicated team working to make every rental experience a great one.': 'فريق متفانٍ يعمل ليجعل كل تجربة تأجير تجربة رائعة.',
    'Omar Al-Rashid': 'عمر الراشد', 'Chief Executive Officer': 'الرئيس التنفيذي', 'Lina Haddad': 'لينا حداد', 'Head of Operations': 'مديرة العمليات',
    'Yousef Al-Otaibi': 'يوسف العتيبي', 'Fleet Manager': 'مدير الأسطول', 'Reem Al-Zahrani': 'ريم الزهراني', 'Customer Support Lead': 'قائدة فريق خدمة العملاء',
    'Ready to Hit the Road?': 'جاهز للانطلاق؟', 'Browse our fleet and book your next rental in minutes.': 'تصفح أسطولنا واحجز سيارتك القادمة في دقائق.',
    'View Fleet': 'عرض الأسطول',

    /* ---- Contact ---- */
    'Our Address': 'عنواننا', 'Phone Number': 'رقم الجوال', 'Mon–Sun, 24/7 support': 'طوال أيام الأسبوع، دعم 24/7',
    'Email Address': 'البريد الإلكتروني', 'Working Hours': 'ساعات العمل',
    'Booking desk: 7:00 AM – 11:00 PM': 'مكتب الحجز: 7:00 صباحاً – 11:00 مساءً', 'Support line: 24/7': 'خط الدعم: 24/7',
    'Send Us a Message': 'أرسل لنا رسالة',
    'Have a question about a booking or need help planning your trip? Fill out the form below.': 'لديك سؤال عن حجز أو تحتاج مساعدة في التخطيط لرحلتك؟ املأ النموذج أدناه.',
    'Thanks for reaching out! Our team will get back to you within 24 hours.': 'شكراً لتواصلك! سيرد عليك فريقنا خلال 24 ساعة.',
    'Full Name': 'الاسم الكامل', 'Mohammed Ahmed': 'محمد أحمد', 'Subject': 'الموضوع',
    'General Inquiry': 'استفسار عام', 'Booking Support': 'دعم الحجوزات', 'Fleet Availability': 'توفر السيارات', 'Partnership': 'شراكة',
    'Message': 'الرسالة', 'Tell us how we can help...': 'أخبرنا كيف يمكننا مساعدتك...', 'Send Message': 'إرسال الرسالة',
    'Map showing DriveNow Rentals location in Riyadh': 'خريطة توضح موقع درايف ناو في الرياض',

    /* ---- WhatsApp & admin link (added by main.js) ---- */
    '→': '←',
    'Book via WhatsApp': 'احجز عبر واتساب', 'Chat on WhatsApp': 'تواصل عبر واتساب', 'Admin': 'لوحة التحكم'
  };

  var lang;
  try { lang = localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'; } catch (e) { lang = 'en'; }

  function tr(text) {
    if (lang !== 'ar' || !text) return text;
    var key = text.replace(/\s+/g, ' ').trim();
    if (Object.prototype.hasOwnProperty.call(AR, key)) {
      var lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0];
      return lead + AR[key] + trail;
    }
    // "SAR 450" -> "450 ر.س"
    var price = key.match(/^SAR ([\d,]+)$/);
    if (price) return text.replace(key, price[1] + ' ر.س');
    return text;
  }

  function translateTree(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || /^(SCRIPT|STYLE)$/.test(p.nodeName) || p.closest('svg')) return NodeFilter.FILTER_REJECT;
        return /\S/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) { n.nodeValue = tr(n.nodeValue); });
    root.querySelectorAll('[placeholder],[aria-label]').forEach(function (el) {
      ['placeholder', 'aria-label'].forEach(function (attr) {
        if (el.hasAttribute(attr)) el.setAttribute(attr, tr(el.getAttribute(attr)));
      });
    });
  }

  window.I18N = {
    lang: lang,
    t: tr,
    translate: function (el) { if (lang === 'ar') translateTree(el); },
    days: function (n) {
      if (lang !== 'ar') return n + ' ' + (n === 1 ? 'day' : 'days');
      if (n === 1) return 'يوم واحد';
      if (n === 2) return 'يومان';
      return n + ' ' + (n <= 10 ? 'أيام' : 'يوماً');
    },
    money: function (n) { return lang === 'ar' ? n.toLocaleString('en') + ' ر.س' : 'SAR ' + n.toLocaleString('en'); }
  };

  if (lang === 'ar') {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (lang === 'ar') {
      document.title = tr(document.title);
      translateTree(document.body);
    }

    // Language switch button in the header
    var actions = document.querySelector('.header-actions');
    if (actions) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lang-switch';
      btn.textContent = lang === 'ar' ? 'English' : 'العربية';
      btn.setAttribute('lang', lang === 'ar' ? 'en' : 'ar');
      btn.addEventListener('click', function () {
        try { localStorage.setItem('lang', lang === 'ar' ? 'en' : 'ar'); } catch (e) {}
        location.reload();
      });
      actions.insertBefore(btn, actions.firstChild);
    }
  });
})();
