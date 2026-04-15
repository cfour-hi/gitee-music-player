import 'normalize.css';
import './style.css';
import { createApp } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import SvgIcon from './components/svg-icon.vue';
import App from './App.vue';

// 注册 Service Worker 并处理更新
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('🔄 New content available, please refresh.');
    // 可以在这里添加用户提示
  },
  onOfflineReady() {
    console.log('✅ App ready to work offline.');
  },
  onRegistered(registration) {
    console.log('✅ Service Worker registered:', registration);
  },
  onRegisterError(error) {
    console.error('❌ Service Worker registration error:', error);
  },
});

// 监听在线/离线状态
window.addEventListener('online', () => {
  console.log('🌐 Back online');
});

window.addEventListener('offline', () => {
  console.log('📴 You are offline. Using cached content.');
});

const app = createApp(App);
app.component(SvgIcon.name, SvgIcon);
app.mount('#app');
