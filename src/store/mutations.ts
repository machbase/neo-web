import { ResBoardList, ResPreferences, TimeRange } from '@/interface/tagView';
import { RootState } from './state';
import { BoardInfo, RangeData } from '@/interface/chart';

enum MutationTypes {
    /* Global */
    setPreference = 'setPreference',
    activeHeader = 'activeHeader',
    setBoard = 'setBoard',
    setTable = 'setTable',
    setBoardList = 'setBoardList',
    setTimeRange = 'setTimeRange',
    setRangeData = 'setRangeData',
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
    [MutationTypes.setTimeRange](state: RootState, aTimeRange: TimeRange) {
        state.gTimeRange = aTimeRange;
    },
    [MutationTypes.setRangeData](state: RootState, aRangeData: RangeData) {
        state.gRangeData = aRangeData;
    },
    [MutationTypes.setTable](state: RootState, aTable: any) {
        state.gTable = aTable;
    },
};

type Mutations = typeof mutations;

export { MutationTypes, mutations, Mutations };
