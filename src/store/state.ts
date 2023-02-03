import { BoardInfo, RangeData } from '@/interface/chart';
import { ResBoardList, ResPreferences, TimeRange } from '@/interface/tagView';

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
    gRangeData: {} as RangeData,
    gTable: {} as any,
};

type RootState = typeof state;

export { state, RootState };
