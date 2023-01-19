import { ResBoardList, ResPreferences } from '@/interface/tagView';

const state = {
    /* Global */
    gPreference: {} as ResPreferences,
    gActiveHeader: false as boolean,
    gBoardList: [] as ResBoardList[],
};

type RootState = typeof state;

export { state, RootState };
