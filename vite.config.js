import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/gitee-music-player/',
  plugins: [
    vue(),
  ],
})
