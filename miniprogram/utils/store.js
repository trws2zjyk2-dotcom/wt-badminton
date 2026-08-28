const { COURTS, ALL_HOURS, STORAGE_KEY } = require('./config');
const {
  generateId,
  formatMoney,
  slotLabel,
  isWeekend,
} = require('./util');
const {
  getUnifiedPrice,
  calcMemberBookingPrice,
  getPriceTableLabel,
} = require('./prices');

let data = null;

function migrateData(d) {
  if (!d.holidays) d.holidays = [];
  d.members.forEach((m) => {
    if (!m.priceTable) {
      m.priceTable = 'A';
      delete m.price;
    }
  });
  d.bookings.forEach((b) => {
    if (b.startHour == null && b.slotIndex != null) {
      b.startHour = 8 + b.slotIndex;
      delete b.slotIndex;
    }
    if (b.type == null) b.type = 'member';
    if (b.charged == null) {
      b.charged = b.type === 'walkin' || b.type === 'online';
      if (b.charged && !b.chargedAt) b.chargedAt = b.lockedAt;
    }
  });
}

function loadData() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    if (raw) {
      migrateData(raw);
      return raw;
    }
  } catch (_) {}
  return { members: [], bookings: [], holidays: [] };
}

function saveData() {
  wx.setStorageSync(STORAGE_KEY, data);
}

function getData() {
  if (!data) data = loadData();
  return data;
}

function reloadData() {
  data = loadData();
  return data;
}

function initSampleData() {
  const d = getData();
  if (d.members.length > 0) return;
  [
    { name: '张三', priceTable: 'A', balance: 500 },
    { name: '李四', priceTable: 'B', balance: 300 },
    { name: '王五', priceTable: 'C', balance: 1000 },
    { name: '赵六', priceTable: 'E', balance: 200 },
  ].forEach((s) => addMember(s.name, s.priceTable, s.balance));
}

function isHoliday(dateStr) {
  return getData().holidays.includes(dateStr);
}

function isHolidayForPricing(dateStr) {
  return isHoliday(dateStr);
}

function isWeekendOrHoliday(dateStr) {
  return isWeekend(dateStr) || isHoliday(dateStr);
}

function getOpenHour(dateStr) {
  return isWeekendOrHoliday(dateStr) ? 8 : 9;
}

function getActiveHours(dateStr) {
  const start = getOpenHour(dateStr);
  return ALL_HOURS.filter((h) => h >= start);
}

function getBusinessHoursText(dateStr) {
  const start = getOpenHour(dateStr);
  const type = isHoliday(dateStr) ? '节假日' : isWeekend(dateStr) ? '周末' : '工作日';
  return `${type}营业 ${String(start).padStart(2, '0')}:00-23:00`;
}

function getSlotEndTime(dateStr, startHour) {
  return new Date(`${dateStr}T${String(startHour + 1).padStart(2, '0')}:00:00`);
}

function isSlotEnded(dateStr, startHour) {
  return Date.now() >= getSlotEndTime(dateStr, startHour).getTime();
}

function getMember(id) {
  return getData().members.find((m) => m.id === id);
}

function getBooking(date, courtId, startHour) {
  return getData().bookings.find(
    (b) => b.date === date && b.courtId === courtId && b.startHour === startHour
  );
}

function getBookingKey(date, courtId, startHour) {
  return `${date}|${courtId}|${startHour}`;
}

function findMemberByName(name) {
  const trimmed = (name || '').trim();
  return getData().members.find((m) => m.name === trimmed);
}

function addMember(name, priceTable, balance) {
  const member = {
    id: generateId(),
    name: name.trim(),
    priceTable: priceTable || 'A',
    balance: Number(balance) || 0,
    ledger: [],
    createdAt: new Date().toISOString(),
  };
  if (member.balance > 0) {
    member.ledger.push({
      id: generateId(),
      type: 'recharge',
      time: new Date().toISOString(),
      item: '初始充值',
      amount: member.balance,
    });
  }
  getData().members.push(member);
  saveData();
  return member;
}

function updateMember(id, name, priceTable) {
  const m = getMember(id);
  if (!m) return;
  m.name = name.trim();
  m.priceTable = priceTable || 'A';
  saveData();
}

