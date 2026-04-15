import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const BASE = process.env.NODE_ENV === 'production' ? '/gitee-music-player/' : '/'

export default defineConfig({
  base: BASE,
  plugins: [
    vue(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      scope: BASE,
      injectRegister: 'auto',
      manifest: {
        name: 'Music Player',
        short_name: 'Music',
        description: 'A PWA music player with offline support',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        theme_color: '#1e201e',
        background_color: '#1e201e',
        icons: [
          {
            src: `${BASE}favicon.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,ico,webmanifest}'],
        globIgnores: ['**/node_modules/**/*'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
