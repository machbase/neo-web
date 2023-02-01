import { ResBoardList, ResPreferences, TimeRange } from '@/interface/tagView';

const state = {
    /* Global */
    gPreference: {} as ResPreferences,
    gActiveHeader: false as boolean,
    gBoardList: [] as ResBoardList[],
    gTimeRange: {} as TimeRange,
    gTableList: [] as any,
    gSecRollupExist: {} as any,
    gTagList: [] as any,
};
console.log("🚀 ~ file: state.ts:11 ~ gTableList", state.gTableList)

type RootState = typeof state;

export { state, RootState };
