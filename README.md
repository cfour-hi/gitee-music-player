# gitee-music-player

一个基于 Vue 3 + Vite 的 PWA 音乐播放器，支持离线播放。

## ✨ 特性

- 🎵 从 Gitee 仓库加载音乐文件
- 📱 PWA 支持，可安装到桌面/主屏幕
- 🔌 完整的离线功能
- 💾 使用 IndexedDB 本地存储
- 🎨 响应式设计，支持移动端
- 🎛️ 媒体会话控制（系统媒体键）
- 🔍 歌曲搜索功能
- 🎲 顺序/随机播放

## 🚀 快速开始

### 安装依赖
```bash
pnpm install
```

### 配置环境变量
创建 `.env.local` 文件：
```env
VITE_ACCESS_TOKEN=your_gitee_access_token
VITE_OWNER=your_gitee_username
VITE_REPO=your_music_repo
VITE_BRANCH=main
```

### 开发
```bash
pnpm run dev
```

### 构建
```bash
pnpm run build
```

### 预览
```bash
pnpm run preview
```

## 📖 PWA 离线功能

### 工作原理
1. 首次访问时，Service Worker 会缓存所有静态资源
2. 点击刷新按钮，音乐文件会下载到 IndexedDB
3. 离线时，应用可以正常访问和播放已下载的音乐

### 测试离线功能
1. 在线访问应用
2. 点击刷新按钮下载歌曲
3. 打开 DevTools → Network → 选择 "Offline"
4. 刷新页面，验证应用仍可正常使用

详细说明请查看：
- [PWA 离线缓存指南](./PWA-OFFLINE-GUIDE.md)
- [快速测试指南](./QUICK-TEST.md)
- [部署检查清单](./DEPLOYMENT-CHECKLIST.md)

## 🔧 测试工具

打开 `test-pwa.html` 可以：
- 查看 Service Worker 状态
- 检查缓存内容
- 查看 IndexedDB 数据
- 监控网络状态

## 🛠️ 技术栈

- Vue 3.5.13
- Vite 6.3.5
- vite-plugin-pwa 0.20.5
- Workbox 7.x
- IndexedDB
- jsmediatags

## 📱 浏览器支持

- Chrome/Edge (推荐)
- Firefox
- Safari (iOS)
- 其他支持 PWA 的现代浏览器

## 📄 许可证

MIT
