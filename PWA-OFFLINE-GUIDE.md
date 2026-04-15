# 🚀 PWA 离线缓存修复总结

## ✅ 最终解决方案

使用 **injectManifest** 模式完全控制 Service Worker，确保离线刷新正常工作。

### 核心修复：

1. **切换到 injectManifest 模式**
   - 创建自定义 `src/sw.js`
   - 完全控制缓存策略和导航处理

2. **移除重复的 precache 条目**
   - 移除 `additionalManifestEntries` 中的 `jsmediatags.min.js`
   - 让 `globPatterns` 自动扫描所有 JS 文件
   - 避免 "conflicting-entries" 错误

3. **正确的导航处理**
   ```javascript
   registerRoute(
     ({ request }) => request.mode === 'navigate',
     new NetworkFirst({
       cacheName: 'pages-cache',
       networkTimeoutSeconds: 3,
       plugins: [{
         handlerDidError: async () => {
           // 网络失败时返回缓存的 index.html
           const cache = await caches.open('workbox-precache-v2-' + self.registration.scope);
           return await cache.match('index.html') || Response.error();
         }
       }]
     })
   );
   ```

4. **安装 Workbox 依赖**
   ```bash
   pnpm add -D workbox-precaching workbox-routing workbox-strategies workbox-expiration workbox-cacheable-response
   ```

## 📋 测试步骤

### 1. 重新安装依赖
```bash
pnpm install
```

### 2. 构建项目
```bash
pnpm run build
```

应该看到：
```
PWA v0.20.5
Building src/sw.js service worker ("es" format)...
mode      injectManifest
precache  9 entries (146.67 KiB)
files generated
  dist/sw.js
```

### 3. 启动预览
```bash
pnpm run preview
```

### 4. 访问应用
打开浏览器访问：http://localhost:4173/gitee-music-player/

### 5. 测试离线功能

#### 步骤 A：首次加载（在线）
1. 打开 DevTools (F12) → Console
2. 确认看到：`✅ Service Worker registered`
3. 等待 Service Worker 激活
4. 点击应用中的"刷新"按钮，下载几首歌曲

#### 步骤 B：切换到离线模式
1. 打开 DevTools (F12) → Network 标签
2. 在顶部网络状态下拉菜单中选择 "Offline"
3. Console 应该显示：`📴 You are offline`

#### 步骤 C：验证离线刷新
1. **刷新页面**（Cmd+R 或 Ctrl+R）
2. ✅ 页面应该正常加载
3. ✅ 所有静态资源从 Service Worker 加载
4. ✅ 已下载的歌曲可以播放

### 6. 验证缓存

在 DevTools → Application 中检查：

#### Cache Storage
- `workbox-precache-v2-...`: 包含所有静态资源（HTML、CSS、JS、SVG）
- `pages-cache`: 导航请求缓存
- `gitee-api-cache`: Gitee API 响应
- `gitee-blob-cache`: Gitee Blob 响应（音乐文件）

#### Service Workers
- 状态：activated and is running
- Scope: /gitee-music-player/
- Source: /gitee-music-player/sw.js

## 🔍 故障排查

### 问题：离线刷新仍然失败
**解决方案：**
1. 清除所有缓存：DevTools → Application → Clear storage → Clear site data
2. 重新构建：`pnpm run build`
3. 重启预览服务器：`pnpm run preview`
4. 在线访问一次，等待 SW 激活
5. 再次测试离线模式

### 问题：Service Worker 未激活
**检查：**
1. DevTools → Application → Service Workers
2. 如果状态是 "waiting"，点击 "skipWaiting"
3. 或者关闭所有标签页，重新打开

### 问题：Console 报错
**常见错误：**
- `Failed to fetch`: 正常，离线模式下的网络请求失败
- `QuotaExceededError`: 缓存空间不足，清除一些缓存

## 📊 预期结果

### Network 标签（离线模式）
```
Status  Method  Type        Name
200     GET     document    index.html          (ServiceWorker)
200     GET     script      index-*.js          (ServiceWorker)
200     GET     stylesheet  index-*.css         (ServiceWorker)
200     GET     svg         favicon.svg         (ServiceWorker)
```

### Console 日志
```
✅ Service Worker registered: ServiceWorkerRegistration {...}
✅ App ready to work offline.
📴 You are offline. Using cached content.
连接 IndexDB 成功！
```

## 🎯 关键文件

### src/sw.js
自定义 Service Worker，包含：
- precacheAndRoute：预缓存静态资源
- 导航请求处理：NetworkFirst + 失败回退
- Gitee API 缓存：NetworkFirst
- Gitee Blob 缓存：CacheFirst

### vite.config.js
```javascript
VitePWA({
  strategies: 'injectManifest',  // 关键！
  srcDir: 'src',
  filename: 'sw.js',
  // ...
})
```

## ✅ 成功标志

如果看到以下情况，说明修复成功：
- ✅ 离线模式下刷新页面正常加载
- ✅ Network 标签显示资源来自 ServiceWorker
- ✅ 没有 404 或网络错误
- ✅ 已下载的歌曲可以播放
- ✅ UI 完全可用

## 🚀 部署

修复验证通过后，可以部署到生产环境：

```bash
# 构建
pnpm run build

# 部署到 GitHub Pages
npx gh-pages -d dist
```

访问：https://your-username.github.io/gitee-music-player/

离线功能在生产环境同样有效！

## 修复内容

### 1. 升级依赖
- 将 `vite-plugin-pwa` 从 `1.2.0` 升级到 `0.20.5`

### 2. 优化缓存策略

