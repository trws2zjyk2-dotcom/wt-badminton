const auth = require('../../utils/auth');
const store = require('../../utils/store');
const { todayStr } = require('../../utils/util');

Page({
  data: {
    date: '',
    grid: null,
    sessionName: '',
    showBookModal: false,
    showUnlockModal: false,
    bookingInfo: '',
    unlockInfo: '',
    unlockWarning: '',
    bookingTypes: [
      { value: 'member', label: '会员订场' },
      { value: 'walkin', label: '现场订场' },
      { value: 'online', label: '线上平台订场' },
    ],
    bookingType: 'member',
    memberName: '',
    memberNames: [],
    pricePreview: '',
    pricePreviewClass: '',
    pricePreviewError: false,
    memberNameHint: '点击选择会员',
    walkinPrice: '80',
    onlinePrice: '80',
    walkinPayments: [
      { value: 'cash', label: '现金订场' },
      { value: 'scan', label: '扫码支付' },
    ],
    walkinPayment: 'cash',
    pendingBooking: null,
    pendingUnlock: null,
  },

  onLoad() {
    this.setData({ date: todayStr() });
  },

  onShow() {
    if (!auth.requireAuth()) return;
    const session = auth.getSession();
    store.reloadData();
    const receipts = store.processDueCharges();
    if (receipts.length > 0) {
      wx.showToast({
        title: receipts.length > 1 ? `已自动扣费 ${receipts.length} 笔` : '已自动扣费',
        icon: 'none',
      });
    }
    this.setData({ sessionName: session.name });
    this.refreshGrid();
  },

  onDataChanged(receipts) {
    if (receipts && receipts.length > 0) {
      wx.showToast({
        title: receipts.length > 1 ? `已自动扣费 ${receipts.length} 笔` : '已自动扣费',
        icon: 'none',
      });
    }
    this.refreshGrid();
  },

  refreshGrid() {
    const grid = store.buildBookingGrid(this.data.date);
    this.setData({ grid });
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value }, () => this.refreshGrid());
  },

  onHolidayChange(e) {
    store.toggleHoliday(this.data.date, e.detail.value);
    this.refreshGrid();
  },

  stopBubble() {},

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出管理系统？',
      success: (res) => {
        if (res.confirm) {
          auth.logout();
          wx.reLaunch({ url: '/pages/login/login' });
        }
      },
    });
  },

  onCellTap(e) {
    const { courtId, hour, status } = e.currentTarget.dataset;
    const court = store.COURTS.find((c) => c.id === courtId);
    const date = this.data.date;
    const startHour = Number(hour);

    if (status === 'available') {
      const unified = store.getUnifiedPrice(courtId, date, startHour, store.isHolidayForPricing);
      const defaultPrice = unified != null ? String(unified) : '80';
      const memberNames = store.getData().members.map((m) => m.name);
      this.setData({
        showBookModal: true,
        pendingBooking: { date, courtId, startHour },
        bookingType: 'member',
        memberName: '',
        memberNameHint: '点击选择会员',
        walkinPrice: defaultPrice,
        onlinePrice: defaultPrice,
        walkinPayment: 'cash',
        memberNames,
        bookingInfo: `日期：${date}\n场地：${court.name}\n时段：${store.slotLabel(startHour)}\n计费说明：会员订场在时段结束后自动扣费`,
        pricePreview: '请输入会员名称以预览价格对比',
        pricePreviewClass: '',
        pricePreviewError: false,
      });
    } else if (status === 'booked') {
      const booking = store.getBooking(date, courtId, startHour);
      let paymentInfo = booking.charged ? '（已扣费）' : '（待扣费，取消无需退款）';
      if (booking.type === 'walkin') {
        paymentInfo = `（${booking.walkinPayment === 'cash' ? '现金' : '扫码'}支付）`;
      } else if (booking.type === 'online') {
        paymentInfo = '（线上平台已支付）';
      }

      let priceDetail = '';
      if (booking.type === 'member' && booking.memberPrice != null) {
        priceDetail = `\n计价：会员表${booking.priceTable || ''} ${store.formatMoney(booking.memberPrice)} / 统一价 ${store.formatMoney(booking.unifiedPrice)} → 取低 ${store.formatMoney(booking.price)}`;
      }

      let unlockWarning = '该订场尚未扣费，取消后不会产生费用';
      if (booking.type === 'member' && booking.charged) {
        unlockWarning = '取消后将退还消费金额至会员余额';
      } else if (booking.type === 'walkin') {
        unlockWarning = '取消现场订场请确认已处理退款';
      } else if (booking.type === 'online') {
        unlockWarning = '取消线上平台订场请确认已在平台处理退款';
      }

      this.setData({
        showUnlockModal: true,
        pendingUnlock: { date, courtId, startHour },
        unlockInfo: `客户：${booking.memberName}\n场地：${court.name} · ${store.slotLabel(startHour)}\n费用：${store.formatMoney(booking.price)} ${paymentInfo}${priceDetail}`,
        unlockWarning,
      });
    }
  },

  onBookingTypeChange(e) {
    this.setData({ bookingType: e.detail.value }, () => this.updatePricePreview());
  },

  onMemberNameInput(e) {
    const name = e.detail.value;
    this.setData({
      memberName: name,
      memberNameHint: name || '点击选择会员',
    }, () => this.updatePricePreview());
  },

  onMemberPick(e) {
    const name = this.data.memberNames[e.detail.value];
    this.setData({
      memberName: name,
      memberNameHint: name || '点击选择会员',
    }, () => this.updatePricePreview());
  },

  updatePricePreview() {
    if (this.data.bookingType !== 'member' || !this.data.pendingBooking) return;
    const { courtId, date, startHour } = this.data.pendingBooking;
    const preview = store.calcPricePreview(this.data.memberName, courtId, date, startHour);
    if (preview.error) {
      this.setData({ pricePreview: preview.error, pricePreviewClass: 'error', pricePreviewError: true });
    } else if (preview.hint) {
      this.setData({ pricePreview: preview.hint, pricePreviewClass: '', pricePreviewError: false });
    } else {
      const warn = preview.enough ? '' : '\n⚠ 余额可能不足，请提醒会员充值';
      this.setData({
        pricePreview: `会员价：${preview.memberPriceText} · 统一价：${preview.unifiedPriceText}\n预计扣费：${preview.finalText}（${preview.sourceText}）\n当前余额：${preview.balanceText}${warn}`,
        pricePreviewClass: preview.enough ? '' : 'error',
        pricePreviewError: !preview.enough,
      });
    }
  },

  onWalkinPriceInput(e) {
    this.setData({ walkinPrice: e.detail.value });
  },

  onOnlinePriceInput(e) {
    this.setData({ onlinePrice: e.detail.value });
  },

  onWalkinPaymentChange(e) {
    this.setData({ walkinPayment: e.detail.value });
  },

  closeBookModal() {
    this.setData({ showBookModal: false, pendingBooking: null });
  },

  closeUnlockModal() {
    this.setData({ showUnlockModal: false, pendingUnlock: null });
  },

  confirmBooking() {
    const { pendingBooking, bookingType, memberName, walkinPrice, onlinePrice, walkinPayment } = this.data;
    if (!pendingBooking) return;

    let result;
    if (bookingType === 'member') {
      const member = store.findMemberByName(memberName);
      if (!member) {
        wx.showToast({ title: '未找到该会员', icon: 'none' });
        return;
      }
      result = store.lockMemberBooking(
        pendingBooking.date,
        pendingBooking.courtId,
        pendingBooking.startHour,
        member.id
      );
    } else if (bookingType === 'walkin') {
      result = store.lockWalkinBooking(
        pendingBooking.date,
        pendingBooking.courtId,
        pendingBooking.startHour,
        walkinPrice,
        walkinPayment
      );
    } else {
      result = store.lockOnlineBooking(
        pendingBooking.date,
        pendingBooking.courtId,
        pendingBooking.startHour,
        onlinePrice
      );
    }

    if (result.ok) {
      this.closeBookModal();
      this.refreshGrid();
      wx.showToast({ title: result.msg, icon: 'none', duration: 2500 });
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
  },

  confirmUnlock() {
    const { pendingUnlock } = this.data;
    if (!pendingUnlock) return;
    const result = store.unlockBooking(
      pendingUnlock.date,
      pendingUnlock.courtId,
      pendingUnlock.startHour
    );
    if (result.ok) {
      this.closeUnlockModal();
      this.refreshGrid();
      wx.showToast({ title: '已取消锁定', icon: 'success' });
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
  },

  onShareAppMessage() {
    return { title: '羽毛球馆订场管理' };
  },
});
