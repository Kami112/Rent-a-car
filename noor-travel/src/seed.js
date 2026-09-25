'use strict';
const config = require('./config');
const { hashPassword } = require('./auth');
const dbm = require('./db');

const SAR = (n) => Math.round(n * 100);
const J = JSON.stringify;
const t = (en, ar) => ({ en, ar });

const PACKAGES = [
  {
    slug: 'umrah-economy-7-nights', category: 'umrah', scene: 'mosque', hue: 150, featured: 1,
    title: t('Umrah Economy — 7 Nights', 'عمرة اقتصادية — 7 ليالٍ'),
    dest: t('Makkah & Madinah', 'مكة المكرمة والمدينة المنورة'),
    summary: t('A comfortable, well-organised Umrah with 4 nights in Makkah and 3 nights in Madinah, return transport from Riyadh and guided ziyarat.',
      'عمرة مريحة ومنظمة: 4 ليالٍ في مكة المكرمة و3 ليالٍ في المدينة المنورة، مع النقل من الرياض والعودة، وزيارات بصحبة مرشد.'),
    days: 8, price: 2450, old: 2900, seats: 40,
    itinerary: [
      t('Day 1: Depart Riyadh by air-conditioned coach; Ihram at Miqat; arrive Makkah and perform Umrah.', 'اليوم 1: المغادرة من الرياض بحافلة مكيفة، الإحرام من الميقات، الوصول إلى مكة وأداء العمرة.'),
      t('Days 2–4: Prayers at Masjid al-Haram; guided ziyarah to Jabal al-Nour, Arafat and Mina.', 'الأيام 2–4: الصلاة في المسجد الحرام وزيارة جبل النور وعرفات ومنى.'),
      t('Day 5: Travel to Madinah; check in near Masjid an-Nabawi.', 'اليوم 5: السفر إلى المدينة المنورة والإقامة قرب المسجد النبوي.'),
      t('Days 6–7: Ziyarah to Quba Mosque, Uhud and the Seven Mosques.', 'الأيام 6–7: زيارة مسجد قباء وجبل أحد والمساجد السبعة.'),
      t('Day 8: Return to Riyadh.', 'اليوم 8: العودة إلى الرياض.'),
    ],
    includes: [t('Return coach transport', 'النقل بالحافلة ذهاباً وإياباً'), t('7 nights 3★ hotels', '7 ليالٍ في فنادق 3 نجوم'), t('Daily breakfast', 'إفطار يومي'), t('Religious guide', 'مرشد ديني'), t('Ziyarah tours', 'جولات الزيارة')],
  },
  {
    slug: 'umrah-vip-5-star', category: 'umrah', scene: 'mosque', hue: 42, featured: 1,
    title: t('VIP Umrah — 5★ Haram View', 'عمرة VIP — فنادق 5 نجوم بإطلالة على الحرم'),
    dest: t('Makkah & Madinah', 'مكة المكرمة والمدينة المنورة'),
    summary: t('Premium Umrah with flights, Haram-view 5★ hotels, private GMC transfers and a dedicated coordinator.',
      'عمرة فاخرة تشمل الطيران وفنادق 5 نجوم مطلة على الحرم، ونقل خاص بسيارات GMC ومنسق خاص.'),
    days: 6, price: 7850, old: 8900, seats: 16,
    itinerary: [
      t('Day 1: Fly Riyadh → Jeddah; private transfer to Makkah; perform Umrah with your guide.', 'اليوم 1: الطيران من الرياض إلى جدة، نقل خاص إلى مكة وأداء العمرة مع المرشد.'),
      t('Days 2–3: Free time for worship; optional private ziyarah.', 'الأيام 2–3: وقت حر للعبادة مع زيارة خاصة اختيارية.'),
      t('Day 4: Haramain high-speed train to Madinah (business class).', 'اليوم 4: قطار الحرمين السريع إلى المدينة (درجة الأعمال).'),
      t('Day 5: Ziyarah in Madinah.', 'اليوم 5: الزيارة في المدينة المنورة.'),
      t('Day 6: Fly Madinah → Riyadh.', 'اليوم 6: الطيران من المدينة إلى الرياض.'),
    ],
    includes: [t('Return flights', 'تذاكر الطيران ذهاباً وإياباً'), t('5★ Haram-view hotels', 'فنادق 5 نجوم بإطلالة على الحرم'), t('Haramain train, business class', 'قطار الحرمين درجة الأعمال'), t('Private transfers', 'نقل خاص'), t('Breakfast & dinner', 'إفطار وعشاء')],
  },
  {
    slug: 'istanbul-bursa-6-days', category: 'international', scene: 'mosque', hue: 205, featured: 1,
    title: t('Istanbul & Bursa — 6 Days', 'إسطنبول وبورصة — 6 أيام'),
    dest: t('Türkiye', 'تركيا'),
    summary: t('Bosphorus cruise, historic Sultanahmet, Uludağ cable car and Bursa’s green valleys — a family favourite.',
      'رحلة بحرية في البوسفور، وسلطان أحمد التاريخية، وتلفريك أولوداغ ووديان بورصة الخضراء — المفضلة لدى العائلات.'),
    days: 6, price: 4290, old: 4990, seats: 30,
    itinerary: [
      t('Arrive Istanbul; private transfer to hotel.', 'الوصول إلى إسطنبول والنقل إلى الفندق.'),
      t('Old City tour: Blue Mosque, Hagia Sophia, Grand Bazaar.', 'جولة المدينة القديمة: الجامع الأزرق وآيا صوفيا والبازار الكبير.'),
      t('Bosphorus dinner cruise.', 'عشاء على متن رحلة بحرية في البوسفور.'),
      t('Day trip to Bursa and Uludağ cable car.', 'رحلة يومية إلى بورصة وتلفريك أولوداغ.'),
      t('Free day for shopping.', 'يوم حر للتسوق.'),
      t('Transfer to airport.', 'النقل إلى المطار.'),
    ],
    includes: [t('Return flights from Riyadh', 'طيران ذهاباً وإياباً من الرياض'), t('5 nights 4★ hotel', '5 ليالٍ في فندق 4 نجوم'), t('Daily breakfast', 'إفطار يومي'), t('Arabic-speaking guide', 'مرشد يتحدث العربية'), t('All transfers', 'جميع التنقلات')],
  },
  {
    slug: 'baku-gabala-5-days', category: 'international', scene: 'city', hue: 265, featured: 1,
    title: t('Baku & Gabala — 5 Days', 'باكو وقبالة — 5 أيام'),
    dest: t('Azerbaijan', 'أذربيجان'),
    summary: t('Flame Towers, the Old City, and the mountains of Gabala with Tufandag cable car.',
      'أبراج اللهب والمدينة القديمة وجبال قبالة مع تلفريك توفانداغ.'),
    days: 5, price: 3390, old: null, seats: 30,
    itinerary: [t('Arrive Baku; evening at the Boulevard.', 'الوصول إلى باكو ومساء على الكورنيش.'), t('Baku city tour.', 'جولة في مدينة باكو.'), t('Gabala & Tufandag cable car.', 'قبالة وتلفريك توفانداغ.'), t('Shahdag mountain resort.', 'منتجع جبل شاهداغ.'), t('Departure.', 'المغادرة.')],
    includes: [t('Return flights', 'طيران ذهاباً وإياباً'), t('4 nights 4★ hotels', '4 ليالٍ في فنادق 4 نجوم'), t('Breakfast', 'إفطار'), t('Private driver-guide', 'سائق ومرشد خاص')],
  },
  {
    slug: 'georgia-tbilisi-batumi-6-days', category: 'international', scene: 'mountain', hue: 130, featured: 0,
    title: t('Georgia: Tbilisi & Batumi — 6 Days', 'جورجيا: تبليسي وباتومي — 6 أيام'),
    dest: t('Georgia', 'جورجيا'),
    summary: t('Green mountains, Kazbegi views and the Black Sea coast at Batumi.', 'جبال خضراء وإطلالات كازبيغي وساحل البحر الأسود في باتومي.'),
    days: 6, price: 3990, old: 4400, seats: 24,
    itinerary: [t('Arrive Tbilisi.', 'الوصول إلى تبليسي.'), t('Kazbegi day trip.', 'رحلة يومية إلى كازبيغي.'), t('Fly/drive to Batumi.', 'الانتقال إلى باتومي.'), t('Batumi botanical garden & boulevard.', 'حديقة باتومي النباتية والكورنيش.'), t('Free day.', 'يوم حر.'), t('Departure.', 'المغادرة.')],
    includes: [t('Return flights', 'طيران ذهاباً وإياباً'), t('5 nights hotels', '5 ليالٍ فندقية'), t('Breakfast', 'إفطار'), t('Transfers & tours', 'التنقلات والجولات')],
  },
  {
    slug: 'maldives-honeymoon-5-days', category: 'honeymoon', scene: 'beach', hue: 185, featured: 1,
    title: t('Maldives Honeymoon — Water Villa', 'شهر العسل في المالديف — فيلا مائية'),
    dest: t('Maldives', 'المالديف'),
    summary: t('Four nights in an over-water villa with half board, seaplane transfers and a sunset cruise.',
      'أربع ليالٍ في فيلا فوق الماء مع نصف إقامة، ونقل بالطائرة المائية ورحلة بحرية عند الغروب.'),
    days: 5, price: 12900, old: 14500, seats: 10,
    itinerary: [t('Arrive Malé; seaplane to resort.', 'الوصول إلى ماليه والانتقال بالطائرة المائية إلى المنتجع.'), t('Snorkelling & spa.', 'الغطس والسبا.'), t('Sunset dolphin cruise.', 'رحلة غروب لمشاهدة الدلافين.'), t('Private beach dinner.', 'عشاء خاص على الشاطئ.'), t('Departure.', 'المغادرة.')],
    includes: [t('Return flights', 'طيران ذهاباً وإياباً'), t('4 nights water villa', '4 ليالٍ في فيلا مائية'), t('Half board', 'نصف إقامة'), t('Seaplane transfers', 'النقل بالطائرة المائية')],
  },
  {
    slug: 'switzerland-grand-tour-8-days', category: 'international', scene: 'mountain', hue: 215, featured: 0,
    title: t('Switzerland Grand Tour — 8 Days', 'جولة سويسرا الكبرى — 8 أيام'),
    dest: t('Switzerland', 'سويسرا'),
    summary: t('Zurich, Lucerne, Interlaken and Jungfraujoch — the Alps at their finest.', 'زيورخ ولوسيرن وإنترلاكن ويونغفراويوخ — جبال الألب في أجمل صورها.'),
    days: 8, price: 11450, old: null, seats: 20,
    itinerary: [t('Arrive Zurich.', 'الوصول إلى زيورخ.'), t('Rhine Falls.', 'شلالات الراين.'), t('Lucerne & Mt. Titlis.', 'لوسيرن وجبل تيتليس.'), t('Interlaken.', 'إنترلاكن.'), t('Jungfraujoch.', 'يونغفراويوخ.'), t('Lake Brienz cruise.', 'رحلة بحيرة برينز.'), t('Free day.', 'يوم حر.'), t('Departure.', 'المغادرة.')],
    includes: [t('Return flights', 'طيران ذهاباً وإياباً'), t('7 nights 4★ hotels', '7 ليالٍ في فنادق 4 نجوم'), t('Swiss Travel Pass', 'تذكرة القطارات السويسرية'), t('Schengen visa assistance', 'المساعدة في تأشيرة شنغن')],
  },
  {
    slug: 'malaysia-kl-langkawi-7-days', category: 'international', scene: 'city', hue: 20, featured: 0,
    title: t('Malaysia: Kuala Lumpur & Langkawi', 'ماليزيا: كوالالمبور ولنكاوي'),
    dest: t('Malaysia', 'ماليزيا'),
    summary: t('Petronas Towers, Genting Highlands and Langkawi’s islands.', 'أبراج بتروناس ومرتفعات جنتنج وجزر لنكاوي.'),
    days: 7, price: 5190, old: 5800, seats: 30,
    itinerary: [t('Arrive KL.', 'الوصول إلى كوالالمبور.'), t('City tour & Petronas.', 'جولة المدينة وأبراج بتروناس.'), t('Genting Highlands.', 'مرتفعات جنتنج.'), t('Fly to Langkawi.', 'الطيران إلى لنكاوي.'), t('Island hopping.', 'جولة الجزر.'), t('Sky Bridge.', 'الجسر المعلق.'), t('Departure.', 'المغادرة.')],
    includes: [t('Return flights', 'طيران ذهاباً وإياباً'), t('6 nights hotels', '6 ليالٍ فندقية'), t('Breakfast', 'إفطار'), t('Domestic flight KL–Langkawi', 'رحلة داخلية كوالالمبور–لنكاوي')],
  },
  {
    slug: 'alula-heritage-3-days', category: 'domestic', scene: 'desert', hue: 25, featured: 1,
    title: t('AlUla Heritage Escape — 3 Days', 'رحلة تراث العلا — 3 أيام'),
    dest: t('AlUla, Saudi Arabia', 'العلا، المملكة العربية السعودية'),
    summary: t('Hegra UNESCO site, Elephant Rock at sunset and a stargazing dinner in the desert.',
      'موقع الحجر المدرج في اليونسكو، وجبل الفيل عند الغروب، وعشاء تحت النجوم في الصحراء.'),
    days: 3, price: 2890, old: null, seats: 20,
    itinerary: [t('Fly Riyadh → AlUla; Old Town walk.', 'الطيران من الرياض إلى العلا وجولة في البلدة القديمة.'), t('Hegra tour; Elephant Rock sunset.', 'جولة الحجر وغروب جبل الفيل.'), t('Maraya visit; return.', 'زيارة مرايا والعودة.')],
    includes: [t('Return flights', 'طيران ذهاباً وإياباً'), t('2 nights resort', 'ليلتان في منتجع'), t('Hegra tickets', 'تذاكر الحجر'), t('Stargazing dinner', 'عشاء تحت النجوم')],
  },
  {
    slug: 'abha-summer-4-days', category: 'domestic', scene: 'mountain', hue: 110, featured: 0,
    title: t('Abha Summer Break — 4 Days', 'صيف أبها — 4 أيام'),
    dest: t('Abha, Saudi Arabia', 'أبها، المملكة العربية السعودية'),
    summary: t('Cool mountain air, Rijal Almaa village and the Al Soudah cable car.', 'هواء الجبال العليل وقرية رجال ألمع وتلفريك السودة.'),
    days: 4, price: 1950, old: 2300, seats: 30,
    itinerary: [t('Fly to Abha.', 'الطيران إلى أبها.'), t('Al Soudah & cable car.', 'السودة والتلفريك.'), t('Rijal Almaa heritage village.', 'قرية رجال ألمع التراثية.'), t('Return.', 'العودة.')],
    includes: [t('Return flights', 'طيران ذهاباً وإياباً'), t('3 nights hotel', '3 ليالٍ فندقية'), t('Car with driver', 'سيارة مع سائق')],
  },
];

