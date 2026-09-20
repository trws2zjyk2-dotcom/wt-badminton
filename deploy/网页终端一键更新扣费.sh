#!/bin/bash
# 用法：复制本文件全部内容，粘贴到腾讯云「网页终端」里回车执行
# 不需要 scp 上传，不需要 GitHub
set -e

cd ~/badminton-court-manager || cd /root/badminton-court-manager || {
  echo "找不到项目目录，请先 cd 到 badminton-court-manager"
  exit 1
}

echo ">>> 写入 server/charges.js ..."
cat > server/charges.js << 'CHARGES_EOF'
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
CHARGES_EOF

echo ">>> 更新 server/storage.js ..."
cat > server/storage.js << 'STORAGE_EOF'
const fs = require('fs');
const config = require('./config');
const { processDueCharges } = require('./charges');

const EMPTY_DATA = { members: [], bookings: [], holidays: [], fixedBookings: [] };

function normalizeData(data) {
  if (!data || typeof data !== 'object') return { ...EMPTY_DATA };
  if (!Array.isArray(data.members)) data.members = [];
  if (!Array.isArray(data.bookings)) data.bookings = [];
  if (!Array.isArray(data.holidays)) data.holidays = [];
  if (!Array.isArray(data.fixedBookings)) data.fixedBookings = [];
  return data;
}

function loadFromFile() {
  try {
    if (fs.existsSync(config.DATA_FILE)) {
      return normalizeData(JSON.parse(fs.readFileSync(config.DATA_FILE, 'utf8')));
    }
  } catch (_) {}
  return { ...EMPTY_DATA };
}

function saveToFile(data) {
  const dir = require('path').dirname(config.DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(config.DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function loadFromSupabase() {
  const url = `${config.SUPABASE_URL}/rest/v1/app_data?id=eq.1&select=data`;
  const res = await fetch(url, {
    headers: {
      apikey: config.SUPABASE_KEY,
      Authorization: `Bearer ${config.SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase 读取失败: ${res.status}`);
  const rows = await res.json();
  if (rows[0] && rows[0].data) return normalizeData(rows[0].data);
  await saveToSupabase({ ...EMPTY_DATA });
  return { ...EMPTY_DATA };
}

async function saveToSupabase(data) {
  const normalized = normalizeData(data);
  const res = await fetch(`${config.SUPABASE_URL}/rest/v1/app_data`, {
    method: 'POST',
    headers: {
      apikey: config.SUPABASE_KEY,
      Authorization: `Bearer ${config.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ id: 1, data: normalized }),
  });
  if (!res.ok) throw new Error(`Supabase 保存失败: ${res.status}`);
}

async function loadServerData() {
  const data =
    config.SUPABASE_URL && config.SUPABASE_KEY ? await loadFromSupabase() : loadFromFile();
  const charged = processDueCharges(data);
  if (charged > 0) await saveServerData(data);
  return data;
}

async function saveServerData(data) {
  const normalized = normalizeData(data);
  processDueCharges(normalized);
  if (config.SUPABASE_URL && config.SUPABASE_KEY) {
    await saveToSupabase(normalized);
    return;
  }
  saveToFile(normalized);
}

module.exports = { loadServerData, saveServerData };
STORAGE_EOF

echo ">>> 更新 server/index.js 自动扣费定时任务 ..."
cat > server/index.js << 'INDEX_EOF'
const path = require('path');
const express = require('express');
const session = require('express-session');
const config = require('./config');
const { loadServerData, saveServerData } = require('./storage');

const app = express();
const ROOT = path.join(__dirname, '..');

if (config.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

app.use(express.json({ limit: '2mb' }));
app.use(
  session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: config.TRUST_PROXY,
    cookie: {
      maxAge: config.SESSION_MAX_AGE,
      httpOnly: true,
      secure: config.SESSION_SECURE,
      sameSite: 'lax',
    },
  })
);

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ ok: false, msg: '未登录' });
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const trimmed = (username || '').trim();
  const user = config.ADMIN_USERS.find(
    (u) => u.username === trimmed && u.password === password
  );
  if (!user) {
    return res.status(401).json({ ok: false, msg: '账号或密码错误' });
  }
  req.session.user = { username: user.username, name: user.name };
  res.json({ ok: true, user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/session', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ ok: true, user: req.session.user });
  }
  res.status(401).json({ ok: false, msg: '未登录' });
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'badminton-court-manager',
    storage: config.SUPABASE_URL ? 'supabase' : 'file',
  });
});

app.get('/api/data', requireAuth, async (req, res) => {
  try {
    res.json(await loadServerData());
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: '数据加载失败' });
  }
});

app.put('/api/data', requireAuth, async (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ ok: false, msg: '数据格式错误' });
  }
  try {
    await saveServerData(data);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: '数据保存失败' });
  }
});

app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    res.redirect('/index.html');
  } else {
    res.redirect('/login.html');
  }
});

app.use(express.static(ROOT, { index: false }));

app.use((req, res) => {
  res.status(404).send('页面不存在');
});

async function runServerChargeCycle() {
  try {
    await loadServerData();
  } catch (err) {
    console.error('自动扣费检查失败:', err.message);
  }
}

app.listen(config.PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  🏸 羽毛球馆管理系统已启动');
  console.log(`  端口: ${config.PORT}`);
  console.log(`  数据存储: ${config.SUPABASE_URL ? 'Supabase 云数据库' : '本地文件'}`);
  console.log('');
  runServerChargeCycle();
  setInterval(runServerChargeCycle, 60 * 1000);
});
INDEX_EOF

echo ">>> 重建 Docker（约 1～3 分钟）..."
sudo docker compose -f docker-compose.run.yml up -d --build

echo ""
echo "=========================================="
echo "  完成！请打开 http://106.55.250.32 登录"
echo "  登录后会自动补扣 9月19日 漏扣的订场"
echo "  到「会员管理」核对消费记录和余额"
echo "=========================================="