#### Gitee API 缓存（树结构查询）
- **策略**: NetworkFirst（优先网络，超时后使用缓存）
- **超时时间**: 10 秒
- **缓存时间**: 7 天
- **最大条目**: 100 个
- **用途**: 缓存歌曲列表查询结果

#### Gitee Blob 缓存（音乐文件内容）
- **策略**: CacheFirst（优先缓存，提升加载速度）
- **缓存时间**: 365 天
- **最大条目**: 500 个
- **用途**: 缓存音乐文件的 base64 内容

### 3. 修复配置问题
- 修正 `navigateFallbackDenylist`，正确排除外部 URL
- 添加 manifest 描述信息
- 图标添加 `purpose: 'any maskable'` 支持

### 4. 改进 Service Worker 注册
- 添加详细的生命周期日志
- 添加在线/离线状态监听
- 更好的错误处理

## 工作原理

### 数据流程
1. 用户点击刷新 → 请求 Gitee API 获取歌曲列表
2. 下载新歌曲 → 请求 Gitee Blob API 获取 base64 内容
3. 解析并存储 → 将 Blob 存入 IndexedDB
4. 播放音乐 → 从 IndexedDB 读取 Blob，使用 `URL.createObjectURL()`

### 缓存层级
```
┌─────────────────────────────────────┐
│  Service Worker Cache (HTTP 请求)   │
│  - Gitee API 响应                   │
│  - Gitee Blob 响应                  │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  IndexedDB (应用层存储)             │
│  - 音乐文件 Blob                    │
│  - 元数据（SHA、路径等）            │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  内存 (运行时)                      │
│  - Object URL                       │
│  - 音频标签、封面等                 │
└─────────────────────────────────────┘
```

## 测试步骤

### 1. 安装依赖并构建
```bash
pnpm install
pnpm run build
```

### 2. 预览生产版本
```bash
pnpm run preview
```

访问 http://localhost:4173/gitee-music-player/

### 3. 首次加载（必须在线）
1. 确保网络连接正常
2. 打开应用，等待 Service Worker 注册成功
3. 点击刷新按钮，下载一些歌曲到 IndexedDB
4. 打开 DevTools → Console，确认看到：
   - ✅ Service Worker registered
   - ✅ App ready to work offline

### 4. 测试离线功能

#### 方法一：Chrome DevTools（推荐）
1. 打开 Chrome DevTools (F12)
2. 进入 Application 标签
3. 左侧选择 Service Workers
4. 确认 Service Worker 状态为 "activated and is running"
5. 进入 Network 标签
6. 将网络状态改为 "Offline"
7. 刷新页面（Cmd+R 或 Ctrl+R）
8. 验证：
   - ✅ 页面正常加载
   - ✅ 已下载的歌曲可以播放
   - ✅ Console 显示 "📴 You are offline"

#### 方法二：真实离线测试
1. 正常访问应用，点击刷新加载歌曲
2. 等待歌曲下载完成
3. 断开网络连接（关闭 WiFi 或拔网线）
4. 刷新浏览器页面
5. 验证应用仍可正常使用

### 5. 验证缓存
在 Chrome DevTools → Application 中检查：

#### Cache Storage
- **workbox-precache-v2-...**: 包含所有静态资源（HTML、CSS、JS、SVG）
- **gitee-api-cache**: Gitee API 响应（歌曲列表）
- **gitee-blob-cache**: Gitee Blob 响应（音乐文件内容）

#### IndexedDB
- **music** 数据库 → **songs** 表：包含已下载的歌曲 Blob 数据

#### Service Workers
- 状态：activated and is running
- Scope: /gitee-music-player/
- Source: /gitee-music-player/sw.js

## 注意事项

1. **首次访问需要在线**: 必须先在线访问一次，下载歌曲到 IndexedDB
2. **API Token**: 确保 `.env.local` 中配置了正确的 `VITE_ACCESS_TOKEN`
3. **缓存限制**: 浏览器对缓存大小有限制，建议不要缓存过多歌曲
4. **更新机制**: Service Worker 采用 `autoUpdate` 模式，会自动更新

## 调试技巧

### 查看 Service Worker 日志
打开控制台，查看以下日志：
- ✅ Service Worker registered
- ✅ App ready to work offline
- 🔄 New content available
- 🌐 Back online / 📴 You are offline

### 清除缓存
如果需要重新测试：
1. DevTools → Application → Clear storage
2. 勾选所有选项
3. 点击 "Clear site data"

### 强制更新 Service Worker
1. DevTools → Application → Service Workers
2. 点击 "Update" 按钮
3. 或勾选 "Update on reload"

## 常见问题

### Q: 离线模式下刷新页面失败？
A: 确保：
1. Service Worker 已成功注册（在线时首次访问）
2. 在 DevTools → Application → Service Workers 中确认状态为 "activated"
3. 使用正确的 URL 路径：http://localhost:4173/gitee-music-player/
4. 清除缓存后需要重新在线访问一次

### Q: 离线后无法播放音乐？
A: 确保音乐已经下载到 IndexedDB。只有点击过"刷新"并成功下载的歌曲才能离线播放。

### Q: Service Worker 没有注册？
A: 检查是否使用 HTTPS 或 localhost。Service Worker 只在安全上下文中工作。

### Q: 缓存没有生效？
A: 检查 DevTools → Network，确认请求来自 "ServiceWorker"。如果来自 "disk cache"，说明是浏览器缓存而非 SW 缓存。

### Q: 如何验证 PWA 可安装？
A: Chrome 地址栏右侧会出现安装图标。或在 DevTools → Application → Manifest 中检查配置。

### Q: 构建后测试，页面显示空白？
A: 确保使用 `pnpm run preview` 而不是直接打开 dist/index.html 文件。直接打开文件会导致路径错误。
