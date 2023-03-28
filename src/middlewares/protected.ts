import { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { PageRoutes } from '@/enums/routes';

export default (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext): void => {
    const sToken = localStorage.getItem('accessToken');
    if (to.path === '/login') {
        if (sToken) {
            next(PageRoutes.TAG_VIEW);
            return;
        }
        next();
        return;
    }

    if (sToken) {
        if (to.path === '/') {
            next(PageRoutes.TAG_VIEW);
            return;
        }

        next();
    } else {
        next(PageRoutes.LOGIN);
    }
};
