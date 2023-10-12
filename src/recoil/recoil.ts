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

export const gConsoleList = atom<any>({
    key: 'gConsoleList',
    default: [] as any,
});

export const gSelectedExtension = atom<string>({
    key: 'gSelectedExtension',
    default: 'EXPLORER',
});
export const gExtensionList = atom<any>({
    key: 'gExtensionList',
    default: [
        {
            id: 'EXPLORER',
            type: 'EXPLORER',
            label: 'EXPLORER',
        },
        {
            id: 'DBEXPLORER',
            type: 'DBEXPLORER',
            label: 'DBEXPLORER',
        },
        {
            id: 'REFERENCE',
            type: 'REFERENCE',
            label: 'REFERENCE',
        },
    ],
});

export const gTables = atom<any>({
    key: 'gTables',
    default: [],
});

export const gRollupTableList = atom<any>({
    key: 'gRollupTableList',
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
