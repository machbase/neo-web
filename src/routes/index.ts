import Footer from '@/components/footer/index.vue';
import Header from '@/components/header/index.vue';
import TagView from '@/pages/tag-view/index.vue';
import New from '@/pages/new/index.vue';
import ChartEdit from '@/pages/chart-edit/index.vue';
import ChartView from '@/pages/chart-view/index.vue';
import ShareView from '@/pages/share-view/index.vue';
import Login from '@/pages/login/index.vue';
import { PageRoutes } from '@/enums/routes';
import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';
import protectedRoute from '../middlewares/protected';
import { RouteNames } from './../enums/routes';
import { BasePrefix } from '@/helpers/prefix';

const routes: Array<RouteRecordRaw> = [
    {
        path: PageRoutes.LOGIN,
        name: RouteNames.LOGIN,
        alias: ['/login'],
        components: {
            default: Login,
            Footer,
        },
        beforeEnter: protectedRoute,
    },
    {
        path: `${PageRoutes.TAG_VIEW}`,
        name: RouteNames.TAG_VIEW,
        alias: ['/'],
        components: {
            default: TagView,
            // Header,
            Footer,
        },
        beforeEnter: protectedRoute,
    },

    {
        path: `${PageRoutes.TAG_VIEW}${PageRoutes.NEW}`,
        name: RouteNames.NEW,
        components: {
            default: New,
            // Header,
            Footer,
        },
        beforeEnter: protectedRoute,
    },
    {
        path: `${PageRoutes.TAG_VIEW}${PageRoutes.CHART_EDIT}/:tab_id/:id`,
        name: RouteNames.CHART_EDIT,
        components: {
            default: ChartEdit,
            // Header,
            Footer,
        },
        props: true,
        beforeEnter: protectedRoute,
    },
    {
        path: `${PageRoutes.TAG_VIEW}${PageRoutes.CHART_VIEW}/:id`,
        name: RouteNames.CHART_VIEW,
        components: {
            default: ChartView,
            // Header,
            Footer,
        },
        props: true,
        beforeEnter: protectedRoute,
    },
    {
        path: `${PageRoutes.TAG_VIEW}${PageRoutes.VIEW}`,
        name: RouteNames.VIEW,
        components: {
            default: ShareView,
            // Header,
            Footer,
        },
        beforeEnter: protectedRoute,
    },
    {
        // path: '*',
        path: '/:catchAll(.*)',
        redirect: '/',
        beforeEnter: protectedRoute,
    },
];

const router = createRouter({
    history: createWebHistory(BasePrefix + '/ui'),
    routes,
});

export default router;
