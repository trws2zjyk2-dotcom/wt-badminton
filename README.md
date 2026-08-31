# 羽毛球馆会员订场管理系统

威腾羽毛球馆会员充值、订场锁定、分时段定价与收入统计系统。

## 推荐：获取永久在线链接

**无需在电脑安装任何软件**，部署一次后，任何设备用浏览器打开链接即可使用。

👉 **完整步骤见：[ONLINE.md](ONLINE.md)**（全程浏览器操作，约 15 分钟）

完成后你将获得类似这样的固定网址：

```
https://badminton-court-manager.onrender.com
```

---

## 功能

1. **每日订场表** — 工作日 9:00–23:00、周末及节假日 8:00–23:00
2. **每日价格表** — 统一价格表，按日期/场地/时段展示
3. **六套价格表** — 统一价 + 会员价 A/B/C/D/E，按时段与场地类型自动计价
4. **最低价扣费** — 会员订场时对比会员价与统一价，取较低者扣费
5. **会员管理** — 每位会员选择应用的价格表（A–E）
6. **现场订场** — 现金/扫码，默认按统一价
7. **线上平台订场** — 第三方平台订单锁定
8. **延后扣费** — 时段结束后自动扣费并生成消费清单
9. **每日收入统计** — 支持 CSV 导出
10. **管理人员登录** — 账号密码保护，手机/电脑浏览器均可访问

## 价格表说明

| 表名 | 用途 |
|------|------|
| 统一价格表 | 每日公示价，非会员及比价基准 |
| 会员价格表 A–F | 会员专属价，订场时与统一价取低 |

场地分类：
- **A1–A9** 标准场（A馆）
- **B1–B5** 豪华场（B馆）
- **VIP1–VIP2** VIP 贵宾场

## 启动网站（推荐）

需要安装 [Node.js](https://nodejs.org/)（18 或以上）。

**方式一：一键启动（Mac/Linux）**

```bash
cd /Users/rae/Documents/badminton-court-manager
./start.sh
```

**方式二：手动启动**

```bash
cd /Users/rae/Documents/badminton-court-manager
npm install
npm start
```

启动后在浏览器打开：

- **本机**：http://localhost:3000
- **手机（同一 WiFi）**：http://你的电脑IP:3000

查看电脑 IP：Mac 终端运行 `ipconfig getifaddr en0`

> 注意：必须通过 `npm start` 或 `./start.sh` 启动，不要直接双击打开 HTML 文件，否则登录和数据同步无法使用。

### 默认管理账号

| 账号 | 密码 | 角色 |
|------|------|------|
| `admin` | `admin123` | 系统管理员 |
| `manager` | `wt2024` | 前台管理 |

**正式使用前请修改密码**，编辑 `server/config.js` 中的 `ADMIN_USERS`。

### 数据存储

启动服务器后，所有订场/会员数据保存在 `server/data.json`，手机与电脑访问同一地址时数据自动同步。

## 外网访问（不在同一 WiFi 也能打开）

通过 **Cloudflare 免费隧道**，把本机服务暴露到公网，手机用流量、人在外面也能访问。

### 第一步：安装 cloudflared（只需一次）

```bash
brew install cloudflared
```

没有 Homebrew 可从 [Cloudflare 官网](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) 下载。

### 第二步：启动公网模式

```bash
cd /Users/rae/Documents/badminton-court-manager
chmod +x start-public.sh
./start-public.sh
```

或：

```bash
npm run start:public
```

终端会显示类似：

```
✅ 公网访问地址（手机流量/任意网络均可打开）：

   https://xxxx-xxxx.trycloudflare.com
```

把这个链接发到手机，用浏览器打开即可登录使用。

### 注意事项

| 说明 | |
|------|------|
| 链接有效期 | 关闭终端后链接失效，下次启动会生成新链接 |
| 安全性 | 务必修改 `server/config.js` 中的默认密码 |
| 电脑需开机 | 外网访问时电脑必须保持运行且不要休眠 |
| 长期稳定使用 | 建议购买云服务器部署（阿里云/腾讯云等），需要可继续协助 |

### 局域网访问（同一 WiFi，无需公网）

```bash
npm start
```

手机访问 `http://电脑IP:3000`（查 IP：`ipconfig getifaddr en0`）

## 云服务器部署（长期稳定 + 固定域名）

适合需要 **24 小时在线、固定网址、HTTPS 安全访问** 的场景。

### 你需要准备

- 云服务器（阿里云/腾讯云轻量服务器，约 50 元/月起）
- 域名（约 30 元/年，可选但推荐）

### 快速部署（3 步）

```bash
# 1. SSH 登录服务器后，上传代码到 /opt/badminton-court-manager
# 2. 一键安装
chmod +x deploy/install.sh deploy/ssl-setup.sh
sudo ./deploy/install.sh

# 3. 绑定域名后开启 HTTPS
sudo ./deploy/ssl-setup.sh
```

部署完成后访问 `https://你的域名.com`，手机流量、外出均可使用。

**完整图文教程见：[deploy/DEPLOY.md](deploy/DEPLOY.md)**

## 其他使用方式

### 仅本地打开（无登录、无多设备同步）

```bash
open index.html
```

数据保存在浏览器 `localStorage`，各设备独立。

### 微信小程序版

详见 [miniprogram/README.md](miniprogram/README.md)。

## 文件结构

- `login.html` — 管理人员登录页
- `index.html` — 主系统页面
- `styles.css` — 样式（含手机适配）
- `prices.js` — 六套价格表数据与查价逻辑
- `app.js` — 业务逻辑
- `server/` — Web 服务器（登录鉴权 + 数据 API）
- `miniprogram/` — 微信小程序源码
- `package.json` — Node.js 依赖与启动脚本
