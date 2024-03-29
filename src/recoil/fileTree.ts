import { atom, selector } from 'recoil';

export const gFileTree = atom({
    key: 'gFileTree',
    default: { depth: 0, dirs: [], files: [], id: '', name: '', parentId: undefined, type: 0, path: 'ROOT' },
});

export const gFileTreeRoot = selector({
    key: 'gFileTreeRoot',
    get: ({ get }) => {
        return get(gFileTree);
    },
});

export const gRecentDirectory = atom({
    key: 'gRecentDirectory',
    default: '/',
});

export const gRenameFile = atom({
    key: 'gRename',
    default: undefined,
});

export const gDeleteFileList = atom({
    key: 'gDeleteFileList',
    default: undefined,
});
