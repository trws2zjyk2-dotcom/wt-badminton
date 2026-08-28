#!/bin/bash
# 启动系统并创建公网访问链接（外网任意地点可打开）
cd "$(dirname "$0")"

PORT="${PORT:-3000}"
SERVER_PID=""
TUNNEL_PID=""

cleanup() {
  echo ""
  echo "  正在关闭..."
  [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

if ! command -v node >/dev/null 2>&1; then
  echo "  ❌ 请先安装 Node.js: https://nodejs.org/"
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo ""
  echo "  ❌ 未安装 cloudflared（用于创建公网链接）"
  echo ""
  echo "  请先安装："
  echo "    brew install cloudflared"
  echo ""
  echo "  或访问: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  echo ""
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "  正在安装依赖..."
  npm install
fi

echo ""
echo "  🏸 正在启动羽毛球馆管理系统（公网模式）..."
echo ""

export TRUST_PROXY=true
export SESSION_SECURE=true
export PORT

node server/index.js &
SERVER_PID=$!
sleep 1

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "  ❌ 服务器启动失败"
  exit 1
fi

LOG_FILE=$(mktemp)
cloudflared tunnel --url "http://localhost:${PORT}" 2>&1 | tee "$LOG_FILE" &
TUNNEL_PID=$!

echo "  正在创建公网链接，请稍候..."
echo ""

PUBLIC_URL=""
for i in $(seq 1 30); do
  PUBLIC_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | head -1)
  if [ -n "$PUBLIC_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$PUBLIC_URL" ]; then
  echo "  ❌ 公网链接创建失败，请检查网络后重试"
  cleanup
  exit 1
fi

echo "  ✅ 公网访问地址（手机流量/任意网络均可打开）："
echo ""
echo "     $PUBLIC_URL"
echo ""
echo "  默认账号: admin / admin123"
echo "  前台账号: manager / wt2024"
echo ""
echo "  ⚠️  请妥善保管此链接，任何人知道链接和密码均可登录"
echo "  ⚠️  关闭此终端窗口后，公网链接将失效"
echo "  ⚠️  正式使用前请在 server/config.js 修改密码"
echo ""
echo "  按 Ctrl+C 停止服务"
echo ""

wait "$TUNNEL_PID"
