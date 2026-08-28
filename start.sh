#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  ❌ 未检测到 Node.js"
  echo ""
  echo "  请先安装 Node.js: https://nodejs.org/"
  echo "  推荐安装 LTS 版本，安装后重新运行此脚本"
  echo ""
  exit 1
fi

echo ""
echo "  🏸 羽毛球馆管理系统 - 正在启动..."
echo ""

if [ ! -d "node_modules" ]; then
  echo "  首次运行，正在安装依赖..."
  npm install
  echo ""
fi

npm start
