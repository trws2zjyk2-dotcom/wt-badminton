# 羽毛球馆会员订场管理系统

威腾羽毛球馆会员充值、订场锁定、分时段定价与收入统计系统。

## 功能

1. **每日订场表** — 工作日 9:00–23:00、周末及节假日 8:00–23:00
2. **每日价格表** — 统一价格表，按日期/场地/时段展示
3. **六套价格表** — 统一价 + 会员价 A/B/C/D/E，按时段与场地类型自动计价
4. **最低价扣费** — 会员订场时对比会员价与统一价，取较低者扣费
5. **会员管理** — 每位会员选择应用的价格表（A–E）
6. **现场订场** — 现金/扫码，默认按统一价
7. **线上平台订场** — 第三方平台订单锁定
8. **延后扣费** — 时段结束后自动扣费并生成消费清单
9. **每日收入统计** — 支持 CSV 导出（Web 版）

## 价格表说明

| 表名 | 用途 |
|------|------|
| 统一价格表 | 每日公示价，非会员及比价基准 |
| 会员价格表 A–E | 会员专属价，订场时与统一价取低 |

场地分类：
- **A1–A9** 标准场（A馆）
- **B1–B5** 豪华场（B馆）
- **VIP1–VIP2** VIP 贵宾场

## 使用方式

### Web 版（浏览器）

```bash
open /Users/rae/Documents/badminton-court-manager/index.html
```

或：

```bash
cd /Users/rae/Documents/badminton-court-manager
python3 -m http.server 8080
```

数据保存在浏览器 `localStorage`。

### 微信小程序版

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入本项目根目录（含 `project.config.json`）
3. 编译运行，使用管理账号登录

| 账号 | 密码 | 角色 |
|------|------|------|
| `admin` | `admin123` | 系统管理员 |
| `manager` | `wt2024` | 前台管理 |

详细说明见 [miniprogram/README.md](miniprogram/README.md)。正式使用前请在 `miniprogram/utils/config.js` 修改密码。

## 文件结构

- `index.html` — Web 版页面结构
- `styles.css` — Web 版样式
- `prices.js` — 六套价格表数据与查价逻辑
- `app.js` — Web 版业务逻辑
- `miniprogram/` — 微信小程序完整源码
- `project.config.json` — 微信开发者工具项目配置
