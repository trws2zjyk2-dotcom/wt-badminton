const store = require('./utils/store');

App({
  onLaunch() {
    store.initSampleData();
    this.startChargeChecker();
  },

  onShow() {
    store.processDueCharges();
  },

  startChargeChecker() {
    if (this.globalData.chargeTimer) return;
    this.globalData.chargeTimer = setInterval(() => {
      const receipts = store.processDueCharges();
      if (receipts.length > 0) {
        const pages = getCurrentPages();
        const current = pages[pages.length - 1];
        if (current && typeof current.onDataChanged === 'function') {
          current.onDataChanged(receipts);
        }
      }
    }, 30000);
  },

  globalData: {
    chargeTimer: null,
  },
});
