import { getBoardList } from '@/api/repository/tagView';
import { ResBoardList } from '@/interface/tagView';
import { ActionContext } from 'vuex';
import { MutationTypes, Mutations } from './mutations';
import { RootState } from './state';

type MyActionContext = {
    commit<K extends keyof Mutations>(key: K, payload?: Parameters<Mutations[K]>[1]): ReturnType<Mutations[K]>;
} & Omit<ActionContext<RootState, RootState>, 'commit'>;

enum ActionTypes {
    fetchBoardList = 'fetchBoardList',
}

const actions = {
    async [ActionTypes.fetchBoardList](context: MyActionContext) {
        const res = (await getBoardList()) as ResBoardList;
        if (res.success === true) {
            context.commit(MutationTypes.setBoardList, res.list);
            return 'success';
        } else {
            return 'fail';
        }
    },
};

type Actions = typeof actions;

export { ActionTypes, actions, Actions };
