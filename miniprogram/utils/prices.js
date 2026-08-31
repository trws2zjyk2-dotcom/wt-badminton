// 威腾羽毛球馆价格表
// schema: weekday_weekend | weekday_sat_sun | mon_tuefri_sat_sun

const PRICE_TABLE_META = {
  unified: { name: '统一价格表（每日价格）', schema: 'weekday_weekend' },
  A: { name: '会员价格表 A', schema: 'weekday_weekend' },
  B: { name: '会员价格表 B', schema: 'weekday_weekend' },
  C: { name: '会员价格表 C', schema: 'weekday_weekend' },
  D: { name: '会员价格表 D', schema: 'weekday_sat_sun' },
  E: { name: '会员价格表 E', schema: 'mon_tuefri_sat_sun' },
  F: { name: '会员价格表 F', schema: 'weekday_weekend' },
};

// 时段规则：[开始小时, 结束小时, 价格] 左闭右开
const PRICE_DATA = {
  unified: {
    standard_a: {
      weekday: [[9, 16, 35], [16, 18, 45], [18, 22, 90], [22, 23, 65]],
      weekend: [[8, 10, 55], [10, 12, 90], [12, 14, 45], [14, 18, 90], [22, 23, 65]],
      weekend_sat: { range: [18, 22], price: 90 },
      weekend_sun: { range: [18, 22], price: 68 },
    },
    deluxe_b: {
      weekday: [[9, 16, 35], [16, 18, 45], [18, 22, 100], [22, 23, 75]],
      weekend: [[8, 10, 55], [10, 12, 100], [12, 14, 45], [14, 18, 100], [22, 23, 75]],
      weekend_sat: { range: [18, 22], price: 100 },
      weekend_sun: { range: [18, 22], price: 78 },
    },
    vip: {
      weekday: [[9, 16, 68], [16, 18, 88], [18, 22, 120], [22, 23, 78]],
      weekend: [[8, 10, 68], [10, 12, 120], [12, 14, 68], [14, 18, 120], [22, 23, 78]],
      weekend_sat: { range: [18, 22], price: 120 },
      weekend_sun: { range: [18, 22], price: 78 },
    },
  },
  A: {
    standard_a: {
      weekday: [[9, 16, 22], [16, 18, 30], [18, 22, 88], [22, 23, 30]],
      weekend: [[8, 10, 55], [10, 12, 88], [12, 14, 30], [14, 18, 88], [22, 23, 30]],
      weekend_sat: { range: [18, 22], price: 88 },
      weekend_sun: { range: [18, 22], price: 60 },
    },
    vip: {
      weekday: [[9, 16, 60], [16, 18, 85], [18, 22, 120], [22, 23, 60]],
      weekend: [[8, 10, 68], [10, 12, 120], [12, 14, 60], [14, 18, 120], [22, 23, 60]],
      weekend_sat: { range: [18, 22], price: 120 },
      weekend_sun: { range: [18, 22], price: 78 },
    },
  },
  B: {
    standard_a: {
      weekday: [[9, 16, 29], [16, 18, 39], [18, 22, 98], [22, 23, 39]],
      weekend: [[8, 10, 55], [10, 12, 98], [12, 14, 39], [14, 18, 98], [22, 23, 39]],
      weekend_sat: { range: [18, 22], price: 98 },
      weekend_sun: { range: [18, 22], price: 68 },
    },
    vip: {
      weekday: [[9, 16, 68], [16, 18, 88], [18, 22, 120], [22, 23, 68]],
      weekend: [[8, 10, 68], [10, 12, 120], [12, 14, 68], [14, 18, 120], [22, 23, 68]],
      weekend_sat: { range: [18, 22], price: 120 },
      weekend_sun: { range: [18, 22], price: 78 },
    },
  },
  C: {
    standard_a: {
      weekday: [[9, 16, 35], [16, 18, 45], [18, 22, 98], [22, 23, 45]],
      weekend: [[8, 10, 55], [10, 12, 98], [12, 14, 45], [14, 18, 98], [22, 23, 45]],
      weekend_sat: { range: [18, 22], price: 98 },
      weekend_sun: { range: [18, 22], price: 68 },
    },
    vip: {
      weekday: [[9, 16, 68], [16, 18, 88], [18, 22, 120], [22, 23, 68]],
      weekend: [[8, 10, 68], [10, 12, 120], [12, 14, 68], [14, 18, 120], [22, 23, 68]],
      weekend_sat: { range: [18, 22], price: 120 },
      weekend_sun: { range: [18, 22], price: 78 },
    },
  },
  D: {
    standard_a: {
      weekday: [[9, 16, 35], [16, 18, 45], [18, 20, 98], [20, 22, 108], [22, 23, 55]],
      saturday: [[8, 10, 55], [10, 12, 108], [12, 16, 68], [16, 22, 108], [22, 23, 55]],
      sun_holiday: [[8, 10, 55], [10, 12, 108], [12, 16, 68], [16, 18, 108], [18, 22, 78], [22, 23, 55]],
    },
    vip: {
      weekday: [[9, 16, 68], [16, 18, 88], [18, 20, 120], [20, 22, 128], [22, 23, 78]],
      saturday: [[8, 10, 68], [10, 12, 128], [12, 16, 88], [16, 22, 128], [22, 23, 78]],
      sun_holiday: [[8, 10, 68], [10, 12, 128], [12, 16, 88], [16, 18, 128], [18, 22, 88], [22, 23, 78]],
    },
  },
  E: {
    standard_a: {
      monday: [[9, 16, 35], [16, 18, 45], [18, 20, 68], [20, 22, 78], [22, 23, 55]],
      tue_fri: [[9, 16, 35], [16, 18, 45], [18, 20, 98], [20, 22, 108], [22, 23, 55]],
      saturday: [[8, 10, 55], [10, 12, 108], [12, 16, 68], [16, 22, 88], [22, 23, 55]],
      sun_holiday: [[8, 10, 55], [10, 12, 78], [12, 16, 68], [16, 18, 88], [18, 22, 78], [22, 23, 55]],
    },
    deluxe_b: {
      monday: [[9, 16, 35], [16, 18, 45], [18, 20, 68], [20, 22, 78], [22, 23, 55]],
      tue_fri: [[9, 16, 35], [16, 18, 45], [18, 20, 98], [20, 22, 108], [22, 23, 55]],
      saturday: [[8, 10, 55], [10, 12, 108], [12, 16, 68], [16, 22, 88], [22, 23, 55]],
      sun_holiday: [[8, 10, 55], [10, 12, 78], [12, 16, 68], [16, 18, 88], [18, 22, 78], [22, 23, 55]],
    },
    vip: {
      monday: [[9, 16, 68], [16, 18, 88], [18, 20, 78], [20, 22, 88], [22, 23, 78]],
      tue_fri: [[9, 16, 68], [16, 18, 88], [18, 20, 120], [20, 22, 128], [22, 23, 78]],
      saturday: [[8, 10, 68], [10, 12, 128], [12, 16, 88], [16, 22, 128], [22, 23, 78]],
      sun_holiday: [[8, 10, 68], [10, 12, 128], [12, 16, 88], [16, 18, 128], [18, 22, 88], [22, 23, 78]],
    },
  },
  F: {
    standard_a: {
      weekday: [[9, 16, 35], [16, 18, 45], [18, 22, 90], [22, 23, 65]],
      weekend: [[8, 10, 55], [10, 12, 90], [12, 14, 45], [14, 18, 90], [22, 23, 65]],
      weekend_sat: { range: [18, 22], price: 90 },
      weekend_sun: { range: [18, 22], price: 68 },
    },
    deluxe_b: {
      weekday: [[9, 16, 35], [16, 18, 45], [18, 22, 100], [22, 23, 75]],
      weekend: [[8, 10, 55], [10, 12, 100], [12, 14, 45], [14, 18, 100], [22, 23, 75]],
      weekend_sat: { range: [18, 22], price: 100 },
      weekend_sun: { range: [18, 22], price: 78 },
    },
    vip: {
      weekday: [[9, 16, 68], [16, 18, 88], [18, 22, 120], [22, 23, 78]],
      weekend: [[8, 10, 68], [10, 12, 120], [12, 14, 68], [14, 18, 120], [22, 23, 78]],
      weekend_sat: { range: [18, 22], price: 120 },
      weekend_sun: { range: [18, 22], price: 78 },
    },
  },
};

