import { Board } from '@/interface/tagView';

const state = {
    /* Global */
    gDarkMode: true as boolean,
    gActiveHeader: false as boolean,
    gBoardList: [] as Board[],
};

type RootState = typeof state;

export { state, RootState };
