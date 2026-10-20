import { GBoardListType, gBoardList, gSelectedTab } from '@/recoil/recoil';
import { gCopyFileTree, gDeleteFileList, gDeleteFileTree, gFileTree, gRecentDirectory, gRenameFile, gReplaceTree } from '@/recoil/fileTree';
import { getId, isImage, extractionExtension } from '@/utils';
import { getFileRequestFailure } from '@/utils/fileRequestResult';
import { useState } from 'react';
import { Delete, Download, Update, Rename, TbFolderPlus, TbCloudDown, MdRefresh, VscNewFile } from '@/assets/icons/Icon';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { FileTree } from '../../fileTree/file-tree';
import { useEffect } from 'react';
import { getFiles, deleteFile as deleteContextFile } from '@/api/repository/fileTree';
import { FileTreeType, FileType, fileTreeParser } from '@/utils/fileTreeParser';
import OpenFile from './OpenFile';
import { FolderModal } from './FolderModal';
import { getFileList, postFileList } from '@/api/repository/api';
import { DeleteModal } from '../../modal/DeleteModal';
import { Side, ContextMenu, ContextMenuPosition, Button } from '@/design-system/components';
import { renameManager } from '@/utils/file-manager';
import { UrlDownloadModal } from '../../modal/UrlDownloadModal';
import { recordRecentFile } from '@/utils/recentFiles';
import { loadBoardFromFile } from './loadBoardFromFile';
import { VscCopy } from 'react-icons/vsc';
import { FileCopy } from '@/utils/UpdateTree';
import { EXTENSION_SET } from '@/utils/constants';
import { Toast } from '@/design-system/components';
import { gWsLog } from '@/recoil/websocket';
import { FileModal } from './FileModal';

