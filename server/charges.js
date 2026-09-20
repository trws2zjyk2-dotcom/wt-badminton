/** 服务端自动扣费（不依赖浏览器是否打开） */

const COURTS = [
  ...Array.from({ length: 9 }, (_, i) => ({ id: `A${i + 1}`, name: `A${i + 1}号场` })),
  { id: 'VIP1', name: 'VIP1号场' },
  { id: 'VIP2', name: 'VIP2号场' },
  ...Array.from({ length: 5 }, (_, i) => ({ id: `B${i + 1}`, name: `B${i + 1}号场` })),
];

const TZ_OFFSET = '+08:00';

function getBookingSpan(booking) {
  return booking?.spanHours || 1;
}

function normalizeHour(hour) {
  const n = Number(hour);
  return Number.isFinite(n) ? n : null;
}

function getSlotEndTime(dateStr, startHour) {
  const h = normalizeHour(startHour);
  if (h == null) return new Date(NaN);
  return new Date(`${dateStr}T${String(h + 1).padStart(2, '0')}:00:00${TZ_OFFSET}`);
}

function isBookingEnded(booking) {
  const start = normalizeHour(booking.startHour);
  const span = getBookingSpan(booking);
  if (start == null) return false;
  const end = getSlotEndTime(booking.date, start + span - 1);
  return Number.isFinite(end.getTime()) && Date.now() >= end.getTime();
}

function getBookingKey(date, courtId, startHour) {
  return `${date}|${courtId}|${startHour}`;
}

function slotRangeLabel(startHour, spanHours = 1) {
  if (spanHours <= 1) {
    const end = startHour + 1;
    return `${String(startHour).padStart(2, '0')}:00-${String(end).padStart(2, '0')}:00`;
  }
  const end = startHour + spanHours;
  return `${String(startHour).padStart(2, '0')}:00-${String(end).padStart(2, '0')}:00`;
}

function formatBookingLedgerItem(booking, court, prefix = '订场') {
  const slot = slotRangeLabel(booking.startHour, getBookingSpan(booking));
  const base = `${prefix} ${booking.date} ${court?.name || booking.courtId} ${slot}`;
  const note = booking.note?.trim();
  return note ? `${base}（${note}）` : base;
}

function normalizeBookings(data) {
  if (!Array.isArray(data.bookings)) data.bookings = [];
  data.bookings.forEach((b) => {
    if (b.type == null) b.type = 'member';
    if (b.charged == null) {
      b.charged = b.type === 'walkin' || b.type === 'online';
      if (b.charged && !b.chargedAt) b.chargedAt = b.lockedAt;
    }
    if (b.startHour != null) b.startHour = Number(b.startHour);
    if (!b.spanHours) b.spanHours = 1;
    else b.spanHours = Number(b.spanHours) || 1;
    if (b.price != null) b.price = Number(b.price);
  });
}

function needsChargeRepair(data, booking) {
  if (booking.type !== 'member' || !isBookingEnded(booking)) return false;
  if (!booking.charged) return true;
  if (!booking.ledgerId) return true;
  const member = data.members.find((m) => m.id === booking.memberId);
  if (!member) return true;
  return !member.ledger?.some((l) => l.id === booking.ledgerId);
}

function applyChargeToBooking(data, booking) {
  if (booking.type !== 'member' || !isBookingEnded(booking)) return false;
  if (booking.charged && !needsChargeRepair(data, booking)) return false;

  if (booking.charged) {
    booking.charged = false;
    booking.chargedAt = null;
    booking.ledgerId = null;
  }

  const now = new Date().toISOString();
  const member = data.members.find((m) => m.id === booking.memberId);
  const court = COURTS.find((c) => c.id === booking.courtId);

  if (!member) {
    return false;
  }

  const item = formatBookingLedgerItem(booking, court);
  const ledgerEntry = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    type: 'consume',
    time: now,
    item,
    amount: booking.price,
    bookingRef: getBookingKey(booking.date, booking.courtId, booking.startHour),
  };

  member.balance = Math.round((member.balance - booking.price) * 100) / 100;
  if (!Array.isArray(member.ledger)) member.ledger = [];
  member.ledger.unshift(ledgerEntry);

  booking.charged = true;
  booking.chargedAt = now;
  booking.ledgerId = ledgerEntry.id;
  return true;
}

function processDueCharges(data) {
  if (!data || typeof data !== 'object') return 0;
  normalizeBookings(data);
  let count = 0;
  for (const booking of data.bookings) {
    if (applyChargeToBooking(data, booking)) count++;
  }
  return count;
}

module.exports = { processDueCharges, isBookingEnded };
