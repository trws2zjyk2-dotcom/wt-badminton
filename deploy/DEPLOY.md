# 云服务器部署指南

将羽毛球馆管理系统部署到云服务器，获得**固定域名 + HTTPS + 24 小时在线**。

## 你需要准备

| 项目 | 说明 | 参考费用 |
|------|------|----------|
| 云服务器 | 阿里云 / 腾讯云 / 华为云 轻量应用服务器 | 约 50–100 元/月 |
| 域名 | 在云平台或万网购买 `.com` / `.cn` 域名 | 约 30–60 元/年 |
| 配置建议 | 1 核 CPU、1–2 GB 内存、Ubuntu 22.04 | 足够使用 |

## 一、购买并初始化服务器

1. 购买轻量应用服务器，系统选择 **Ubuntu 22.04**
2. 在云平台安全组/防火墙中**开放端口 80 和 443**
3. 用 SSH 登录服务器：

```bash
ssh root@你的服务器IP
```

## 二、上传项目代码

**方式 A：Git 克隆（推荐）**

```bash
cd /opt
git clone <你的仓库地址> badminton-court-manager
cd badminton-court-manager
```

**方式 B：本地上传**

在 Mac 终端运行：

```bash
cd /Users/rae/Documents
scp -r badminton-court-manager root@你的服务器IP:/opt/
ssh root@你的服务器IP
cd /opt/badminton-court-manager
```

## 三、一键部署

```bash
chmod +x deploy/install.sh deploy/ssl-setup.sh
sudo ./deploy/install.sh
```

完成后可用 `http://服务器IP` 访问。

脚本会自动：
- 安装 Docker
- 生成 `.env` 配置文件（含随机密码）
- 启动应用 + Nginx

查看管理员密码：

```bash
cat .env | grep ADMIN
```

## 四、绑定域名 + 开启 HTTPS

### 1. 配置 DNS

在域名管理后台添加 **A 记录**：

| 记录类型 | 主机记录 | 记录值 |
|----------|----------|--------|
| A | @ | 你的服务器 IP |
| A | www | 你的服务器 IP |

等待 5–30 分钟生效。

### 2. 修改配置

```bash
nano .env
```

修改：

```
DOMAIN=你的域名.com
ADMIN_PASSWORD=你的强密码
```

### 3. 申请 SSL 证书

```bash
sudo ./deploy/ssl-setup.sh
```

完成后访问：**https://你的域名.com**

## 五、日常运维

```bash
cd /opt/badminton-court-manager

# 查看运行状态
docker compose -f docker-compose.run.yml ps

# 查看日志
docker compose -f docker-compose.run.yml logs -f app

# 重启服务
docker compose -f docker-compose.run.yml restart

# 更新代码后重新部署
git pull
docker compose -f docker-compose.run.yml up -d --build
```

### 数据备份

所有业务数据保存在 Docker 卷中，备份命令：

```bash
docker compose -f docker-compose.run.yml exec app cat /data/data.json > backup-$(date +%Y%m%d).json
```

建议设置每周自动备份到对象存储。

## 六、安全建议

1. **立即修改** `.env` 中的 `ADMIN_PASSWORD` 和 `SESSION_SECRET`
2. 不要使用默认密码 `admin123`
3. 仅将网址分享给管理人员
4. 定期备份 `data.json`
5. 云平台安全组仅开放 80、443、22（SSH）端口

## 七、常见问题

**打不开网页？**
- 检查安全组是否开放 80/443
- 运行 `docker compose -f docker-compose.run.yml ps` 确认容器在运行

**登录后闪退？**
- 确认使用了 HTTPS（`ssl-setup.sh` 之后）
- 检查 `SESSION_SECRET` 是否被修改后未重启

**如何添加第二个管理员？**
- 当前版本通过 `.env` 配置单个管理员；如需多个账号，编辑 `server/config.js` 后重新 build

## 八、没有域名，只用 IP 访问

运行 `install.sh` 后直接用 `http://服务器IP` 访问即可，无需执行 `ssl-setup.sh`。

> IP 访问为 HTTP 明文传输，建议正式使用务必配置域名和 HTTPS。