const HOTELS = [
  ['Haram View Hotel', 'Makkah', 'مكة المكرمة', 5, 1450, '150 m from Masjid al-Haram', '150 م من المسجد الحرام', 'mosque', 42],
  ['Ajyad Pilgrim Suites', 'Makkah', 'مكة المكرمة', 3, 420, '700 m from Masjid al-Haram', '700 م من المسجد الحرام', 'mosque', 150],
  ['Madinah Gardens Hotel', 'Madinah', 'المدينة المنورة', 4, 690, '250 m from Masjid an-Nabawi', '250 م من المسجد النبوي', 'mosque', 160],
  ['Olaya Business Tower Hotel', 'Riyadh', 'الرياض', 5, 980, 'King Fahd Road, Olaya', 'طريق الملك فهد، العليا', 'city', 220],
  ['Corniche Sea Breeze', 'Jeddah', 'جدة', 4, 560, 'On the Jeddah Corniche', 'على كورنيش جدة', 'beach', 195],
  ['Marina Skyline Dubai', 'Dubai', 'دبي', 5, 1150, 'Dubai Marina', 'دبي مارينا', 'city', 260],
  ['Bosphorus Pearl', 'Istanbul', 'إسطنبول', 4, 640, 'Taksim, 5 min to the Bosphorus', 'تقسيم، 5 دقائق من البوسفور', 'mosque', 205],
  ['Nile Terrace Hotel', 'Cairo', 'القاهرة', 5, 720, 'Garden City, Nile view', 'جاردن سيتي، إطلالة على النيل', 'desert', 35],
  ['Hyde Park Residence', 'London', 'لندن', 4, 1350, 'Near Edgware Road', 'قرب شارع إدجوير رود', 'city', 230],
  ['KLCC Twin View', 'Kuala Lumpur', 'كوالالمبور', 5, 610, 'Opposite Petronas Towers', 'مقابل أبراج بتروناس', 'city', 20],
];
const HOTEL_AMENITIES = ['wifi', 'breakfast', 'pool', 'gym', 'parking', 'family_rooms', 'prayer_room', 'airport_shuttle'];

