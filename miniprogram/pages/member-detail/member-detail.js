const auth = require('../../utils/auth');
const store = require('../../utils/store');
const { getMemberPriceTableOptions } = require('../../utils/prices');
const { RECHARGE_TIERS } = require('../../utils/config');

Page({
  data: {
    memberId: '',
    member: null,
    showRechargeModal: false,
    showEditModal: false,
    showReceiptModal: false,
    rechargeAmount: '',
    rechargeBonus: 0,
    rechargePreview: '',
    selectedRechargeTierPay: 0,
    rechargeTiers: RECHARGE_TIERS.map((tier) => ({
      ...tier,
      label: `充${tier.pay}送${tier.bonus}`,
    })),
    rechargeItem: '储值卡充值',
    editName: '',
    editPriceTable: 'A',
    priceTableOptions: getMemberPriceTableOptions(),
    priceTableLabels: getMemberPriceTableOptions().map((o) => o.name),
    priceTableIndex: 0,
    editPriceTableLabel: '',
    receiptText: '',
    receiptLines: [],
  },

  onLoad(options) {
    this.setData({ memberId: options.id });
  },

  onShow() {
    if (!auth.requireAuth()) return;
    store.reloadData();
    this.refreshDetail();
  },

  refreshDetail() {
    const member = store.getMemberDetail(this.data.memberId);
    if (!member) {
      wx.showToast({ title: '会员不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 500);
      return;
    }
    this.setData({ member });
  },

  stopBubble() {},

  onRechargeTap() {
    this.setData({
      showRechargeModal: true,
      rechargeAmount: '',
      rechargeBonus: 0,
      rechargePreview: '',
      selectedRechargeTierPay: 0,
      rechargeItem: '储值卡充值',
    });
  },

  onEditTap() {
    const m = this.data.member;
    const idx = this.data.priceTableOptions.findIndex((o) => o.id === m.priceTable);
    this.setData({
      showEditModal: true,
      editName: m.name,
      editPriceTable: m.priceTable,
      priceTableIndex: idx >= 0 ? idx : 0,
      editPriceTableLabel: this.data.priceTableLabels[idx >= 0 ? idx : 0],
    });
  },

  onDeleteTap() {
    wx.showModal({
      title: '删除会员',
      content: `确定删除会员「${this.data.member.name}」？`,
      success: (res) => {
        if (res.confirm) {
          const result = store.deleteMember(this.data.memberId);
          if (result.ok) {
            wx.showToast({ title: '会员已删除', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 500);
          } else {
            wx.showToast({ title: result.msg, icon: 'none' });
          }
        }
      },
    });
  },

  closeRechargeModal() {
    this.setData({ showRechargeModal: false });
  },

  closeEditModal() {
    this.setData({ showEditModal: false });
  },

  closeReceiptModal() {
    this.setData({ showReceiptModal: false });
  },

  onRechargeAmountInput(e) {
    const amount = Number(e.detail.value);
    const tier = RECHARGE_TIERS.find((t) => t.pay === amount);
    if (tier) {
      this.setData({
        rechargeAmount: e.detail.value,
        rechargeBonus: tier.bonus,
        selectedRechargeTierPay: tier.pay,
        rechargeItem: `储值卡充值（充${tier.pay}送${tier.bonus}）`,
        rechargePreview: `实付 ¥${tier.pay}，赠送 ¥${tier.bonus}，到账 ¥${tier.pay + tier.bonus}`,
      });
      return;
    }
    this.setData({
      rechargeAmount: e.detail.value,
      rechargeBonus: 0,
      selectedRechargeTierPay: 0,
      rechargeItem: this.data.rechargeItem.startsWith('储值卡充值（充') ? '储值卡充值' : this.data.rechargeItem,
      rechargePreview: '',
    });
  },

  onRechargeTierTap(e) {
    const pay = Number(e.currentTarget.dataset.pay);
    const bonus = Number(e.currentTarget.dataset.bonus);
    this.setData({
      rechargeAmount: String(pay),
      rechargeBonus: bonus,
      selectedRechargeTierPay: pay,
      rechargeItem: `储值卡充值（充${pay}送${bonus}）`,
      rechargePreview: `实付 ¥${pay}，赠送 ¥${bonus}，到账 ¥${pay + bonus}`,
    });
  },

  onRechargeItemInput(e) {
    this.setData({ rechargeItem: e.detail.value });
  },

  onEditNameInput(e) {
    this.setData({ editName: e.detail.value });
  },

  onEditPriceTableChange(e) {
    const idx = Number(e.detail.value);
    const option = this.data.priceTableOptions[idx];
    this.setData({
      priceTableIndex: idx,
      editPriceTable: option.id,
      editPriceTableLabel: option.name,
    });
  },

  confirmRecharge() {
    const amount = Number(this.data.rechargeAmount);
    const bonus = Number(this.data.rechargeBonus) || 0;
    if (!amount || amount < 1) {
      wx.showToast({ title: '请输入有效充值金额', icon: 'none' });
      return;
    }
    if (store.rechargeMember(this.data.memberId, amount, this.data.rechargeItem, bonus)) {
      this.closeRechargeModal();
      this.refreshDetail();
      const total = amount + bonus;
      wx.showToast({
        title: bonus > 0 ? `到账 ¥${total}` : `充值成功 ¥${amount}`,
        icon: 'success',
      });
    }
  },

  confirmEdit() {
    if (!this.data.editName.trim()) {
      wx.showToast({ title: '请输入会员名称', icon: 'none' });
      return;
    }
    store.updateMember(this.data.memberId, this.data.editName, this.data.editPriceTable);
    this.closeEditModal();
    this.refreshDetail();
    wx.showToast({ title: '会员信息已更新', icon: 'success' });
  },

  onLedgerReceipt(e) {
    const ledgerId = e.currentTarget.dataset.id;
    const m = store.getMember(this.data.memberId);
    const entry = m.ledger.find((l) => l.id === ledgerId);
    if (!entry) return;
    const text = store.buildReceiptText(m, entry);
    this.setData({
      showReceiptModal: true,
      receiptText: text,
      receiptLines: [
        { label: '会员名称', value: m.name },
        { label: '消费时间', value: require('../../utils/util').formatDateTime(entry.time) },
        { label: '消费项目', value: entry.item },
        { label: '消费金额', value: store.formatMoney(entry.amount), highlight: true },
        { label: '账户余额', value: store.formatMoney(m.balance) },
      ],
    });
  },

  onLedgerDelete(e) {
    const ledgerId = e.currentTarget.dataset.id;
    const m = store.getMember(this.data.memberId);
    const entry = m.ledger.find((l) => l.id === ledgerId);
    const action = entry.type === 'consume' ? '消费' : '充值';
    wx.showModal({
      title: '删除记录',
      content: `确定删除该${action}记录？余额将相应调整。`,
      success: (res) => {
        if (res.confirm) {
          const result = store.deleteLedgerEntry(this.data.memberId, ledgerId);
          if (result.ok) {
            this.refreshDetail();
            wx.showToast({ title: '记录已删除', icon: 'success' });
          } else {
            wx.showToast({ title: result.msg, icon: 'none' });
          }
        }
      },
    });
  },

  copyReceipt() {
    wx.setClipboardData({
      data: this.data.receiptText,
      success: () => wx.showToast({ title: '清单已复制', icon: 'success' }),
    });
  },
});
