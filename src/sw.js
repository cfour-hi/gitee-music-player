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

// Gitee API 缓存（歌曲列表）
registerRoute(
  ({ url }) => url.origin === 'https://gitee.com' && url.pathname.includes('/api/v5/repos/'),
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

// Gitee Blob 缓存（音乐文件内容）
registerRoute(
  ({ url }) => 
    url.origin === 'https://gitee.com' && 
    url.pathname.includes('/api/v5/repos/') && 
    url.pathname.includes('/git/blobs/'),
  new CacheFirst({
    cacheName: 'gitee-blob-cache',
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
