import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// 预缓存所有构建资源
precacheAndRoute(self.__WB_MANIFEST);

// 清理旧缓存
cleanupOutdatedCaches();

// 立即激活新的 Service Worker
self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 处理导航请求（页面刷新）
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          // 不缓存 opaque 响应
          if (response && response.type === 'opaque') {
            return null;
          }
          return response;
        },
      },
      {
        handlerDidError: async () => {
          // 网络失败时，返回缓存的 index.html
          const cache = await caches.open('workbox-precache-v2-' + self.registration.scope);
          const cachedResponse = await cache.match('index.html');
          return cachedResponse || Response.error();
        },
      },
    ],
  })
);

// Gitee Raw 文件缓存（音乐二进制内容）
// Raw URL 格式: https://gitee.com/api/v5/repos/{owner}/{repo}/raw/{path}?ref={branch}
// 必须先于 API 列表路由注册，否则会被下面的 NetworkFirst 路由截获
registerRoute(
  ({ url }) =>
    url.origin === 'https://gitee.com' &&
    url.pathname.includes('/api/v5/repos/') &&
    url.pathname.includes('/raw/'),
  new CacheFirst({
    cacheName: 'gitee-raw-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 365 天
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Gitee API 缓存（歌曲列表，排除 raw 下载请求）
registerRoute(
  ({ url }) =>
    url.origin === 'https://gitee.com' &&
    url.pathname.includes('/api/v5/repos/') &&
    !url.pathname.includes('/raw/'),
  new NetworkFirst({
    cacheName: 'gitee-api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 天
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// LRCLIB 歌词搜索结果缓存（歌词几乎不变，缓存 30 天）
// 歌词本身已按 sha 存 IndexedDB，这里只缓存 HTTP 响应，避免首拉重复请求
registerRoute(
  ({ url }) => url.origin === 'https://lrclib.net' && url.pathname.startsWith('/api/'),
  new CacheFirst({
    cacheName: 'lrclib-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
  })
);

// iTunes 封面搜索 API + 封面图 CDN（mzstatic）
registerRoute(
  ({ url }) => url.origin === 'https://itunes.apple.com',
  new CacheFirst({
    cacheName: 'itunes-search',
    plugins: [
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);
registerRoute(
  ({ url }) => url.hostname.endsWith('.mzstatic.com'),
  new CacheFirst({
    cacheName: 'itunes-cover',
    plugins: [
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);
