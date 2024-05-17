import { getFileList, postFileList } from '@/api/repository/api';
import { fileTreeParser } from './fileTreeParser';
import { isJsonString } from './utils';

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
    const sTargetDirInfo: any = aIsFile ? { success: true } : await getFileList('', aFullPath, '');
    let sAlreadyExist = false;

    const CheckFullPath = (aPath: string) => {
        const aTest = aFullPath.slice(0, aPath.length);
        return aTest === aPath;
    };

    const DirDrill = async (aTargetDir: any, aFullPath: string, aDepth: number) => {
        for await (const [aIdx, aDir] of aTargetDir.entries()) {
            if (aFullPath === aDir.path + aDir.name) {
                const sParsedTargetRes = fileTreeParser(sTargetDirInfo.data, sPath + sName + '/', sDepth, sTargetDirInfo.data.name);
                sAlreadyExist = true;
                aTargetDir[aIdx].dirs = sParsedTargetRes.dirs;
                aTargetDir[aIdx].files = sParsedTargetRes.files;
                aTargetDir[aIdx].isOpen = true;
                return aTargetDir;
            } else if (CheckFullPath(aDir.path + aDir.name)) {
                const sReslut: any = await getFileList('', aDir.path + aDir.name, '');
                if (sReslut.success) {
                    const sParsedRes = fileTreeParser(sReslut.data, aDir.path + aDir.name + '/', aDepth + 1, sReslut.data.name);
                    const sDirs: any = {
                        ...aDir,
                        dirs: await DirDrill(sParsedRes.dirs, aFullPath, aDepth + 1),
                        files: aIsFile && sDepth - 1 === aDir.depth ? sParsedRes.files : aDir.files,
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
                const sParsedTargetRes = fileTreeParser(sTargetDirInfo.data, sPath, 1, sTargetDirInfo.data.name);
                if (sParsedRes.dirs.length !== 0) {
                    sTmp.dirs.map((bDir: any) => {
                        if (bDir.name === sName && bDir.id === sName && bDir.depth === sDepth) sAlreadyExist = true;
                    });
                    sParsedRes.dirs.map((aDir: any, aIdx: number) => {
                        if (aDir.name === sName && aDir.id === sName && aDir.depth === sDepth) {
                            if (sAlreadyExist) {
                                sTmp.dirs[aIdx] = { ...sTmp.dirs[aIdx], dirs: sParsedTargetRes.dirs, files: sParsedTargetRes.files, isOpen: true };
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

export const FileCopy = async (aTargetFile: any) => {
    const sTargetFolderInfo = await getFileList('', aTargetFile.path, '');
    const sTargetFileInfo: any = await getFileList('', aTargetFile.path, aTargetFile.name);
    const sParsedTargetFolder = fileTreeParser(sTargetFolderInfo.data, aTargetFile.path, aTargetFile.depth - 1, aTargetFile.parentId);
    const sTargetFileList = sParsedTargetFolder.files;
    const sExt = aTargetFile.name.split('.');
    const sDuplList = sTargetFileList.filter(
        (aFile: any) =>
            aFile.path === aTargetFile.path &&
            aFile.depth === aTargetFile.depth &&
            aFile.parentId === aTargetFile.parentId &&
            (aFile.path + aFile.name).includes(aTargetFile.path + sExt[0])
    );
    const sCopyName = `${sExt[0]} (${sDuplList.length}).${sExt[1]}`;
    let payload = undefined;

    if (isJsonString(sTargetFileInfo)) {
        payload = JSON.parse(sTargetFileInfo);
    } else {
        payload = sTargetFileInfo;
    }

    const sResult: any = await postFileList(payload, aTargetFile.path, sCopyName);
    if (sResult.success) {
        const sCopyFile = JSON.parse(JSON.stringify(aTargetFile));
        sCopyFile.name = sCopyName;
        sCopyFile.id = sCopyName;

        return sCopyFile;
    }
    return undefined;
};
