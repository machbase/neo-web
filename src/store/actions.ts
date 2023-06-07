import { TempNewChartData } from './../interface/tagView';
import { ActionContext } from 'vuex';
import { MutationTypes, Mutations } from './mutations';
import { RootState } from './state';
import { ResPreferences, TimeRange } from '@/interface/tagView';
import { BoardInfo, FetchTagDataArg, PanelInfo, RangeData } from '@/interface/chart';
import { fetchCalculationData, fetchOnMinMaxTable, fetchRangeData, fetchRawData, fetchTablesData, fetchTags, fetchTableName, getChartData } from '@/api/repository/machiot';
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
    fetchOnRollup = 'fetchOnRollup',
    fetchNewChartBoard = 'fetchNewChartBoard',
    fetchNewDashboard = 'fetchNewDashboard',
    fetchRangeData = 'fetchRangeData',
    fetchTagData = 'fetchTagData',
    fetchTagDataRaw = 'fetchTagDataRaw',
    fetchTableNameValue = 'fetchTableNameValue',
    fetchxAxisChartData = 'fetchxAxisChartData',
}

const actions = {
    async [ActionTypes.postPreference](context: MyActionContext, payload: ResPreferences) {
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

    async [ActionTypes.fetchRangeData](context: MyActionContext, payload: { table: string; tagName: string }) {
        const sRes = await fetchOnMinMaxTable(payload.table, payload.tagName);
        if (sRes.data.rows[0]) {
            context.commit(MutationTypes.setRangeData, sRes.data);
            return sRes.data;
        } else {
            const res: any = await fetchRangeData(payload.table, payload.tagName);
            context.commit(MutationTypes.setRangeData, res.data);
            return res.data;
        }
    },

    async [ActionTypes.fetchxAxisChartData](context: MyActionContext, aParams: any) {
        const res: any = await getChartData(aParams.tagTables, aParams.option, aParams.range, aParams.time);
        return res;
    },

    async [ActionTypes.fetchTagData](context: MyActionContext, aParams: FetchTagDataArg) {
        const res = aParams.CalculationMode === 'raw' ? ((await fetchRawData(aParams)) as any) : ((await fetchCalculationData(aParams)) as any);
        if (res.success) {
            return res.data.rows.map((aItem: any) => {
                return aParams.CalculationMode ? { time: aItem[0], avg: aItem[1] } : { TIME: aItem[0], VALUE: aItem[1] };
            });
        } else {
            return res.reason;
        }
    },
    async [ActionTypes.fetchTableNameValue](context: MyActionContext, aTable: string) {
        const sRes: any = await fetchTableName(aTable);
        if (sRes.success) return sRes.data;
        else return '';
    },
    async [ActionTypes.fetchTagDataRaw](context: MyActionContext, aParams: FetchTagDataArg) {
        const res = (await fetchRawData(aParams)) as any;
        if (res.success) {
            return res.data.rows.map((aItem: any) => {
                return { TIME: aItem[0], VALUE: aItem[1] };
            });
        } else {
            return res.reason;
        }
    },
};
type Actions = typeof actions;

export { ActionTypes, actions, Actions };
