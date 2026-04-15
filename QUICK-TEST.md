# 快速测试指南

## 🚀 快速开始

### 1. 构建项目
```bash
pnpm run build
```

### 2. 启动预览服务器
```bash
pnpm run preview
```

### 3. 访问应用
打开浏览器访问：http://localhost:4173/gitee-music-player/

## ✅ 测试离线功能（3 步）

### 步骤 1：首次加载（在线）
1. 打开应用
2. 打开 DevTools (F12) → Console
3. 确认看到：`✅ Service Worker registered`
4. 点击应用中的"刷新"按钮，下载几首歌曲

### 步骤 2：切换到离线模式
1. 打开 DevTools (F12) → Network 标签
2. 在顶部找到网络状态下拉菜单（默认显示 "No throttling"）
3. 选择 "Offline"
4. Console 应该显示：`📴 You are offline`

### 步骤 3：验证离线功能
1. 刷新页面（Cmd+R 或 Ctrl+R）
2. ✅ 页面应该正常加载
3. ✅ 已下载的歌曲可以播放
4. ✅ 界面完全可用

## 🔍 使用测试工具

在浏览器中打开 `test-pwa.html` 文件：

```bash
open test-pwa.html  # macOS
# 或直接拖拽到浏览器
```

测试工具可以：
- 查看 Service Worker 状态
- 检查所有缓存内容
- 查看 IndexedDB 数据
- 监控网络状态变化
- 一键清除缓存和数据

## 🐛 故障排查

### 问题：刷新后页面空白
**解决方案：**
1. 确保使用 `pnpm run preview` 而不是直接打开 HTML 文件
2. 检查 URL 是否正确：http://localhost:4173/gitee-music-player/

### 问题：Service Worker 未注册
**解决方案：**
1. 清除浏览器缓存：DevTools → Application → Clear storage
2. 重新构建：`pnpm run build`
3. 重启预览服务器

### 问题：离线模式下无法加载
**解决方案：**
1. 确保在线时至少访问过一次应用
2. 检查 Service Worker 状态：DevTools → Application → Service Workers
3. 确认状态为 "activated and is running"

### 问题：歌曲无法离线播放
**原因：** 歌曲存储在 IndexedDB 中，只有下载过的歌曲才能离线播放

**解决方案：**
1. 在线时点击"刷新"按钮下载歌曲
2. 等待下载完成
3. 检查 IndexedDB：DevTools → Application → IndexedDB → music

## 📊 验证清单

- [ ] Service Worker 已注册
- [ ] Cache Storage 包含 3 个缓存（precache、api-cache、blob-cache）
- [ ] IndexedDB 包含 music 数据库
- [ ] 离线模式下页面可以刷新
- [ ] 离线模式下已下载的歌曲可以播放
- [ ] 网络恢复后可以下载新歌曲

## 🎯 预期结果

### Cache Storage
```
workbox-precache-v2-...     (9 entries)  - 静态资源
gitee-api-cache             (1+ entries) - API 响应
gitee-blob-cache            (N entries)  - 音乐文件
```

### IndexedDB
```
music (v1)
  └─ songs (N records)
     ├─ sha: "abc123..."
     ├─ path: "song.mp3"
     ├─ blob: Blob(...)
     └─ ...
```

### Console 日志
```
✅ Service Worker registered: ServiceWorkerRegistration {...}
✅ App ready to work offline.
🌐 Back online / 📴 You are offline
```

## 💡 提示

1. **首次访问必须在线**：Service Worker 需要在线注册
2. **歌曲需要手动下载**：点击刷新按钮下载到 IndexedDB
3. **缓存有大小限制**：不要下载过多歌曲
4. **使用 HTTPS 或 localhost**：Service Worker 只在安全上下文工作
