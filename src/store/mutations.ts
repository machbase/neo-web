import { TempNewChartData } from './../interface/tagView';
import { ResBoardList, ResPreferences, TimeRange, BoardPanelEdit } from '@/interface/tagView';
import { RootState } from './state';
import { BoardInfo, PanelInfo, RangeData } from '@/interface/chart';
import { cloneDeep, isEmpty } from 'lodash';

enum MutationTypes {
    /* Global */
    setPreference = 'setPreference',
    activeHeader = 'activeHeader',
    setBoard = 'setBoard',
    setTable = 'setTable',
    setBoardList = 'setBoardList',
    setTimeRange = 'setTimeRange',
    setTableList = 'setTableList',
    setTagList = 'setTagList',
    setTempNewChartData = 'setTempNewChartData',
    setRangeData = 'setRangeData',
    setChartEdit = 'setChartEdit',
    setNewChartBoard = 'setNewChartBoard',
    setNewBoard = 'setNewBoard',
    setDeleteChart = 'setDeleteChart',
    setChartBoardEdit = 'setChartBoardEdit',
    setBoardByFileUpload = 'setBoardByFileUpload',
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
    [MutationTypes.setTimeRange](state: RootState, aTimeRange: TimeRange) {
        state.gTimeRange = aTimeRange;
        state.gBoard = {
            ...state.gBoard,
            range_end: aTimeRange.end,
            range_bgn: aTimeRange.start,
        };
    },
    [MutationTypes.setTableList](state: RootState, aTableList: any) {
        const mutateTables = [];
        const gTagTables = state.gTableList;
        if (gTagTables.length > 0) {
            gTagTables.splice(0, gTagTables.length);
            state.gSecRollupExist = {};
        }
        for (let i = 0; i < aTableList.length; i++) {
            if (aTableList[i].length > 3 && aTableList[i][2] == 'Y' && aTableList[i][3] == 'Y') {
                const sTagTable = aTableList[i][0];
                mutateTables.push(sTagTable);
                state.gSecRollupExist[sTagTable] = aTableList[i][1];
            }
        }
        state.gTableList = mutateTables;
        if (state.gTableList.length < 1) {
            state.gTableList.push('TAG');
        }
    },
    [MutationTypes.setTagList](state: RootState, aTagList: any) {
        state.gTagList = aTagList;
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
    [MutationTypes.setRangeData](state: RootState, aRangeData: RangeData) {
        state.gRangeData = aRangeData;
    },
    [MutationTypes.setTable](state: RootState, aTable: any) {
        state.gTable = aTable;
    },
    [MutationTypes.setChartEdit](state: RootState, payload: { index: number; item: Partial<PanelInfo> }) {
        state.gBoardPanelEdit.index = payload.index;
        state.gBoardPanelEdit.item = { ...state.gBoard.panels[payload.index][0], ...payload.item };
    },
    [MutationTypes.setDeleteChart](state: RootState, payload: number) {
        state.gBoard.panels.splice(payload, 1);
    },
    [MutationTypes.setChartBoardEdit](state: RootState) {
        if (isEmpty(state.gBoardPanelEdit.item)) return;
        state.gBoard.panels[state.gBoardPanelEdit.index][0] = state.gBoardPanelEdit.item;
    },
    [MutationTypes.setBoardByFileUpload](state: RootState, payload: any) {
        state.gBoard.panels[payload.index][0] = payload.item;
    },
};

type Mutations = typeof mutations;

export { MutationTypes, mutations, Mutations };
