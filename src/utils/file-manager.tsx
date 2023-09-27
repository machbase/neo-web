export enum Type {
    FILE,
    DIRECTORY,
    DUMMY,
}

interface CommonProps {
    id: string;
    type: Type;
    name: string;
    parentId: string | undefined;
    depth: number;
}

export interface File extends CommonProps {
    content: string;
}

export interface Directory extends CommonProps {
    files: File[];
    dirs: Directory[];
}

export function buildFileTree(data: any): Directory {
    const dirs = [...data.directories];
    const files = [...data.modules];
    const cache = new Map<string, Directory | File>();

    const rootDir: Directory = {
        id: '0',
        name: 'root',
        parentId: undefined,
        type: Type.DIRECTORY,
        depth: 0,
        dirs: [],
        files: [],
    };

    dirs.forEach((item) => {
        const dir: Directory = {
            id: item.shortid,
            name: item.title,
            parentId: item.directory_shortid === null ? '0' : item.directory_shortid,
            type: Type.DIRECTORY,
            depth: 0,
            dirs: [],
            files: [],
        };

        cache.set(dir.id, dir);
    });

    files.forEach((item) => {
        const file: File = {
            id: item.shortid,
            name: item.title,
            parentId: item.directory_shortid === null ? '0' : item.directory_shortid,
            type: Type.FILE,
            depth: 0,
            content: item.code,
        };
        cache.set(file.id, file);
    });

    cache.forEach((value) => {
        if (value.parentId === '0') {
            if (value.type === Type.DIRECTORY) rootDir.dirs.push(value as Directory);
            else rootDir.files.push(value as File);
        } else {
            const parentDir = cache.get(value.parentId as string) as Directory;
            if (value.type === Type.DIRECTORY) parentDir.dirs.push(value as Directory);
            else parentDir.files.push(value as File);
        }
    });

    getDepth(rootDir, 0);

    return rootDir;
}

function getDepth(rootDir: Directory, curDepth: number) {
    rootDir.files.forEach((file) => {
        file.depth = curDepth + 1;
    });
    rootDir.dirs.forEach((dir) => {
        dir.depth = curDepth + 1;
        getDepth(dir, curDepth + 1);
    });
}

export function findFileByName(rootDir: Directory, filename: string): File | undefined {
    let targetFile: File | undefined = undefined;

    function findFile(rootDir: Directory, filename: string) {
        rootDir.files.forEach((file) => {
            if (file.name === filename) {
                targetFile = file;
                return;
            }
        });
        rootDir.dirs.forEach((dir) => {
            findFile(dir, filename);
        });
    }

    findFile(rootDir, filename);
    return targetFile;
}

export function sortDir(l: Directory, r: Directory) {
    return l.name.localeCompare(r.name);
}

export function sortFile(l: File, r: File) {
    return l.name.localeCompare(r.name);
}

/** findItemByUniqueKey
 * @rootDir Directory
 * @uniqueKey Item.path + Item.name + '-' + Item.depth
 */
export function findItemByUniqueKey(rootDir: Directory, aUniqueKey: string) {
    let TargetItem: any = undefined;
    function findFile(rootDir: Directory, aKey: string) {
        rootDir.files.forEach((file: any) => {
            if (file.path + file.name + '-' + file.depth === aKey) {
                TargetItem = file;
                return;
            }
        });
        rootDir.dirs.forEach((dir: any) => {
            if (dir.path + dir.name + '-' + dir.depth === aKey) {
                TargetItem = dir;
                return;
            } else findFile(dir, aKey);
        });
    }
    findFile(rootDir, aUniqueKey);
    return TargetItem;
}

export function findParentDirByUniqueKey(rootDir: Directory, aUniqueKey: string) {
    let TargetItem: any = undefined;
    function findFile(rootDir: Directory, aKey: string) {
        rootDir.files.forEach((file: any) => {
            if (file.path + file.name + '-' + file.depth === aKey) {
                TargetItem = rootDir;
                return;
            }
        });
        rootDir.dirs.forEach((dir: any) => {
            if (dir.path + dir.name + '-' + dir.depth === aKey) {
                TargetItem = rootDir;
                return;
            } else findFile(dir, aKey);
        });
    }
    findFile(rootDir, aUniqueKey);
    return TargetItem.path + TargetItem.name + '-' + TargetItem.depth;
}

export function renameManager(rootDir: Directory, aUniqueKey: string, rename: string) {
    const sResult = JSON.parse(JSON.stringify(rootDir));

    function findTarget(rootDir: Directory, aKey: string, rename: string) {
        rootDir.files = rootDir.files.map((file: any) => {
            if (file.path + file.name + '-' + file.depth === aKey) {
                return { ...file, id: rename, name: rename };
            } else return file;
        });
        rootDir.dirs = rootDir.dirs.map((dir: any) => {
            if (dir.path + dir.name + '-' + dir.depth === aKey) {
                return { ...dir, id: rename, name: rename, dirs: [], files: [], isOpen: false };
            } else return findTarget(dir, aKey, rename);
        });
        return rootDir;
    }
    return findTarget(sResult, aUniqueKey, rename);
}
