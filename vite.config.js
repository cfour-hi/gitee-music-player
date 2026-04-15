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
      // 缓存 App Shell 所需的静态资源
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // jsmediatags 体积较大，单独列出确保被缓存
        additionalManifestEntries: [
          { url: 'jsmediatags.min.js', revision: null },
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
