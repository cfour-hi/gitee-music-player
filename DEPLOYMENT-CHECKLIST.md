# 🚀 部署检查清单

## 📋 部署前检查

### 1. 环境变量配置
- [ ] `.env.local` 文件存在
- [ ] `VITE_ACCESS_TOKEN` 已配置
- [ ] `VITE_OWNER` 已配置
- [ ] `VITE_REPO` 已配置
- [ ] `VITE_BRANCH` 已配置

### 2. 依赖安装
```bash
pnpm install
```
- [ ] 所有依赖安装成功
- [ ] `vite-plugin-pwa` 版本为 0.20.5

### 3. 本地测试
```bash
pnpm run build
pnpm run preview
```
- [ ] 构建成功，无错误
- [ ] 预览服务器启动成功
- [ ] 访问 http://localhost:4173/gitee-music-player/ 正常

### 4. PWA 功能测试
- [ ] Service Worker 注册成功
- [ ] 离线模式下页面可刷新
- [ ] 歌曲可以下载到 IndexedDB
- [ ] 离线模式下可播放已下载的歌曲
- [ ] Cache Storage 包含 3 个缓存
- [ ] Manifest 配置正确

### 5. 浏览器兼容性测试
- [ ] Chrome/Edge (推荐)
- [ ] Firefox
- [ ] Safari (iOS)
- [ ] 移动端浏览器

## 🔧 构建配置检查

### vite.config.js
```javascript
✅ BASE 路径正确: '/gitee-music-player/'
✅ navigateFallback: '/gitee-music-player/index.html'
✅ navigateFallbackAllowlist: [/^\/gitee-music-player\//]
✅ skipWaiting: true
✅ clientsClaim: true
✅ cleanupOutdatedCaches: true
```

### package.json
```json
✅ "vite-plugin-pwa": "^0.20.5"
✅ "workbox-window": "^7.4.0"
```

### src/main.js
```javascript
✅ registerSW 配置完整
✅ 包含所有生命周期回调
✅ 网络状态监听已添加
```

## 📦 构建输出检查

运行 `pnpm run build` 后，检查 `dist/` 目录：

```
dist/
├── index.html                     ✅ 主页面
├── sw.js                          ✅ Service Worker
├── workbox-*.js                   ✅ Workbox 运行时
├── manifest.webmanifest           ✅ PWA 清单
├── favicon.svg                    ✅ 图标
├── jsmediatags.min.js             ✅ 音频标签解析库
└── assets/
    ├── index-*.js                 ✅ 应用代码
    ├── index-*.css                ✅ 样式
    └── workbox-window.*.js        ✅ Workbox 客户端
```

### 文件大小检查
- [ ] `sw.js` 存在且大小 > 1KB
- [ ] `manifest.webmanifest` 存在
- [ ] `assets/` 目录包含所有资源

## 🧪 功能测试清单

### 在线功能
1. [ ] 页面正常加载
2. [ ] 点击刷新按钮可获取歌曲列表
3. [ ] 歌曲可以下载
4. [ ] 歌曲可以播放
5. [ ] 搜索功能正常
6. [ ] 顺序播放正常
7. [ ] 随机播放正常

### 离线功能
1. [ ] 切换到离线模式
2. [ ] 刷新页面成功
3. [ ] 已下载的歌曲可以播放
4. [ ] UI 完全可用
5. [ ] Console 显示 "📴 You are offline"

### PWA 功能
1. [ ] 可以安装到桌面/主屏幕
2. [ ] 独立窗口运行（standalone）
3. [ ] 主题色正确显示
4. [ ] 图标正确显示
5. [ ] 媒体会话控制正常（系统媒体键）

## 🔍 DevTools 检查

### Application 标签
- [ ] Service Workers: activated and is running
- [ ] Manifest: 所有字段正确
- [ ] Cache Storage: 3 个缓存存在
- [ ] IndexedDB: music 数据库存在

### Console 日志
应该看到：
```
✅ Service Worker registered: ServiceWorkerRegistration {...}
✅ App ready to work offline.
```

### Network 标签
离线模式下刷新，应该看到：
```
(ServiceWorker) index.html
(ServiceWorker) index-*.js
(ServiceWorker) index-*.css
(ServiceWorker) favicon.svg
```

## 🌐 部署到 GitHub Pages

### 1. 确认配置
```javascript
// vite.config.js
const BASE = process.env.NODE_ENV === 'production' 
  ? '/gitee-music-player/'  // ✅ 仓库名
  : '/'
```

### 2. 构建
```bash
pnpm run build
```

### 3. 部署
```bash
# 方法 1: 使用 gh-pages
pnpm add -D gh-pages
npx gh-pages -d dist

# 方法 2: 手动推送
cd dist
git init
git add -A
git commit -m 'deploy'
git push -f git@github.com:username/gitee-music-player.git main:gh-pages
```

### 4. GitHub 设置
- [ ] Settings → Pages → Source: gh-pages branch
- [ ] 等待部署完成
- [ ] 访问 https://username.github.io/gitee-music-player/

## 🔒 安全检查

- [ ] `.env.local` 不在 Git 仓库中
- [ ] `.gitignore` 包含 `.env.local`
- [ ] Access Token 权限最小化
- [ ] HTTPS 部署（GitHub Pages 自动提供）

## 📱 移动端测试

### iOS Safari
- [ ] 页面正常显示
- [ ] 可以添加到主屏幕
- [ ] 独立应用模式运行
- [ ] 离线功能正常

### Android Chrome
- [ ] 页面正常显示
- [ ] 显示"安装应用"提示
- [ ] 可以安装为 PWA
- [ ] 离线功能正常

## 🐛 常见问题排查

### 问题 1: Service Worker 未注册
**检查：**
- [ ] 是否使用 HTTPS 或 localhost
- [ ] Console 是否有错误
- [ ] `sw.js` 文件是否存在

### 问题 2: 离线刷新失败
**检查：**
- [ ] `navigateFallback` 路径是否正确
- [ ] Service Worker 是否已激活
- [ ] Cache Storage 是否包含 index.html

### 问题 3: 歌曲无法离线播放
**检查：**
- [ ] 歌曲是否已下载到 IndexedDB
- [ ] IndexedDB 中是否有 Blob 数据
- [ ] 是否在线时点击过刷新按钮

## ✅ 最终确认

部署前最后检查：
- [ ] 所有测试通过
- [ ] 无 Console 错误
- [ ] 离线功能正常
- [ ] 移动端测试通过
- [ ] 文档已更新
- [ ] 代码已提交

## 🎉 部署完成

部署成功后：
1. 访问生产 URL
2. 测试所有功能
3. 在不同设备上测试
4. 监控错误日志
5. 收集用户反馈

---

**提示：** 使用 `test-pwa.html` 工具可以快速检查 PWA 状态！