const VISAS = [
  ['United Kingdom', 'المملكة المتحدة', 'Standard Visitor (6 months)', 'زيارة قياسية (6 أشهر)', '10–15 working days', 450, '🇬🇧'],
  ['Schengen Area', 'منطقة شنغن', 'Short-stay (Type C)', 'إقامة قصيرة (نوع C)', '10–15 working days', 390, '🇪🇺'],
  ['United States', 'الولايات المتحدة', 'B1/B2 appointment & file', 'موعد وملف B1/B2', 'Depends on embassy', 350, '🇺🇸'],
  ['Türkiye', 'تركيا', 'e-Visa', 'تأشيرة إلكترونية', '1–2 working days', 190, '🇹🇷'],
  ['Azerbaijan', 'أذربيجان', 'ASAN e-Visa', 'تأشيرة ASAN الإلكترونية', '3 working days', 160, '🇦🇿'],
  ['Egypt', 'مصر', 'Tourist e-Visa', 'تأشيرة سياحية إلكترونية', '5–7 working days', 210, '🇪🇬'],
  ['Malaysia', 'ماليزيا', 'eVISA / eNTRI', 'تأشيرة إلكترونية', '2–4 working days', 180, '🇲🇾'],
  ['Saudi Arabia', 'المملكة العربية السعودية', 'Tourist e-Visa for visiting family', 'تأشيرة سياحية لزيارة الأقارب', '1–3 working days', 650, '🇸🇦'],
];
const VISA_REQS = [t('Passport valid 6+ months', 'جواز سفر ساري لمدة 6 أشهر على الأقل'), t('Personal photo (white background)', 'صورة شخصية بخلفية بيضاء'), t('Bank statement (3 months)', 'كشف حساب بنكي (3 أشهر)'), t('Employment letter / Iqama copy', 'خطاب تعريف بالراتب / صورة الإقامة')];

