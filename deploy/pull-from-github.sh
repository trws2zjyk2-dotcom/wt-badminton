#!/bin/bash
# 在腾讯云「网页终端」里运行，无需本地上传文件
set -e

REPO="${1:-https://github.com/trws2zjyk2-dotcom/wt-badminton.git}"
DIR="${2:-$HOME/badminton-court-manager}"

echo "目标目录: $DIR"
mkdir -p "$DIR"
cd "$DIR"

if [ -d .git ]; then
  git pull origin main
else
  git clone "$REPO" .
fi

sudo docker compose -f docker-compose.run.yml up -d --build
echo ""
echo "部署完成。请打开网站登录验证。"
