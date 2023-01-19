import { ResBoardList, ResPreferences, TimeRange } from '@/interface/tagView';

const state = {
    /* Global */
    gPreference: {} as ResPreferences,
    gActiveHeader: false as boolean,
    gBoardList: [] as ResBoardList[],
    gTimeRange: {} as TimeRange,
};

type RootState = typeof state;

export { state, RootState };
