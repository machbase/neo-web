import { BoardPanelEdit, ResBoardList, ResPreferences, TempNewChartData, TimeRange } from '@/interface/tagView';
import { BoardInfo, RangeData, PanelInfo } from '@/interface/chart';

const state = {
    /* Global */
    gActiveHeader: false as boolean,
    /* Popup */
    gPreference:
        JSON.parse(localStorage.getItem('gPreference') as string) ||
        ({
            ip: '127.0.0.1',
            theme: 'machIoTchartWhite',
            font: '16',
            home_board: '',
            timeout: 20000,
            port: '5657',
        } as ResPreferences),
    gTimeRange: {} as TimeRange,
    gTimeRangeSetting: {} as TimeRange,
    // New chart
    gTableList: [] as any,
    gTagList: [] as any,
    gTempNewChartData: {} as TempNewChartData,

    // * Request rollup
    gSecRollupExist: {} as any,

    gTabList: [{ type: 'new', board_id: 'new', range_end: '', refresh: '', board_name: 'new', range_bgn: '', panels: [], code: '' }] as BoardInfo[],

    gSelectedTab: 'board1',
    gLastSelectedTab: '',
    // list board

    gTabBoardList: [] as BoardInfo[],
    // tag-view
    gBoard: {
        type: 'new',
        board_id: '',
        range_end: '',
        refresh: '',
        board_name: '',
        range_bgn: '',
        panels: [],
        code: '',
    } as BoardInfo,
    // old

    gBoardOld: {
        type: 'new',
        board_id: '',
        range_end: '',
        refresh: '',
        board_name: '',
        range_bgn: '',
        panels: [],
        code: '',
    } as BoardInfo,

    gBoardPanelEdit: {
        index: 0,
        item: {},
    } as BoardPanelEdit,

    // Range Time chart
    gRangeData: {} as RangeData,

    //ActionTypes.fetchTableList
    gTable: {} as any,
    gDownload: false,
    gDownloadData: [] as any,
    gImportData: [] as any,
};

type RootState = typeof state;

export { state, RootState };
