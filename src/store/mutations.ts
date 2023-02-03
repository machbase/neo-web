import { TempNewChartData } from './../interface/tagView';
import { ResBoardList, ResPreferences, TimeRange } from '@/interface/tagView';
import { RootState } from './state';

enum MutationTypes {
    /* Global */
    setPreference = 'setPreference',
    activeHeader = 'activeHeader',
    setBoardList = 'setBoardList',
    setTimeRange = 'setTimeRange',
    setTableList = 'setTableList',
    setTagList = 'setTagList',
    setTempNewChartData = 'setTempNewChartData',
}

const mutations = {
    /* Global */
    [MutationTypes.activeHeader](state: RootState, aActive: boolean) {
        state.gActiveHeader = aActive;
    },
    [MutationTypes.setBoardList](state: RootState, aBoardList: ResBoardList[]) {
        state.gBoardList = aBoardList;
    },
    [MutationTypes.setPreference](state: RootState, aPreference: ResPreferences) {
        state.gPreference = aPreference;
    },
    [MutationTypes.setTimeRange](state: RootState, aTimeRange: TimeRange) {
        state.gTimeRange = aTimeRange;
    },
    [MutationTypes.setTableList](state: RootState, aTableList: any) {
        console.log('🚀 ~ file: mutations.ts:31 ~ aTableList', aTableList);
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
};

type Mutations = typeof mutations;

export { MutationTypes, mutations, Mutations };
