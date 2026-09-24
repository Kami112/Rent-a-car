'use strict';
// Airline ticketing lifecycle for flight bookings.
//   pending  → paid but not yet ticketed        held   → seats reserved at the airline (PNR), awaiting payment
//   issued   → e-tickets issued                  manual → staff must issue in their GDS / airline portal
//   failed   → automatic issue failed (fare expired / price changed) — staff action required

const dbm = require('./db');
const notify = require('./notify');
const duffel = require('./flights-duffel');
const flights = require('./flights');

const travelersOf = (b) => JSON.parse(b.travelers || '[]');
const get = (db, id) => db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);

function save(db, id, fields) {
  const keys = Object.keys(fields);
  db.prepare(`UPDATE bookings SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`)
    .run(...keys.map((k) => (k === 'tickets' ? JSON.stringify(fields[k]) : fields[k])), id);
}

/** Called right after a flight booking is created. Reserves seats when the fare allows holds. */
async function onCreated(db, booking) {
  if (booking.type !== 'flight') return;
  if (!booking.item_id.startsWith('off_') || !duffel.isConfigured()) {
    save(db, booking.id, { ticket_status: 'pending' });
    return;
  }
  save(db, booking.id, { ticket_status: 'pending' });
  try {
    const offer = await flights.getOffer(db, booking.item_id);
    if (!offer.holdable) return;
    const order = await duffel.createOrder(offer, booking, travelersOf(booking), { hold: true });
    save(db, booking.id, { ticket_status: 'held', pnr: order.pnr, provider_order_id: order.orderId });
    dbm.logActivity(db, { bookingId: booking.id, action: 'ticket.held', detail: `PNR ${order.pnr}` });
  } catch (err) {
    dbm.logActivity(db, { bookingId: booking.id, action: 'ticket.hold_failed', detail: err.message });
  }
}

/** Called once a flight booking is fully paid. Never throws. */
async function issue(db, bookingId, { userId = null } = {}) {
  const b = get(db, bookingId);
  if (!b || b.type !== 'flight' || b.ticket_status === 'issued') return b;
  if (!b.item_id.startsWith('off_') || !duffel.isConfigured()) {
    save(db, b.id, { ticket_status: 'manual' });
    dbm.logActivity(db, { bookingId: b.id, action: 'ticket.manual_required', detail: 'Issue in GDS / airline portal, then record PNR & ticket numbers.' });
    return get(db, b.id);
  }
  try {
    let order;
    if (b.provider_order_id && b.ticket_status === 'held') {
      order = await duffel.payHeldOrder(b.provider_order_id);
    } else {
      const offer = await flights.getOffer(db, b.item_id);
      order = await duffel.createOrder(offer, b, travelersOf(b));
    }
    save(db, b.id, { ticket_status: 'issued', pnr: order.pnr, tickets: order.tickets, provider_order_id: order.orderId });
    dbm.logActivity(db, { userId, bookingId: b.id, action: 'ticket.issued', detail: `PNR ${order.pnr} ${order.tickets.join(', ')}` });
    notify.ticketsIssued(db, get(db, b.id));
  } catch (err) {
    save(db, b.id, { ticket_status: 'failed' });
    dbm.logActivity(db, { userId, bookingId: b.id, action: 'ticket.failed', detail: err.message });
    console.error('[ticketing]', b.ref, err.message);
  }
  return get(db, b.id);
}

/** Staff recorded tickets issued outside the system (GDS, airline portal). */
function recordManual(db, b, { pnr, tickets }, userId) {
  const list = String(tickets || '').split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
  const cleanPnr = String(pnr || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{5,8}$/.test(cleanPnr)) throw new (require('./errors').AppError)('PNR must be 5–8 letters/numbers.');
  save(db, b.id, { ticket_status: 'issued', pnr: cleanPnr, tickets: list });
  dbm.logActivity(db, { userId, bookingId: b.id, action: 'ticket.recorded', detail: `PNR ${cleanPnr} ${list.join(', ')}` });
  const fresh = get(db, b.id);
  notify.ticketsIssued(db, fresh);
  return fresh;
}

module.exports = { onCreated, issue, recordManual };
