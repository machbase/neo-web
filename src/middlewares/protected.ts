import { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { PageRoutes } from '@/enums/routes';

export default (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext): void => {
    if (to.path === '/') {
        next(PageRoutes.TAG_VIEW);
    }
    next();
};
