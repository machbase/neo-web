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
    updateCode = 'updateCode',
    setTimeRange = 'setTimeRange',
    setTableList = 'setTableList',
    changeTab = 'changeTab',
    setSelectedTab = 'setSelectedTab',
    setLastSelectedTab = 'setLastSelectedTab',
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
    setDownLoad = 'setDownLoad',
    setDownLoadData = 'setDownLoadData',
    setImportData = 'setImportData',
    changeTabList = 'changeTabList',
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
    [MutationTypes.setLastSelectedTab](state: RootState, aItem: string) {
        state.gLastSelectedTab = aItem;
    },
    [MutationTypes.changeTab](state: RootState, aItem: any) {
        const sIdx = state.gTabList.findIndex((aItem) => aItem.board_id === state.gSelectedTab);
        state.gTabList[sIdx] = aItem;
    },
    [MutationTypes.setTabList](state: RootState, aList: any) {
        state.gSelectedTab = aList;
    },
    [MutationTypes.pushTab](state: RootState, aItem: any) {
        state.gTabList.push(aItem);
    },
    [MutationTypes.changeTabList](state: RootState, aTabList: any) {
        state.gTabList = aTabList;
    },
    [MutationTypes.setTimeRange](state: RootState, aTimeRange: TimeRange) {
        const sIdx = state.gTabList.findIndex((aItem) => aItem.board_id === state.gSelectedTab);

        state.gTimeRange = JSON.parse(JSON.stringify(aTimeRange));
        state.gTabList[sIdx].range_end = aTimeRange.end;
        state.gTabList[sIdx].range_bgn = aTimeRange.start;
        state.gTabList[sIdx].refresh = aTimeRange.refresh || '';
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
        const sIdx = state.gTabList.findIndex((aItem) => aItem.board_id === state.gSelectedTab);

        state.gTabList[sIdx].panels.push([{ ...aTemp }]);
    },
    [MutationTypes.setNewBoard](state: RootState, aTemp: any) {
        state.gBoard = {
            ...state.gBoard,
            board_id: aTemp.board_id,
            board_name: aTemp.board_name,
            old_id: aTemp.old_id,
        };
    },
    [MutationTypes.updateCode](state: RootState, aCode: any) {
        state.gBoard.code = aCode;
    },

    [MutationTypes.setDownLoad](state: RootState, aDownload: any) {
        state.gDownload = aDownload;
    },
    [MutationTypes.setDownLoadData](state: RootState, aDownloadData: any) {
        state.gDownloadData.push(aDownloadData);
    },
    [MutationTypes.setImportData](state: RootState, aImportData: any) {
        state.gImportData = aImportData;
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
        const sIdx = state.gTabList.findIndex((aItem) => aItem.board_id === state.gSelectedTab);
        state.gBoardPanelEdit.index = payload.index;
        state.gBoardPanelEdit.item = { ...state.gTabList[sIdx].panels[payload.index][0], ...payload.item };
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
        const sIdx = state.gTabList.findIndex((aItem) => aItem.board_id === state.gSelectedTab);

        state.gTabList[sIdx].panels[state.gBoardPanelEdit.index][0] = state.gBoardPanelEdit.item;
    },
    [MutationTypes.setBoardByFileUpload](state: RootState, payload: BoardInfo) {
        state.gBoard.board_id = payload.board_id;
        state.gBoard.board_name = payload.board_name;
        state.gBoard.code = payload.code;
        state.gBoard.panels = payload.panels;
        state.gBoard.range_bgn = payload.range_bgn;
        state.gBoard.range_end = payload.range_end;
        state.gBoard.refresh = payload.refresh;
        state.gBoard.type = payload.type;
    },
    [MutationTypes.setBoardOld](state: RootState, payload: BoardInfo) {
        state.gBoardOld = payload;
    },
};

type Mutations = typeof mutations;

export { MutationTypes, mutations, Mutations };