function getCourtCategory(courtId) {
  if (courtId.startsWith('VIP')) return 'vip';
  if (courtId.startsWith('B')) return 'deluxe_b';
  return 'standard_a';
}

function resolveDayKey(dateStr, schema, isHolidayFn) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const hol = isHolidayFn(dateStr);

  if (schema === 'weekday_weekend') {
    if (!hol && day >= 1 && day <= 5) return 'weekday';
    return day === 6 && !hol ? 'weekend_sat' : 'weekend_sun';
  }
  if (schema === 'weekday_sat_sun') {
    if (!hol && day >= 1 && day <= 5) return 'weekday';
    if (day === 6 && !hol) return 'saturday';
    return 'sun_holiday';
  }
  // mon_tuefri_sat_sun
  if (hol || day === 0) return 'sun_holiday';
  if (day === 6) return 'saturday';
  if (day === 1) return 'monday';
  return 'tue_fri';
}

function lookupInRules(rules, startHour, dayKey, categoryRules) {
  if (dayKey === 'weekend_sat' || dayKey === 'weekend_sun') {
    const satSun = categoryRules[dayKey === 'weekend_sat' ? 'weekend_sat' : 'weekend_sun'];
    if (satSun) {
      const [rs, re] = satSun.range;
      if (startHour >= rs && startHour < re) return satSun.price;
    }
    const ranges = categoryRules.weekend;
    for (const [s, e, p] of ranges) {
      if (startHour >= s && startHour < e) return p;
    }
    return null;
  }

  const ranges = categoryRules[dayKey];
  if (!ranges) return null;
  for (const [s, e, p] of ranges) {
    if (startHour >= s && startHour < e) return p;
  }
  return null;
}

