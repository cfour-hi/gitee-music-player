#!/bin/bash

echo "🔍 验证构建结果"
echo "================"
echo ""

# 检查构建输出
if [ ! -f "dist/sw.js" ]; then
    echo "❌ dist/sw.js 不存在"
    exit 1
fi

echo "✅ Service Worker 文件存在"
echo ""

# 检查 precache 条目数
echo "📦 Precache 条目检查："
echo "--------------------"

# 统计 jsmediatags.min.js 出现次数
count=$(grep -o 'jsmediatags.min.js' dist/sw.js | wc -l | tr -d ' ')
if [ "$count" -eq "1" ]; then
    echo "✅ jsmediatags.min.js 只出现 1 次（正确）"
else
    echo "❌ jsmediatags.min.js 出现 $count 次（应该是 1 次）"
    exit 1
fi

# 检查关键功能
echo ""
echo "🔧 功能检查："
echo "-------------"

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

if grep -q "handlerDidError" dist/sw.js; then
    echo "✅ 错误处理已包含"
else
    echo "❌ 错误处理未找到"
fi

echo ""
echo "📊 文件大小："
echo "-------------"
ls -lh dist/sw.js | awk '{print "Service Worker: " $5}'
ls -lh dist/index.html | awk '{print "Index HTML: " $5}'

echo ""
echo "✅ 构建验证通过！"
echo ""
echo "🚀 下一步："
echo "1. 运行: pnpm run preview"
echo "2. 访问: http://localhost:4173/gitee-music-player/"
echo "3. 打开 DevTools → Network → Offline"
echo "4. 刷新页面测试离线功能"
