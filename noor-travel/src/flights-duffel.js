'use strict';
// Duffel Flights API (https://duffel.com/docs/api). Test tokens start with
// "duffel_test_" and book on the fictional "Duffel Airways" (ZZ) — no money moves.
// Live tokens search 300+ airlines and issue real e-tickets, paid from the
// agency's Duffel balance.

const config = require('./config');
const { request } = require('./payments/http');
const { AppError } = require('./errors');
const { AIRPORTS } = require('./airports');

const BASE = 'https://api.duffel.com';
const isConfigured = () => Boolean(config.duffel.accessToken);
const headers = () => ({ Authorization: `Bearer ${config.duffel.accessToken}`, 'Duffel-Version': 'v2' });
const countries = new Map(); // IATA code → country, learned from responses

const countryOf = (code) => countries.get(code) || null;

/** Provider amount (string, any currency) → SAR halalas using configured FX rates. */
function toSar(amount, currency) {
  const rate = config.fxRates[currency];
  if (!rate) throw new AppError(`No exchange rate configured for ${currency}.`, { status: 502 });
  return Math.ceil(Number(amount) * rate * 100);
}

function minutes(iso) {
  const m = String(iso || '').match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  return m ? (Number(m[1] || 0) * 1440) + (Number(m[2] || 0) * 60) + Number(m[3] || 0) : 0;
}

const diffMin = (a, b) => Math.round((Date.parse(`${b}Z`) - Date.parse(`${a}Z`)) / 60000);

function mapOffer(o) {
  const pax = { adults: 0, children: 0, infants: 0 };
  for (const p of o.passengers || []) {
    if (p.type === 'adult' || (p.age ?? 99) >= 12) pax.adults++;
    else if (p.type === 'infant_without_seat' || (p.age ?? 99) < 2) pax.infants++;
    else pax.children++;
  }
  const slices = o.slices.map((s) => {
    const segments = s.segments.map((g) => {
      for (const place of [g.origin, g.destination]) if (place?.iata_country_code) countries.set(place.iata_code, place.iata_country_code);
      return {
        carrierCode: g.marketing_carrier?.iata_code, carrierName: g.marketing_carrier?.name,
        operatedBy: g.operating_carrier?.name !== g.marketing_carrier?.name ? g.operating_carrier?.name : null,
        flightNo: `${g.marketing_carrier?.iata_code} ${g.marketing_carrier_flight_number}`,
        origin: g.origin.iata_code, destination: g.destination.iata_code,
        originCity: g.origin.city_name || g.origin.name, destinationCity: g.destination.city_name || g.destination.name,
        departAt: g.departing_at.slice(0, 16), arriveAt: g.arriving_at.slice(0, 16),
        durationMin: minutes(g.duration), aircraft: g.aircraft?.name || null,
      };
    });
    const layovers = segments.slice(1).map((g, i) => ({
      airport: g.origin, city: g.originCity, cityAr: AIRPORTS[g.origin]?.ar || g.originCity, durationMin: diffMin(segments[i].arriveAt, g.departAt),
    }));
    return {
      origin: segments[0].origin, destination: segments[segments.length - 1].destination,
      departAt: segments[0].departAt, arriveAt: segments[segments.length - 1].arriveAt,
      durationMin: minutes(s.duration) || diffMin(segments[0].departAt, segments[segments.length - 1].arriveAt),
      stops: segments.length - 1, segments, layovers,
    };
  });
  const bags = o.slices[0]?.segments[0]?.passengers?.[0]?.baggages || [];
  const total = toSar(o.total_amount, o.total_currency);
  const perAdult = Math.round(total / Math.max(1, pax.adults + pax.children * 0.75 + pax.infants * 0.1));
  return {
    id: o.id,
    provider: 'duffel',
    expiresAt: o.expires_at,
    owner: { code: o.owner?.iata_code, name: o.owner?.name, logo: o.owner?.logo_symbol_url || null },
    cabin: o.slices[0]?.segments[0]?.passengers?.[0]?.cabin_class || 'economy',
    slices,
    total,
    perAdult,
    taxes: o.tax_amount ? toSar(o.tax_amount, o.tax_currency || o.total_currency) : null,
    currency: 'SAR',
    providerAmount: o.total_amount,
    providerCurrency: o.total_currency,
    baggage: {
      checked: bags.filter((b) => b.type === 'checked').reduce((n, b) => n + (b.quantity || 0), 0),
      cabin: bags.filter((b) => b.type === 'carry_on').reduce((n, b) => n + (b.quantity || 0), 0),
    },
    refundable: Boolean(o.conditions?.refund_before_departure?.allowed),
    changeable: Boolean(o.conditions?.change_before_departure?.allowed),
    holdable: o.payment_requirements ? !o.payment_requirements.requires_instant_payment : false,
    passengers: (o.passengers || []).map((p) => ({ id: p.id, type: p.type, age: p.age })),
    pax,
  };
}

