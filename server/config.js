const path = require('path');
const crypto = require('crypto');

// 默认账号（仅开发环境使用，生产环境请通过环境变量配置）
const DEFAULT_ADMIN_USERS = [
  { username: 'admin', password: 'admin123', name: '系统管理员' },
  { username: 'manager', password: 'wt2024', name: '前台管理' },
];

function loadAdminUsers() {
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    return [
      {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
        name: process.env.ADMIN_NAME || '管理员',
      },
    ];
  }
  return DEFAULT_ADMIN_USERS;
}

function loadSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') {
    console.warn('警告: 生产环境未设置 SESSION_SECRET，已自动生成。重启后所有登录将失效。');
    return crypto.randomBytes(32).toString('hex');
  }
  return 'badminton-court-dev-secret';
}

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  SESSION_SECRET: loadSessionSecret(),
  DATA_FILE: process.env.DATA_FILE || path.join(__dirname, 'data.json'),
  ADMIN_USERS: loadAdminUsers(),
  SESSION_MAX_AGE: 7 * 24 * 60 * 60 * 1000,
  TRUST_PROXY: process.env.TRUST_PROXY === 'true' || isProduction,
  SESSION_SECURE: process.env.SESSION_SECURE === 'true' || isProduction,
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '',
};
