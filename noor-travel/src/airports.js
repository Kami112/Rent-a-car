'use strict';
// Airports offered in search/autocomplete. [code, city EN, city AR, airport name, country ISO2, lat, lon, IANA tz]
const RAW = [
  ['RUH', 'Riyadh', 'الرياض', 'King Khalid International', 'SA', 24.96, 46.70, 'Asia/Riyadh'],
  ['JED', 'Jeddah', 'جدة', 'King Abdulaziz International', 'SA', 21.68, 39.16, 'Asia/Riyadh'],
  ['MED', 'Madinah', 'المدينة المنورة', 'Prince Mohammad bin Abdulaziz', 'SA', 24.55, 39.70, 'Asia/Riyadh'],
  ['DMM', 'Dammam', 'الدمام', 'King Fahd International', 'SA', 26.47, 49.80, 'Asia/Riyadh'],
  ['AHB', 'Abha', 'أبها', 'Abha International', 'SA', 18.24, 42.66, 'Asia/Riyadh'],
  ['ULH', 'AlUla', 'العلا', 'AlUla International', 'SA', 26.48, 38.12, 'Asia/Riyadh'],
  ['TIF', 'Taif', 'الطائف', 'Taif International', 'SA', 21.48, 40.54, 'Asia/Riyadh'],
  ['TUU', 'Tabuk', 'تبوك', 'Prince Sultan bin Abdulaziz', 'SA', 28.37, 36.62, 'Asia/Riyadh'],
  ['GIZ', 'Jazan', 'جازان', 'King Abdullah bin Abdulaziz', 'SA', 16.90, 42.59, 'Asia/Riyadh'],
  ['ELQ', 'Qassim', 'القصيم', 'Prince Nayef bin Abdulaziz', 'SA', 26.30, 43.77, 'Asia/Riyadh'],
  ['HAS', 'Hail', 'حائل', 'Hail International', 'SA', 27.44, 41.69, 'Asia/Riyadh'],
  ['AJF', 'Al Jouf', 'الجوف', 'Al Jouf Airport', 'SA', 29.79, 40.10, 'Asia/Riyadh'],
  ['EAM', 'Najran', 'نجران', 'Najran Domestic', 'SA', 17.61, 44.42, 'Asia/Riyadh'],
  ['YNB', 'Yanbu', 'ينبع', 'Prince Abdul Mohsin bin Abdulaziz', 'SA', 24.14, 38.06, 'Asia/Riyadh'],
  ['NUM', 'NEOM', 'نيوم', 'NEOM Bay Airport', 'SA', 27.93, 35.29, 'Asia/Riyadh'],
  ['DXB', 'Dubai', 'دبي', 'Dubai International', 'AE', 25.25, 55.36, 'Asia/Dubai'],
  ['AUH', 'Abu Dhabi', 'أبوظبي', 'Zayed International', 'AE', 24.43, 54.65, 'Asia/Dubai'],
  ['SHJ', 'Sharjah', 'الشارقة', 'Sharjah International', 'AE', 25.33, 55.52, 'Asia/Dubai'],
  ['DOH', 'Doha', 'الدوحة', 'Hamad International', 'QA', 25.27, 51.61, 'Asia/Qatar'],
  ['BAH', 'Bahrain', 'البحرين', 'Bahrain International', 'BH', 26.27, 50.63, 'Asia/Bahrain'],
  ['KWI', 'Kuwait', 'الكويت', 'Kuwait International', 'KW', 29.24, 47.97, 'Asia/Kuwait'],
  ['MCT', 'Muscat', 'مسقط', 'Muscat International', 'OM', 23.59, 58.28, 'Asia/Muscat'],
  ['CAI', 'Cairo', 'القاهرة', 'Cairo International', 'EG', 30.12, 31.41, 'Africa/Cairo'],
  ['HBE', 'Alexandria', 'الإسكندرية', 'Borg El Arab', 'EG', 30.92, 29.70, 'Africa/Cairo'],
  ['SSH', 'Sharm El Sheikh', 'شرم الشيخ', 'Sharm El Sheikh International', 'EG', 27.98, 34.39, 'Africa/Cairo'],
  ['AMM', 'Amman', 'عمّان', 'Queen Alia International', 'JO', 31.72, 35.99, 'Asia/Amman'],
  ['BEY', 'Beirut', 'بيروت', 'Rafic Hariri International', 'LB', 33.82, 35.49, 'Asia/Beirut'],
  ['IST', 'Istanbul', 'إسطنبول', 'Istanbul Airport', 'TR', 41.26, 28.74, 'Europe/Istanbul'],
  ['SAW', 'Istanbul', 'إسطنبول', 'Sabiha Gökçen', 'TR', 40.90, 29.31, 'Europe/Istanbul'],
  ['AYT', 'Antalya', 'أنطاليا', 'Antalya Airport', 'TR', 36.90, 30.80, 'Europe/Istanbul'],
  ['TZX', 'Trabzon', 'طرابزون', 'Trabzon Airport', 'TR', 40.99, 39.79, 'Europe/Istanbul'],
  ['GYD', 'Baku', 'باكو', 'Heydar Aliyev International', 'AZ', 40.47, 50.05, 'Asia/Baku'],
  ['TBS', 'Tbilisi', 'تبليسي', 'Tbilisi International', 'GE', 41.67, 44.95, 'Asia/Tbilisi'],
  ['CMN', 'Casablanca', 'الدار البيضاء', 'Mohammed V International', 'MA', 33.37, -7.59, 'Africa/Casablanca'],
  ['TUN', 'Tunis', 'تونس', 'Tunis–Carthage', 'TN', 36.85, 10.23, 'Africa/Tunis'],
  ['KRT', 'Khartoum', 'الخرطوم', 'Khartoum International', 'SD', 15.59, 32.55, 'Africa/Khartoum'],
  ['ADD', 'Addis Ababa', 'أديس أبابا', 'Bole International', 'ET', 8.98, 38.80, 'Africa/Addis_Ababa'],
  ['NBO', 'Nairobi', 'نيروبي', 'Jomo Kenyatta International', 'KE', -1.32, 36.93, 'Africa/Nairobi'],
  ['LHR', 'London', 'لندن', 'Heathrow', 'GB', 51.47, -0.45, 'Europe/London'],
  ['MAN', 'Manchester', 'مانشستر', 'Manchester Airport', 'GB', 53.35, -2.27, 'Europe/London'],
  ['CDG', 'Paris', 'باريس', 'Charles de Gaulle', 'FR', 49.01, 2.55, 'Europe/Paris'],
  ['FRA', 'Frankfurt', 'فرانكفورت', 'Frankfurt Airport', 'DE', 50.04, 8.56, 'Europe/Berlin'],
  ['MUC', 'Munich', 'ميونخ', 'Munich Airport', 'DE', 48.35, 11.79, 'Europe/Berlin'],
  ['ZRH', 'Zurich', 'زيورخ', 'Zurich Airport', 'CH', 47.46, 8.55, 'Europe/Zurich'],
  ['GVA', 'Geneva', 'جنيف', 'Geneva Airport', 'CH', 46.24, 6.11, 'Europe/Zurich'],
  ['VIE', 'Vienna', 'فيينا', 'Vienna International', 'AT', 48.11, 16.57, 'Europe/Vienna'],
  ['MXP', 'Milan', 'ميلانو', 'Malpensa', 'IT', 45.63, 8.72, 'Europe/Rome'],
  ['FCO', 'Rome', 'روما', 'Fiumicino', 'IT', 41.80, 12.25, 'Europe/Rome'],
  ['MAD', 'Madrid', 'مدريد', 'Adolfo Suárez Madrid–Barajas', 'ES', 40.49, -3.57, 'Europe/Madrid'],
  ['BCN', 'Barcelona', 'برشلونة', 'El Prat', 'ES', 41.30, 2.08, 'Europe/Madrid'],
  ['AMS', 'Amsterdam', 'أمستردام', 'Schiphol', 'NL', 52.31, 4.76, 'Europe/Amsterdam'],
  ['ATH', 'Athens', 'أثينا', 'Athens International', 'GR', 37.94, 23.94, 'Europe/Athens'],
  ['SJJ', 'Sarajevo', 'سراييفو', 'Sarajevo International', 'BA', 43.82, 18.33, 'Europe/Sarajevo'],
  ['KUL', 'Kuala Lumpur', 'كوالالمبور', 'Kuala Lumpur International', 'MY', 2.75, 101.71, 'Asia/Kuala_Lumpur'],
  ['BKK', 'Bangkok', 'بانكوك', 'Suvarnabhumi', 'TH', 13.69, 100.75, 'Asia/Bangkok'],
  ['HKT', 'Phuket', 'بوكيت', 'Phuket International', 'TH', 8.11, 98.32, 'Asia/Bangkok'],
  ['SIN', 'Singapore', 'سنغافورة', 'Changi', 'SG', 1.36, 103.99, 'Asia/Singapore'],
  ['CGK', 'Jakarta', 'جاكرتا', 'Soekarno–Hatta', 'ID', -6.13, 106.66, 'Asia/Jakarta'],
  ['DPS', 'Bali', 'بالي', 'Ngurah Rai International', 'ID', -8.75, 115.17, 'Asia/Makassar'],
  ['MLE', 'Malé', 'ماليه', 'Velana International', 'MV', 4.19, 73.53, 'Indian/Maldives'],
  ['CMB', 'Colombo', 'كولومبو', 'Bandaranaike International', 'LK', 7.18, 79.88, 'Asia/Colombo'],
  ['DEL', 'Delhi', 'دلهي', 'Indira Gandhi International', 'IN', 28.56, 77.10, 'Asia/Kolkata'],
  ['BOM', 'Mumbai', 'مومباي', 'Chhatrapati Shivaji Maharaj', 'IN', 19.09, 72.87, 'Asia/Kolkata'],
  ['HYD', 'Hyderabad', 'حيدر أباد', 'Rajiv Gandhi International', 'IN', 17.24, 78.43, 'Asia/Kolkata'],
  ['COK', 'Kochi', 'كوتشي', 'Cochin International', 'IN', 10.15, 76.40, 'Asia/Kolkata'],
  ['KHI', 'Karachi', 'كراتشي', 'Jinnah International', 'PK', 24.91, 67.16, 'Asia/Karachi'],
  ['LHE', 'Lahore', 'لاهور', 'Allama Iqbal International', 'PK', 31.52, 74.40, 'Asia/Karachi'],
  ['ISB', 'Islamabad', 'إسلام أباد', 'Islamabad International', 'PK', 33.55, 72.83, 'Asia/Karachi'],
  ['DAC', 'Dhaka', 'دكا', 'Hazrat Shahjalal International', 'BD', 23.84, 90.40, 'Asia/Dhaka'],
  ['MNL', 'Manila', 'مانيلا', 'Ninoy Aquino International', 'PH', 14.51, 121.02, 'Asia/Manila'],
  ['ICN', 'Seoul', 'سيول', 'Incheon International', 'KR', 37.46, 126.44, 'Asia/Seoul'],
  ['NRT', 'Tokyo', 'طوكيو', 'Narita International', 'JP', 35.77, 140.39, 'Asia/Tokyo'],
  ['PEK', 'Beijing', 'بكين', 'Beijing Capital', 'CN', 40.08, 116.58, 'Asia/Shanghai'],
  ['CAN', 'Guangzhou', 'قوانغتشو', 'Baiyun International', 'CN', 23.39, 113.30, 'Asia/Shanghai'],
  ['JFK', 'New York', 'نيويورك', 'John F. Kennedy International', 'US', 40.64, -73.78, 'America/New_York'],
  ['IAD', 'Washington', 'واشنطن', 'Dulles International', 'US', 38.95, -77.46, 'America/New_York'],
  ['ORD', 'Chicago', 'شيكاغو', "O'Hare International", 'US', 41.98, -87.90, 'America/Chicago'],
  ['LAX', 'Los Angeles', 'لوس أنجلوس', 'Los Angeles International', 'US', 33.94, -118.41, 'America/Los_Angeles'],
  ['YYZ', 'Toronto', 'تورونتو', 'Pearson International', 'CA', 43.68, -79.63, 'America/Toronto'],
];

