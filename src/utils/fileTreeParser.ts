export interface FileTreeType {
    depth: number;
    dirs: FileTreeType[] | [];
    files: FileType[] | [];
    id: string;
    name: string;
    parentId: string | undefined;
    type: Type;
    path: string | 'ROOT';
    gitClone: boolean;
    gitUrl: string | undefined;
    gitStatus: string | undefined;
    virtual: boolean;
    isOpen: boolean;
}
export interface FileType {
    content: string;
    depth: number;
    id: string;
    name: string;
    parentId: string;
    type: Type;
    path: string;
}

export enum Type {
    FILE,
    DIRECTORY,
    DUMMY,
}

interface ResFileType {
    gitClone: boolean;
    gitUrl?: string;
    isDir: boolean;
    lastModifiedUnixMillis: bigint;
    name: string;
    type: string;
    virtual: boolean;
}
export interface ResFileListType {
    children: ResFileType[];
    name: string;
    isDir: boolean;
    gitClone: boolean;
}
export const fileTreeParser = (aResFileList: ResFileListType, aPath: string, aDepth: number, aParentId: string) => {
    const sParedData: FileTreeType = {
        depth: aDepth,
        dirs:
            aResFileList && aResFileList.children
                ? aResFileList.children.filter((aFile: ResFileType) => aFile.isDir).map((aTargetDir: ResFileType) => dirFormatter(aTargetDir, aPath, aDepth, aParentId))
                : [],
        files:
            aResFileList && aResFileList.children
                ? aResFileList.children.filter((bFile: ResFileType) => !bFile.isDir).map((bTargetFile: ResFileType) => fileFormatter(bTargetFile, aPath, aDepth, aParentId))
                : [],
        id: aParentId,
        name: aResFileList && aResFileList.name,
        parentId: undefined,
        type: aResFileList && aResFileList.isDir ? 1 : 0,
        path: aPath,
        gitClone: aResFileList?.gitClone || false,
        gitUrl: undefined,
        gitStatus: undefined,
        isOpen: false,
        virtual: false,
    };
    return sParedData;
};
const dirFormatter = (aTarget: ResFileType, aPath: string, aDepth: number, aParentId: string) => {
    return {
        depth: aDepth + 1,
        dirs: [],
        files: [],
        id: aTarget.name,
        name: aTarget.name,
        parentId: aParentId,
        type: 1,
        path: aPath,
        gitClone: aTarget.gitClone ? true : false,
        gitUrl: aTarget.gitClone ? aTarget.gitUrl : undefined,
        gitStatus: undefined,
        virtual: aTarget.virtual,
        isOpen: false,
    };
};
const fileFormatter = (aTarget: ResFileType, aPath: string, aDepth: number, aParentId: string) => {
    return {
        content: aTarget.lastModifiedUnixMillis.toString(),
        depth: aDepth + 1,
        id: aTarget.name,
        name: aTarget.name,
        parentId: aParentId,
        type: 0,
        path: aPath,
    };
};

export function sortDir(l: FileTreeType, r: FileTreeType) {
    return l.name.localeCompare(r.name);
}

export function sortFile(l: FileType, r: FileType) {
    return l.name.localeCompare(r.name);
}
