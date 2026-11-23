import { getFileList } from '@/api/repository/api';
import { copyFile } from '@/api/repository/fileTree';
import { fileTreeParser, type FileType } from './fileTreeParser';
import { generateCopyName } from './fileNameUtils';

export const UpdateTree = async ({ path, name }: { path: string; name: string }) => {
    const sPath = path.replace(name, '');
    const sDepth = sPath.split('/').length - 1;
    const sParent = sPath
        .split('/')
        .filter((aPath: string) => aPath !== '')
        .at(-1);
    if (sParent) {
        const sRes = await getFileList('', sPath, '');
        return fileTreeParser(sRes.data, `${sPath}`, sDepth - 1, sParent);
    } else return undefined;
};

export const TreeFetchDrilling = async (aOriginTree: any, aFullPath: string, aIsFile?: boolean) => {
    const sName: string = aFullPath.split('/').at(-1) ?? '/';
    const sPath = aFullPath.replace(sName, '');
    const sDepth = sPath.split('/').length - 1;
    const sParent = sPath
        .split('/')
        .filter((aPath: string) => aPath !== '')
        .at(-1);
    const sTmp = JSON.parse(JSON.stringify(aOriginTree));
    // Ensure trailing slash for directory fetch to avoid misclassification as file
    const ensureDir = (p: string) => (p.endsWith('/') ? p : p + '/');
    const sTargetDirInfo: any = aIsFile ? { success: true } : await getFileList('', ensureDir(aFullPath), '');
    let sAlreadyExist = false;

    const CheckFullPath = (aPath: string) => {
        const aTest = aFullPath.slice(0, aPath.length);
        return aTest === aPath;
    };

    const DirDrill = async (aTargetDir: any, aFullPath: string, aDepth: number) => {
        for await (const [aIdx, aDir] of aTargetDir.entries()) {
            if (aFullPath === aDir.path + aDir.name) {
                // If target dir fetch failed, just mark as open and keep current children
                if (!sTargetDirInfo || !sTargetDirInfo.success || !sTargetDirInfo.data) {
                    sAlreadyExist = true;
                    aTargetDir[aIdx].isOpen = true;
                    return aTargetDir;
                } else {
                    const sParsedTargetRes = fileTreeParser(sTargetDirInfo.data, sPath + sName + '/', sDepth, sTargetDirInfo.data.name);
                    sAlreadyExist = true;
                    aTargetDir[aIdx].dirs = sParsedTargetRes.dirs;
                    aTargetDir[aIdx].files = sParsedTargetRes.files;
                    aTargetDir[aIdx].isOpen = true;
                    return aTargetDir;
                }
            } else if (CheckFullPath(aDir.path + aDir.name)) {
                const sReslut: any = await getFileList('', ensureDir(aDir.path + aDir.name), '');
                if (sReslut.success) {
                    const sParsedRes = fileTreeParser(sReslut.data, aDir.path + aDir.name + '/', aDepth + 1, sReslut.data.name);
                    const sDirs: any = {
                        ...aDir,
                        dirs: await DirDrill(sParsedRes.dirs, aFullPath, aDepth + 1),
                        files: sDepth - 1 === aDir.depth ? sParsedRes.files : aDir.files,
                        isOpen: CheckFullPath(aDir.path + aDir.name),
                    };
                    aTargetDir.splice(aIdx, 1, sDirs);
                }
            }
        }
        return aTargetDir;
    };

    // root path
    if (sPath === '/' && sDepth === 1 && !sParent) {
        const sRootDirRes: any = await getFileList('', '/', '');
        if (sRootDirRes.success && sTargetDirInfo.success) {
            const sParsedRes = fileTreeParser(sRootDirRes.data, '/', 0, sRootDirRes.data.name);
            // DIR
            if (!aIsFile) {
                const sParsedTargetRes = fileTreeParser(sTargetDirInfo.data, sPath + sTargetDirInfo.data.name + '/', 1, sTargetDirInfo.data.name);
                if (sParsedRes.dirs.length !== 0) {
                    let sTargetIdx = -1;
                    sTmp.dirs.map((bDir: any, bIdx: number) => {
                        if (bDir.name === sName && bDir.id === sName && bDir.depth === sDepth) {
                            sAlreadyExist = true;
                            sTargetIdx = bIdx;
                        }
                    });
                    sParsedRes.dirs.map((aDir: any) => {
                        if (aDir.name === sName && aDir.id === sName && aDir.depth === sDepth) {
                            if (sAlreadyExist && sTargetIdx >= 0) {
                                sTmp.dirs[sTargetIdx] = { ...sTmp.dirs[sTargetIdx], dirs: sParsedTargetRes.dirs, files: sParsedTargetRes.files, isOpen: true };
                            } else sTmp.dirs.push({ ...aDir, dirs: sParsedTargetRes.dirs, files: sParsedTargetRes.files, isOpen: true });
                        }
                    });
                    return { tree: sTmp, exist: sAlreadyExist };
                }
            }
            // FILE
            else {
                sParsedRes.files.map((aFile: any) => {
                    if (aFile.name === sName && aFile.id === sName && aFile.depth === sDepth && aFile.path === sPath) {
                        sTmp.files = sParsedRes.files;
                    }
                });
                return { tree: sTmp, exist: sAlreadyExist };
            }
        } else return { tree: aOriginTree, exist: sAlreadyExist };
    } else {
        const sResult = await DirDrill(sTmp.dirs, aFullPath, 0);
        return { tree: { ...sTmp, dirs: sResult }, exist: sAlreadyExist };
    }

    // ERROR
    return { tree: aOriginTree, exist: sAlreadyExist };
};

export const FileCopy = async (file: FileType) => {
    const directory = await getFileList('', file.path, '');
    if (!directory || !('success' in directory) || directory.success !== true || !directory.data?.isDir) return undefined;
    const names = new Set((directory.data.children ?? []).map((entry: { name: string }) => entry.name.normalize().toLowerCase()));

    for (let number = 1; ; number++) {
        const name = generateCopyName(file.name, number);
        if (names.has(name.normalize().toLowerCase())) continue;
        const result: any = await copyFile(file.path + file.name, file.path + name);
        if (result?.success) return { ...file, name, id: name };
        // A simultaneous save or a spelling alias can occupy the candidate even
        // if it wasn't present in the directory listing. The server leaves it intact.
        if (result?.status === 400 && result?.data?.reason === 'destination is not specified.') {
            throw new Error('This Neo server does not support safe file duplication.');
        }
        if (result?.status !== 409) return undefined;
    }
};
