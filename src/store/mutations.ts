import { TempNewChartData } from './../interface/tagView';
import { ResBoardList, ResPreferences, TimeRange, BoardPanelEdit } from '@/interface/tagView';
import { RootState } from './state';
import { BoardInfo, PanelInfo, RangeData } from '@/interface/chart';
import { cloneDeep, isEmpty } from 'lodash';
import moment from 'moment';
import { toTimeUtcChart, utils } from '@/utils/utils';

enum MutationTypes {
    /* Global */
    setPreference = 'setPreference',
    activeHeader = 'activeHeader',
    setBoard = 'setBoard',
    setTable = 'setTable',
    setBoardList = 'setBoardList',
    setTimeRange = 'setTimeRange',
    setTableList = 'setTableList',
    setSelectedTab = 'setSelectedTab',
    setTagList = 'setTagList',
    setTabList = 'setTabList',
    pushTab = 'pushTab',
    setTempNewChartData = 'setTempNewChartData',
    setRangeData = 'setRangeData',
    setChartEdit = 'setChartEdit',
    setNewChartBoard = 'setNewChartBoard',
    setNewBoard = 'setNewBoard',
    setDeleteChart = 'setDeleteChart',
    setChartBoardEdit = 'setChartBoardEdit',
    setBoardByFileUpload = 'setBoardByFileUpload',
    setBoardOld = 'setBoardOld',
    setValueDashBoard = 'setValueDashBoard',
}

const mutations = {
    /* Global */
    [MutationTypes.activeHeader](state: RootState, aActive: boolean) {
        state.gActiveHeader = aActive;
    },
    [MutationTypes.setBoard](state: RootState, aBoard: BoardInfo) {
        state.gBoard = aBoard;
    },
    [MutationTypes.setBoardList](state: RootState, aBoardList: ResBoardList[]) {
        state.gBoardList = aBoardList;
    },
    [MutationTypes.setPreference](state: RootState, aPreference: ResPreferences) {
        state.gPreference = aPreference;
    },
    [MutationTypes.setSelectedTab](state: RootState, aItem: string) {
        state.gSelectedTab = aItem;
    },
    [MutationTypes.setTabList](state: RootState, aList: any) {
        state.gSelectedTab = aList;
    },
    [MutationTypes.pushTab](state: RootState, aItem: any) {
        state.gTabList.push(aItem);
    },
    [MutationTypes.setTimeRange](state: RootState, aTimeRange: TimeRange) {
        state.gTimeRange = JSON.parse(JSON.stringify(aTimeRange));
        state.gBoard.range_end = aTimeRange.end;
        state.gBoard.range_bgn = aTimeRange.start;
    },
    [MutationTypes.setTableList](state: RootState, aTableList: { columns: string[]; rows: string[]; types: string[] }) {
        const newTable = aTableList.rows.map((aTable) => {
            return aTable[0];
        });
        state.gTableList = newTable;
    },
    [MutationTypes.setTagList](state: RootState, aTagList: any) {
        state.gTagList = aTagList.rows.map((aItem: string[]) => {
            return aItem[0];
        });
    },
    [MutationTypes.setTempNewChartData](state: RootState, aTemp: TempNewChartData) {
        state.gTempNewChartData = aTemp;
    },
    [MutationTypes.setNewChartBoard](state: RootState, aTemp: PanelInfo) {
        state.gBoard.panels.push([{ ...aTemp }]);
    },
    [MutationTypes.setNewBoard](state: RootState, aTemp: any) {
        state.gBoard = {
            ...state.gBoard,
            board_id: aTemp.board_id,
            board_name: aTemp.board_name,
            old_id: aTemp.old_id,
        };
    },
    [MutationTypes.setValueDashBoard](state: RootState, aTemp: any) {
        state.gBoard = {
            ...state.gBoard,
            ...aTemp,
        };
    },
    [MutationTypes.setRangeData](state: RootState, aRangeData: any) {
        if (aRangeData) {
            const mapData = aRangeData.rows.map((aItem: any, aIdx: number) => {
                return { range: toTimeUtcChart(aItem[1]) - toTimeUtcChart(aItem[0]), index: aIdx };
            });
            const sReturn = mapData.sort(function (aItem: any, bItem: any) {
                return parseFloat(bItem['range']) - parseFloat(aItem['range']);
            });

            const sRangeData = {
                max: aRangeData.rows[sReturn[0].index][1],
                min: aRangeData.rows[sReturn[0].index][0],
            };

            state.gRangeData = sRangeData;
        }
    },
    [MutationTypes.setTable](state: RootState, aTable: any) {
        state.gTable = aTable;
    },
    [MutationTypes.setChartEdit](state: RootState, payload: { index: number; item: Partial<PanelInfo> }) {
        state.gBoardPanelEdit.index = payload.index;
        state.gBoardPanelEdit.item = { ...state.gBoard.panels[payload.index][0], ...payload.item };
        state.gBoardPanelEdit.item.tag_set.forEach((item: any, index: number) => {
            if (item.id) {
                delete (state.gBoardPanelEdit.item.tag_set[index] as any).id;
            }
        });
    },
    [MutationTypes.setDeleteChart](state: RootState, payload: number) {
        state.gBoard.panels.splice(payload, 1);
    },
    [MutationTypes.setChartBoardEdit](state: RootState) {
        if (isEmpty(state.gBoardPanelEdit.item)) return;
        state.gBoard.panels[state.gBoardPanelEdit.index][0] = state.gBoardPanelEdit.item;
    },
    [MutationTypes.setBoardByFileUpload](state: RootState, payload: BoardInfo) {
        state.gBoard = payload;
    },
    [MutationTypes.setBoardOld](state: RootState, payload: BoardInfo) {
        state.gBoardOld = payload;
    },
};

type Mutations = typeof mutations;

export { MutationTypes, mutations, Mutations };
