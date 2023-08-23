import { getId } from '@/utils';
import { atom, selector } from 'recoil';

export interface GBoardListType {
    [key: string]: any;
}
const defaultId = getId();
export const gBoardList = atom<GBoardListType[]>({
    key: 'gBoardList',
    default: [
        {
            id: defaultId,
            type: 'new',
            name: 'new',
            path: '',
            code: '',
            panels: [],
            range_bgn: '',
            range_end: '',
            sheet: [],
            shell: {},
            savedCode: false,
        },
    ],
});

export const gSelectedTab = atom<string>({
    key: 'gSelectedTab',
    default: defaultId,
});

export const gSelectedExtension = atom<string>({
    key: 'gSelectedExtension',
    default: 'machbase-neo',
});

export const gTables = atom<any>({
    key: 'gTables',
    default: [],
});

export const gSelectedBoard = selector<any>({
    key: 'gSelectedBoard',
    get: ({ get }) => {
        const sBoardList = get(gBoardList);
        const sSelectedTab = get(gSelectedTab);

        return sBoardList.filter((aBoard) => aBoard.id === sSelectedTab)[0];
    },
});
