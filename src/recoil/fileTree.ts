import { atom, selector } from 'recoil';
import moment from 'moment';
import { FileTreeType } from '@/utils/fileTreeParser';

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

/** dir */
// dirs
// files
// gitClone
// isOpen
// virtual

/** file */
// content
const DEFAULT_TREE_VALUE = {
    depth: 0,
    id: '',
    name: '',
    parentId: undefined,
    type: 0,
    path: 'ROOT',
};
const findDir = (aOriginDir: any, aParedData: any, aTargetDir: any): any[] => {
    if (aOriginDir.name === aTargetDir.name && aOriginDir.depth === aTargetDir.depth && aOriginDir.path === aTargetDir.path) {
        if (aParedData.type) return [...aOriginDir.dirs, aParedData];
        else return [...aOriginDir.files, aParedData];
    }

    return aOriginDir.dirs.map((aDir: any) => {
        if (aDir.name === aTargetDir.name && aDir.depth === aTargetDir.depth && aDir.path === aTargetDir.path) {
            if (aParedData.type) return { ...aDir, files: aTargetDir?.files ? [...aTargetDir.files] : [], dirs: aTargetDir?.dirs ? [...aTargetDir.dirs] : [], isOpen: true };
            else return { ...aDir, files: aTargetDir?.files ? [...aTargetDir.files] : [], dirs: aTargetDir?.dirs ? [...aTargetDir.dirs] : [], isOpen: true };
        } else if (aParedData.path.includes(aDir.name)) {
            return { ...aDir, dirs: findDir(aDir, aParedData, aTargetDir), isOpen: true };
        } else return aDir;
    });
};
/** add (file & folder) */
export const gUpdateFileTree = selector({
    key: 'gUpdateFileTree',
    get: () => {},
    set: ({ set, get }, newValue: any) => {
        const sPath = newValue.path.replace(newValue.name, '');
        const sParent = sPath
            .split('/')
            .filter((aPath: string) => aPath !== '')
            .at(-1);
        const sParentPath = sPath.replace(sParent + '/', '');
        const sDepth = sPath.split('/').length - 1;

        let updateItem: any = { ...DEFAULT_TREE_VALUE, path: sPath, type: newValue.type, name: newValue.name, id: newValue.name, parentId: sParent ?? '0', depth: sDepth };
        if (newValue.type) {
            updateItem = { ...updateItem, dirs: [], files: [], gitClone: newValue.gitClone, isOpen: false, virtual: false };
            newValue?.gitUrl && (updateItem.gitUrl = newValue.gitUrl);
        } else updateItem = { ...updateItem, content: moment().unix().toString() };

        const sTmpDir = findDir(
            get(gFileTree),
            updateItem,
            newValue?.dirInfo
                ? { name: sParent ?? '\\', depth: sDepth - 1, path: sParentPath, dirs: newValue.dirInfo.dirs, files: newValue.dirInfo.files }
                : { name: sParent ?? '\\', depth: sDepth - 1, path: sParentPath }
        );
        const sTmpTree = JSON.parse(JSON.stringify(get(gFileTree)));
        if (sParentPath === '/' && newValue.type === 0 && sDepth - 1 === 0) sTmpTree.files = sTmpDir;
        else sTmpTree.dirs = sTmpDir;
        set(gFileTree, sTmpTree);
    },
});
const removeFile = (aRoot: any, aItem: any) => {
    const sPath = aItem.path.split('/').filter((aPath: string) => !!aPath);
    if (sPath && sPath.length > 0) {
        const sTmpDir = removeTargetFile(aRoot, aItem);
        aRoot.dirs = sTmpDir;
        return aRoot;
    } else {
        const sTmpFile = aRoot.files.filter((aFile: any) => !(aFile.name === aItem.name && aFile.path === aItem.path && aFile.depth === aItem.depth));
        aRoot.files = sTmpFile;
        return aRoot;
    }
};
const removeTargetFile = (aOriginDir: FileTreeType, aParedData: FileTreeType): any => {
    return aOriginDir.dirs.map((aDir: FileTreeType) => {
        if (aDir.path + aDir.name + '/' === aParedData.path && aDir.depth === aParedData.depth - 1) {
            const tmpFiles = aDir.files.filter((aFiles: any) => !(aFiles.name === aParedData.name && aFiles.path === aParedData.path && aFiles.depth === aFiles.depth));
            return { ...aDir, files: tmpFiles };
        } else if (aParedData.path.includes(aDir.name)) {
            return { ...aDir, dirs: removeTargetFile(aDir, aParedData) };
        } else return aDir;
    });
};
const removeDir = (aRoot: any, aItem: any) => {
    const sPath = aItem.path.split('/').filter((aPath: string) => !!aPath);
    if (sPath && sPath.length > 0) {
        const sTmpDir = removeTargetDir(aRoot, aItem);
        aRoot.dirs = sTmpDir;
        return aRoot;
    } else {
        const sTmpDir = aRoot.dirs.filter((aDir: any) => !(aDir.name === aItem.name && aDir.path === aItem.path && aDir.depth === aItem.depth));
        aRoot.dirs = sTmpDir;
        return aRoot;
    }
};
const removeTargetDir = (aOriginDir: FileTreeType, aParedData: FileTreeType): any => {
    return aOriginDir.dirs.map((aDir: FileTreeType) => {
        if (aDir.depth + 1 === aParedData.depth && aDir.path + aDir.name + '/' === aParedData.path) {
            const tmpDir = aDir.dirs.filter((aDir: any) => !(aDir.name === aParedData.name && aDir.path === aParedData.path && aDir.depth === aParedData.depth));
            return { ...aDir, dirs: tmpDir };
        } else if (aParedData.path.includes(aDir.name)) {
            return { ...aDir, dirs: removeTargetDir(aDir, aParedData) };
        } else return aDir;
    });
};
/** delete (file & folder) */
export const gDeleteFileTree = selector({
    key: 'gDeleteFileTree',
    get: () => {},
    set: ({ set, get }, delValue: any) => {
        const sTmpTree = JSON.parse(JSON.stringify(get(gFileTree)));
        const sNewTree = delValue.type === 0 ? removeFile(sTmpTree, delValue) : removeDir(sTmpTree, delValue);
        set(gFileTree, sNewTree);
    },
});
const replaceDir = (aOriginDir: any, aParedData: any) => {
    return aOriginDir.dirs.map((aDir: FileTreeType) => {
        if (aDir.depth === aParedData.depth && aDir.path === aParedData.path && aDir.name === aParedData.name) {
            return aParedData;
        } else if (aParedData.path.includes(aDir.name)) {
            return { ...aDir, dirs: replaceDir(aDir, aParedData) };
        } else return aDir;
    });
};
/** replace */
export const gReplaceTree = selector({
    key: 'gReplaceTree',
    get: () => {},
    set: ({ set, get }, replaceValue: any) => {
        const sTmpTree = JSON.parse(JSON.stringify(get(gFileTree)));
        sTmpTree.dirs = replaceDir(sTmpTree, replaceValue);
        set(gFileTree, sTmpTree);
    },
});
/** copy file */
export const gCopyFileTree = selector({
    key: 'gCopyFileTree',
    get: () => {},
    set: ({ set, get }, newValue: any) => {
        const sTmp = JSON.parse(JSON.stringify(get(gFileTree)));

        if (newValue.path === '/' && newValue.depth === 1 && newValue.parentId === '0') {
            sTmp.files.push(newValue);
        } else {
            const addTargetFile = (aOriginDir: FileTreeType, aParedData: FileTreeType, aAddTargetPath: string): any => {
                return aOriginDir.dirs.map((aDir: any) => {
                    if (aDir.depth + 1 === aParedData.depth && aDir.path + aDir.name + '/' === aParedData.path) {
                        return {
                            ...aDir,
                            files: [
                                ...aDir.files,
                                {
                                    ...aParedData,
                                    depth: aParedData.type === 0 ? aParedData.depth : aParedData.depth + 1,
                                    parentId: aParedData.type === 0 ? aParedData.parentId : aDir.id,
                                    path: aParedData.type === 0 ? aParedData.path : aParedData.path + aParedData.name + '/',
                                },
                            ],
                        };
                    } else if (aParedData.path.includes(aDir.name)) {
                        return { ...aDir, dirs: addTargetFile(aDir, aParedData, aAddTargetPath) };
                    } else return aDir;
                });
            };
            sTmp.dirs = addTargetFile(sTmp, newValue, newValue.path);
        }
        set(gFileTree, sTmp);
    },
});
