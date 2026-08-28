# 获取永久在线链接（全程浏览器操作，无需安装任何软件）

部署完成后，你会得到一个固定网址，例如：

**https://badminton-court-manager.onrender.com**

任何电脑、手机用浏览器打开即可，不用装 Node、不用装 cloudflared。

---

## 第一步：把代码放到 GitHub（约 5 分钟）

1. 打开 https://github.com 注册/登录
2. 点击右上角 **+** → **New repository**
3. 仓库名填 `badminton-court-manager`，选 **Private（私有）**，创建
4. 按 GitHub 页面提示，在 Mac 终端运行（把 `你的用户名` 换成你的）：

```bash
cd /Users/rae/Documents/badminton-court-manager
git init
git add .
git commit -m "羽毛球馆管理系统"
git branch -M main
git remote add origin https://github.com/你的用户名/badminton-court-manager.git
git push -u origin main
```

> 如果还没有 git，Mac 终端运行 `xcode-select --install` 安装命令行工具。

---

## 第二步：部署到 Render 获得链接（约 5 分钟）

1. 打开 https://render.com 注册（可用 GitHub 账号直接登录）
2. 点击 **New +** → **Blueprint**
3. 连接你的 GitHub，选择 `badminton-court-manager` 仓库
4. Render 会自动读取 `render.yaml`，点击 **Apply**
5. 在环境变量页面设置：
   - `ADMIN_PASSWORD` → 你的登录密码（必改）
   - 其余可先留空，下一步配置数据库
6. 等待部署完成（约 2–3 分钟），获得链接：`https://xxxx.onrender.com`

此时已可访问，但**建议完成第三步**以免数据丢失。

---

## 第三步：配置云数据库保存数据（约 5 分钟，免费）

免费版 Render 重启后本地文件会清空，用 Supabase 免费云数据库可永久保存数据。

### 3.1 创建 Supabase 项目

1. 打开 https://supabase.com 注册
2. **New project** → 填项目名称 → 设置数据库密码 → 选离中国近的 region（如 Singapore）
3. 等待项目创建完成

### 3.2 建表

1. 左侧 **SQL Editor** → **New query**
2. 粘贴 `deploy/supabase-init.sql` 的内容，点击 **Run**

### 3.3 获取密钥

1. 左侧 **Project Settings** → **API**
2. 复制 **Project URL**（形如 `https://xxx.supabase.co`）
3. 复制 **service_role** 密钥（点击 Reveal，注意保密）

### 3.4 填入 Render

回到 Render → 你的服务 → **Environment**：

| 变量名 | 值 |
|--------|-----|
| `SUPABASE_URL` | 刚才复制的 Project URL |
| `SUPABASE_SERVICE_KEY` | 刚才复制的 service_role 密钥 |

保存后 Render 会自动重新部署。

---

## 完成！

打开你的 Render 链接，用以下账号登录：

- 账号：`admin`（或你在 `ADMIN_USERNAME` 设置的值）
- 密码：你在 `ADMIN_PASSWORD` 设置的值

把这个链接收藏到手机/电脑浏览器，随时打开使用。

---

## 常见问题

**打开链接很慢？**  
免费版休眠后首次访问需等待约 30 秒唤醒，之后恢复正常。

**换电脑能用吗？**  
可以，同一个链接，数据在云端同步。

**还要在电脑上运行 npm start 吗？**  
不需要。部署完成后电脑可以关机。

**如何改密码？**  
Render → Environment → 修改 `ADMIN_PASSWORD` → 保存。

**如何备份数据？**  
Supabase → Table Editor → `app_data` 表可查看/导出 JSON。

---

## 费用说明

| 服务 | 费用 |
|------|------|
| Render 免费版 | 0 元（有休眠，够日常使用） |
| Supabase 免费版 | 0 元（500MB 数据库，完全够用） |
| 域名（可选） | 可在 Render 绑定自己的域名 |

如需 24 小时不休眠，可升级 Render 至 Starter（约 $7/月）。
