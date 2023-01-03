import { ActionContext } from 'vuex';
import { MutationTypes, Mutations } from './mutations';
import { RootState } from './state';
import { ResStatus } from '@/enums/app';

type MyActionContext = {
    commit<K extends keyof Mutations>(key: K, payload?: Parameters<Mutations[K]>[1]): ReturnType<Mutations[K]>;
} & Omit<ActionContext<RootState, RootState>, 'commit'>;

enum ActionTypes {}
/* Tree */
// fetchTest = 'fetchTest',

const actions = {
    /* Tree */
    // async [ActionTypes.fetchTest](context: MyActionContext) {
    //     const res = (await fetchGroupTree()) as any;
    //     if (res.status === ResStatus.SUCCESS) {
    //         context.commit(MutationTypes.activeHeader, res.data);
    //         return 'success';
    //     } else {
    //         return 'fail';
    //     }
    // },
};

type Actions = typeof actions;

export { ActionTypes, actions, Actions };
