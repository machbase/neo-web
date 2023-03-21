import { TempNewChartData } from './../interface/tagView';
import { getBoard, getBoardList, getPreference, postSetting, getDataDefault, postNewBoard, putNewBoard } from '@/api/repository/api';
import { ActionContext } from 'vuex';
import { MutationTypes, Mutations } from './mutations';
import { RootState } from './state';
import { ResPreferences, TimeRange } from '@/interface/tagView';
import { BoardInfo, FetchTagDataArg, PanelInfo, RangeData } from '@/interface/chart';
import { fetchCalculationData, fetchRangeData, fetchRawData, fetchTablesData, fetchTags } from '@/api/repository/machiot';
import { ResType } from '@/assets/ts/common';
import { convertChartDefault } from '../utils/utils';
import { DEFAULT_CHART } from '@/utils/constants';

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
    fetchNewDashboard = 'fetchNewDashboard',
    fetchRangeData = 'fetchRangeData',
    fetchTagData = 'fetchTagData',
    fetchTagDataRaw = 'fetchTagDataRaw',
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
        // const res = await postSetting(payload);
        context.commit(MutationTypes.setPreference, payload);
    },
    [ActionTypes.setTimeRange](context: MyActionContext, payload: TimeRange) {
        context.commit(MutationTypes.setTimeRange, payload);
    },
    async [ActionTypes.fetchTableList](context: MyActionContext) {
        const res = await fetchTablesData();
        context.commit(MutationTypes.setTableList, res.data);
    },
    async [ActionTypes.fetchTagList](context: MyActionContext, payload: string) {
        const res = await fetchTags(payload);
        context.commit(MutationTypes.setTagList, res.data);
    },
    async [ActionTypes.fetchNewChartBoard](context: MyActionContext, payload: TempNewChartData) {
        const chartFormat = await convertChartDefault(DEFAULT_CHART as PanelInfo, payload);
        context.commit(MutationTypes.setNewChartBoard, chartFormat);
    },
    async [ActionTypes.fetchNewDashboard](context: MyActionContext, payload: any) {
        const res: any =
            payload.old_id === ''
                ? await postNewBoard({
                      ...context.state.gBoard,
                      board_id: payload.board_id,
                      board_name: payload.board_name,
                      old_id: payload.old_id,
                  })
                : await putNewBoard({
                      ...context.state.gBoard,
                      board_id: payload.board_id,
                      board_name: payload.board_name,
                      old_id: payload.old_id,
                  });
        if (res.success === true) {
            if (payload.old_id === '') {
                context.commit(MutationTypes.setBoardList, res.list);
            } else {
                const newListBoard = context.state.gBoardList;
                newListBoard.splice(context.state.gBoardList.length - 1, 1, res.list[res.list.length - 1]);
            }
            context.commit(MutationTypes.setNewBoard, {
                ...payload,
                old_id: payload.board_id,
            });
        }
        return res;
    },
    async [ActionTypes.fetchRangeData](context: MyActionContext, payload: { table: string; tagName: string }) {
        const res: any = await fetchRangeData(payload.table, payload.tagName);
        context.commit(MutationTypes.setRangeData, res.data[0]);
    },

    //
    async [ActionTypes.fetchTagData](context: MyActionContext, aParams: FetchTagDataArg) {
        const res = aParams.CalculationMode === 'raw' ? ((await fetchRawData(aParams)) as any) : ((await fetchCalculationData(aParams)) as any);
        if (res.error_code === 0) {
            return res.data;
        } else {
            return res.error_message;
        }
    },
    async [ActionTypes.fetchTagDataRaw](context: MyActionContext, aParams: FetchTagDataArg) {
        const res = (await fetchRawData(aParams)) as any;
        if (res.error_code === 0) {
            return res.data;
        } else {
            return res.error_message;
        }
    },
};
type Actions = typeof actions;

export { ActionTypes, actions, Actions };