// Reviews come from real customers (submitted on package pages, approved in the back-office).
const REVIEWS = [];

function seed(db, { reset = false } = {}) {
  if (reset) {
    db.exec(`DELETE FROM reviews; DELETE FROM activity_log; DELETE FROM notifications; DELETE FROM payments; DELETE FROM bookings;
      DELETE FROM packages; DELETE FROM hotels; DELETE FROM visas; DELETE FROM promo_codes; DELETE FROM counters;`);
  }
  const has = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n > 0;

  dbm.tx(db, () => {
    if (!has('packages')) {
      const ins = db.prepare(`INSERT INTO packages (slug, category, title_en, title_ar, destination_en, destination_ar, summary_en, summary_ar,
        duration_days, price, old_price, scene, hue, itinerary, includes, seats, featured) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
      for (const p of PACKAGES) {
        ins.run(p.slug, p.category, p.title.en, p.title.ar, p.dest.en, p.dest.ar, p.summary.en, p.summary.ar, p.days, SAR(p.price),
          p.old ? SAR(p.old) : null, p.scene, p.hue, J(p.itinerary), J(p.includes), p.seats, p.featured);
      }
    }
    if (!has('hotels')) {
      const ins = db.prepare(`INSERT INTO hotels (name, city_en, city_ar, stars, price_per_night, distance_en, distance_ar, amenities, scene, hue)
        VALUES (?,?,?,?,?,?,?,?,?,?)`);
      HOTELS.forEach((h, i) => ins.run(h[0], h[1], h[2], h[3], SAR(h[4]), h[5], h[6],
        J(HOTEL_AMENITIES.filter((_, j) => (i + j) % 3 !== 0 || j < 2)), h[7], h[8]));
    }
    if (!has('visas')) {
      const ins = db.prepare(`INSERT INTO visas (country_en, country_ar, type_en, type_ar, processing_days, price, requirements, flag)
        VALUES (?,?,?,?,?,?,?,?)`);
      for (const v of VISAS) ins.run(v[0], v[1], v[2], v[3], v[4], SAR(v[5]), J(VISA_REQS), v[6]);
    }
    if (!has('promo_codes')) {
      const ins = db.prepare('INSERT INTO promo_codes (code, kind, value, min_amount, max_discount, max_uses, expires_at) VALUES (?,?,?,?,?,?,?)');
      ins.run('WELCOME10', 'percent', 10, SAR(1000), SAR(500), null, null);
      ins.run('EZHAR250', 'fixed', SAR(250), SAR(3000), null, 500, null);
      ins.run('YOMWATANI96', 'percent', 15, SAR(2000), SAR(1000), 1000, '2026-10-15');
    }
    if (!has('reviews')) {
      const ins = db.prepare('INSERT INTO reviews (package_id, name, rating, comment, approved) SELECT id, ?, ?, ?, 1 FROM packages WHERE slug = ?');
      for (const r of REVIEWS) ins.run(r[1], r[2], r[3], r[0]);
    }
    if (dbm.getSetting(db, 'payment_limits') == null) {
      // Customer-facing BNPL eligibility caps; the provider still makes the final decision.
      dbm.setSetting(db, 'payment_limits', { tabby: { min: SAR(100), max: SAR(20000) }, tamara: { min: SAR(100), max: SAR(20000) } });
    }
    if (dbm.getSetting(db, 'flight_fees') == null) {
      dbm.setSetting(db, 'flight_fees', { perPassenger: SAR(25) }); // agency service fee per ticket (VAT 15%)
    }
    if (dbm.getSetting(db, 'bank_transfer') == null) {
      // Offered at checkout once real bank details are entered in Back-office → Settings.
      dbm.setSetting(db, 'bank_transfer', { enabled: false, bank: '', accountName: config.company.nameEn, iban: '' });
    }
  });

  const { email, password } = config.admin;
  if (password && !db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    db.prepare("INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'admin')")
      .run('Ezhar Admin', email, config.company.phone, hashPassword(password));
    console.log(`[seed] Admin account created: ${email}`);
  }
}

module.exports = { seed };

if (require.main === module) {
  const db = dbm.open();
  seed(db, { reset: process.argv.includes('--reset') });
  console.log('[seed] Done.');
}
