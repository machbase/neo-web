import { ResBoardList, ResPreferences, TempNewChartData, TimeRange } from '@/interface/tagView';
import { BoardInfo, RangeData } from '@/interface/chart';

const state = {
    /* Global */
    gPreference: {} as ResPreferences,
    gActiveHeader: false as boolean,
    gBoard: {
        board_id: '',
        range_end: '',
        refresh: '',
        board_name: '',
        range_bgn: '',
        panels: [],
    } as BoardInfo,
    gBoardList: [] as ResBoardList[],
    gTimeRange: {} as TimeRange,
    gTableList: [] as any,
    gSecRollupExist: {} as any,
    gTagList: [] as any,
    gTempNewChartData: {} as TempNewChartData,
    gRangeData: {} as RangeData,
    gTable: {} as any,
};
console.log('🚀 ~ file: state.ts:11 ~ gTempNewChartData', state.gTempNewChartData);

type RootState = typeof state;

export { state, RootState };
