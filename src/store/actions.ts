import { TempNewChartData } from './../interface/tagView';
import { getBoardList, getPreference, postSetting } from '@/api/repository/api';
import { ActionContext } from 'vuex';
import { MutationTypes, Mutations } from './mutations';
import { RootState } from './state';
import { ResPreferences, TimeRange } from '@/interface/tagView';
import { fetchTablesData, fetchTags } from '@/api/repository/machiot';

type MyActionContext = {
    commit<K extends keyof Mutations>(key: K, payload?: Parameters<Mutations[K]>[1]): ReturnType<Mutations[K]>;
} & Omit<ActionContext<RootState, RootState>, 'commit'>;

enum ActionTypes {
    fetchBoardList = 'fetchBoardList',
    fetchPreference = 'fetchPreference',
    postPreference = 'postPreference',
    setTimeRange = 'setTimeRange',
    fetchTableList = 'fetchTableList',
    fetchTagList = 'fetchTagList',
    setTempNewChartData = 'setTempNewChartData',
    fetchBoardDetail = 'fetchBoardDetail',
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
    async [ActionTypes.fetchTableList](context: MyActionContext) {
        const res = await fetchTablesData();
        context.commit(MutationTypes.setTableList, (res as any).Data);
    },
    async [ActionTypes.fetchTagList](context: MyActionContext, payload: string) {
        const res = await fetchTags(payload);
        console.log("🚀 ~ file: actions.ts:38 ~ res", res);
        context.commit(MutationTypes.setTagList, (res as any).Data);
    },
    [ActionTypes.setTempNewChartData](context: MyActionContext, payload: TempNewChartData) {
        context.commit(MutationTypes.setTempNewChartData, payload);
    },
    async [ActionTypes.fetchBoardDetail](context: MyActionContext, payload: string) {
        // const res = await fetchTags(payload);
        // console.log("🚀 ~ file: actions.ts:38 ~ res", res);
        // context.commit(MutationTypes.setTagList, (res as any).Data);
    },
};

type Actions = typeof actions;

export { ActionTypes, actions, Actions };