function deleteMember(id) {
  const hasBooking = getData().bookings.some((b) => b.memberId === id);
  if (hasBooking) return { ok: false, msg: '该会员有未取消的订场记录，无法删除' };
  getData().members = getData().members.filter((m) => m.id !== id);
  saveData();
  return { ok: true };
}

function rechargeMember(id, amount, item, bonus = 0) {
  const m = getMember(id);
  if (!m) return false;
  const paid = Number(amount);
  const gift = Number(bonus) || 0;
  if (!paid || paid < 1) return false;
  m.balance += paid + gift;
  m.ledger.unshift({
    id: generateId(),
    type: 'recharge',
    time: new Date().toISOString(),
    item: item || '储值卡充值',
    amount: paid,
  });
  if (gift > 0) {
    m.ledger.unshift({
      id: generateId(),
      type: 'recharge',
      time: new Date().toISOString(),
      item: '充值赠送',
      amount: gift,
    });
  }
  saveData();
  return true;
}

function deleteLedgerEntry(memberId, ledgerId) {
  const m = getMember(memberId);
  if (!m) return { ok: false, msg: '会员不存在' };
  const entry = m.ledger.find((l) => l.id === ledgerId);
  if (!entry) return { ok: false, msg: '记录不存在' };

  if (entry.type === 'consume') {
    m.balance += entry.amount;
    if (entry.bookingRef) {
      const booking = getData().bookings.find(
        (b) => getBookingKey(b.date, b.courtId, b.startHour) === entry.bookingRef
      );
      if (booking) {
        booking.charged = false;
        booking.chargedAt = null;
        booking.ledgerId = null;
      }
    }
  } else {
    m.balance -= entry.amount;
  }

  m.ledger = m.ledger.filter((l) => l.id !== ledgerId);
  saveData();
  return { ok: true };
}

function lockMemberBooking(date, courtId, startHour, memberId) {
  const member = getMember(memberId);
  if (!member) return { ok: false, msg: '会员不存在' };
  if (getBooking(date, courtId, startHour)) return { ok: false, msg: '该时段已被锁定' };

  const pricing = calcMemberBookingPrice(member, courtId, date, startHour, isHolidayForPricing);
  if (!pricing || pricing.final == null) {
    return { ok: false, msg: '无法获取该时段价格，请检查营业时间' };
  }

  getData().bookings.push({
    id: generateId(),
    type: 'member',
    date,
    courtId,
    startHour,
    memberId,
    memberName: member.name,
    price: pricing.final,
    memberPrice: pricing.memberPrice,
    unifiedPrice: pricing.unifiedPrice,
    priceSource: pricing.source,
    priceTable: member.priceTable,
    lockedAt: new Date().toISOString(),
    charged: false,
    chargedAt: null,
    ledgerId: null,
  });

  saveData();
  const sourceText =
    pricing.source === 'member'
      ? '会员价更低'
      : pricing.source === 'unified'
        ? '统一价更低'
        : '会员价与统一价相同';
  return {
    ok: true,
    msg: `已锁定，${slotLabel(startHour)} 结束后扣费 ${formatMoney(pricing.final)}（${sourceText}）`,
  };
}

function lockWalkinBooking(date, courtId, startHour, price, payment) {
  if (getBooking(date, courtId, startHour)) return { ok: false, msg: '该时段已被锁定' };

  const paymentLabel = payment === 'cash' ? '现金' : '扫码';
  const now = new Date().toISOString();

  getData().bookings.push({
    id: generateId(),
    type: 'walkin',
    date,
    courtId,
    startHour,
    memberId: null,
    memberName: `现场（${paymentLabel}）`,
    walkinPayment: payment,
    price: Number(price),
    lockedAt: now,
    charged: true,
    chargedAt: now,
    ledgerId: null,
  });

  saveData();
  return { ok: true, msg: `现场订场已锁定（${paymentLabel} ${formatMoney(price)}）` };
}

