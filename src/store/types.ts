import { CommitOptions, DispatchOptions, Store } from 'vuex';
import { Mutations } from './mutations';
import { Getters } from './getters';
import { Actions } from './actions';
import { RootState } from './state';

type MyMutations = {
    commit<K extends keyof Mutations, P extends Parameters<Mutations[K]>[1]>(key: K, payload?: P, options?: CommitOptions): ReturnType<Mutations[K]>;
};

type MyActions = {
    dispatch<K extends keyof Actions>(key: K, payload?: Parameters<Actions[K]>[1], options?: DispatchOptions): ReturnType<Actions[K]>;
};

type MyGetters = {
    getters: {
        [K in keyof Getters]: ReturnType<Getters[K]>;
    };
};

// 기본적으로 있는 commit을 빼고 직접 작성한 MyMutations를 넣음
export type MyStore = Omit<Store<RootState>, 'commit' | 'dispatch' | 'getters'> & MyMutations & MyActions & MyGetters;