const COUNTRIES = {
  SA: ['Saudi Arabia', 'السعودية'], AE: ['United Arab Emirates', 'الإمارات'], QA: ['Qatar', 'قطر'], BH: ['Bahrain', 'البحرين'],
  KW: ['Kuwait', 'الكويت'], OM: ['Oman', 'عُمان'], EG: ['Egypt', 'مصر'], JO: ['Jordan', 'الأردن'], LB: ['Lebanon', 'لبنان'],
  TR: ['Türkiye', 'تركيا'], AZ: ['Azerbaijan', 'أذربيجان'], GE: ['Georgia', 'جورجيا'], MA: ['Morocco', 'المغرب'], TN: ['Tunisia', 'تونس'],
  SD: ['Sudan', 'السودان'], ET: ['Ethiopia', 'إثيوبيا'], KE: ['Kenya', 'كينيا'], GB: ['United Kingdom', 'المملكة المتحدة'],
  FR: ['France', 'فرنسا'], DE: ['Germany', 'ألمانيا'], CH: ['Switzerland', 'سويسرا'], AT: ['Austria', 'النمسا'], IT: ['Italy', 'إيطاليا'],
  ES: ['Spain', 'إسبانيا'], NL: ['Netherlands', 'هولندا'], GR: ['Greece', 'اليونان'], BA: ['Bosnia', 'البوسنة'], MY: ['Malaysia', 'ماليزيا'],
  TH: ['Thailand', 'تايلاند'], SG: ['Singapore', 'سنغافورة'], ID: ['Indonesia', 'إندونيسيا'], MV: ['Maldives', 'المالديف'],
  LK: ['Sri Lanka', 'سريلانكا'], IN: ['India', 'الهند'], PK: ['Pakistan', 'باكستان'], BD: ['Bangladesh', 'بنغلاديش'],
  PH: ['Philippines', 'الفلبين'], KR: ['South Korea', 'كوريا الجنوبية'], JP: ['Japan', 'اليابان'], CN: ['China', 'الصين'],
  US: ['United States', 'الولايات المتحدة'], CA: ['Canada', 'كندا'],
  YE: ['Yemen', 'اليمن'], SY: ['Syria', 'سوريا'], IQ: ['Iraq', 'العراق'], PS: ['Palestine', 'فلسطين'], SO: ['Somalia', 'الصومال'],
  ER: ['Eritrea', 'إريتريا'], DZ: ['Algeria', 'الجزائر'], LY: ['Libya', 'ليبيا'], MR: ['Mauritania', 'موريتانيا'], NG: ['Nigeria', 'نيجيريا'],
  AF: ['Afghanistan', 'أفغانستان'], NP: ['Nepal', 'نيبال'], IR: ['Iran', 'إيران'], UZ: ['Uzbekistan', 'أوزبكستان'], KZ: ['Kazakhstan', 'كازاخستان'],
  AU: ['Australia', 'أستراليا'], IE: ['Ireland', 'أيرلندا'], BE: ['Belgium', 'بلجيكا'], SE: ['Sweden', 'السويد'], RU: ['Russia', 'روسيا'],
  ZA: ['South Africa', 'جنوب أفريقيا'], BN: ['Brunei', 'بروناي'],
};

