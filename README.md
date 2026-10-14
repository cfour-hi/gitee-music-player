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
VITE_REPOS=repo1,repo2
VITE_BRANCH=master
```

`VITE_REPOS` 为逗号分隔的仓库列表，可同时从多个仓库拉取音乐。

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

## 🔧 测试工具

打开 `test-pwa.html` 可以：
- 查看 Service Worker 状态
- 检查缓存内容
- 查看 IndexedDB 数据
- 监控网络状态

## 🗂️ 项目结构与数据流

```
src/
├── App.vue                # 单页 UI：歌曲列表 / 底部播放栏 / 搜索 / 长按菜单
├── sw.js                  # Service Worker（预缓存静态资源）
├── helper.js              # isAudio 等工具函数
└── hooks/
    ├── use-song.js        # songList 状态与排序
    ├── use-music-db.js    # IndexedDB 封装：songs / play_events 两个 store
    ├── use-song-parse.js  # Gitee 下载 blob、jsmediatags 解析 ID3、元数据合并
    ├── use-song-state.js  # 播放事件记录、冷却规则、加权随机选歌
    ├── use-music-search.js# 拼音 / 首字母 / 繁简搜索（pinyin-pro + opencc-js）
    └── use-mood.js        # 情绪开关与目标时段
```

**启动流程**：连接 IndexedDB → 读出本地歌曲 blob → jsmediatags 解析 ID3 标签 → 合并展示元数据（手动修正 > ID3 tag > 文件名「歌手 - 歌名」）→ 渲染列表。全程不发网络请求。

**刷新歌曲列表**（点左上角图标）：调 Gitee API v5 拉文件树 → 按 sha 与本地库比对 → 仅当所有仓库拉取成功时，清理远端已下架的歌 → 新歌每 5 首一批下载 blob 存入 IndexedDB（蜂窝网络下会先弹窗确认）。

**播放**：`<audio>` 直接使用 blob 的 ObjectURL，因此播放不耗流量。切歌时按播放进度写入 `play_events`：播完 ≥60% 记为完整收听，否则记为一次跳过。

**智能随机**权重 = 越久没听越高（对数衰减）× 入库 14 天内新歌翻倍 × 最近跳过降权（0.7^n）× 高斯时段匹配。冷却规则：长按可手动暂停 28 天；14 天内跳过同一首 ≥2 次会自动冷却 21 天。

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
