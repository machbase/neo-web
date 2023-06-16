import { createApp, useAttrs } from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';
import router from './routes';

import '@/assets/scss/theme.scss';
import { key, store } from '@/store';

import Vue3Toasity, { type ToastContainerOptions } from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';

import HighCharts from 'highcharts';
import HighchartsVue from 'highcharts-vue';
import More from 'highcharts/highcharts-more';
import Stock from 'highcharts/modules/stock';
import HighchartsNoData from 'highcharts/modules/no-data-to-display';

HighchartsNoData(HighCharts);
Stock(HighCharts);
createApp(App)
    .use(store, key)
    .use(router)
    .use(vuetify)
    .use(Vue3Toasity, {
        autoClose: 1000,
        // ...
    } as ToastContainerOptions)
    .use(HighchartsVue as any)
    .mount('#app');
More(HighCharts);
