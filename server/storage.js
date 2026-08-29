const fs = require('fs');
const config = require('./config');

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
  if (config.SUPABASE_URL && config.SUPABASE_KEY) {
    return loadFromSupabase();
  }
  return loadFromFile();
}

async function saveServerData(data) {
  const normalized = normalizeData(data);
  if (config.SUPABASE_URL && config.SUPABASE_KEY) {
    await saveToSupabase(normalized);
    return;
  }
  saveToFile(normalized);
}

module.exports = { loadServerData, saveServerData };
