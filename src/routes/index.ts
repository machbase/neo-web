import Footer from '@/components/footer/index.vue';
import Header from '@/components/header/index.vue';
import { PageRoutes } from '@/enums/routes';
import Main from '@/pages/main/index.vue';
import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';
import protectedRoute from '../middlewares/protected';
import { RouteNames } from './../enums/routes';

const routes: Array<RouteRecordRaw> = [
    {
        path: PageRoutes.MAIN,
        name: RouteNames.MAIN,
        alias: ['/'],
        // redirect: `${PageRoutes.ALARM}/${PageRoutes.HISTORY}`,
        // children: [
        //     {
        //         path: PageRoutes.SETTING,
        //         name: RouteNames.ALARM_SETTING,
        //         component: AlarmSetting,
        //     },
        //     {
        //         path: PageRoutes.HISTORY,
        //         name: RouteNames.ALARM_HISTORY,
        //         component: AlarmHistory,
        //     },
        // ],
        components: {
            default: Main,
            Header,
            Footer,
        },
        beforeEnter: protectedRoute,
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
