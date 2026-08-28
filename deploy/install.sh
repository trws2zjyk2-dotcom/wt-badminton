#!/bin/bash
# 云服务器一键部署脚本（Ubuntu 22.04 / Debian）
set -e

cd "$(dirname "$0")/.."

echo ""
echo "  🏸 羽毛球馆管理系统 - 云服务器部署"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo "  请使用 root 运行: sudo ./deploy/install.sh"
  exit 1
fi

# 安装 Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "  正在安装 Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "  正在安装 Docker Compose 插件..."
  apt-get update -qq
  apt-get install -y docker-compose-plugin
fi

# 创建 .env
if [ ! -f .env ]; then
  cp .env.example .env
  RANDOM_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)
  sed -i "s/请改成强密码/Badminton$(openssl rand -hex 4 2>/dev/null || echo 2024)/" .env
  sed -i "s/请改成随机长字符串/${RANDOM_SECRET}/" .env
  echo ""
  echo "  ✅ 已生成 .env 配置文件"
  echo "  ⚠️  请编辑 .env 修改 ADMIN_PASSWORD 和 DOMAIN"
  echo ""
fi

# 先用 HTTP 模式（无 SSL）启动，方便测试
cp deploy/nginx-http-only.conf deploy/nginx-active.conf
mkdir -p deploy/ssl
# 自签名占位（nginx https 配置需要文件存在时才用 active https conf）
touch deploy/ssl/.gitkeep

# 使用 HTTP-only nginx 配置
sed 's|./deploy/nginx.conf|./deploy/nginx-http-only.conf|' docker-compose.yml > docker-compose.tmp.yml 2>/dev/null || true

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

echo "  正在构建并启动服务..."
docker compose -f docker-compose.run.yml up -d --build

IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ip.sb 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "  ✅ 部署完成！"
echo ""
echo "  访问地址: http://${IP}"
echo ""
echo "  默认账号见 .env 文件（ADMIN_USERNAME / ADMIN_PASSWORD）"
echo ""
echo "  下一步（绑定域名 + HTTPS）:"
echo "    1. 域名 DNS 添加 A 记录指向服务器 IP: ${IP}"
echo "    2. 编辑 .env 设置 DOMAIN=你的域名"
echo "    3. 运行: sudo ./deploy/ssl-setup.sh"
echo ""
echo "  常用命令:"
echo "    查看日志: docker compose -f docker-compose.run.yml logs -f"
echo "    重启服务: docker compose -f docker-compose.run.yml restart"
echo "    停止服务: docker compose -f docker-compose.run.yml down"
echo ""
