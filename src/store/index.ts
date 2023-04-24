import { InjectionKey } from 'vue';
import { createStore, useStore as baseUseStore, Store } from 'vuex';
import { actions } from './actions';
import { mutations } from './mutations';
import { state, RootState } from './state';
import { getters } from './getters';

type storeTypes = RootState;

export const key: InjectionKey<Store<storeTypes>> = Symbol();

export const store = createStore<storeTypes>({
    state: state,
    getters: getters,
    actions: actions,
    mutations: mutations,
});

// define your own `useStore` composition function
export function useStore() {
    return baseUseStore(key);
}
