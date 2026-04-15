import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const BASE = process.env.NODE_ENV === 'production' ? '/gitee-music-player/' : '/'

export default defineConfig({
  base: BASE,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      scope: BASE,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,webmanifest}'],
        navigateFallback: 'index.html',
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
