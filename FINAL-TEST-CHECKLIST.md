# ✅ 最终测试清单

## 🔧 构建验证

运行验证脚本：
```bash
./verify-build.sh
```

应该看到：
- ✅ Service Worker 文件存在
- ✅ jsmediatags.min.js 只出现 1 次（正确）
- ✅ 导航处理已包含
- ✅ Gitee API 缓存已配置
- ✅ Gitee Blob 缓存已配置
- ✅ 错误处理已包含

## 🚀 功能测试

### 步骤 1：启动预览服务器
```bash
pnpm run preview
```

### 步骤 2：首次访问（在线）
1. 访问 http://localhost:4173/gitee-music-player/
2. 打开 DevTools (F12) → Console
3. 确认看到：
   ```
   ✅ Service Worker registered: ServiceWorkerRegistration {...}
   ✅ App ready to work offline.
   ```
4. 进入 Application 标签 → Service Workers
5. 确认状态：`activated and is running`

### 步骤 3：下载歌曲（可选）
1. 点击应用中的刷新按钮（加载图标）
2. 等待歌曲列表加载
3. 歌曲会自动下载到 IndexedDB

### 步骤 4：测试离线刷新（关键！）
1. 打开 DevTools → Network 标签
2. 在顶部网络状态下拉菜单中选择 **"Offline"**
3. Console 应该显示：`📴 You are offline. Using cached content.`
4. **刷新页面**（Cmd+R 或 Ctrl+R）
5. ✅ 页面应该正常加载，没有错误

### 步骤 5：验证资源来源
在 Network 标签中，应该看到：
```
Status  Method  Type        Name                Size        Time
200     GET     document    index.html          (ServiceWorker)
200     GET     script      index-*.js          (ServiceWorker)
200     GET     stylesheet  index-*.css         (ServiceWorker)
200     GET     svg         favicon.svg         (ServiceWorker)
200     GET     script      jsmediatags.min.js  (ServiceWorker)
```

所有资源都应该标记为 `(ServiceWorker)`，而不是 `(failed)` 或 `(disk cache)`。

### 步骤 6：验证缓存
进入 DevTools → Application 标签：

#### Cache Storage
应该看到以下缓存：
- `workbox-precache-v2-http://localhost:4173/gitee-music-player/`
  - 包含 8 个条目：
    - index.html
    - index-*.js
    - index-*.css
    - favicon.svg
    - jsmediatags.min.js
    - manifest.webmanifest
    - workbox-window.*.js
- `pages-cache` (可能为空，用于导航请求)
- `gitee-api-cache` (如果点击过刷新)
- `gitee-blob-cache` (如果下载过歌曲)

#### IndexedDB
- `music` 数据库
  - `songs` 表（如果下载过歌曲）

### 步骤 7：测试离线播放（可选）
如果在步骤 3 中下载了歌曲：
1. 保持离线模式
2. 点击已下载的歌曲
3. ✅ 歌曲应该可以正常播放

### 步骤 8：恢复在线
1. 在 Network 标签中选择 "No throttling"
2. Console 应该显示：`🌐 Back online`
3. 刷新页面，验证在线模式也正常

## ❌ 常见错误

### 错误 1：add-to-cache-list-conflicting-entries
```
Uncaught add-to-cache-list-conflicting-entries
```
**原因：** jsmediatags.min.js 被添加了两次
**解决：** 已修复，移除了 `additionalManifestEntries`

### 错误 2：Failed to fetch
```
Failed to fetch
```
**原因：** 离线模式下尝试网络请求（正常）
**解决：** 这是预期行为，Service Worker 会返回缓存

### 错误 3：页面空白
**原因：** Service Worker 未激活或缓存未生成
**解决：**
1. 清除所有缓存
2. 重新在线访问一次
3. 等待 SW 激活

## ✅ 成功标志

如果所有以下条件都满足，说明 PWA 离线功能完全正常：

- [x] 构建无错误，precache 8 个条目
- [x] Service Worker 成功注册
- [x] Service Worker 状态为 activated
- [x] 离线模式下刷新页面成功
- [x] Network 标签显示资源来自 ServiceWorker
- [x] Console 无错误（除了预期的 Failed to fetch）
- [x] Cache Storage 包含所有静态资源
- [x] 已下载的歌曲可以离线播放

## 🎉 测试通过！

如果所有测试都通过，恭喜！PWA 离线缓存功能已完全修复。

可以部署到生产环境：
```bash
pnpm run build
npx gh-pages -d dist
```

## 📝 测试记录

测试日期：__________
测试人员：__________
测试结果：[ ] 通过  [ ] 失败

备注：
_________________________________
_________________________________
_________________________________