function lockOnlineBooking(date, courtId, startHour, price) {
  if (getBooking(date, courtId, startHour)) return { ok: false, msg: '该时段已被锁定' };

  const now = new Date().toISOString();

  getData().bookings.push({
    id: generateId(),
    type: 'online',
    date,
    courtId,
    startHour,
    memberId: null,
    memberName: '线上平台',
    price: Number(price),
    lockedAt: now,
    charged: true,
    chargedAt: now,
    ledgerId: null,
  });

  saveData();
  return { ok: true, msg: `线上平台订场已锁定（${formatMoney(price)}）` };
}

function getBookingTypeLabel(booking) {
  if (booking.type === 'walkin') {
    return `现场订场（${booking.walkinPayment === 'cash' ? '现金' : '扫码'}）`;
  }
  if (booking.type === 'online') return '线上平台订场';
  return '会员订场';
}

function chargeBooking(booking) {
  if (booking.charged || booking.type !== 'member') return null;

  const member = getMember(booking.memberId);
  if (!member) {
    booking.charged = true;
    booking.chargedAt = new Date().toISOString();
    saveData();
    return null;
  }

  const court = COURTS.find((c) => c.id === booking.courtId);
  const item = `订场 ${court.name} ${slotLabel(booking.startHour)}`;
  const now = new Date().toISOString();

  member.balance -= booking.price;
  const ledgerEntry = {
    id: generateId(),
    type: 'consume',
    time: now,
    item,
    amount: booking.price,
    bookingRef: getBookingKey(booking.date, booking.courtId, booking.startHour),
  };
  member.ledger.unshift(ledgerEntry);

  booking.charged = true;
  booking.chargedAt = now;
  booking.ledgerId = ledgerEntry.id;

  saveData();
  return { member, ledgerEntry, booking };
}

function processDueCharges() {
  const receipts = [];
  getData()
    .bookings.filter((b) => b.type === 'member' && !b.charged && isSlotEnded(b.date, b.startHour))
    .forEach((b) => {
      const result = chargeBooking(b);
      if (result) receipts.push(result);
    });
  return receipts;
}

function unlockBooking(date, courtId, startHour) {
  const booking = getBooking(date, courtId, startHour);
  if (!booking) return { ok: false, msg: '订场记录不存在' };

  if (booking.type === 'member' && booking.charged) {
    const member = getMember(booking.memberId);
    if (member) {
      member.balance += booking.price;
      const court = COURTS.find((c) => c.id === booking.courtId);
      member.ledger.unshift({
        id: generateId(),
        type: 'recharge',
        time: new Date().toISOString(),
        item: `取消订场退款 ${court.name} ${slotLabel(booking.startHour)}`,
        amount: booking.price,
      });
      const key = getBookingKey(date, courtId, startHour);
      member.ledger = member.ledger.filter(
        (l) => !(l.type === 'consume' && l.bookingRef === key)
      );
    }
  }

  getData().bookings = getData().bookings.filter((b) => b.id !== booking.id);
  saveData();
  return { ok: true };
}

function toggleHoliday(dateStr, isHol) {
  const d = getData();
  if (isHol) {
    if (!d.holidays.includes(dateStr)) d.holidays.push(dateStr);
  } else {
    d.holidays = d.holidays.filter((x) => x !== dateStr);
  }
  saveData();
}

function buildBookingGrid(date) {
  const activeHours = getActiveHours(date);
  const courts = COURTS.map((court) => {
    const cells = ALL_HOURS.map((h) => {
      const active = activeHours.includes(h);
      if (!active) {
        return { hour: h, status: 'closed', active: false, displayClass: 'closed' };
      }
      const booking = getBooking(date, court.id, h);
      if (booking) {
        let cellClass = 'locked';
        if (booking.type === 'walkin') cellClass = 'walkin';
        if (booking.type === 'online') cellClass = 'online';
        const vipSuffix = court.type === 'vip' ? ' vip-row' : '';
        return {
          hour: h,
          status: 'booked',
          active: true,
          cellClass,
          displayClass: cellClass + vipSuffix,
          booking,
          pending: booking.type === 'member' && !booking.charged,
          memberName: booking.memberName,
          priceText: formatMoney(booking.price),
        };
      }
      const unified = getUnifiedPrice(court.id, date, h, isHolidayForPricing);
      const vipSuffix = court.type === 'vip' ? ' vip-row' : '';
      return {
        hour: h,
        status: 'available',
        active: true,
        displayClass: 'available' + vipSuffix,
        priceHint: unified != null ? `${unified}元` : '',
      };
    });
    return Object.assign({}, court, { cells, isVip: court.type === 'vip' });
  });

  return {
    date,
    activeHours,
    hours: ALL_HOURS.map((h) => {
      const active = activeHours.includes(h);
      return {
        hour: h,
        label: slotLabel(h),
        active,
        colClass: active ? '' : 'closed-col',
      };
    }),
    courts,
    businessHours: getBusinessHoursText(date),
    isHoliday: isHoliday(date),
  };
}