async function search({ from, to, date, returnDate, cabin, pax }) {
  const passengers = [
    ...Array(pax.adults).fill({ type: 'adult' }),
    ...Array(pax.children).fill({ age: 8 }),
    ...Array(pax.infants).fill({ age: 1 }),
  ];
  const slices = [{ origin: from, destination: to, departure_date: date }];
  if (returnDate) slices.push({ origin: to, destination: from, departure_date: returnDate });
  const res = await request('duffel', `${BASE}/air/offer_requests?return_offers=true&supplier_timeout=20000`, {
    method: 'POST', headers: headers(),
    body: { data: { slices, passengers, cabin_class: cabin, max_connections: 1 } },
  });
  const offers = (res.data?.offers || []).slice(0, 200);
  return offers.map((o) => { try { return mapOffer(o); } catch { return null; } }).filter(Boolean);
}

async function getOffer(id) {
  try {
    const res = await request('duffel', `${BASE}/air/offers/${encodeURIComponent(id)}`, { headers: headers() });
    return mapOffer(res.data);
  } catch (err) {
    if (err.httpStatus === 404 || err.httpStatus === 422) return null;
    throw err;
  }
}

async function places(query) {
  if (!isConfigured() || String(query).trim().length < 2) return [];
  const res = await request('duffel', `${BASE}/places/suggestions?query=${encodeURIComponent(query)}`, { headers: headers() });
  return (res.data || []).filter((p) => p.type === 'airport' && p.iata_code).slice(0, 6).map((p) => ({
    code: p.iata_code, en: p.city_name || p.name, ar: AIRPORTS[p.iata_code]?.ar || p.city_name || p.name, name: p.name,
    country: p.iata_country_code, countryName: { en: p.iata_country_code, ar: p.iata_country_code },
  }));
}

/** Map our travellers onto the offer's passenger ids (adults, then children, then infants). */
function passengersFor(offer, booking, travelers) {
  const byType = { adult: [], child: [], infant: [] };
  for (const p of offer.passengers) {
    const t = p.type === 'adult' || (p.age ?? 99) >= 12 ? 'adult' : p.type === 'infant_without_seat' || (p.age ?? 99) < 2 ? 'infant' : 'child';
    byType[t].push(p.id);
  }
  const out = [];
  const used = { adult: 0, child: 0, infant: 0 };
  const infantsForAdults = [];
  for (const t of travelers) {
    const id = byType[t.type]?.[used[t.type]++];
    if (!id) throw new AppError('Traveller details do not match the fare.', { status: 409 });
    const person = {
      id, title: t.title === 'mr' ? 'mr' : t.title === 'mrs' ? 'mrs' : 'ms',
      gender: t.gender === 'f' ? 'f' : 'm', given_name: t.firstName, family_name: t.lastName, born_on: t.dob,
      email: booking.contact_email, phone_number: booking.contact_phone,
    };
    if (t.passport) {
      person.identity_documents = [{
        type: 'passport', unique_identifier: t.passport, issuing_country_code: t.nationality || 'SA', expires_on: t.passportExpiry,
      }];
    }
    if (t.type === 'infant') infantsForAdults.push(id);
    out.push(person);
  }
  // Each infant is linked to a responsible adult.
  out.filter((p) => byType.adult.includes(p.id)).forEach((a, i) => { if (infantsForAdults[i]) a.infant_passenger_id = infantsForAdults[i]; });
  return out;
}

function mapOrder(o) {
  return {
    orderId: o.id,
    pnr: o.booking_reference,
    tickets: (o.documents || []).filter((d) => d.type === 'electronic_ticket').map((d) => d.unique_identifier),
    awaitingPayment: Boolean(o.payment_status?.awaiting_payment),
    paymentRequiredBy: o.payment_status?.payment_required_by || null,
  };
}

async function createOrder(offer, booking, travelers, { hold = false } = {}) {
  const data = {
    type: hold ? 'hold' : 'instant',
    selected_offers: [offer.id],
    passengers: passengersFor(offer, booking, travelers),
    metadata: { booking_ref: booking.ref },
  };
  if (!hold) data.payments = [{ type: 'balance', currency: offer.providerCurrency, amount: offer.providerAmount }];
  const res = await request('duffel', `${BASE}/air/orders`, { method: 'POST', headers: headers(), body: { data } });
  return mapOrder(res.data);
}

async function payHeldOrder(orderId) {
  const order = await request('duffel', `${BASE}/air/orders/${encodeURIComponent(orderId)}`, { headers: headers() });
  await request('duffel', `${BASE}/air/payments`, {
    method: 'POST', headers: headers(),
    body: { data: { order_id: orderId, payment: { type: 'balance', currency: order.data.total_currency, amount: order.data.total_amount } } },
  });
  const fresh = await request('duffel', `${BASE}/air/orders/${encodeURIComponent(orderId)}`, { headers: headers() });
  return mapOrder(fresh.data);
}

module.exports = { isConfigured, search, getOffer, places, createOrder, payHeldOrder, countryOf, mapOffer, toSar };
