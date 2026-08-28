const COURTS = [];
for (let i = 1; i <= 9; i++) {
  COURTS.push({ id: `A${i}`, name: `A${i}号场`, type: 'normal' });
}
COURTS.push({ id: 'VIP1', name: 'VIP1号场', type: 'vip' });
COURTS.push({ id: 'VIP2', name: 'VIP2号场', type: 'vip' });
for (let i = 1; i <= 5; i++) {
  COURTS.push({ id: `B${i}`, name: `B${i}号场`, type: 'normal' });
}

const ALL_HOURS = [];
for (let h = 8; h < 23; h++) ALL_HOURS.push(h);

// 管理人员账号（部署前请修改密码）
const ADMIN_USERS = [
  { username: 'admin', password: 'admin123', name: '系统管理员' },
  { username: 'manager', password: 'wt2024', name: '前台管理' },
];

const STORAGE_KEY = 'badminton_court_data';
const SESSION_KEY = 'badminton_admin_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

const RECHARGE_TIERS = [
  { pay: 3000, bonus: 300 },
  { pay: 5000, bonus: 750 },
  { pay: 10000, bonus: 2000 },
];

module.exports = {
  COURTS,
  ALL_HOURS,
  ADMIN_USERS,
  STORAGE_KEY,
  SESSION_KEY,
  SESSION_DURATION,
  RECHARGE_TIERS,
};
