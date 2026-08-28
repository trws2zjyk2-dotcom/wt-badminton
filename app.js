// ========== 配置 ==========
const COURTS = [
  ...Array.from({ length: 9 }, (_, i) => ({ id: `A${i + 1}`, name: `A${i + 1}号场`, type: 'normal' })),
  { id: 'VIP1', name: 'VIP1号场', type: 'vip' },
  { id: 'VIP2', name: 'VIP2号场', type: 'vip' },
  ...Array.from({ length: 5 }, (_, i) => ({ id: `B${i + 1}`, name: `B${i + 1}号场`, type: 'normal' })),
];

const ALL_HOURS = [];
for (let h = 8; h < 23; h++) ALL_HOURS.push(h);

const RECHARGE_TIERS = [
  { pay: 3000, bonus: 300 },
  { pay: 5000, bonus: 750 },
  { pay: 10000, bonus: 2000 },
];

const STORAGE_KEY = 'badminton_court_data';
let USE_SERVER_API = false;

// ========== 数据层 ==========
async function loadData() {
  if (USE_SERVER_API) {
    const res = await fetch('/api/data', { credentials: 'include' });
    if (res.status === 401) {
      window.location.href = '/login.html';
      return { members: [], bookings: [], holidays: [] };
    }
    if (!res.ok) throw new Error('加载数据失败');
    const parsed = await res.json();
    migrateData(parsed);
    return parsed;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      migrateData(parsed);
      return parsed;
    }
  } catch (_) {}
  return { members: [], bookings: [], holidays: [] };
}

function migrateData(data) {
  if (!data.holidays) data.holidays = [];
  if (!data.members) data.members = [];
  if (!data.bookings) data.bookings = [];
  data.members.forEach((m) => {
    if (!m.priceTable) {
      m.priceTable = 'A';
      delete m.price;
    }
  });
  data.bookings.forEach((b) => {
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

async function saveData(data) {
  if (USE_SERVER_API) {
    try {
      const res = await fetch('/api/data', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      if (!res.ok) showToast('保存失败，请重试');
    } catch {
      showToast('网络错误，保存失败');
    }
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function readLocalStorageData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    migrateData(parsed);
    return parsed;
  } catch (_) {
    return null;
  }
}

function hasBusinessData(d) {
  return d && (d.members.length > 0 || d.bookings.length > 0);
}

async function tryMigrateFromLocalStorage() {
  if (!USE_SERVER_API) return false;
  if (hasBusinessData(data)) return false;

  const local = readLocalStorageData();
  if (!hasBusinessData(local)) return false;

  data = local;
  await saveData(data);
  showToast(`已从浏览器恢复 ${local.members.length} 位会员、${local.bookings.length} 条订场记录`);
  return true;
}

async function importFromLocalStorage() {
  const local = readLocalStorageData();
  if (!hasBusinessData(local)) {
    showToast('浏览器中未找到可导入的历史数据');
    return false;
  }

  if (hasBusinessData(data)) {
    if (!confirm(
      `将用浏览器中的数据覆盖当前服务器数据：\n` +
        `${local.members.length} 位会员、${local.bookings.length} 条订场\n\n确定导入？`
    )) {
      return false;
    }
  }

  data = local;
  await saveData(data);
  renderBookingTable();
  renderDailyPriceTable();
  renderMemberList();
  if (selectedMemberId) renderMemberDetail(selectedMemberId);
  showToast('历史数据导入成功');
  return true;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatMoney(n) {
  return `¥${Number(n).toFixed(0)}`;
}

function slotLabel(startHour) {
  const end = startHour + 1;
  return `${String(startHour).padStart(2, '0')}:00-${String(end).padStart(2, '0')}:00`;
}

function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

function isHoliday(dateStr) {
  return data.holidays.includes(dateStr);
}

function isHolidayForPricing(dateStr) {
  return isHoliday(dateStr);
}

function calcPriceForMember(member, courtId, dateStr, startHour) {
  return calcMemberBookingPrice(member, courtId, dateStr, startHour, isHolidayForPricing);
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

// ========== 状态 ==========
let data = { members: [], bookings: [], holidays: [] };
let selectedMemberId = null;
let pendingBooking = null;
let pendingUnlock = null;
let editingMemberId = null;
let rechargingMemberId = null;
let selectedRechargeBonus = 0;
let chargeCheckTimer = null;

// ========== 工具 ==========
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function resetRechargeTierSelection() {
  selectedRechargeBonus = 0;
  document.querySelectorAll('.recharge-tier-btn').forEach((btn) => btn.classList.remove('active'));
  const preview = document.getElementById('recharge-preview');
  if (preview) {
    preview.classList.add('hidden');
    preview.textContent = '';
  }
}

function updateRechargePreview() {
  const amount = Number(document.getElementById('recharge-amount').value) || 0;
  const preview = document.getElementById('recharge-preview');
  if (!preview) return;
  if (selectedRechargeBonus > 0 && amount > 0) {
    preview.classList.remove('hidden');
    preview.textContent = `实付 ${formatMoney(amount)}，赠送 ${formatMoney(selectedRechargeBonus)}，到账 ${formatMoney(amount + selectedRechargeBonus)}`;
  } else {
    preview.classList.add('hidden');
    preview.textContent = '';
  }
}

function applyRechargeTier(pay, bonus) {
  document.getElementById('recharge-amount').value = pay;
  document.getElementById('recharge-item').value = `储值卡充值（充${pay}送${bonus}）`;
  selectedRechargeBonus = bonus;
  document.querySelectorAll('.recharge-tier-btn').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.pay) === pay);
  });
  updateRechargePreview();
}

function syncRechargeTierFromAmount() {
  const amount = Number(document.getElementById('recharge-amount').value);
  const tier = RECHARGE_TIERS.find((t) => t.pay === amount);
  if (tier) {
    selectedRechargeBonus = tier.bonus;
    document.getElementById('recharge-item').value = `储值卡充值（充${tier.pay}送${tier.bonus}）`;
    document.querySelectorAll('.recharge-tier-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.pay) === tier.pay);
    });
  } else {
    selectedRechargeBonus = 0;
    document.querySelectorAll('.recharge-tier-btn').forEach((btn) => btn.classList.remove('active'));
    const item = document.getElementById('recharge-item').value;
    if (item.startsWith('储值卡充值（充')) {
      document.getElementById('recharge-item').value = '储值卡充值';
    }
  }
  updateRechargePreview();
}

function getMember(id) {
  return data.members.find((m) => m.id === id);
}

function getBooking(date, courtId, startHour) {
  return data.bookings.find(
    (b) => b.date === date && b.courtId === courtId && b.startHour === startHour
  );
}

function getBookingKey(date, courtId, startHour) {
  return `${date}|${courtId}|${startHour}`;
}

function findMemberByName(name) {
  const trimmed = name.trim();
  return data.members.find((m) => m.name === trimmed);
}

// ========== 会员操作 ==========
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
  data.members.push(member);
  saveData(data);
  return member;
}