const AIRPORTS = Object.fromEntries(RAW.map(([code, en, ar, name, country, lat, lon, tz]) => [code, {
  code, en, ar, name, country, countryName: { en: COUNTRIES[country]?.[0] || country, ar: COUNTRIES[country]?.[1] || country }, lat, lon, tz,
}]));

function distanceKm(a, b) {
  const A = AIRPORTS[a]; const B = AIRPORTS[b];
  const r = Math.PI / 180;
  const h = Math.sin(((B.lat - A.lat) * r) / 2) ** 2 + Math.cos(A.lat * r) * Math.cos(B.lat * r) * Math.sin(((B.lon - A.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Offset of an IANA zone from UTC, in minutes, at a given instant. */
function tzOffsetMin(tz, date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return Math.round((asUtc - Math.floor(date.getTime() / 60000) * 60000) / 60000);
}

function search(q, lang = 'en') {
  const s = String(q || '').trim().toLowerCase();
  const all = Object.values(AIRPORTS);
  if (!s) return all.filter((a) => ['RUH', 'JED', 'MED', 'DMM', 'DXB', 'CAI', 'IST', 'LHR', 'KUL', 'MLE'].includes(a.code));
  const score = (a) => {
    if (a.code.toLowerCase() === s) return 0;
    if (a.en.toLowerCase().startsWith(s) || a.ar.startsWith(q.trim())) return 1;
    if (a.countryName.en.toLowerCase().startsWith(s) || a.countryName.ar.startsWith(q.trim())) return 2;
    if (a.name.toLowerCase().includes(s) || a.en.toLowerCase().includes(s) || a.ar.includes(q.trim())) return 3;
    return 9;
  };
  void lang;
  return all.map((a) => [score(a), a]).filter(([n]) => n < 9).sort((x, y) => x[0] - y[0]).slice(0, 8).map(([, a]) => a);
}

module.exports = { AIRPORTS, COUNTRIES, distanceKm, tzOffsetMin, search };
