import { BoardPanelEdit, ResBoardList, ResPreferences, TempNewChartData, TimeRange } from '@/interface/tagView';
import { BoardInfo, RangeData, PanelInfo } from '@/interface/chart';

const state = {
    /* Global */
    gActiveHeader: false as boolean,
    /* Popup */
    gPreference: {} as ResPreferences,
    gTimeRange: {} as TimeRange,
    gTimeRangeSetting: {} as TimeRange,
    // New chart
    gTableList: [] as any,
    gTagList: [] as any,
    gTempNewChartData: {} as TempNewChartData,

    // * Request rollup
    gSecRollupExist: {} as any,

    // list board
    gBoardList: [] as ResBoardList[],

    // tag-view
    gBoard: {
        board_id: '',
        range_end: '',
        refresh: '',
        board_name: '',
        range_bgn: '',
        panels: [],
    } as BoardInfo,
    // old
    gBoardOld: {
        board_id: '',
        range_end: '',
        refresh: '',
        board_name: '',
        range_bgn: '',
        panels: [],
    } as BoardInfo,

    gBoardPanelEdit: {
        index: 0,
        item: {},
    } as BoardPanelEdit,

    // Range Time chart
    gRangeData: {} as RangeData,

    //ActionTypes.fetchTableList
    gTable: {} as any,
};

type RootState = typeof state;

export { state, RootState };