function buildPriceGrid(date) {
  const activeHours = getActiveHours(date);
  const courts = COURTS.map((court) => {
    const cells = ALL_HOURS.map((h) => {
      const active = activeHours.includes(h);
      if (!active) return { hour: h, active: false, text: '—', cellClass: 'closed' };
      const price = getUnifiedPrice(court.id, date, h, isHolidayForPricing);
      return { hour: h, active: true, text: price != null ? `${price}元` : '—', cellClass: '' };
    });
    return Object.assign({}, court, { cells });
  });

  return {
    date,
    hours: ALL_HOURS.map((h) => {
      const active = activeHours.includes(h);
      return {
        hour: h,
        label: slotLabel(h),
        active,
        colClass: active ? '' : 'closed-col',
      };
    }),
    courts,
    businessHours: getBusinessHoursText(date),
    isHoliday: isHoliday(date),
  };
}

function getIncomeStats(date) {
  const dayBookings = getData().bookings.filter((b) => b.date === date && b.charged);
  const memberBookingIncome = dayBookings
    .filter((b) => b.type === 'member')
    .reduce((s, b) => s + b.price, 0);
  const walkinIncome = dayBookings
    .filter((b) => b.type === 'walkin')
    .reduce((s, b) => s + b.price, 0);
  const onlineIncome = dayBookings
    .filter((b) => b.type === 'online')
    .reduce((s, b) => s + b.price, 0);
  const cashWalkin = dayBookings
    .filter((b) => b.type === 'walkin' && b.walkinPayment === 'cash')
    .reduce((s, b) => s + b.price, 0);
  const scanWalkin = dayBookings
    .filter((b) => b.type === 'walkin' && b.walkinPayment === 'scan')
    .reduce((s, b) => s + b.price, 0);

  const dayRecharges = [];
  getData().members.forEach((m) => {
    m.ledger.forEach((l) => {
      if (
        l.type === 'recharge' &&
        l.time.slice(0, 10) === date &&
        !l.item.includes('取消订场退款') &&
        l.item !== '初始充值' &&
        l.item !== '充值赠送'
      ) {
        dayRecharges.push(Object.assign({}, l, { memberName: m.name }));
      }
    });
  });
  const rechargeIncome = dayRecharges.reduce((s, r) => s + r.amount, 0);
  const bookingIncome = memberBookingIncome + walkinIncome + onlineIncome;

  const rows = [];
  dayBookings.forEach((b) => {
    const court = COURTS.find((c) => c.id === b.courtId);
    rows.push({
      time: b.chargedAt || b.lockedAt,
      member: b.memberName,
      court: court.name,
      slot: slotLabel(b.startHour),
      amount: b.price,
      amountText: formatMoney(b.price),
      type: getBookingTypeLabel(b),
    });
  });
  dayRecharges.forEach((r) => {
    rows.push({
      time: r.time,
      member: r.memberName,
      court: '-',
      slot: '-',
      amount: r.amount,
      amountText: formatMoney(r.amount),
      type: '会员充值',
    });
  });
  rows.sort((a, b) => new Date(b.time) - new Date(a.time));

  return {
    summary: {
      memberBookingIncome,
      memberBookingIncomeText: formatMoney(memberBookingIncome),
      cashWalkin,
      cashWalkinText: formatMoney(cashWalkin),
      scanWalkin,
      scanWalkinText: formatMoney(scanWalkin),
      onlineIncome,
      onlineIncomeText: formatMoney(onlineIncome),
      rechargeIncome,
      rechargeIncomeText: formatMoney(rechargeIncome),
      totalIncome: bookingIncome + rechargeIncome,
      totalIncomeText: formatMoney(bookingIncome + rechargeIncome),
      bookingCount: dayBookings.length,
    },
    rows,
  };
}