function getTablePrice(tableId, courtId, dateStr, startHour, isHolidayFn) {
  const table = PRICE_DATA[tableId];
  if (!table) return null;

  const category = getCourtCategory(courtId);
  let categoryRules = table[category];
  // 无豪华场价格时回退标准场（A/B/C/D 会员表）
  if (!categoryRules && category === 'deluxe_b') {
    categoryRules = table.standard_a;
  }
  if (!categoryRules) return null;

  const schema = PRICE_TABLE_META[tableId].schema;
  const dayKey = resolveDayKey(dateStr, schema, isHolidayFn);
  return lookupInRules(null, startHour, dayKey, categoryRules);
}

function getUnifiedPrice(courtId, dateStr, startHour, isHolidayFn) {
  return getTablePrice('unified', courtId, dateStr, startHour, isHolidayFn);
}

function getMemberTablePrice(priceTable, courtId, dateStr, startHour, isHolidayFn) {
  return getTablePrice(priceTable, courtId, dateStr, startHour, isHolidayFn);
}

function calcMemberBookingPrice(member, courtId, dateStr, startHour, isHolidayFn) {
  const memberPrice = getMemberTablePrice(member.priceTable, courtId, dateStr, startHour, isHolidayFn);
  const unifiedPrice = getUnifiedPrice(courtId, dateStr, startHour, isHolidayFn);

  if (memberPrice == null && unifiedPrice == null) return null;
  if (memberPrice == null) return { final: unifiedPrice, memberPrice: null, unifiedPrice, source: 'unified' };
  if (unifiedPrice == null) return { final: memberPrice, memberPrice, unifiedPrice: null, source: 'member' };

  const final = Math.min(memberPrice, unifiedPrice);
  const source = final === memberPrice ? (final === unifiedPrice ? 'both' : 'member') : 'unified';
  return { final, memberPrice, unifiedPrice, source };
}

function getPriceTableLabel(id) {
  const meta = PRICE_TABLE_META[id];
  return meta ? meta.name : id;
}

function getMemberPriceTableOptions() {
  return ['A', 'B', 'C', 'D', 'E', 'F'].map((id) => ({ id, name: PRICE_TABLE_META[id].name }));
}

module.exports = {
  getUnifiedPrice,
  getMemberTablePrice,
  calcMemberBookingPrice,
  getPriceTableLabel,
  getMemberPriceTableOptions,
};
