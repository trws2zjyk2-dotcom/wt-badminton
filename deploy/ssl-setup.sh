#!/bin/bash
# 为已部署的系统申请免费 SSL 证书（Let's Encrypt）
set -e

cd "$(dirname "$0")/.."

if [ "$(id -u)" -ne 0 ]; then
  echo "  请使用 root 运行: sudo ./deploy/ssl-setup.sh"
  exit 1
fi

if [ ! -f .env ]; then
  echo "  ❌ 未找到 .env，请先运行 ./deploy/install.sh"
  exit 1
fi

source .env

if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "your-domain.com" ]; then
  echo "  ❌ 请先在 .env 中设置 DOMAIN=你的域名"
  exit 1
fi

echo ""
echo "  正在为 ${DOMAIN} 申请 SSL 证书..."
echo ""

# 临时停止 nginx 占用 80 端口
docker compose -f docker-compose.run.yml stop nginx 2>/dev/null || true

apt-get update -qq
apt-get install -y certbot

mkdir -p deploy/ssl

certbot certonly --standalone \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --preferred-challenges http

cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" deploy/ssl/fullchain.pem
cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" deploy/ssl/privkey.pem

# 切换到 HTTPS 配置
cat > docker-compose.run.yml <<EOF
services:
  app:
    build: .
    restart: unless-stopped
    env_file: .env
    environment:
      NODE_ENV: production
      TRUST_PROXY: "true"
      SESSION_SECURE: "true"
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
      - "443:443"
    volumes:
      - ./deploy/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./deploy/ssl:/etc/nginx/ssl:ro
      - certbot-www:/var/www/certbot:ro
    depends_on:
      - app
    networks:
      - web

volumes:
  badminton-data:
  certbot-www:

networks:
  web:
EOF

docker compose -f docker-compose.run.yml up -d

echo ""
echo "  ✅ HTTPS 已启用！"
echo ""
echo "  访问地址: https://${DOMAIN}"
echo ""
echo "  证书自动续期（添加到 crontab）:"
echo "    0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/${DOMAIN}/*.pem $(pwd)/deploy/ssl/ && docker compose -f $(pwd)/docker-compose.run.yml restart nginx"
echo ""
