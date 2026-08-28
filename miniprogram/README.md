# 羽毛球馆管理系统 · 微信小程序

威腾羽毛球馆会员充值、订场锁定、分时段定价与收入统计的微信小程序版本。

## 功能

- 管理人员账号密码登录
- 每日订场表（会员 / 现场 / 线上平台订场）
- 每日统一价格表
- 会员管理与充值
- 每日收入统计
- 本地数据存储（`wx.storage`）

## 快速开始

### 1. 安装微信开发者工具

下载：[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

### 2. 导入项目

1. 打开微信开发者工具
2. 选择「导入项目」
3. 目录选择本仓库根目录 `badminton-court-manager`（包含 `project.config.json`）
4. AppID 可先选「测试号」或使用自己的小程序 AppID

### 3. 编译运行

导入后点击「编译」即可在模拟器中预览。

## 默认管理账号

| 账号 | 密码 | 角色 |
|------|------|------|
| `admin` | `admin123` | 系统管理员 |
| `manager` | `wt2024` | 前台管理 |

**正式使用前请务必修改密码**，编辑文件：

```
miniprogram/utils/config.js
```

中的 `ADMIN_USERS` 数组。

## 项目结构

```
miniprogram/
├── app.js / app.json / app.wxss   # 小程序入口
├── utils/
│   ├── config.js                  # 场地配置、管理账号
│   ├── auth.js                    # 登录鉴权
│   ├── store.js                   # 业务逻辑与数据存储
│   ├── prices.js                  # 价格表
│   └── util.js                    # 工具函数
└── pages/
    ├── login/                     # 登录页
    ├── booking/                   # 每日订场表
    ├── prices/                    # 每日价格表
    ├── members/                   # 会员列表
    ├── member-detail/             # 会员详情
    └── income/                    # 收入统计
```

## 注意事项

1. **数据存储**：当前版本数据保存在每台设备的本地存储中，不同手机之间不会自动同步。如需多设备共享数据，建议接入微信云开发或自建后端 API。
2. **安全性**：账号密码目前保存在小程序代码配置中，仅适用于内部管理人员使用。上线前建议接入服务端鉴权。
3. **Web 版保留**：原 `index.html` Web 版仍可使用，数据与小程序相互独立。

## 发布上线

1. 在微信公众平台注册小程序并获取 AppID
2. 将 `project.config.json` 中的 `appid` 替换为你的 AppID
3. 修改管理账号密码
4. 在微信开发者工具中点击「上传」提交审核
