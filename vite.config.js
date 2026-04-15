import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const BASE = '/gitee-music-player/'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      scope: BASE,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,webmanifest}'],
        // navigateFallback 使用相对于 scope 的路径
        navigateFallback: 'index.html',
        // 排除跨域请求（Gitee API）
        navigateFallbackDenylist: [/^https:\/\/gitee\.com/],
        additionalManifestEntries: [
          { url: 'jsmediatags.min.js', revision: null },
        ],
      },
      manifest: {
        name: 'Music Player',
        short_name: 'Music',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        theme_color: '#1e201e',
        background_color: '#1e201e',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
})
