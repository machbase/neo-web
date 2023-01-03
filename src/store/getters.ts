import { RootState } from './state';

const getters = {
    getStatusHeader(state: RootState) {
        return state.gActiveHeader
    },
};

type Getters = typeof getters;

export { getters, Getters };
