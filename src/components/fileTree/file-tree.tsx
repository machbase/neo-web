import React, { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import icons from '@/utils/icons';
import { FileTreeType, FileType, sortDir, sortFile } from '@/utils/fileTreeParser';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { gFileTree, gRecentDirectory, gRenameFile } from '@/recoil/fileTree';
import { extractionExtension } from '@/utils';
import { BiDownload } from '@/assets/icons/Icon';
import { postFileList } from '@/api/repository/api';
import { findItemByUniqueKey, findParentDirByUniqueKey } from '@/utils/file-manager';

interface FileTreeProps {
    rootDir: FileTreeType;
    selectedFile: FileType | undefined;
    onSelect: (file: FileType) => void;
    onFetchDir: (item: FileTreeType, isOpen: boolean) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, file: FileType | FileTreeType) => void;
    onRefresh?: (e?: React.MouseEvent<HTMLDivElement>) => void;
    onSetFileTree: (fileTree: any) => void;
    onRename: (item: any, name: string) => void;
}

const FileTreeKeyList = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];

export const FileTree = (props: FileTreeProps) => {
    const setRecentDirectory = useSetRecoilState(gRecentDirectory);
    const [sEnterItem, setEnterItem] = useState<any>(null);
    const [sDndTargetList, setDndTargetList] = useState<any>(null);
    const [sIsDnd, setIsDnd] = useState<boolean>(false);
    const [sLeaveItem, setLeaveItem] = useState<any>(null);
    const [sLastItem, setLastItem] = useState<any>(null);
    const [sFileTree] = useRecoilState(gFileTree);
    const [sIsDropZone, setIsDropZone] = useState<boolean>(false);
    const sTreeRef = useRef<any>(null);
    const [sKeyItem, setKeyItem] = useState<string>('');
    const HandleRootClick = (e: any) => {
        if (e.metakey || e.ctrlKey) return;
        setKeyItem('');
        setDndTargetList(null);
        setEnterItem(null);
        setRecentDirectory('/');
    };
    const DndClear = () => {
        setDndTargetList(null);
        setEnterItem(null);
        setIsDnd(false);
    };
    const handleLastItem = () => {
        if (props.rootDir.files.length > 0) {
            return props.rootDir.files.at(-1);
        } else if (props.rootDir.dirs.length > 0 && props.rootDir.files.length === 0) {
            return props.rootDir.dirs.at(-1);
        } else {
            return null;
        }
    };
    const modifyDepth = (aDir: any) => {
        const abc = JSON.parse(JSON.stringify(aDir));
        if (aDir.dirs.length > 0) {
            abc.dirs = aDir.dirs.map((bDir: any) => {
                if (bDir.dirs.length > 0 || bDir.files.length > 0) {
                    return modifyDepth({ ...bDir, depth: aDir.depth + 1, path: aDir.path + aDir.name + '/' });
                } else return { ...bDir, depth: aDir.depth + 1, path: aDir.path + aDir.name + '/' };
            });
        }
        if (aDir.files.length > 0) {
            abc.files = aDir.files.map((aFile: any) => {
                return { ...aFile, depth: aDir.depth + 1, path: aDir.path + aDir.name + '/' };
            });
        }
        return abc;
    };
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
    const addTargetFile = (aOriginDir: FileTreeType, aParedData: FileTreeType, aAddTargetPath: string): any => {
        return aOriginDir.dirs.map((aDir: any) => {
            if (
                sEnterItem.type === 0
                    ? aDir.depth + 1 === sEnterItem.depth && aDir.path + aDir.name + '/' === sEnterItem.path
                    : aDir.depth === sEnterItem.depth && aDir.name === sEnterItem.name && aDir.path === sEnterItem.path
            ) {
                return {
                    ...aDir,
                    files: [
                        ...aDir.files,
                        {
                            ...aParedData,
                            depth: sEnterItem.type === 0 ? sEnterItem.depth : sEnterItem.depth + 1,
                            parentId: sEnterItem.type === 0 ? sEnterItem.parentId : aDir.id,
                            path: sEnterItem.type === 0 ? sEnterItem.path : sEnterItem.path + sEnterItem.name + '/',
                        },
                    ],
                };
            } else if (sEnterItem.path.includes(aDir.name)) {
                return { ...aDir, dirs: addTargetFile(aDir, aParedData, aAddTargetPath) };
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
    const addTargetDir = (aOriginDir: FileTreeType, aParedData: FileTreeType, aAddTargetPath: string): any => {
        return aOriginDir.dirs.map((aDir: any) => {
            if (
                sEnterItem.type === 0
                    ? aDir.depth + 1 === sEnterItem.depth && aDir.path + aDir.name + '/' === sEnterItem.path
                    : aDir.depth === sEnterItem.depth && aDir.name === sEnterItem.name && aDir.path === sEnterItem.path
            ) {
                const sTmp = {
                    ...aDir,
                    dirs: [
                        ...aDir.dirs,
                        {
                            ...aParedData,
                            depth: sEnterItem.type === 0 ? sEnterItem.depth : sEnterItem.depth + 1,
                            parentId: sEnterItem.type === 0 ? sEnterItem.parentId : aDir.id,
                            path: sEnterItem.type === 0 ? sEnterItem.path : sEnterItem.path + sEnterItem.name + '/',
                        },
                    ],
                };
                const sFixedDepthDirs = modifyDepth(sTmp);
                return sFixedDepthDirs;
            } else if (sEnterItem.path.includes(aDir.name)) {
                return { ...aDir, dirs: addTargetDir(aDir, aParedData, aAddTargetPath) };
            } else return aDir;
        });
    };
    const handleKeyDown = (e: any) => {
        if (!FileTreeKeyList.includes(e.code)) return;
        if (!sKeyItem) {
            setKeyItem(sTreeRef.current.childNodes[0].id);
            return;
        }
        const TreeNodeIdList = Array.from(sTreeRef.current.childNodes).map((aChild: any) => {
            return aChild.id;
        });
        const TargetChildIndex = TreeNodeIdList.indexOf(sKeyItem);
        switch (e.code) {
            case 'ArrowUp':
                {
                    e.stopPropagation();
                    if (TargetChildIndex === 0) {
                        setKeyItem(TreeNodeIdList[0]);
                        break;
                    } else setKeyItem(TreeNodeIdList[TargetChildIndex - 1]);
                }
                break;
            case 'ArrowDown':
                {
                    e.stopPropagation();
                    if (TargetChildIndex === TreeNodeIdList.length - 1) {
                        setKeyItem(TreeNodeIdList[TreeNodeIdList.length - 1]);
                        break;
                    } else setKeyItem(TreeNodeIdList[TargetChildIndex + 1]);
                }
                break;
            case 'Enter':
                {
                    e.stopPropagation();
                    if (!sKeyItem) break;
                    const sTargetItem = findItemByUniqueKey(props.rootDir, sKeyItem);
                    if (!sTargetItem) break;
                    sTargetItem.type === 0
                        ? (props.onSelect(sTargetItem), setKeyItem(''))
                        : sTargetItem.isOpen
                        ? props.onFetchDir(sTargetItem, false)
                        : props.onFetchDir(sTargetItem, true);
                }
                break;
            case 'ArrowRight':
                {
                    e.stopPropagation();
                    if (!sKeyItem) break;
                    const sTargetItem = findItemByUniqueKey(props.rootDir, sKeyItem);
                    if (!sTargetItem) break;
                    if (sTargetItem.type === 1) {
                        if (sTargetItem.dirs.length === 0 && sTargetItem.files.length === 0) {
                            sTargetItem.isOpen ? null : props.onFetchDir(sTargetItem, true);
                            break;
                        }
                        sTargetItem.isOpen ? setKeyItem(TreeNodeIdList[TargetChildIndex + 1]) : props.onFetchDir(sTargetItem, true);
                    }
                }
                break;
            case 'ArrowLeft':
                {
                    e.stopPropagation();
                    if (!sKeyItem) break;
                    const sTargetItem = findItemByUniqueKey(props.rootDir, sKeyItem);
                    if (!sTargetItem) break;
                    if (sTargetItem.type === 1 && !sTargetItem.isOpen && sTargetItem.path == '/') break;
                    if (sTargetItem.type === 1 && sTargetItem.isOpen) {
                        props.onFetchDir(sTargetItem, false);
                        break;
                    }
                    const sParentUniqueKey = findParentDirByUniqueKey(props.rootDir, sKeyItem);
                    if (sParentUniqueKey !== '/\\-0') setKeyItem(sParentUniqueKey);
                }
                break;
        }
    };
    const handleRename = (aFile: any, aName: string) => {
        let sExpand: string = '';
        if (aFile.type === 0) sExpand = '.' + aFile.name.split('.')[1];
        props.onRename(aFile, aName + sExpand);
    };

    useEffect(() => {
        if (props.rootDir) {
            setLastItem(handleLastItem());
        }
    }, [props.rootDir]);

    useEffect(() => {
        if (sIsDnd) {
            if (!sEnterItem && !sIsDropZone) {
                DndClear();
                return;
            }
            let sParsedList: any = [];
            let sAddTargetPath: string = '';
            // ROOT (DROP ZONE)
            if (sIsDropZone) {
                sAddTargetPath = '/';
                sParsedList = sDndTargetList.filter((aTarget: any) => aTarget.path !== '/');
                setIsDropZone(false);
            } else {
                // FILE
                if (sEnterItem.type === 0) {
                    sAddTargetPath = sEnterItem.path;
                    sParsedList = sDndTargetList.filter((aTarget: any) => aTarget.path !== sEnterItem.path);
                }
                // DIR
                else {
                    sAddTargetPath = sEnterItem.path + sEnterItem.name + '/';
                    sParsedList = sDndTargetList.filter((aTarget: any) => aTarget.path !== sEnterItem.path + sEnterItem.name + '/' && aTarget.name !== sEnterItem.name);
                }
            }
            if (!sParsedList.length || !sAddTargetPath) {
                DndClear();
                return;
            }
            let sTestRoot = JSON.parse(JSON.stringify(sFileTree));
            // remove
            sParsedList.map((aDeleteItem: any) => {
                if (aDeleteItem.type === 0) sTestRoot = removeFile(sTestRoot, aDeleteItem);
                else sTestRoot = removeDir(sTestRoot, aDeleteItem);
            });
            // add
            sParsedList.map((aAddItem: any) => {
                if (sAddTargetPath === '/') {
                    if (aAddItem.type === 1) {
                        const sDirTmp = { ...aAddItem, depth: 1, parentId: '0', path: '/' };
                        if (aAddItem.dirs.length > 0) {
                            const sFixedDepthDirs = modifyDepth(sDirTmp);
                            sTestRoot.dirs.push(sFixedDepthDirs);
                        } else {
                            sDirTmp.files = sDirTmp.files.map((aFile: any) => {
                                return { ...aFile, depth: sDirTmp.depth + 1, path: sDirTmp.path + sDirTmp.name + '/' };
                            });
                            sTestRoot.dirs.push(sDirTmp);
                        }
                    } else {
                        sTestRoot.files.push({ ...aAddItem, depth: 1, parentId: '0', path: '/' });
                    }
                } else {
                    if (aAddItem.type === 0) sTestRoot.dirs = addTargetFile(sTestRoot, aAddItem, sAddTargetPath);
                    else sTestRoot.dirs = addTargetDir(sTestRoot, aAddItem, sAddTargetPath);
                }
            });
            DndClear();
            props.onSetFileTree(JSON.parse(JSON.stringify(sTestRoot)));
        }
    }, [sIsDnd]);
    return (
        <div
            tabIndex={-1}
            onBlur={() => setKeyItem('')}
            onKeyDown={handleKeyDown}
            onClick={HandleRootClick}
            style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
        >
            <div ref={sTreeRef}>
                <SubTree
                    directory={props.rootDir}
                    {...props}
                    sEnterItem={sEnterItem}
                    setEnterItem={setEnterItem}
                    sDndTargetList={sDndTargetList}
                    setDndTargetList={setDndTargetList}
                    setIsDnd={setIsDnd}
                    setLeaveItem={setLeaveItem}
                    sLeaveItem={sLeaveItem}
                    sLastItem={sLastItem}
                    sKeyItem={sKeyItem}
                    onRename={handleRename}
                />
            </div>
            <div
                className="rootdropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => setIsDropZone(true)}
                style={{ flexGrow: '1', width: '100%', backgroundColor: 'transparent' }}
            />
        </div>
    );
};

interface SubTreeProps {
    directory: FileTreeType;
    selectedFile: FileType | undefined;
    setIsDnd: (status: boolean) => void;
    sDndTargetList: any;
    setDndTargetList: (item: any) => void;
    sEnterItem: any;
    setEnterItem: (item: any) => void;
    sLastItem: any;
    sLeaveItem: any;
    sKeyItem: string;
    setLeaveItem: (item: any) => void;
    onSelect: (file: FileType) => void;
    onFetchDir: (item: FileTreeType, isOpen: boolean) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, file: FileType | FileTreeType) => void;
    onRefresh?: (e?: React.MouseEvent<HTMLDivElement>) => void;
    onRename: (file: any, name: string) => void;
}

const SubTree = (props: SubTreeProps) => {
    return (
        <>
            {props.directory.dirs.length > 0 ? (
                props.directory.dirs.sort(sortDir).map((dir) => (
                    <React.Fragment key={'' + dir.depth + dir.id}>
                        <DirDiv
                            directory={dir}
                            selectedFile={props.selectedFile}
                            onSelect={props.onSelect}
                            onSelectDir={props.onFetchDir}
                            onContextMenu={props.onContextMenu}
                            onRefresh={props.onRefresh}
                            pEnterItem={props.sEnterItem}
                            onSetEnterItem={props.setEnterItem}
                            pLeaveItem={props.sLeaveItem}
                            onSetLeaveItem={props.setLeaveItem}
                            pLastItem={props.sLastItem}
                            pDndTargetList={props.sDndTargetList}
                            onSetDndTargetList={props.setDndTargetList}
                            onSetIsDnd={props.setIsDnd}
                            pKeyItem={props.sKeyItem}
                            onRename={props.onRename}
                        />
                    </React.Fragment>
                ))
            ) : (
                <></>
            )}
            {props.directory.files.length > 0 ? (
                props.directory.files.sort(sortFile).map((file) => (
                    <React.Fragment key={'' + file.depth + file.id}>
                        <FileDiv
                            file={file}
                            selectedFile={props.selectedFile}
                            onClick={() => props.onSelect(file)}
                            onContextMenu={props.onContextMenu}
                            pEnterItem={props.sEnterItem}
                            onSetEnterItem={props.setEnterItem}
                            pLastItem={props.sLastItem}
                            pLeaveItem={props.sLeaveItem}
                            onSetLeaveItem={props.setLeaveItem}
                            pDndTargetList={props.sDndTargetList}
                            onSetDndTargetList={props.setDndTargetList}
                            onSetIsDnd={props.setIsDnd}
                            pKeyItem={props.sKeyItem}
                            onRename={props.onRename}
                        />
                    </React.Fragment>
                ))
            ) : (
                <></>
            )}
        </>
    );
};

const handleGit = async (aFile: FileTreeType, aRefreshCallback: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    switch (aFile.virtual) {
        case true:
            {
                const sPayload: { url: string; command: string } = { url: aFile.gitUrl as string, command: 'clone' };
                const sPath = (aFile.path + aFile.name)
                    .split('/')
                    .filter((aDir: string) => aDir)
                    .join('/');
                const sResult: any = await postFileList(sPayload, sPath, '');
                if (sResult && sResult.success) {
                    aRefreshCallback();
                } else {
                    console.error('');
                }
            }
            break;
        case false:
            break;
    }
};

const GitIcon = (aFile: FileTreeType, aRefreshCallback: any) => {
    const GitDiv = styled.div`
        display: flex;
        width: 18px;
        height: 18px;
        justify-content: center;
        align-items: center;

        :hover {
            cursor: pointer;
            background-color: #4c4c4c;
            border-radius: 4px;
        }
    `;

    const GitStatusIcon = () => {
        if (aFile.virtual)
            return (
                <GitDiv>
                    <BiDownload />
                </GitDiv>
            );
        else return <></>;
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px', width: '22px', height: '22px' }} onClick={(e) => handleGit(aFile, aRefreshCallback, e)}>
            {GitStatusIcon()}
        </div>
    );
};

const FileDiv = ({
    file,
    icon,
    onSetIsDnd,
    pDndTargetList,
    onSetDndTargetList,
    pEnterItem,
    onSetEnterItem,
    pLastItem,
    pLeaveItem,
    onSetLeaveItem,
    onClick,
    onContextMenu,
    onRefresh,
    pKeyItem,
    onRename,
}: {
    file: FileType | FileTreeType;
    icon?: string;
    onSetIsDnd: (status: boolean) => void;
    selectedFile: FileType | undefined;
    pDndTargetList: any;
    onSetDndTargetList: (item: any) => void;
    pEnterItem: any;
    onSetEnterItem: (item: any) => void;
    pLastItem: any;
    pLeaveItem: any;
    pKeyItem: string;
    onSetLeaveItem: (item: any) => void;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, file: FileType | FileTreeType) => void;
    onRefresh?: (e?: React.MouseEvent<HTMLDivElement>) => void;
    onRename: (file: any, name: string) => void;
}) => {
    const [sSelectedTab] = useRecoilState(gSelectedTab);
    const [sBoardList] = useRecoilState(gBoardList);
    const setRecentDirectory = useSetRecoilState(gRecentDirectory);
    const [sRenameItem, setRenameItem] = useRecoilState(gRenameFile);
    const selectBoard: any = sBoardList.find((aItem) => aItem.id === sSelectedTab);
    const isSelected = selectBoard?.path + selectBoard?.name === file.path + file.id;
    const depth = file.depth;
    const [sIsRename, setIsRename] = useState<boolean>(false);
    const [sName, setName] = useState<string>(file.name.split('.')[0]);

    const HandleDragStart = (e: any, aData: any) => {
        // const nImg = new Image();
        // nImg.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Free_logo.svg/1200px-Free_logo.svg.png';
        // e.dataTransfer.setDragImage(nImg, -10, -10);
        e.stopPropagation();
        if (pDndTargetList && pDndTargetList.length > 0) {
            if (!pDndTargetList.includes(aData)) onSetDndTargetList([...pDndTargetList, aData]);
        } else {
            onSetDndTargetList([aData]);
        }
    };
    const HandleDragEnter = (e: any, aData: any) => {
        onSetEnterItem(aData);
        e.stopPropagation();
    };
    const HandleDragEnd = (e: any) => {
        e.stopPropagation();
        onSetIsDnd(true);
    };
    const HandleMultiDrag = (aFile: any) => {
        if (pDndTargetList && pDndTargetList.length > 0) {
            if (pDndTargetList.includes(aFile)) {
                const tmp = JSON.parse(JSON.stringify(pDndTargetList));
                tmp.splice(
                    tmp.findIndex((aItem: any) => aItem.name === aFile.name && aItem.path === aFile.path),
                    1
                );
                onSetDndTargetList(tmp);
            } else {
                onSetDndTargetList([...pDndTargetList, aFile]);
            }
        } else {
            onSetDndTargetList([aFile]);
        }
    };
    const handleOnContextMenu = (e: React.MouseEvent<HTMLDivElement>, afile: FileType | FileTreeType) => {
        onContextMenu(e, afile);
    };
    const checkDndItem = (aFile: any): boolean => {
        if (pDndTargetList && pDndTargetList.length > 0) {
            if (pDndTargetList.findIndex((aTarget: any) => aTarget.name === aFile.name && aTarget.path === aFile.path) !== -1) return true;
            else return false;
        } else return false;
    };
    const checkDndSection = (aFile: any): boolean => {
        if (pEnterItem) {
            const sFilePath = aFile.path.split('/').join('').trim();
            const sEnterItemPath = pEnterItem.path.split('/').join('').trim();
            const testexp = new RegExp(`^${pEnterItem.path + pEnterItem.name + '/'}`);
            if (
                pEnterItem.type === 1 &&
                sFilePath.length > sEnterItemPath.length &&
                sFilePath.includes(sEnterItemPath) &&
                pEnterItem.depth <= aFile.depth &&
                testexp.test(aFile.path)
            ) {
                return true;
            } else {
                if (pEnterItem.type === 1 && pEnterItem.name === aFile.name && pEnterItem.depth === aFile.depth && aFile.path === pEnterItem.path) return true;
                return false;
            }
        } else return false;
    };
    const HandleDragLeave = (e: any, aTarget: any) => {
        e.stopPropagation();
        onSetLeaveItem(aTarget);
    };
    const checkLastItem = (): boolean => {
        if (!pLeaveItem || !pEnterItem) return false;
        if (
            pLastItem.name === pEnterItem.name &&
            pLastItem.path === pEnterItem.path &&
            pLastItem.depth === pEnterItem.depth &&
            pLastItem.name === pLeaveItem.name &&
            pLastItem.path === pLeaveItem.path &&
            pLastItem.depth === pLeaveItem.depth
        ) {
            return true;
        }
        return false;
    };
    const handleClick = (e: any) => {
        if (e.metakey || e.ctrlKey) return;
        e.stopPropagation();
        onSetDndTargetList(null);
        onSetEnterItem(null);
        if ((file as FileTreeType).virtual) return;
        if (file.type === 0) setRecentDirectory(file.path);
        if (file.type === 1) setRecentDirectory(file.path + file.name + '/');
        onClick();
    };
    const handleKeyDown = (e: any) => {
        if (e.code === 'Enter') {
            e.stopPropagation();
            if (sName && sName.length > 0) {
                onRename(file, sName);
                resetRenameValue();
            }
        }
    };
    const resetRenameValue = () => {
        setIsRename(false);
        setRenameItem(undefined);
        setName(file.name.split('.')[0]);
    };
    const handleBlur = () => {
        if (sName && sName.length > 0) {
            onRename(file, sName);
            resetRenameValue();
        } else resetRenameValue();
    };

    useEffect(() => {
        if (sRenameItem === file) {
            setIsRename(true);
        } else if (sIsRename) setIsRename(false);
    }, [sRenameItem]);

    return (
        <div
            className="dragAndDrop"
            id={file.path + file.name + '-' + file.depth}
            onDragStart={(event) => HandleDragStart(event, file)}
            onDragEnter={(event) => HandleDragEnter(event, file)}
            onDragEnd={HandleDragEnd}
            onDragLeave={(event) => HandleDragLeave(event, file)}
            onClick={() => HandleMultiDrag(file)}
            onKeyDown={sIsRename ? (e) => e.stopPropagation() : () => {}}
            draggable
        >
            <Div
                depth={depth}
                isDndItem={checkDndItem(file)}
                isDndSection={checkDndSection(file)}
                isSelected={isSelected}
                isLastItem={checkLastItem()}
                isGit={(file as FileTreeType).gitClone || false}
                onClick={handleClick}
                onContextMenu={(e) => handleOnContextMenu(e, file)}
                isBorder={file.path + file.name + '-' + file.depth === pKeyItem}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-all',
                    }}
                >
                    <FileIcon name={icon} extension={extractionExtension(file.name) || ''} />
                    {sIsRename ? (
                        <div
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                backgroundColor: 'rgba(38, 40, 49, 0.5)',
                                border: 'solid 0.5px rgba(255, 255, 255, 0.5)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <input
                                type="text"
                                value={sName}
                                onChange={(e: any) => setName(e.target.value)}
                                autoFocus
                                onFocus={(e) => e.target.setSelectionRange(0, sName.length)}
                                onBlur={handleBlur}
                                style={{ color: '#f8f8f8', outline: 'none', border: 'none', backgroundColor: 'transparent' }}
                            />
                        </div>
                    ) : (
                        <span style={{ marginLeft: 1, fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{file.name}</span>
                    )}
                </div>
                {(file as FileTreeType).gitClone ? GitIcon(file as FileTreeType, onRefresh) : null}
            </Div>
        </div>
    );
};

const Div = styled.div<{
    depth: number;
    isSelected: boolean;
    isGit: boolean;
    isDndItem: boolean;
    isDndSection: boolean;
    isLastItem: boolean;
    isBorder: boolean;
}>`
    display: flex;
    justify-content: space-between;
    padding-left: ${(props) => props.depth * 16}px;
    background-color: ${(props) => (props.isLastItem ? '#3e3e3e' : props.isDndItem ? '#3e3e3e' : props.isDndSection ? '#3e3e3e' : props.isSelected ? '#242424' : 'transparent')};
    word-break: break-all;
    :hover {
        cursor: pointer;
        background-color: ${(props) => (props.isLastItem ? '#3e3e3e' : props.isDndItem ? '#3e3e3e' : props.isDndSection ? '#3e3e3e' : '#242424')};
    }
    border: ${(props) => (props.isBorder ? 'solid 1px #c9d1d9' : 'solid 1px transparent')};
`;

const DirDiv = ({
    directory,
    selectedFile,
    onSetIsDnd,
    pDndTargetList,
    onSetDndTargetList,
    pEnterItem,
    onSetEnterItem,
    pLastItem,
    pLeaveItem,
    onSetLeaveItem,
    onSelect,
    onSelectDir,
    onContextMenu,
    onRefresh,
    pKeyItem,
    onRename,
}: {
    directory: FileTreeType;
    selectedFile: FileType | undefined;
    onSetIsDnd: (status: boolean) => void;
    pDndTargetList: any;
    onSetDndTargetList: (item: any) => void;
    pEnterItem: any;
    onSetEnterItem: (item: any) => void;
    pLastItem: any;
    pLeaveItem: any;
    pKeyItem: string;
    onSetLeaveItem: (item: any) => void;
    onSelect: (file: FileType) => void;
    onSelectDir: (item: FileTreeType, isOpen: boolean) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, file: FileType | FileTreeType) => void;
    onRefresh?: (e?: React.MouseEvent<HTMLDivElement>) => void;
    onRename: (file: any, name: string) => void;
}) => {
    const sDirectoryIcon = (): string => {
        if (directory.isOpen) return directory.gitClone ? 'gitOpenDirectory' : 'openDirectory';
        else return directory.gitClone ? 'gitClosedDirectory' : 'closedDirectory';
    };
    return (
        <>
            {
                <FileDiv
                    file={directory}
                    icon={sDirectoryIcon()}
                    selectedFile={selectedFile}
                    onClick={() => {
                        onSelectDir(directory, !directory.isOpen);
                    }}
                    onContextMenu={onContextMenu}
                    onRefresh={onRefresh}
                    pEnterItem={pEnterItem}
                    onSetEnterItem={onSetEnterItem}
                    pLastItem={pLastItem}
                    pLeaveItem={pLeaveItem}
                    onSetLeaveItem={onSetLeaveItem}
                    pDndTargetList={pDndTargetList}
                    onSetDndTargetList={onSetDndTargetList}
                    onSetIsDnd={onSetIsDnd}
                    pKeyItem={pKeyItem}
                    onRename={onRename}
                />
            }
            {directory.isOpen ? (
                <SubTree
                    directory={directory}
                    selectedFile={selectedFile}
                    onSelect={onSelect}
                    onFetchDir={onSelectDir}
                    onContextMenu={onContextMenu}
                    sDndTargetList={pDndTargetList}
                    setDndTargetList={onSetDndTargetList}
                    sEnterItem={pEnterItem}
                    setEnterItem={onSetEnterItem}
                    sLastItem={pLastItem}
                    sLeaveItem={pLeaveItem}
                    setLeaveItem={onSetLeaveItem}
                    setIsDnd={onSetIsDnd}
                    sKeyItem={pKeyItem}
                    onRename={onRename}
                />
            ) : null}
        </>
    );
};

const FileIcon = ({ extension, name }: { name?: string; extension?: string }) => {
    const icon = icons(name || (extension as string));
    return <Span>{icon}</Span>;
};

const Span = styled.span`
    display: flex;
    width: 16px;
    height: 22px;
    margin-right: 6px;
    justify-content: center;
    align-items: center;
    svg {
        width: 16px;
        height: 16px;
    }
`;
