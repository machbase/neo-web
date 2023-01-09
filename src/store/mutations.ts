import { Board } from '@/interface/tagView';
import { RootState } from './state';

enum MutationTypes {
    /* Global */
    activeDarkMode = 'activeDarkMode',
    activeHeader = 'activeHeader',
    setBoardList = 'setBoardList',
}

const mutations = {
    /* Global */
    [MutationTypes.activeDarkMode](state: RootState, aActive: boolean) {
        state.gDarkMode = aActive;
    },
    [MutationTypes.activeHeader](state: RootState, aActive: boolean) {
        state.gActiveHeader = aActive;
    },
    [MutationTypes.setBoardList](state: RootState, aBoardList: Board[]) {
        state.gBoardList = aBoardList;
    },
};

type Mutations = typeof mutations;

export { MutationTypes, mutations, Mutations };
