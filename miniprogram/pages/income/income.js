const auth = require('../../utils/auth');
const store = require('../../utils/store');
const { todayStr, formatDateTime } = require('../../utils/util');

Page({
  data: {
    date: '',
    summary: null,
    rows: [],
  },

  onLoad() {
    this.setData({ date: todayStr() });
  },

  onShow() {
    if (!auth.requireAuth()) return;
    store.reloadData();
    this.refreshStats();
  },

  refreshStats() {
    const stats = store.getIncomeStats(this.data.date);
    const rows = stats.rows.map((r) => {
      return Object.assign({}, r, { timeText: formatDateTime(r.time) });
    });
    this.setData({ summary: stats.summary, rows });
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value }, () => this.refreshStats());
  },

  onCopyReport() {
    const { date, rows, summary } = this.data;
    const lines = [
      `【羽毛球馆收入报表 ${date}】`,
      `会员订场：${summary.memberBookingIncomeText}`,
      `现场现金：${summary.cashWalkinText}`,
      `现场扫码：${summary.scanWalkinText}`,
      `线上平台：${summary.onlineIncomeText}`,
      `充值收入：${summary.rechargeIncomeText}`,
      `当日总收入：${summary.totalIncomeText}`,
      '',
      '--- 明细 ---',
    ];
    rows.forEach((r) => {
      lines.push(`${r.timeText} | ${r.member} | ${r.court} | ${r.slot} | ${r.amountText} | ${r.type}`);
    });
    wx.setClipboardData({
      data: lines.join('\n'),
      success: () => wx.showToast({ title: '报表已复制', icon: 'success' }),
    });
  },
});
