#!/bin/bash
# 在本机 Mac 终端运行（项目根目录）：
#   chmod +x deploy/本地推送到云服务器.sh && ./deploy/本地推送到云服务器.sh
#
# 首次连接会要求微信扫码登录腾讯云 SSH，按提示完成即可。
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SERVER="${DEPLOY_SERVER:-106.55.250.32}"
USER="${DEPLOY_USER:-ubuntu}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/home/ubuntu/badminton-court-manager}"
ZIP="/tmp/badminton-local-deploy.zip"

echo ">>> 打包本地代码（不含 .env / node_modules / 数据）..."
rm -f "$ZIP"
zip -r "$ZIP" \
  app.js index.html styles.css login.html prices.js \
  Dockerfile package.json package-lock.json \
  server deploy \
  -x "*/node_modules/*" "*/.git/*" "deploy/ssl/*" "*.DS_Store" \
  "douyin_odyssey_images/*" "*/douyin_odyssey_images/*"

echo ">>> 上传到 ${USER}@${SERVER} ..."
scp "$ZIP" "${USER}@${SERVER}:~/badminton-local-deploy.zip"

echo ">>> 在服务器解压并重建 Docker（保留 .env 与数据库卷）..."
ssh "${USER}@${SERVER}" bash -s <<REMOTE
set -e
mkdir -p "$REMOTE_DIR"
cd "$REMOTE_DIR"
unzip -o ~/badminton-local-deploy.zip
rm -f ~/badminton-local-deploy.zip
if [ ! -f docker-compose.run.yml ]; then
  echo "未找到 docker-compose.run.yml，正在生成 HTTP 配置..."
  cat > docker-compose.run.yml <<'EOF'
services:
  app:
    build: .
    restart: unless-stopped
    env_file: .env
    environment:
      NODE_ENV: production
      TRUST_PROXY: "true"
      SESSION_SECURE: "false"
      DATA_FILE: /data/data.json
    volumes:
      - badminton-data:/data
    networks:
      - web
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./deploy/nginx-http-only.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
    networks:
      - web
volumes:
  badminton-data:
networks:
  web:
EOF
fi
sudo docker compose -f docker-compose.run.yml build --no-cache app
sudo docker compose -f docker-compose.run.yml up -d
echo ""
echo "✅ 服务器已用本机代码更新完成"
wc -c app.js | awk '{print "app.js 大小:", \$1, "字节"}'
REMOTE

echo ""
echo "=========================================="
echo "  完成：http://${SERVER}"
echo "  浏览器请 Cmd+Shift+R 强制刷新"
echo "=========================================="
