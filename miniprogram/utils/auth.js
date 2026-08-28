const { ADMIN_USERS, SESSION_KEY, SESSION_DURATION } = require('./config');

function login(username, password) {
  const trimmedUser = (username || '').trim();
  const user = ADMIN_USERS.find(
    (u) => u.username === trimmedUser && u.password === password
  );
  if (!user) {
    return { ok: false, msg: '账号或密码错误' };
  }
  const session = {
    username: user.username,
    name: user.name,
    token: Date.now().toString(36) + Math.random().toString(36).slice(2),
    expireAt: Date.now() + SESSION_DURATION,
  };
  wx.setStorageSync(SESSION_KEY, session);
  return { ok: true, session };
}

function logout() {
  wx.removeStorageSync(SESSION_KEY);
}

function getSession() {
  const session = wx.getStorageSync(SESSION_KEY);
  if (!session || !session.expireAt || Date.now() > session.expireAt) {
    wx.removeStorageSync(SESSION_KEY);
    return null;
  }
  return session;
}

function isLoggedIn() {
  return !!getSession();
}

function requireAuth() {
  if (!isLoggedIn()) {
    wx.reLaunch({ url: '/pages/login/login' });
    return false;
  }
  return true;
}

module.exports = {
  login,
  logout,
  getSession,
  isLoggedIn,
  requireAuth,
};
