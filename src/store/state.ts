import { ResBoardList, ResPreferences, TempNewChartData, TimeRange } from '@/interface/tagView';

const state = {
    /* Global */
    gPreference: {} as ResPreferences,
    gActiveHeader: false as boolean,
    gBoardList: [] as ResBoardList[],
    gTimeRange: {} as TimeRange,
    gTimeRangeSetting: {} as TimeRange,
    gTableList: [] as any,
    gSecRollupExist: {} as any,
    gTagList: [] as any,
    gTempNewChartData: {} as TempNewChartData,
};
console.log("🚀 ~ file: state.ts:11 ~ gTempNewChartData", state.gTempNewChartData)

type RootState = typeof state;

export { state, RootState };
