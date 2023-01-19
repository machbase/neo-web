import { ResBoardList, ResPreferences, TimeRange } from '@/interface/tagView';
import { RootState } from './state';

enum MutationTypes {
    /* Global */
    setPreference = 'setPreference',
    activeHeader = 'activeHeader',
    setBoardList = 'setBoardList',
    setTimeRange = 'setTimeRange',
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
};

type Mutations = typeof mutations;

export { MutationTypes, mutations, Mutations };
