#!/bin/bash
# 先把本机 badminton-local-deploy.zip 上传到服务器家目录，再粘贴本脚本到网页终端运行
set -e

cd ~/badminton-court-manager 2>/dev/null || cd /root/badminton-court-manager || mkdir -p ~/badminton-court-manager && cd ~/badminton-court-manager

ZIP="$HOME/badminton-local-deploy.zip"
if [ ! -f "$ZIP" ]; then
  echo "❌ 未找到 ~/badminton-local-deploy.zip"
  echo "   请先在腾讯云控制台把本机 zip 上传到 /home/ubuntu/"
  exit 1
fi

echo ">>> 解压本地代码包（不覆盖 .env）..."
unzip -o "$ZIP"
rm -f "$ZIP"

if [ ! -f docker-compose.run.yml ]; then
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

echo ">>> 重建 Docker..."
sudo docker compose -f docker-compose.run.yml build --no-cache app
sudo docker compose -f docker-compose.run.yml up -d

echo "✅ 完成 app.js 大小: $(wc -c < app.js) 字节"
