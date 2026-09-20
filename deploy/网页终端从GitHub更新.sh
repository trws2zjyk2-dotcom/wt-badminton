#!/bin/bash
# 在腾讯云控制台 → 登录 → 网页终端 中粘贴整段运行（无需 scp、无需本地上传）
set -e

cd ~/badminton-court-manager 2>/dev/null || cd /root/badminton-court-manager || {
  echo "❌ 找不到 ~/badminton-court-manager，请先确认项目目录"
  exit 1
}

BASE="https://raw.githubusercontent.com/trws2zjyk2-dotcom/wt-badminton/main"
echo ">>> 从 GitHub 拉取最新代码（不覆盖 .env 与数据）..."

fetch() {
  curl -fsSL "$BASE/$1" -o "$1"
  echo "  ✓ $1"
}

fetch app.js
fetch index.html
fetch styles.css
fetch login.html
fetch prices.js
fetch server/charges.js
fetch server/storage.js
fetch server/index.js
fetch server/config.js
fetch Dockerfile
fetch docker-compose.run.yml
fetch package.json

echo ">>> 重建并启动容器（约 1～3 分钟）..."
sudo docker compose -f docker-compose.run.yml up -d --build

echo ""
echo "=========================================="
echo "  ✅ 更新完成"
echo "  打开 http://106.55.250.32 登录验证"
echo "  · 会员清单按订场时间排序"
echo "  · 服务端自动扣费 / 补扣到期订场"
echo "=========================================="
