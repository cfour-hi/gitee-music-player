import 'normalize.css';
import './style.css';
import { createApp } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import SvgIcon from './components/svg-icon.vue';
import App from './App.vue';

registerSW({ immediate: true });

const app = createApp(App);
app.component(SvgIcon.name, SvgIcon);
app.mount('#app');