function updateMember(id, name, priceTable) {
  const m = getMember(id);
  if (!m) return;
  m.name = name.trim();
  m.priceTable = priceTable || 'A';
  saveData(data);
}

function deleteMember(id) {
  const hasBooking = data.bookings.some((b) => b.memberId === id);
  if (hasBooking) {
    showToast('该会员有未取消的订场记录，无法删除');
    return false;
  }
  data.members = data.members.filter((m) => m.id !== id);
  saveData(data);
  return true;
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
  saveData(data);
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
      const booking = data.bookings.find(
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
  saveData(data);
  return { ok: true };
}

// ========== 订场与扣费 ==========
function lockMemberBooking(date, courtId, startHour, memberId) {
  const member = getMember(memberId);
  if (!member) return { ok: false, msg: '会员不存在' };
  if (getBooking(date, courtId, startHour)) {
    return { ok: false, msg: '该时段已被锁定' };
  }

  const pricing = calcPriceForMember(member, courtId, date, startHour);
  if (!pricing || pricing.final == null) {
    return { ok: false, msg: '无法获取该时段价格，请检查营业时间' };
  }

  data.bookings.push({
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

  saveData(data);
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
  if (getBooking(date, courtId, startHour)) {
    return { ok: false, msg: '该时段已被锁定' };
  }

  const paymentLabel = payment === 'cash' ? '现金' : '扫码';
  const now = new Date().toISOString();

  data.bookings.push({
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

  saveData(data);
  return { ok: true, msg: `现场订场已锁定（${paymentLabel} ${formatMoney(price)}）` };
}

function lockOnlineBooking(date, courtId, startHour, price) {
  if (getBooking(date, courtId, startHour)) {
    return { ok: false, msg: '该时段已被锁定' };
  }

  const now = new Date().toISOString();

  data.bookings.push({
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

  saveData(data);
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
    saveData(data);
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

  saveData(data);
  return { member, ledgerEntry, booking };
}

function processDueCharges() {
  const receipts = [];
  data.bookings
    .filter((b) => b.type === 'member' && !b.charged && isSlotEnded(b.date, b.startHour))
    .forEach((b) => {
      const result = chargeBooking(b);
      if (result) receipts.push(result);
    });

  if (receipts.length > 0) {
    renderBookingTable();
    renderMemberList(document.getElementById('member-search')?.value || '');
    if (selectedMemberId) renderMemberDetail(selectedMemberId);
    const last = receipts[receipts.length - 1];
    showMemberReceipt(last.member, last.ledgerEntry);
    if (receipts.length > 1) {
      showToast(`已自动扣费 ${receipts.length} 笔订场`);
    }
  }
  return receipts.length;
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

  data.bookings = data.bookings.filter((b) => b.id !== booking.id);
  saveData(data);
  return { ok: true };
}

// ========== 会员消费清单 ==========
function buildReceiptText(member, entry) {
  return [
    '【羽毛球馆消费清单】',
    `会员名称：${member.name}`,
    `消费时间：${formatDateTime(entry.time)}`,
    `消费项目：${entry.item}`,
    `消费金额：${formatMoney(entry.amount)}`,
    `账户余额：${formatMoney(member.balance)}`,
    '感谢您的光临！',
  ].join('\n');
}

function showMemberReceipt(member, entry) {
  const content = document.getElementById('receipt-content');
  content.innerHTML = `
    <div class="receipt-header">🏸 消费清单</div>
    <div class="receipt-row"><span>会员名称</span><strong>${member.name}</strong></div>
    <div class="receipt-row"><span>消费时间</span><strong>${formatDateTime(entry.time)}</strong></div>
    <div class="receipt-row"><span>消费项目</span><strong>${entry.item}</strong></div>
    <div class="receipt-row"><span>消费金额</span><strong class="receipt-amount">${formatMoney(entry.amount)}</strong></div>
    <div class="receipt-row receipt-balance"><span>账户余额</span><strong>${formatMoney(member.balance)}</strong></div>
    <p class="receipt-footer">请核对以上信息，如有疑问请联系前台。</p>
  `;
  content.dataset.text = buildReceiptText(member, entry);
  document.getElementById('receipt-dialog').showModal();
}

// ========== 渲染：订场表 ==========
function renderBookingTable() {
  processDueCharges();

  const date = document.getElementById('booking-date').value;
  const activeHours = getActiveHours(date);
  const thead = document.getElementById('booking-thead');
  const tbody = document.getElementById('booking-tbody');

  document.getElementById('business-hours').textContent = getBusinessHoursText(date);
  document.getElementById('holiday-toggle').checked = isHoliday(date);

  thead.innerHTML = `
    <tr>
      <th>场地 \\ 时间</th>
      ${ALL_HOURS.map((h) => {
        const active = activeHours.includes(h);
        return `<th class="${active ? '' : 'closed-col'}">${slotLabel(h)}</th>`;
      }).join('')}
    </tr>
  `;

  tbody.innerHTML = COURTS.map((court) => {
    const cells = ALL_HOURS.map((h) => {
      const isVip = court.type === 'vip';
      const active = activeHours.includes(h);

      if (!active) {
        return `<td class="court-cell closed ${isVip ? 'vip-row' : ''}">休息</td>`;
      }

      const booking = getBooking(date, court.id, h);
      if (booking) {
        const isWalkin = booking.type === 'walkin';
        const isOnline = booking.type === 'online';
        const pending = booking.type === 'member' && !booking.charged;
        const extra = pending ? '<span class="pending-tag">待扣费</span>' : '';
        return `
          <td class="court-cell locked ${isWalkin ? 'walkin-cell' : ''} ${isOnline ? 'online-cell' : ''} ${isVip ? 'vip-row' : ''}"
              data-date="${date}" data-court="${court.id}" data-hour="${h}" data-action="unlock">
            <span class="member-name">${booking.memberName}</span>
            <span class="price-tag">${formatMoney(booking.price)}</span>
            ${extra}
          </td>`;
      }
      const unified = getUnifiedPrice(court.id, date, h, isHolidayForPricing);
      const priceHint = unified != null ? `<span class="price-hint">${unified}元</span>` : '';
      return `
        <td class="court-cell ${isVip ? 'vip-row' : ''}"
            data-date="${date}" data-court="${court.id}" data-hour="${h}" data-action="book">
          ${priceHint}
        </td>`;
    }).join('');
    return `<tr><th>${court.name}</th>${cells}</tr>`;
  }).join('');

  tbody.querySelectorAll('.court-cell[data-action]').forEach((cell) => {
    cell.addEventListener('click', onCourtCellClick);
  });
}

function onCourtCellClick(e) {
  const cell = e.currentTarget;
  const date = cell.dataset.date;
  const courtId = cell.dataset.court;
  const startHour = Number(cell.dataset.hour);
  const action = cell.dataset.action;

  const court = COURTS.find((c) => c.id === courtId);

  if (action === 'book') {
    pendingBooking = { date, courtId, startHour };
    document.getElementById('booking-info').innerHTML = `
      <strong>日期：</strong>${date}<br>
      <strong>场地：</strong>${court.name}<br>
      <strong>时段：</strong>${slotLabel(startHour)}<br>
      <strong>计费说明：</strong>会员订场在时段结束后自动扣费
    `;
    document.querySelector('input[name="booking-type"][value="member"]').checked = true;
    toggleBookingTypeFields();
    renderMemberDatalist();
    document.getElementById('booking-member-name').value = '';
    const unified = getUnifiedPrice(courtId, date, startHour, isHolidayForPricing);
    document.getElementById('walkin-price').value = unified ?? 80;
    document.getElementById('online-price').value = unified ?? 80;
    updateBookingPricePreview();
    document.getElementById('booking-dialog').showModal();
  } else {
    const booking = getBooking(date, courtId, startHour);
    pendingUnlock = { date, courtId, startHour };
    const paymentInfo = booking.type === 'walkin'
      ? `（${booking.walkinPayment === 'cash' ? '现金' : '扫码'}支付）`
      : booking.type === 'online'
        ? '（线上平台已支付）'
        : booking.charged ? '（已扣费）' : '（待扣费，取消无需退款）';

    let priceDetail = '';
    if (booking.type === 'member' && booking.memberPrice != null) {
      priceDetail = `<br><strong>计价：</strong>会员表${booking.priceTable || ''} ${formatMoney(booking.memberPrice)} / 统一价 ${formatMoney(booking.unifiedPrice)} → 取低 ${formatMoney(booking.price)}`;
    }

    document.getElementById('unlock-info').innerHTML = `
      <strong>客户：</strong>${booking.memberName}<br>
      <strong>场地：</strong>${court.name} · ${slotLabel(startHour)}<br>
      <strong>费用：</strong>${formatMoney(booking.price)} ${paymentInfo}${priceDetail}
    `;

    const warn = document.getElementById('unlock-warning');
    if (booking.type === 'member' && booking.charged) {
      warn.textContent = '取消后将退还消费金额至会员余额';
      warn.style.display = '';
    } else if (booking.type === 'walkin') {
      warn.textContent = '取消现场订场请确认已处理退款';
      warn.style.display = '';
    } else if (booking.type === 'online') {
      warn.textContent = '取消线上平台订场请确认已在平台处理退款';
      warn.style.display = '';
    } else {
      warn.textContent = '该订场尚未扣费，取消后不会产生费用';
      warn.style.display = '';
    }
    document.getElementById('unlock-dialog').showModal();
  }
}

function toggleBookingTypeFields() {
  const type = document.querySelector('input[name="booking-type"]:checked').value;
  const memberFields = document.getElementById('member-booking-fields');
  const walkinFields = document.getElementById('walkin-booking-fields');
  const onlineFields = document.getElementById('online-booking-fields');
  const memberInput = document.getElementById('booking-member-name');

  memberFields.classList.toggle('hidden', type !== 'member');
  walkinFields.classList.toggle('hidden', type !== 'walkin');
  onlineFields.classList.toggle('hidden', type !== 'online');
  memberInput.required = type === 'member';
}

function renderMemberDatalist() {
  const list = document.getElementById('member-datalist');
  list.innerHTML = data.members.map((m) => `<option value="${m.name}">`).join('');
}

function updateBookingPricePreview() {
  const type = document.querySelector('input[name="booking-type"]:checked').value;
  const el = document.getElementById('booking-price-preview');
  if (type !== 'member') return;

  if (!pendingBooking) return;
  const { date, courtId, startHour } = pendingBooking;

  const name = document.getElementById('booking-member-name').value;
  const member = findMemberByName(name);
  if (member) {
    const pricing = calcPriceForMember(member, courtId, date, startHour);
    if (!pricing || pricing.final == null) {
      el.innerHTML = '<span style="color:#ef4444">该时段不在营业范围内</span>';
      return;
    }
    const enough = member.balance >= pricing.final;
    const sourceText =
      pricing.source === 'member'
        ? `会员表${member.priceTable}价 ${formatMoney(pricing.memberPrice)} 更低`
        : pricing.source === 'unified'
          ? `统一价 ${formatMoney(pricing.unifiedPrice)} 更低`
          : `会员表${member.priceTable}与统一价均为 ${formatMoney(pricing.final)}`;
    el.innerHTML = `
      会员价：<strong>${formatMoney(pricing.memberPrice)}</strong> ·
      统一价：<strong>${formatMoney(pricing.unifiedPrice)}</strong><br>
      预计扣费：<strong>${formatMoney(pricing.final)}</strong>（${sourceText}）<br>
      时段结束后从余额扣除，当前余额：<strong>${formatMoney(member.balance)}</strong>
      ${enough ? '' : '<br><span style="color:#ef4444">⚠ 余额可能不足，请提醒会员充值</span>'}`;
  } else if (name.trim()) {
    el.innerHTML = '<span style="color:#ef4444">未找到该会员，请先在会员管理中添加</span>';
  } else {
    el.innerHTML = '请输入会员名称以预览价格对比';
  }
}

// ========== 渲染：会员管理 ==========
function renderMemberList(filter = '') {
  const list = document.getElementById('member-list');
  const q = filter.trim().toLowerCase();
  const members = data.members.filter((m) => !q || m.name.toLowerCase().includes(q));

  if (members.length === 0) {
    list.innerHTML = '<li class="empty-state" style="padding:30px">暂无会员，点击上方新增</li>';
    return;
  }

  list.innerHTML = members
    .map(
      (m) => `
    <li data-id="${m.id}" class="${m.id === selectedMemberId ? 'active' : ''}">
      <div class="name">${m.name}</div>
      <div class="meta">价格表 ${m.priceTable} · 余额 ${formatMoney(m.balance)}</div>
    </li>`
    )
    .join('');

  list.querySelectorAll('li[data-id]').forEach((li) => {
    li.addEventListener('click', () => {
      selectedMemberId = li.dataset.id;
      renderMemberList(document.getElementById('member-search').value);
      renderMemberDetail(selectedMemberId);
    });
  });
}

function renderMemberDetail(id) {
  const panel = document.getElementById('member-detail');
  const m = getMember(id);
  if (!m) {
    panel.innerHTML = '<div class="empty-state">← 请选择左侧会员查看详情</div>';
    return;
  }

  const ledgerRows = m.ledger.length
    ? m.ledger
        .map(
          (l) => `
      <tr>
        <td>${formatDateTime(l.time)}</td>
        <td class="type-${l.type}">${l.type === 'consume' ? '消费' : '充值'}</td>
        <td>${l.item}</td>
        <td class="type-${l.type}">${l.type === 'consume' ? '-' : '+'}${formatMoney(l.amount)}</td>
        <td class="ledger-actions">
          ${l.type === 'consume' ? `<button class="btn btn-secondary btn-sm ledger-receipt" data-ledger-id="${l.id}">发送清单</button>` : ''}
          <button class="btn btn-danger btn-sm ledger-delete" data-ledger-id="${l.id}">删除</button>
        </td>
      </tr>`
        )
        .join('')
    : '<tr><td colspan="5" style="text-align:center;color:#64748b">暂无记录</td></tr>';

  panel.innerHTML = `
    <div class="detail-header">
      <div>
        <h2>${m.name}</h2>
        <p style="color:#64748b;font-size:0.85rem;margin-top:4px">会员 ID: ${m.id}</p>
      </div>
      <div class="detail-actions">
        <button class="btn btn-primary btn-sm" id="recharge-btn">充值</button>
        <button class="btn btn-secondary btn-sm" id="edit-member-btn">编辑</button>
        <button class="btn btn-danger btn-sm" id="delete-member-btn">删除</button>
      </div>
    </div>
    <div class="info-cards">
      <div class="info-card balance">
        <div class="label">当前余额</div>
        <div class="value">${formatMoney(m.balance)}</div>
      </div>
      <div class="info-card">
        <div class="label">会员价格表</div>
        <div class="value" style="font-size:1rem">${getPriceTableLabel(m.priceTable)}</div>
      </div>
      <div class="info-card">
        <div class="label">累计消费</div>
        <div class="value">${formatMoney(m.ledger.filter((l) => l.type === 'consume').reduce((s, l) => s + l.amount, 0))}</div>
      </div>
      <div class="info-card">
        <div class="label">累计充值</div>
        <div class="value">${formatMoney(m.ledger.filter((l) => l.type === 'recharge').reduce((s, l) => s + l.amount, 0))}</div>
      </div>
    </div>
    <div class="ledger-section">
      <h3>会员清单（消费 / 充值记录）</h3>
      <table class="ledger-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>类型</th>
            <th>项目</th>
            <th>金额</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>${ledgerRows}</tbody>
      </table>
    </div>
  `;

  document.getElementById('recharge-btn').addEventListener('click', () => {
    rechargingMemberId = id;
    document.getElementById('recharge-member-name').innerHTML = `<strong>会员：</strong>${m.name} · 当前余额 ${formatMoney(m.balance)}`;
    document.getElementById('recharge-amount').value = '';
    document.getElementById('recharge-item').value = '储值卡充值';
    resetRechargeTierSelection();
    document.getElementById('recharge-dialog').showModal();
  });

  document.getElementById('edit-member-btn').addEventListener('click', () => {
    editingMemberId = id;
    document.getElementById('member-dialog-title').textContent = '编辑会员';
    document.getElementById('member-name').value = m.name;
    document.getElementById('member-price-table').value = m.priceTable || 'A';
    document.getElementById('member-balance').closest('label').style.display = 'none';
    document.getElementById('member-dialog').showModal();
  });

  document.getElementById('delete-member-btn').addEventListener('click', () => {
    if (confirm(`确定删除会员「${m.name}」？`)) {
      if (deleteMember(id)) {
        selectedMemberId = null;
        renderMemberList();
        panel.innerHTML = '<div class="empty-state">← 请选择左侧会员查看详情</div>';
        showToast('会员已删除');
      }
    }
  });

  panel.querySelectorAll('.ledger-receipt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const entry = m.ledger.find((l) => l.id === btn.dataset.ledgerId);
      if (entry) showMemberReceipt(m, entry);
    });
  });

  panel.querySelectorAll('.ledger-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ledgerId = btn.dataset.ledgerId;
      const entry = m.ledger.find((l) => l.id === ledgerId);
      const action = entry.type === 'consume' ? '消费' : '充值';
      if (confirm(`确定删除该${action}记录？余额将相应调整。`)) {
        const result = deleteLedgerEntry(id, ledgerId);
        if (result.ok) {
          renderMemberDetail(id);
          renderMemberList(document.getElementById('member-search').value);
          renderBookingTable();
          showToast('记录已删除');
        } else {
          showToast(result.msg);
        }
      }
    });
  });
}

// ========== 渲染：每日价格表 ==========
function renderDailyPriceTable() {
  const date = document.getElementById('price-date').value;
  const activeHours = getActiveHours(date);
  const thead = document.getElementById('price-thead');
  const tbody = document.getElementById('price-tbody');

  document.getElementById('price-hours').textContent = getBusinessHoursText(date);
  document.getElementById('price-holiday-toggle').checked = isHoliday(date);

  thead.innerHTML = `
    <tr>
      <th>场地 \\ 时间</th>
      ${ALL_HOURS.map((h) => {
        const active = activeHours.includes(h);
        return `<th class="${active ? '' : 'closed-col'}">${slotLabel(h)}</th>`;
      }).join('')}
    </tr>
  `;

  tbody.innerHTML = COURTS.map((court) => {
    const cells = ALL_HOURS.map((h) => {
      const active = activeHours.includes(h);
      if (!active) return `<td class="price-cell closed">—</td>`;
      const price = getUnifiedPrice(court.id, date, h, isHolidayForPricing);
      return `<td class="price-cell">${price != null ? `${price}元` : '—'}</td>`;
    }).join('');
    return `<tr><th>${court.name}</th>${cells}</tr>`;
  }).join('');
}

function syncHolidayFromPriceTab(checked) {
  const date = document.getElementById('price-date').value;
  document.getElementById('booking-date').value = date;
  toggleHoliday(date, checked);
}

// ========== 渲染：收入统计 ==========
function getChargedBookingsForDate(date) {
  return data.bookings.filter((b) => b.date === date && b.charged);
}

function renderIncomeStats() {
  const date = document.getElementById('income-date').value;

  const dayBookings = getChargedBookingsForDate(date);
  const memberBookingIncome = dayBookings
    .filter((b) => b.type === 'member')
    .reduce((s, b) => s + b.price, 0);
  const walkinIncome = dayBookings
    .filter((b) => b.type === 'walkin')
    .reduce((s, b) => s + b.price, 0);
  const onlineIncome = dayBookings
    .filter((b) => b.type === 'online')
    .reduce((s, b) => s + b.price, 0);
  const bookingIncome = memberBookingIncome + walkinIncome + onlineIncome;

  const dayRecharges = [];
  data.members.forEach((m) => {
    m.ledger.forEach((l) => {
      if (
        l.type === 'recharge' &&
        l.time.slice(0, 10) === date &&
        !l.item.includes('取消订场退款') &&
        l.item !== '初始充值' &&
        l.item !== '充值赠送'
      ) {
        dayRecharges.push({ ...l, memberName: m.name });
      }
    });
  });
  const rechargeIncome = dayRecharges.reduce((s, r) => s + r.amount, 0);

  const cashWalkin = dayBookings
    .filter((b) => b.type === 'walkin' && b.walkinPayment === 'cash')
    .reduce((s, b) => s + b.price, 0);
  const scanWalkin = dayBookings
    .filter((b) => b.type === 'walkin' && b.walkinPayment === 'scan')
    .reduce((s, b) => s + b.price, 0);

  document.getElementById('income-summary').innerHTML = `
    <div class="summary-card">
      <div class="label">会员订场收入</div>
      <div class="value">${formatMoney(memberBookingIncome)}</div>
    </div>
    <div class="summary-card">
      <div class="label">现场订场（现金）</div>
      <div class="value">${formatMoney(cashWalkin)}</div>
    </div>
    <div class="summary-card">
      <div class="label">现场订场（扫码）</div>
      <div class="value">${formatMoney(scanWalkin)}</div>
    </div>
    <div class="summary-card">
      <div class="label">线上平台订场</div>
      <div class="value">${formatMoney(onlineIncome)}</div>
    </div>
    <div class="summary-card">
      <div class="label">充值收入</div>
      <div class="value">${formatMoney(rechargeIncome)}</div>
    </div>
    <div class="summary-card">
      <div class="label">已结算场次</div>
      <div class="value">${dayBookings.length} 场</div>
    </div>
    <div class="summary-card">
      <div class="label">当日总收入</div>
      <div class="value" style="color:#10b981">${formatMoney(bookingIncome + rechargeIncome)}</div>
    </div>
  `;

  const rows = [];

  dayBookings.forEach((b) => {
    const court = COURTS.find((c) => c.id === b.courtId);
    rows.push({
      time: b.chargedAt || b.lockedAt,
      member: b.memberName,
      court: court.name,
      slot: slotLabel(b.startHour),
      amount: b.price,
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
      type: '会员充值',
    });
  });

  rows.sort((a, b) => new Date(b.time) - new Date(a.time));

  const tbody = document.getElementById('income-tbody');
  tbody.innerHTML = rows.length
    ? rows
        .map(
          (r) => `
      <tr>
        <td>${formatDateTime(r.time)}</td>
        <td>${r.member}</td>
        <td>${r.court}</td>
        <td>${r.slot}</td>
        <td>${formatMoney(r.amount)}</td>
        <td>${r.type}</td>
      </tr>`
        )
        .join('')
    : '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:40px">当日暂无收入记录</td></tr>';
}

// ========== 导出 ==========
function exportCSV(filename, headers, rows) {
  const bom = '\uFEFF';
  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportBooking() {
  const date = document.getElementById('booking-date').value;
  const activeHours = getActiveHours(date);
  const headers = ['场地', ...ALL_HOURS.map((h) => slotLabel(h))];
  const rows = COURTS.map((court) => {
    const cells = ALL_HOURS.map((h) => {
      if (!activeHours.includes(h)) return '休息';
      const b = getBooking(date, court.id, h);
      if (!b) return '空闲';
      const pending = b.type === 'member' && !b.charged ? '(待扣费)' : '';
      return `${b.memberName} ${b.price}元${pending}`;
    });
    return [court.name, ...cells];
  });
  exportCSV(`订场表_${date}.csv`, headers, rows);
  showToast('订场表已导出');
}

function exportIncome() {
  const date = document.getElementById('income-date').value;
  const headers = ['时间', '会员/客户', '场地', '时段', '金额', '类型'];
  const rows = [];
  getChargedBookingsForDate(date).forEach((b) => {
    const court = COURTS.find((c) => c.id === b.courtId);
    rows.push([
      formatDateTime(b.chargedAt || b.lockedAt),
      b.memberName,
      court.name,
      slotLabel(b.startHour),
      b.price,
      getBookingTypeLabel(b),
    ]);
  });
  data.members.forEach((m) => {
    m.ledger.forEach((l) => {
      if (
        l.type === 'recharge' &&
        l.time.slice(0, 10) === date &&
        !l.item.includes('取消订场退款') &&
        l.item !== '初始充值' &&
        l.item !== '充值赠送'
      ) {
        rows.push([formatDateTime(l.time), m.name, '-', '-', l.amount, '会员充值']);
      }
    });
  });
  exportCSV(`收入统计_${date}.csv`, headers, rows);
  showToast('收入报表已导出');
}

// ========== 节假日 ==========
function toggleHoliday(dateStr, isHol) {
  if (isHol) {
    if (!data.holidays.includes(dateStr)) data.holidays.push(dateStr);
  } else {
    data.holidays = data.holidays.filter((d) => d !== dateStr);
  }
  saveData(data);
  document.getElementById('holiday-toggle').checked = isHol;
  document.getElementById('price-holiday-toggle').checked = isHol;
  renderBookingTable();
  renderDailyPriceTable();
}

// ========== 初始化示例数据 ==========
async function initSampleData() {
  // 服务器模式不自动添加示例数据，避免覆盖真实业务场景
  if (USE_SERVER_API) return;
  if (data.members.length > 0) return;
  const samples = [
    { name: '张三', priceTable: 'A', balance: 500 },
    { name: '李四', priceTable: 'B', balance: 300 },
    { name: '王五', priceTable: 'C', balance: 1000 },
    { name: '赵六', priceTable: 'E', balance: 200 },
  ];
  samples.forEach((s) => addMember(s.name, s.priceTable, s.balance));
  data = await loadData();
}

// ========== 事件绑定 ==========
function initEvents() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab === 'income') renderIncomeStats();
      if (btn.dataset.tab === 'booking') renderBookingTable();
      if (btn.dataset.tab === 'prices') renderDailyPriceTable();
    });
  });

  document.getElementById('booking-date').addEventListener('change', () => {
    document.getElementById('price-date').value = document.getElementById('booking-date').value;
    renderBookingTable();
    renderDailyPriceTable();
  });
  document.getElementById('price-date').addEventListener('change', () => {
    renderDailyPriceTable();
    document.getElementById('booking-date').value = document.getElementById('price-date').value;
    renderBookingTable();
  });
  document.getElementById('income-date').addEventListener('change', renderIncomeStats);
  document.getElementById('export-booking').addEventListener('click', exportBooking);
  document.getElementById('export-income').addEventListener('click', exportIncome);

  document.getElementById('holiday-toggle').addEventListener('change', (e) => {
    const date = document.getElementById('booking-date').value;
    document.getElementById('price-date').value = date;
    toggleHoliday(date, e.target.checked);
  });

  document.getElementById('price-holiday-toggle').addEventListener('change', (e) => {
    syncHolidayFromPriceTab(e.target.checked);
  });

  document.querySelectorAll('input[name="booking-type"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      toggleBookingTypeFields();
      updateBookingPricePreview();
    });
  });

  document.getElementById('booking-member-name').addEventListener('input', updateBookingPricePreview);

  document.getElementById('booking-cancel').addEventListener('click', () => {
    document.getElementById('booking-dialog').close();
  });

  document.getElementById('booking-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.querySelector('input[name="booking-type"]:checked').value;
    let result;

    if (type === 'member') {
      const memberName = document.getElementById('booking-member-name').value;
      const member = findMemberByName(memberName);
      if (!member) {
        showToast('未找到该会员，请检查名称或先添加会员');
        return;
      }
      result = lockMemberBooking(
        pendingBooking.date,
        pendingBooking.courtId,
        pendingBooking.startHour,
        member.id
      );
      if (result.ok) {
        document.getElementById('booking-dialog').close();
        renderBookingTable();
        renderMemberList(document.getElementById('member-search').value);
        showToast(result.msg);
      } else {
        showToast(result.msg);
      }
    } else if (type === 'walkin') {
      const price = document.getElementById('walkin-price').value;
      const payment = document.querySelector('input[name="walkin-payment"]:checked').value;
      result = lockWalkinBooking(
        pendingBooking.date,
        pendingBooking.courtId,
        pendingBooking.startHour,
        price,
        payment
      );
      if (result.ok) {
        document.getElementById('booking-dialog').close();
        renderBookingTable();
        showToast(result.msg);
      } else {
        showToast(result.msg);
      }
    } else {
      const price = document.getElementById('online-price').value;
      result = lockOnlineBooking(
        pendingBooking.date,
        pendingBooking.courtId,
        pendingBooking.startHour,
        price
      );
      if (result.ok) {
        document.getElementById('booking-dialog').close();
        renderBookingTable();
        showToast(result.msg);
      } else {
        showToast(result.msg);
      }
    }
  });

  document.getElementById('unlock-cancel').addEventListener('click', () => {
    document.getElementById('unlock-dialog').close();
  });

  document.getElementById('unlock-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const result = unlockBooking(
      pendingUnlock.date,
      pendingUnlock.courtId,
      pendingUnlock.startHour
    );
    if (result.ok) {
      document.getElementById('unlock-dialog').close();
      renderBookingTable();
      if (selectedMemberId) renderMemberDetail(selectedMemberId);
      renderMemberList(document.getElementById('member-search').value);
      showToast('已取消锁定');
    } else {
      showToast(result.msg);
    }
  });

  document.getElementById('add-member-btn').addEventListener('click', () => {
    editingMemberId = null;
    document.getElementById('member-dialog-title').textContent = '新增会员';
    document.getElementById('member-name').value = '';
    document.getElementById('member-price-table').value = 'A';
    document.getElementById('member-balance').value = 0;
    document.getElementById('member-balance').closest('label').style.display = '';
    document.getElementById('member-dialog').showModal();
  });

  document.getElementById('member-cancel').addEventListener('click', () => {
    document.getElementById('member-dialog').close();
  });

  document.getElementById('member-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('member-name').value;
    const priceTable = document.getElementById('member-price-table').value;
    if (editingMemberId) {
      updateMember(editingMemberId, name, priceTable);
      showToast('会员信息已更新');
      renderMemberDetail(editingMemberId);
    } else {
      const balance = document.getElementById('member-balance').value;
      const m = addMember(name, priceTable, balance);
      selectedMemberId = m.id;
      showToast('会员已添加');
      renderMemberDetail(m.id);
    }
    document.getElementById('member-dialog').close();
    renderMemberList(document.getElementById('member-search').value);
  });

  document.getElementById('member-search').addEventListener('input', (e) => {
    renderMemberList(e.target.value);
  });

  document.getElementById('recharge-cancel').addEventListener('click', () => {
    document.getElementById('recharge-dialog').close();
  });

  document.querySelectorAll('.recharge-tier-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyRechargeTier(Number(btn.dataset.pay), Number(btn.dataset.bonus));
    });
  });

  document.getElementById('recharge-amount').addEventListener('input', syncRechargeTierFromAmount);

  document.getElementById('recharge-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = document.getElementById('recharge-amount').value;
    const item = document.getElementById('recharge-item').value;
    const bonus = selectedRechargeBonus;
    if (rechargeMember(rechargingMemberId, amount, item, bonus)) {
      document.getElementById('recharge-dialog').close();
      renderMemberDetail(rechargingMemberId);
      renderMemberList(document.getElementById('member-search').value);
      const total = Number(amount) + bonus;
      showToast(
        bonus > 0
          ? `充值成功，到账 ${formatMoney(total)}（含赠送 ${formatMoney(bonus)}）`
          : `充值成功 ${formatMoney(amount)}`
      );
    }
  });

  document.getElementById('receipt-copy').addEventListener('click', async () => {
    const text = document.getElementById('receipt-content').dataset.text;
    try {
      await navigator.clipboard.writeText(text);
      showToast('清单已复制，可发送给会员');
    } catch {
      showToast('复制失败，请手动复制');
    }
  });

  document.getElementById('receipt-close').addEventListener('click', () => {
    document.getElementById('receipt-dialog').close();
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (!confirm('确定退出登录？')) return;
      try {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      } catch (_) {}
      window.location.href = '/login.html';
    });
  }

  const importBtn = document.getElementById('import-local-btn');
  if (importBtn) {
    importBtn.addEventListener('click', () => importFromLocalStorage());
  }
}

