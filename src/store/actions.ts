import { getBoardList, getPreference, postSetting } from '@/api/repository/api';
import { ActionContext } from 'vuex';
import { MutationTypes, Mutations } from './mutations';
import { RootState } from './state';
import { ResPreferences, TimeRange } from '@/interface/tagView';

type MyActionContext = {
    commit<K extends keyof Mutations>(key: K, payload?: Parameters<Mutations[K]>[1]): ReturnType<Mutations[K]>;
} & Omit<ActionContext<RootState, RootState>, 'commit'>;

enum ActionTypes {
    fetchBoardList = 'fetchBoardList',
    fetchPreference = 'fetchPreference',
    postPreference = 'postPreference',
    setTimeRange = 'setTimeRange',
}

const actions = {
    async [ActionTypes.fetchBoardList](context: MyActionContext) {
        const res = await getBoardList();
        context.commit(MutationTypes.setBoardList, res);
    },
    async [ActionTypes.fetchPreference](context: MyActionContext) {
        const res = await getPreference();
        context.commit(MutationTypes.setPreference, res);
    },
    async [ActionTypes.postPreference](context: MyActionContext, payload: ResPreferences) {
        const res = await postSetting(payload);
        context.commit(MutationTypes.setPreference, res);
    },
    [ActionTypes.setTimeRange](context: MyActionContext, payload: TimeRange) {
        context.commit(MutationTypes.setTimeRange, payload);
    },
};

type Actions = typeof actions;

export { ActionTypes, actions, Actions };
