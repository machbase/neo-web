import { RootState } from './state';

const getters = {
    getDarkMode(state: RootState) {
        if (state.gPreference.theme === 'machIoTchartBlack') return true;
        if (state.gPreference.theme === 'machIoTchartWhite') return false;
    },
};

type Getters = typeof getters;

export { getters, Getters };
