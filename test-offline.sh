#!/bin/bash

echo "🔧 PWA 离线测试脚本"
echo "===================="
echo ""

# 检查 dist 目录
if [ ! -d "dist" ]; then
    echo "❌ dist 目录不存在，请先运行 pnpm run build"
    exit 1
fi

echo "✅ dist 目录存在"

# 检查关键文件
files=("dist/index.html" "dist/sw.js" "dist/manifest.webmanifest")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 不存在"
        exit 1
    fi
done

echo ""
echo "📦 Service Worker 内容检查："
echo "----------------------------"

# 检查 SW 中的关键内容
if grep -q "precacheAndRoute" dist/sw.js; then
    echo "✅ precacheAndRoute 已包含"
else
    echo "❌ precacheAndRoute 未找到"
fi

if grep -q "navigate" dist/sw.js; then
    echo "✅ 导航处理已包含"
else
    echo "❌ 导航处理未找到"
fi

if grep -q "gitee-api-cache" dist/sw.js; then
    echo "✅ Gitee API 缓存已配置"
else
    echo "❌ Gitee API 缓存未配置"
fi

if grep -q "gitee-blob-cache" dist/sw.js; then
    echo "✅ Gitee Blob 缓存已配置"
else
    echo "❌ Gitee Blob 缓存未配置"
fi

echo ""
echo "🚀 启动预览服务器："
echo "----------------------------"
echo "运行命令: pnpm run preview"
echo ""
echo "然后访问: http://localhost:4173/gitee-music-player/"
echo ""
echo "测试步骤："
echo "1. 打开浏览器 DevTools (F12)"
echo "2. 进入 Network 标签"
echo "3. 选择 'Offline' 模式"
echo "4. 刷新页面 (Cmd+R 或 Ctrl+R)"
echo "5. 页面应该正常加载 ✅"
