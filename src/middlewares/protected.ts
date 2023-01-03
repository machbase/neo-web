import { NavigationGuardNext, RouteLocationNormalized, useRoute } from 'vue-router';
import { LocalStorageKeys } from '@/enums/localStorage';
import { PageRoutes } from '@/enums/routes';
import { MutationTypes } from '@/store/mutations';
import { store } from '@/store';

export default (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext): void => {
    // if (localStorage.getItem(LocalStorageKeys.ACCESS_TOKEN) !== null && to.path !== PageRoutes.LOGIN) {
    //     next();
    // } else if (localStorage.getItem(LocalStorageKeys.ACCESS_TOKEN) !== null && to.path === PageRoutes.LOGIN) {
    //     next(from.path);
    // } else if (localStorage.getItem(LocalStorageKeys.ACCESS_TOKEN) === null) {
    //     next();
    //     // next(PageRoutes.LOGIN);
    // }
    // store.commit(MutationTypes.setHeaderTitle, { title: to.name, path: to.path });

    next();
};
