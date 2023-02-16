import { TempNewChartData } from './../interface/tagView';
import { getBoard, getBoardList, getPreference, postSetting, getDataDefault } from '@/api/repository/api';
import { ActionContext } from 'vuex';
import { MutationTypes, Mutations } from './mutations';
import { RootState } from './state';
import { ResPreferences, TimeRange } from '@/interface/tagView';
import { BoardInfo, FetchTagDataArg, RangeData } from '@/interface/chart';
import { fetchCalculationData, fetchRangeData, fetchRawData, fetchTablesData, fetchTags } from '@/api/repository/machiot';
import { ResType } from '@/assets/ts/common';
import { convertChartDefault } from '../utils/utils';

type MyActionContext = {
    commit<K extends keyof Mutations>(key: K, payload?: Parameters<Mutations[K]>[1]): ReturnType<Mutations[K]>;
} & Omit<ActionContext<RootState, RootState>, 'commit'>;

enum ActionTypes {
    fetchBoard = 'fetchBoard',
    fetchBoardList = 'fetchBoardList',
    fetchPreference = 'fetchPreference',
    postPreference = 'postPreference',
    setTimeRange = 'setTimeRange',
    fetchTableList = 'fetchTableList',
    fetchTagList = 'fetchTagList',
    fetchNewChartBoard = 'fetchNewChartBoard',
    fetchRangeData = 'fetchRangeData',
    fetchTable = 'fetchTable',
    fetchTagData = 'fetchTagData',
    fetchTagDataRaw = 'fetchTagDataRaw',
    fetchBoardDetail = 'fetchBoardDetail',
}

const actions = {
    async [ActionTypes.fetchBoardList](context: MyActionContext) {
        const res = await getBoardList();
        context.commit(MutationTypes.setBoardList, res);
    },
    async [ActionTypes.fetchBoard](context: MyActionContext, payload: string) {
        const res = await getBoard(payload);
        context.commit(MutationTypes.setBoard, res);
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
        context.commit(MutationTypes.setTagList, (res as any).Data);
    },
    async [ActionTypes.fetchNewChartBoard](context: MyActionContext, payload: TempNewChartData) {
        const res = await getDataDefault();
        const chartFormat = await convertChartDefault(res.data, payload);
        context.commit(MutationTypes.setNewChartBoard, chartFormat);
    },
    async [ActionTypes.fetchBoardDetail](context: MyActionContext, payload: string) {
        // const res = await fetchTags(payload);
        // console.log("🚀 ~ file: actions.ts:38 ~ res", res);
        // context.commit(MutationTypes.setTagList, (res as any).Data);
    },
    async [ActionTypes.fetchRangeData](context: MyActionContext) {
        const res: any = await fetchRangeData();
        context.commit(MutationTypes.setRangeData, res.Data[0]);
    },

    // lấy ActionTypes.fetchTableList
    async [ActionTypes.fetchTable](context: MyActionContext) {
        const res: any = await fetchTablesData();
        context.commit(MutationTypes.setTable, { ...res.Data.map((aItem: any) => aItem[0]) });
    },

    //
    async [ActionTypes.fetchTagData](context: MyActionContext, aParams: FetchTagDataArg) {
        const res = aParams.CalculationMode === 'raw' ? ((await fetchRawData(aParams)) as any) : ((await fetchCalculationData(aParams)) as any);
        if (res.ErrorCode === 0) {
            return res.Data;
        } else {
            return 'fail';
        }
    },
    async [ActionTypes.fetchTagDataRaw](context: MyActionContext, aParams: FetchTagDataArg) {
        const res = (await fetchRawData(aParams)) as any;
        if (res.ErrorCode === 0) {
            return res.Data;
        } else {
            return 'fail';
        }
    },
};
type Actions = typeof actions;

export { ActionTypes, actions, Actions };