// ========== 启动 ==========
async function detectServerMode() {
  try {
    const res = await fetch('/api/session', { credentials: 'include' });
    if (res.ok || res.status === 401) return 'server';
  } catch (_) {}
  return 'static';
}

async function bootstrap() {
  const mode = await detectServerMode();

  if (mode === 'server') {
    try {
      const res = await fetch('/api/session', { credentials: 'include' });
      if (!res.ok) {
        window.location.href = '/login.html';
        return;
      }
      const session = await res.json();
      USE_SERVER_API = true;
      const userEl = document.getElementById('user-display');
      const logoutBtn = document.getElementById('logout-btn');
      if (userEl) {
        userEl.textContent = `👤 ${session.user.name}`;
        userEl.classList.remove('hidden');
      }
      if (logoutBtn) logoutBtn.classList.remove('hidden');
      const importBtn = document.getElementById('import-local-btn');
      if (importBtn) importBtn.classList.remove('hidden');
    } catch {
      document.body.innerHTML =
        '<div style="padding:40px;text-align:center;font-family:sans-serif"><h2>无法连接服务器</h2><p>请运行 <code>npm start</code> 后访问</p></div>';
      return;
    }
  }

  try {
    data = await loadData();
    await tryMigrateFromLocalStorage();
    await initSampleData();
    init();
  } catch (err) {
    console.error(err);
    showToast('系统加载失败，请刷新页面重试');
  }
}

function init() {
  const today = todayStr();
  document.getElementById('booking-date').value = today;
  document.getElementById('price-date').value = today;
  document.getElementById('income-date').value = today;
  initEvents();
  renderBookingTable();
  renderDailyPriceTable();
  renderMemberList();

  chargeCheckTimer = setInterval(() => {
    processDueCharges();
  }, 30000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) processDueCharges();
  });
}

bootstrap();
