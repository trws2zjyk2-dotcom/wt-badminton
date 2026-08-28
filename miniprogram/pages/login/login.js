const auth = require('../../utils/auth');

Page({
  data: {
    username: '',
    password: '',
    loading: false,
  },

  onLoad() {
    if (auth.isLoggedIn()) {
      wx.switchTab({ url: '/pages/booking/booking' });
    }
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  onLogin() {
    const { username, password } = this.data;
    if (!username.trim()) {
      wx.showToast({ title: '请输入账号', icon: 'none' });
      return;
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    const result = auth.login(username, password);
    this.setData({ loading: false });

    if (result.ok) {
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/booking/booking' });
      }, 400);
    } else {
      wx.showToast({ title: result.msg, icon: 'none' });
    }
  },
});
