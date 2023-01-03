import { RootState } from './state';

enum MutationTypes {
    /* Global */
    activeHeader = 'activeHeader',
}

const mutations = {
    /* Global */
    [MutationTypes.activeHeader](state: RootState, aActive: boolean) {
        state.gActiveHeader = aActive;
    },
};

type Mutations = typeof mutations;

export { MutationTypes, mutations, Mutations };