function buildReceiptText(member, entry) {
  return [
    '【羽毛球馆消费清单】',
    `会员名称：${member.name}`,
    `消费时间：${require('./util').formatDateTime(entry.time)}`,
    `消费项目：${entry.item}`,
    `消费金额：${formatMoney(entry.amount)}`,
    `账户余额：${formatMoney(member.balance)}`,
    '感谢您的光临！',
  ].join('\n');
}

function getMemberDetail(id) {
  const m = getMember(id);
  if (!m) return null;
  const consumeTotal = m.ledger.filter((l) => l.type === 'consume').reduce((s, l) => s + l.amount, 0);
  const rechargeTotal = m.ledger.filter((l) => l.type === 'recharge').reduce((s, l) => s + l.amount, 0);
  return Object.assign({}, m, {
    balanceText: formatMoney(m.balance),
    priceTableLabel: getPriceTableLabel(m.priceTable),
    consumeTotalText: formatMoney(consumeTotal),
    rechargeTotalText: formatMoney(rechargeTotal),
    ledger: m.ledger.map((l) => {
      return Object.assign({}, l, {
        timeText: require('./util').formatDateTime(l.time),
        typeLabel: l.type === 'consume' ? '消费' : '充值',
        amountText: `${l.type === 'consume' ? '-' : '+'}${formatMoney(l.amount)}`,
      });
    }),
  });
}

function searchMembers(keyword) {
  const q = (keyword || '').trim().toLowerCase();
  return getData()
    .members.filter((m) => !q || m.name.toLowerCase().includes(q))
    .map((m) => {
      return {
        id: m.id,
        name: m.name,
        priceTable: m.priceTable,
        balanceText: formatMoney(m.balance),
      };
    });
}

function calcPricePreview(memberName, courtId, date, startHour) {
  const member = findMemberByName(memberName);
  if (!member) {
    if ((memberName || '').trim()) return { error: '未找到该会员，请先在会员管理中添加' };
    return { hint: '请输入会员名称以预览价格对比' };
  }
  const pricing = calcMemberBookingPrice(member, courtId, date, startHour, isHolidayForPricing);
  if (!pricing || pricing.final == null) {
    return { error: '该时段不在营业范围内' };
  }
  const enough = member.balance >= pricing.final;
  const sourceText =
    pricing.source === 'member'
      ? `会员表${member.priceTable}价 ${formatMoney(pricing.memberPrice)} 更低`
      : pricing.source === 'unified'
        ? `统一价 ${formatMoney(pricing.unifiedPrice)} 更低`
        : `会员表${member.priceTable}与统一价均为 ${formatMoney(pricing.final)}`;
  return {
    memberPriceText: formatMoney(pricing.memberPrice),
    unifiedPriceText: formatMoney(pricing.unifiedPrice),
    finalText: formatMoney(pricing.final),
    balanceText: formatMoney(member.balance),
    sourceText,
    enough,
  };
}

module.exports = {
  COURTS,
  ALL_HOURS,
  initSampleData,
  reloadData,
  getData,
  isHoliday,
  toggleHoliday,
  getActiveHours,
  getBusinessHoursText,
  getMember,
  findMemberByName,
  getBooking,
  addMember,
  updateMember,
  deleteMember,
  rechargeMember,
  deleteLedgerEntry,
  lockMemberBooking,
  lockWalkinBooking,
  lockOnlineBooking,
  unlockBooking,
  processDueCharges,
  getBookingTypeLabel,
  buildBookingGrid,
  buildPriceGrid,
  getIncomeStats,
  buildReceiptText,
  getMemberDetail,
  searchMembers,
  calcPricePreview,
  getUnifiedPrice,
  isHolidayForPricing,
  slotLabel,
  formatMoney,
};
