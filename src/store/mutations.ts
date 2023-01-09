import { RootState } from './state';

enum MutationTypes {
    /* Global */
    activeDarkMode = 'activeDarkMode',
    activeHeader = 'activeHeader',
}

const mutations = {
    /* Global */
    [MutationTypes.activeDarkMode](state: RootState, aActive: boolean) {
        state.gDarkMode = aActive;
    },
    [MutationTypes.activeHeader](state: RootState, aActive: boolean) {
        state.gActiveHeader = aActive;
    },
};

type Mutations = typeof mutations;

export { MutationTypes, mutations, Mutations };
