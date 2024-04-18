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
        {
            id: 'KEY',
            type: 'KEY',
            label: 'KEY',
        },
    ],
});

export const gTables = atom<any>({
    key: 'gTables',
    default: [],
});
export const gConsoleSelector = selector<any>({
    key: 'gConsoleSelector',
    get: ({ get }) => {
        const sArray: any = get(gConsoleList);
        return sArray;
    },
    set: ({ set }, aNewValue) => {
        if (aNewValue.length > 200) {
            // 배열 길이가 200개를 초과하는 경우
            // 첫 번째 요소를 제거한 후 나머지 요소를 유지
            const sNewSlicedArray = aNewValue.slice(1, 201);
            set(gConsoleList, sNewSlicedArray);
        } else {
            set(gConsoleList, aNewValue);
        }
    },
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

export const gKeyList = atom<any>({
    key: 'gKeyList',
    default: [] as any,
});

export const gActiveKey = atom<any>({
    key: 'gActiveKey',
    default: '' as string,
});
