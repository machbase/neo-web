import { createApp } from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';
import router from './routes';

import '@/assets/scss/theme.scss';
import { key, store } from '@/store';

import HighCharts from 'highcharts';
import HighchartsVue from 'highcharts-vue';
import More from 'highcharts/highcharts-more';
import Stock from 'highcharts/modules/stock';

Stock(HighCharts);
createApp(App)
    .use(store, key)
    .use(router)
    .use(vuetify)
    .use(HighchartsVue as any)
    .mount('#app');
More(HighCharts);
