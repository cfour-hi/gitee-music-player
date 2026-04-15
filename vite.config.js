import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/gitee-music-player/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // 缓存所有构建产物及 public 下的静态文件
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // 断网刷新时用缓存的 index.html 响应导航请求
        navigateFallback: '/gitee-music-player/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        additionalManifestEntries: [
          { url: '/gitee-music-player/jsmediatags.min.js', revision: null },
        ],
      },
      manifest: {
        name: 'Music Player',
        short_name: 'Music',
        description: '离线音乐播放器',
        theme_color: '#1e201e',
        background_color: '#1e201e',
        display: 'standalone',
        icons: [
          {
            src: 'vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
