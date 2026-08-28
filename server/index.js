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

app.listen(config.PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  🏸 羽毛球馆管理系统已启动');
  console.log(`  端口: ${config.PORT}`);
  console.log(`  数据存储: ${config.SUPABASE_URL ? 'Supabase 云数据库' : '本地文件'}`);
  console.log('');
});
