const auth = require('../../utils/auth');
const store = require('../../utils/store');
const { getMemberPriceTableOptions } = require('../../utils/prices');

Page({
  data: {
    keyword: '',
    members: [],
    showMemberModal: false,
    editingId: null,
    memberName: '',
    priceTable: 'A',
    balance: '0',
    priceTableOptions: getMemberPriceTableOptions(),
    priceTableLabels: getMemberPriceTableOptions().map((o) => o.name),
    priceTableIndex: 0,
    selectedPriceTableLabel: getMemberPriceTableOptions()[0].name,
    modalTitle: '新增会员',
    isEdit: false,
  },

  stopBubble() {},

  onShow() {
    if (!auth.requireAuth()) return;
    store.reloadData();
    this.refreshList();
  },

  refreshList() {
    this.setData({ members: store.searchMembers(this.data.keyword) });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value }, () => this.refreshList());
  },

  onMemberTap(e) {
    wx.navigateTo({ url: `/pages/member-detail/member-detail?id=${e.currentTarget.dataset.id}` });
  },

  onAddMember() {
    this.setData({
      showMemberModal: true,
      isEdit: false,
      editingId: null,
      modalTitle: '新增会员',
      memberName: '',
      priceTable: 'A',
      priceTableIndex: 0,
      selectedPriceTableLabel: this.data.priceTableLabels[0],
      balance: '0',
    });
  },

  closeMemberModal() {
    this.setData({ showMemberModal: false });
  },

  onMemberNameInput(e) {
    this.setData({ memberName: e.detail.value });
  },

  onBalanceInput(e) {
    this.setData({ balance: e.detail.value });
  },

  onPriceTableChange(e) {
    const idx = Number(e.detail.value);
    const option = this.data.priceTableOptions[idx];
    this.setData({
      priceTableIndex: idx,
      priceTable: option.id,
      selectedPriceTableLabel: option.name,
    });
  },

  saveMember() {
    const { memberName, priceTable, balance, isEdit, editingId } = this.data;
    if (!memberName.trim()) {
      wx.showToast({ title: '请输入会员名称', icon: 'none' });
      return;
    }
    if (isEdit) {
      store.updateMember(editingId, memberName, priceTable);
      wx.showToast({ title: '会员信息已更新', icon: 'success' });
    } else {
      const m = store.addMember(memberName, priceTable, balance);
      wx.showToast({ title: '会员已添加', icon: 'success' });
      wx.navigateTo({ url: `/pages/member-detail/member-detail?id=${m.id}` });
    }
    this.closeMemberModal();
    this.refreshList();
  },
});