export const FileExplorer = ({ pGetInfo, pSavedPath, pDisplay }: any) => {
    const sParedData: FileTreeType = {
        depth: 0,
        dirs: [],
        files: [],
        id: '',
        name: '',
        parentId: undefined,
        type: 0,
        path: 'ROOT',
        gitClone: false,
        gitUrl: undefined,
        gitStatus: undefined,
        virtual: false,
        isOpen: false,
    };
    const [sMenuPosition, setMenuPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const setRename = useSetRecoilState(gRenameFile);
    const setSelectedTab = useSetRecoilState<string>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);
    const [rootDir, setRootDir] = useState<FileTreeType>(sParedData);
    const [selectedFile, setSelectedFile] = useState<FileType | undefined>(undefined);
    const [selectedContextFile, setSelectedContextFile] = useState<FileType | FileTreeType | undefined>(undefined);
    const [sLoadFileTree, setLoadFileTree] = useState<boolean>(false);
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sIsFolderModal, setIsFoldermodal] = useState<boolean>(false);
    const [sIsUrlDownloadModal, setIsUrlDownloadModal] = useState<boolean>(false);
    const [sIsGit, setIsGit] = useState(false);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const setRecentDirectory = useSetRecoilState(gRecentDirectory);
    const setConsoleList = useSetRecoilState<any>(gWsLog);
    const [sSideSizes, setSideSizes] = useState<any>(['15%', '85%']);
    const [sDeleteFileList, setDeleteFileList] = useRecoilState(gDeleteFileList);
    const [sIsFetch, setIsFetch] = useState<boolean>(false);
    const [sIsFileModal, setIsFileModal] = useState<boolean>(false);
    const DeleteFileTree = useSetRecoilState(gDeleteFileTree);
    const ReplaceTree = useSetRecoilState(gReplaceTree);
    const CopyFileTree = useSetRecoilState(gCopyFileTree);

    useEffect(() => {
        getFileTree();
    }, []);

    useEffect(() => {
        if (!pSavedPath) {
            return;
        }
        const pathArray: any = pSavedPath.split('/');
        onFetchDir(
            {
                depth: pathArray.length,
                dirs: [],
                files: [],
                id: pathArray[pathArray.length - 1],
                name: pathArray[pathArray.length - 1],
                parentId: pathArray[pathArray.length - 2] ? pathArray[pathArray.length - 2] : '0',
                path: '/' + removeLastItem(pathArray).join('/') ? removeLastItem(pathArray).join('/') : '/',
                type: 1,
                gitClone: false,
                gitUrl: undefined,
                gitStatus: undefined,
                virtual: false,
                isOpen: false,
            },
            false
        );
    }, [pSavedPath]);
    useEffect(() => {
        if (sFileTree.name && sFileTree.id) {
            setRootDir(JSON.parse(JSON.stringify(sFileTree)));
            // if (sSearchFilter) handleSearch(sSearchTxt);
        }
    }, [sFileTree]);

    function removeLastItem(array: string[]) {
        if (!Array.isArray(array) || array.length === 0) {
            return array;
        }

        return array.slice(0, array.length - 1);
    }
    const getFileTree = async () => {
        setLoadFileTree(true);
        try {
            const sReturn: any = await getFiles('/');
            const sFailure = getFileRequestFailure(sReturn, 'Failed to load the file tree.');
            if (sFailure || !sReturn?.data) {
                // keep the previous tree; tell the user why
                Toast.error(sFailure?.reason ?? 'Failed to load the file tree.', { testId: 'file-explorer-error-toast', id: 'file-explorer-refresh' });
                return;
            }
            const sParedData = fileTreeParser(sReturn.data, '/', 0, '0');
            setFileTree(JSON.parse(JSON.stringify(sParedData)));
        } finally {
            setLoadFileTree(false);
        }
    };

    const onSelect = async (file: FileType) => {
        closeContextMenu();
        const sTmpId = getId();
        const sExistBoard = getExistBoard(file);
        if (sExistBoard) {
            setSelectedTab(sExistBoard.id as string);
        } else {
            const sLoaded = await loadBoardFromFile(file, sTmpId);
            if (sLoaded.error !== undefined) {
                Toast.error(sLoaded.error, { testId: 'file-explorer-error-toast', id: 'file-explorer-open' });
                return;
            }

            pGetInfo();
            setBoardList([...sBoardList, sLoaded.board]);
            setSelectedTab(sTmpId);
        }
        recordRecentFile(file);
        setSelectedFile(file);
    };

    const getExistBoard = (aTargetFile: FileType): GBoardListType => {
        return sBoardList.filter((aBoard: GBoardListType) => aBoard.name === aTargetFile.name && aBoard.path === aTargetFile.path)[0];
    };

    const onFetchDir = async (aSelectedDir: FileTreeType, aIsOpen: boolean) => {
        closeContextMenu();
        if (!sIsFetch) {
            setIsFetch(true);
            let sReturn: any = null;
            let sParedData = null;

            if (aIsOpen) {
                sReturn = await getFiles(`${aSelectedDir.path}${aSelectedDir.name}/`);
                const sFailure = getFileRequestFailure(sReturn, 'Failed to open the folder.');
                if (sFailure || !sReturn?.success) {
                    Toast.error(sFailure?.reason ?? 'Failed to open the folder.', { testId: 'file-explorer-error-toast', id: 'file-explorer-fetch-dir' });
                    setIsFetch(false);
                    return;
                }
                sParedData = fileTreeParser(sReturn.data, `${aSelectedDir.path}${aSelectedDir.name}/`, aSelectedDir.depth, aSelectedDir.name);
            } else {
                sParedData = aSelectedDir;
            }

            if (aSelectedDir.parentId === 'apps') sParedData.readOnly = aSelectedDir.readOnly;

            sParedData.isOpen = aIsOpen;
            const sTmpDir = findDir(sFileTree as any, sParedData, aSelectedDir);
            const sResult = JSON.parse(JSON.stringify(sFileTree));
            sResult.dirs = sTmpDir;
            setFileTree(JSON.parse(JSON.stringify(sResult)));
            setIsFetch(false);
        }
    };

    const onRename = async (aSelectedItem: any, aName: string) => {
        const sTmpBoardList = JSON.parse(JSON.stringify(sBoardList));
        const updateBoardList = sTmpBoardList.map((aBoard: any) => {
            if (aBoard.name === aSelectedItem.name && aBoard.path === aSelectedItem.path) {
                return { ...aBoard, name: aName };
            } else if (aBoard.path.includes(aSelectedItem.path + aSelectedItem.name + '/')) {
                return { ...aBoard, path: aBoard.path.replace(aSelectedItem.path + aSelectedItem.name, aSelectedItem.path + aName) };
            } else return aBoard;
        });
        setBoardList(updateBoardList);
        const sResultRoot = renameManager(sFileTree as any, aSelectedItem.path + aSelectedItem.name + '-' + aSelectedItem.depth, aName);
        setFileTree(JSON.parse(JSON.stringify(sResultRoot)));
    };

    const findDir = (aOriginDir: FileTreeType, aParedData: FileTreeType, aTargetDir: FileTreeType): FileTreeType[] => {
        return aOriginDir.dirs.map((aDir: FileTreeType) => {
            if (aDir.name === aTargetDir.name && aDir.depth === aTargetDir.depth && aDir.path === aTargetDir.path) return { ...aParedData, path: aTargetDir.path };
            else if (aParedData.path.includes(aDir.name)) {
                return { ...aDir, dirs: findDir(aDir, aParedData, aTargetDir) };
            } else return aDir;
        });
    };

    const onContextMenu = (e: React.MouseEvent, file: FileType | FileTreeType) => {
        e.preventDefault();
        setMenuPosition({ x: e.pageX, y: e.pageY });
        setIsContextMenu(true);
        setSelectedContextFile(file);
        setRecentDirectory(`${file.path}`);
    };

    const closeContextMenu = () => {
        setIsContextMenu(false);
    };

    const deleteFile = () => {
        setIsDeleteModal(true);
        closeContextMenu();
    };

    const multiDelete = async (aDelList: any) => {
        const sReslutList: any = [];
        const sFailReasons: string[] = [];
        for (const aItem of aDelList) {
            if (!aItem || !aItem.path || !aItem.name) continue;
            const aResult: any = await deleteContextFile(aItem.path, aItem.name, { recursive: !!aItem.recursive });
            const sFailure = getFileRequestFailure(aResult, 'Failed to delete.');
            if (!sFailure) {
                sReslutList.push(aItem);
                DeleteFileTree(aItem);
            } else {
                sFailReasons.push(`${aItem.name}: ${sFailure.reason}`);
                setConsoleList((prev: any) => [
                    ...prev,
                    {
                        timestamp: new Date().getTime(),
                        level: 'ERROR',
                        task: '',
                        message: sFailure.reason,
                    },
                ]);
            }
        }
        if (sFailReasons.length > 0) Toast.error(sFailReasons.join('\n'), { testId: 'file-explorer-error-toast', id: 'file-explorer-delete' });
        if (sReslutList && sReslutList.length > 0) {
            let updateBoardList: any = JSON.parse(JSON.stringify(sBoardList));
            sReslutList.map((aResult: any) => {
                if (aResult.type === 0) {
                    updateBoardList = updateBoardList.filter((aBoard: any) => !(aBoard.name === aResult.name && aBoard.path === aResult.path));
                } else {
                    updateBoardList = updateBoardList.filter((aBoard: any) => !aBoard.path.includes(aResult.path + aResult.name + '/'));
                }
            });

            if (updateBoardList.length > 0) setSelectedTab(updateBoardList[0].id);
            else {
                const tmpId = getId();
                updateBoardList = [{ id: tmpId, type: 'new', name: 'new', path: '', code: '', panels: [], range_bgn: '', range_end: '', sheet: [], savedCode: false }];
                setSelectedTab(tmpId);
            }
            setBoardList(updateBoardList);
        }
        // getFileTree();
        setRecentDirectory('/');
    };

    const handleDeleteFile = async (isRecursive: boolean) => {
        if (sDeleteFileList && (sDeleteFileList as any).length > 0) {
            const sDeleteList = JSON.parse(JSON.stringify(sDeleteFileList)).map((aDelFile: any) => {
                return {
                    path: aDelFile.path,
                    name: aDelFile.name,
                    recursive: isRecursive && aDelFile.type === 1,
                    type: aDelFile.type,
                    depth: aDelFile.depth,
                };
            });
            if (selectedContextFile && selectedContextFile.path && selectedContextFile.name) {
                const sContextItem = {
                    path: selectedContextFile.path,
                    name: selectedContextFile.name,
                    recursive: isRecursive && selectedContextFile.type === 1,
                    type: selectedContextFile.type,
                    depth: selectedContextFile.depth,
                };
                if (!sDeleteList.some((aItem: any) => aItem.path === sContextItem.path && aItem.name === sContextItem.name)) sDeleteList.push(sContextItem);
            }
            setDeleteFileList(undefined);
            multiDelete(sDeleteList);
        } else {
            if (selectedContextFile && selectedContextFile.path && selectedContextFile.name) {
                const sResult: any = await deleteContextFile(selectedContextFile.path, selectedContextFile.name, { recursive: isRecursive });
                const sFailure = getFileRequestFailure(sResult, 'Failed to delete.');
                if (!sFailure) {
                    const sTmpBoardList = JSON.parse(JSON.stringify(sBoardList));
                    let updateBoardList: any = [];
                    if (selectedContextFile.type === 0) {
                        updateBoardList = sTmpBoardList.filter((aBoard: any) => !(aBoard.name === selectedContextFile.name && aBoard.path === selectedContextFile.path));
                        if (updateBoardList.length === 0) {
                            const tmpId = getId();
                            setBoardList([{ id: tmpId, type: 'new', name: 'new', path: '', code: '', panels: [], range_bgn: '', range_end: '', sheet: [], savedCode: false }]);
                            setSelectedTab(tmpId);
                        } else setBoardList(updateBoardList);
                        if (updateBoardList.length > 0) setSelectedTab(updateBoardList[0].id);
                    } else {
                        updateBoardList = sTmpBoardList.filter((cBoard: any) => !cBoard.path.includes(selectedContextFile.path + selectedContextFile.name + '/'));
                        if (updateBoardList.length === 0) {
                            const tmpId = getId();
                            setBoardList([{ id: tmpId, type: 'new', name: 'new', path: '', code: '', panels: [], range_bgn: '', range_end: '', sheet: [], savedCode: false }]);
                            setSelectedTab(tmpId);
                        } else setBoardList(updateBoardList);
                        if (updateBoardList.length > 0) setSelectedTab(updateBoardList[0].id);
                    }
                    // getFileTree();
                    DeleteFileTree(selectedContextFile);
                    setRecentDirectory('/');
                } else {
                    setConsoleList((prev: any) => [
                        ...prev,
                        {
                            timestamp: new Date().getTime(),
                            level: 'ERROR',
                            task: '',
                            message: sFailure.reason,
                        },
                    ]);
                    Toast.error(sFailure.reason, { testId: 'file-explorer-error-toast', id: 'file-explorer-delete' });
                }
            }
        }
        setIsDeleteModal(false);
    };

    const downloadFile = async () => {
        if (selectedContextFile !== undefined) {
            const sData: any = await getFiles(`${selectedContextFile.path}${selectedContextFile.name}`);

            const sBlob = new Blob([sData], { type: `text/plain` });
            const sLink = document.createElement('a');
            sLink.href = URL.createObjectURL(sBlob);
            sLink.setAttribute('download', selectedContextFile.name);
            sLink.click();
            URL.revokeObjectURL(sLink.href);
            closeContextMenu();
        }
    };

    const updateGitFolder = async () => {
        if (selectedContextFile !== undefined) {
            const sResult: any = await postFileList({ url: (selectedContextFile as any).gitUrl, command: 'pull' }, `${selectedContextFile.path}${selectedContextFile.name}`, '');
            if (sResult && sResult.success) {
                const sTargetTree: any = await getFileList('', selectedContextFile.path + selectedContextFile.name + '/', '');
                const sParsedTree = fileTreeParser(
                    sTargetTree.data,
                    selectedContextFile.path + selectedContextFile.name + '/',
                    selectedContextFile.depth,
                    selectedContextFile.name
                );
                ReplaceTree({ ...selectedContextFile, dirs: sParsedTree.dirs, files: sParsedTree.files, isOpen: true });
            } else {
                const sFailure = getFileRequestFailure(sResult, 'Pull failed.');
                Toast.error(sFailure?.reason ?? 'Pull failed.', { testId: 'file-explorer-error-toast', id: 'file-explorer-pull' });
            }
            closeContextMenu();
        }
    };

    const handleFolder = (aHandle: boolean, aEvent: any, aIsGit: boolean) => {
        if (aEvent) {
            aEvent.stopPropagation();
        }
        setIsGit(aIsGit);
        setIsFoldermodal(aHandle);
        closeContextMenu();
    };

    const handleRefresh = (e?: MouseEvent) => {
        if (e) e.stopPropagation();
        getFileTree();
    };

    const handleRename = () => {
        if (selectedContextFile !== undefined) {
            setRename(selectedContextFile as any);
        }
        closeContextMenu();
    };

    const handleCopy = async () => {
        const sCopiedFile = await FileCopy(selectedContextFile);
        if (sCopiedFile) {
            CopyFileTree(sCopiedFile);
        }
        closeContextMenu();
    };

    const handleFile = (aEvent: any) => {
        if (aEvent) {
            aEvent.stopPropagation();
        }
        setIsFileModal(true);
        closeContextMenu();
    };

    const handleOpenFileArea = () => {
        if (sSideSizes[0] !== 22) {
            setSideSizes([22, 'calc(100% - 22px)']);
        } else {
            setSideSizes(['15%', '85%']);
        }
    };

    return (
        <>
            <Side.Container style={{ display: pDisplay ? '' : 'none' }} splitSizes={sSideSizes} onSplitChange={setSideSizes}>
                <Side.Section>
                    <Side.Collapse pCallback={handleOpenFileArea} pCollapseState={sSideSizes[0] !== 22}>
                        <span>OPEN EDITORS</span>
                    </Side.Collapse>
                    {sSideSizes[0] !== 22 && (
                        <Side.List>
                            {sBoardList.length !== 0 &&
                                sBoardList.map((aBoard: any, aIdx: any) => {
                                    return <OpenFile pBoard={aBoard} pSetSelectedTab={setSelectedTab} pIdx={aIdx} key={aBoard.id} />;
                                })}
                        </Side.List>
                    )}
                </Side.Section>
                <Side.Section>
                    <Side.Collapse pCallback={() => setCollapseTree(!sCollapseTree)} pCollapseState={sCollapseTree}>
                        <span>EXPLORER</span>
                        <Button.Group style={{ paddingTop: '3px' }}>
                            <Button size="side" variant="ghost" isToolTip toolTipContent="New file" data-testid="file-explorer-new-file" icon={<VscNewFile size={13} />} onClick={(aEvent: any) => handleFile(aEvent)} />
                            <Button
                                size="side"
                                variant="ghost"
                                isToolTip
                                toolTipContent="New folder"
                                data-testid="file-explorer-new-folder"
                                icon={<TbFolderPlus size={14} />}
                                onClick={(aEvent: any) => handleFolder(true, aEvent, false)}
                            />
                            <Button
                                size="side"
                                variant="ghost"
                                isToolTip
                                toolTipContent="Git clone"
                                data-testid="file-explorer-git-clone"
                                icon={<TbCloudDown size={14} />}
                                onClick={(aEvent: any) => handleFolder(true, aEvent, true)}
                            />
                            <Button size="side" variant="ghost" isToolTip toolTipContent="Refresh" data-testid="file-explorer-refresh" icon={<MdRefresh size={14} />} onClick={(e: any) => handleRefresh(e)} />
                        </Button.Group>
                    </Side.Collapse>
                    {sCollapseTree &&
                        (sLoadFileTree ? (
                            <span>...</span>
                        ) : (
                            <>
                                <Side.List>
                                    <FileTree
                                        rootDir={rootDir}
                                        selectedFile={selectedFile}
                                        onSelect={onSelect}
                                        onFetchDir={onFetchDir}
                                        onContextMenu={onContextMenu}
                                        onRefresh={() => handleRefresh()}
                                        onSetFileTree={setFileTree}
                                        onRename={onRename}
                                    />
                                </Side.List>
                                <ContextMenu isOpen={sIsContextMenu} position={sMenuPosition} onClose={closeContextMenu} data-testid="file-context-menu">
                                    {(selectedContextFile as any)?.type === 1 && !(selectedContextFile as any)?.virtual ? (
                                        <>
                                            <ContextMenu.Item onClick={(aEvent: any) => handleFile(aEvent)} data-testid="new-file">
                                                <VscNewFile size={12} />
                                                <span>New File...</span>
                                            </ContextMenu.Item>
                                            <ContextMenu.Item onClick={(aEvent: any) => handleFolder(true, aEvent, false)} data-testid="new-folder">
                                                <TbFolderPlus size={12} />
                                                <span>New Folder...</span>
                                            </ContextMenu.Item>
                                            <ContextMenu.Item onClick={(aEvent: any) => handleFolder(true, aEvent, true)} data-testid="git-clone">
                                                <TbCloudDown size={12} />
                                                <span>Git Clone...</span>
                                            </ContextMenu.Item>
                                        </>
                                    ) : null}
                                    {(selectedContextFile as any)?.type === 0 &&
                                        !isImage((selectedContextFile as any).name as string) &&
                                        EXTENSION_SET.has(extractionExtension((selectedContextFile as any)?.id)) && (
                                            <ContextMenu.Item onClick={handleCopy} data-testid="duplicate">
                                                <VscCopy />
                                                <span>Duplicate</span>
                                            </ContextMenu.Item>
                                        )}
                                    {!(selectedContextFile as any)?.readOnly &&
                                        ((selectedContextFile as any)?.type === 1 || EXTENSION_SET.has(extractionExtension((selectedContextFile as any)?.id))) && (
                                            <ContextMenu.Item onClick={handleRename} data-testid="rename">
                                                <Rename />
                                                <span>Rename</span>
                                            </ContextMenu.Item>
                                        )}
                                    {(selectedContextFile as any)?.gitClone ? (
                                        <ContextMenu.Item onClick={updateGitFolder} data-testid="update">
                                            <Update />
                                            <span>Update</span>
                                        </ContextMenu.Item>
                                    ) : null}
                                    {!(selectedContextFile as any)?.readOnly &&
                                        ((selectedContextFile as any)?.type === 1 || EXTENSION_SET.has(extractionExtension((selectedContextFile as any)?.id))) && (
                                            <ContextMenu.Item onClick={deleteFile} data-testid="delete">
                                                <Delete />
                                                <span>Delete</span>
                                            </ContextMenu.Item>
                                        )}
                                    {(selectedContextFile as any)?.content ? (
                                        <ContextMenu.Item onClick={downloadFile}>
                                            <Download />
                                            <span>Saved to local</span>
                                        </ContextMenu.Item>
                                    ) : null}
                                </ContextMenu>
                            </>
                        ))}
                </Side.Section>
            </Side.Container>
            {sIsFileModal ? <FileModal setIsOpen={setIsFileModal} /> : null}
            {sIsFolderModal ? <FolderModal pIsGit={sIsGit} setIsOpen={handleFolder} /> : null}
            {sIsDeleteModal ? <DeleteModal setIsOpen={setIsDeleteModal} pFileInfo={selectedContextFile} pCallback={handleDeleteFile} /> : null}
            {sIsUrlDownloadModal && <UrlDownloadModal setIsOpen={setIsUrlDownloadModal} pCallback={handleRefresh} />}
        </>
    );
};
