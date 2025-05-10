import 'normalize.css';
import './style.css';
import { createApp } from 'vue';
import SvgIcon from './components/svg-icon.vue';
import App from './App.vue';

const app = createApp(App);
app.component(SvgIcon.name, SvgIcon);
app.mount('#app');
