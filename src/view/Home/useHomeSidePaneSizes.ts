import { useCallback, useReducer } from 'react';

export type HomeSidePaneSizes = Array<string | number>;

export const DEFAULT_HOME_SIDE_SIZES: HomeSidePaneSizes = ['15%', '85%'];
export const CLOSED_HOME_SIDE_SIZES: HomeSidePaneSizes = ['0%', '100%'];

interface HomeSidePaneSizeState {
    sideSizes: HomeSidePaneSizes;
    lastOpenSideSizes: HomeSidePaneSizes;
}

type HomeSidePaneSizeAction = { type: 'resize'; sizes: HomeSidePaneSizes } | { type: 'open' } | { type: 'close' };

const cloneSizes = (sizes: HomeSidePaneSizes): HomeSidePaneSizes => {
    return [...sizes];
};

const isClosedSideSizes = (sizes: HomeSidePaneSizes): boolean => {
    return sizes.length === CLOSED_HOME_SIDE_SIZES.length && sizes.every((size, idx) => size === CLOSED_HOME_SIDE_SIZES[idx]);
};

const initialState: HomeSidePaneSizeState = {
    sideSizes: cloneSizes(DEFAULT_HOME_SIDE_SIZES),
    lastOpenSideSizes: cloneSizes(DEFAULT_HOME_SIDE_SIZES),
};

const reducer = (state: HomeSidePaneSizeState, action: HomeSidePaneSizeAction): HomeSidePaneSizeState => {
    switch (action.type) {
        case 'resize': {
            const nextSizes = cloneSizes(action.sizes);

            return {
                sideSizes: nextSizes,
                lastOpenSideSizes: isClosedSideSizes(nextSizes) ? state.lastOpenSideSizes : cloneSizes(nextSizes),
            };
        }
        case 'open':
            return {
                sideSizes: cloneSizes(state.lastOpenSideSizes),
                lastOpenSideSizes: cloneSizes(state.lastOpenSideSizes),
            };
        case 'close':
            return {
                sideSizes: cloneSizes(CLOSED_HOME_SIDE_SIZES),
                lastOpenSideSizes: cloneSizes(state.lastOpenSideSizes),
            };
        default:
            return state;
    }
};

export const useHomeSidePaneSizes = () => {
    const [state, dispatch] = useReducer(reducer, initialState);

    const setSideSizes = useCallback((sizes: HomeSidePaneSizes) => {
        dispatch({ type: 'resize', sizes });
    }, []);

    const openSideBar = useCallback(() => {
        dispatch({ type: 'open' });
    }, []);

    const closeSideBar = useCallback(() => {
        dispatch({ type: 'close' });
    }, []);

    return {
        sideSizes: state.sideSizes,
        setSideSizes,
        openSideBar,
        closeSideBar,
    };
};
