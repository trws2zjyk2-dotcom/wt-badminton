const auth = require('../../utils/auth');
const store = require('../../utils/store');
const { todayStr } = require('../../utils/util');

Page({
  data: {
    date: '',
    grid: null,
  },

  onLoad() {
    this.setData({ date: todayStr() });
  },

  onShow() {
    if (!auth.requireAuth()) return;
    store.reloadData();
    this.refreshGrid();
  },

  refreshGrid() {
    this.setData({ grid: store.buildPriceGrid(this.data.date) });
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value }, () => this.refreshGrid());
  },

  onHolidayChange(e) {
    store.toggleHoliday(this.data.date, e.detail.value);
    this.refreshGrid();
  },
});
