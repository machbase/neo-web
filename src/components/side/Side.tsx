import { GBoardListType, gBoardList, gConsoleSelector, gSelectedTab } from '@/recoil/recoil';
import { gCopyFileTree, gDeleteFileList, gDeleteFileTree, gFileTree, gRecentDirectory, gRenameFile, gReplaceTree } from '@/recoil/fileTree';
import { getId, isImage, binaryCodeEncodeBase64, extractionExtension } from '@/utils';
import { useState, useRef } from 'react';
import {
    Delete,
    Download,
    Update,
    Rename,
    VscChevronRight,
    VscChevronDown,
    TbFolderPlus,
    TbCloudDown,
    // TbFolder,
    MdRefresh,
    VscNewFile,
} from '@/assets/icons/Icon';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { FileTree } from '../fileTree/file-tree';
// import Sidebar from '../fileTree/sidebar';
import { useEffect } from 'react';
import './Side.scss';
import { getFiles, deleteFile as deleteContextFile } from '@/api/repository/fileTree';
import { FileTreeType, FileType, fileTreeParser } from '@/utils/fileTreeParser';
import Menu from '../contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import { SaveModal } from '../modal/SaveModal';
import OpenFile from './OpenFile';
import { FolderModal } from '../modal/FolderModal';
import { getFileList, postFileList } from '@/api/repository/api';
import { DeleteModal } from '../modal/DeleteModal';
import SplitPane, { Pane } from 'split-pane-react';
import { IconButton } from '@/components/buttons/IconButton';
// import { SearchInput } from '../inputs/SearchInput';
// import { TreeViewFilter } from '@/utils/treeViewFilter';
import { renameManager } from '@/utils/file-manager';
import { FileModal } from '../modal/FileModal';
import { UrlDownloadModal } from '../modal/UrlDownloadModal';
import { CheckDataCompatibility } from '@/utils/CheckDataCompatibility';
import { VscCopy } from 'react-icons/vsc';
import { FileCopy } from '@/utils/UpdateTree';
import axios from 'axios';
import { EXTENSION_SET } from '@/utils/constants';
import { Error } from '../toast/Toast';

const Side = ({
    pGetInfo,
    pSavedPath,
    pServer,
    pDisplay,
}: // pExtensionList
any) => {
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
    const [menuX, setMenuX] = useState<number>(0);
    const [menuY, setMenuY] = useState<number>(0);
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const MenuRef = useRef<HTMLDivElement>(null);
    const setRename = useSetRecoilState(gRenameFile);
    const setSelectedTab = useSetRecoilState<string>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);
    const [rootDir, setRootDir] = useState<FileTreeType>(sParedData);
    const [selectedFile, setSelectedFile] = useState<FileType | undefined>(undefined);
    const [selectedContextFile, setSelectedContextFile] = useState<FileType | FileTreeType | undefined>(undefined);
    const [sLoadFileTree, setLoadFileTree] = useState<boolean>(false);
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sIsOpenModal, setIsOpenModal] = useState<boolean>(false);
    const [sIsFolderModal, setIsFoldermodal] = useState<boolean>(false);
    const [sIsUrlDownloadModal, setIsUrlDownloadModal] = useState<boolean>(false);
    const [sIsGit, setIsGit] = useState(false);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const setRecentDirectory = useSetRecoilState(gRecentDirectory);
    const [, setConsoleList] = useRecoilState<any>(gConsoleSelector);
    const [sSideSizes, setSideSizes] = useState<any>(['15%', '85%']);
    // const [sSearchFilter, setSearchFilter] = useState<boolean>(false);
    // const [sSearchTxt, setSearchTxt] = useState<string>('');
    const [sDeleteFileList, setDeleteFileList] = useRecoilState(gDeleteFileList);
    const [sIsFetch, setIsFetch] = useState<boolean>(false);
    const [sIsFileModal, setIsFileModal] = useState<boolean>(false);
    const sFileTreeRef = useRef(null);
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

    const handleIsOpenModal = (aBool: boolean, aEvent?: any) => {
        if (aEvent) {
            aEvent.stopPropagation();
        }

        setIsOpenModal(aBool);
        pGetInfo();
    };

    function removeLastItem(array: string[]) {
        if (!Array.isArray(array) || array.length === 0) {
            return array;
        }

        return array.slice(0, array.length - 1);
    }
    const getFileTree = async () => {
        setLoadFileTree(true);
        const sReturn = await getFiles('/');
        if (sReturn && sReturn?.data) {
            const sParedData = fileTreeParser(sReturn.data, '/', 0, '0');
            setFileTree(JSON.parse(JSON.stringify(sParedData)));
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
            const sContentResult: any = await getFiles(`${file.path}${file.name}`);
            const sFileExtension = extractionExtension(file.id);
            if (axios.isAxiosError(sContentResult)) return;
            if (sContentResult?.hasOwnProperty('headers') || sContentResult?.hasOwnProperty('reason') || sContentResult?.data?.hasOwnProperty('reason')) {
                const sParseData = typeof sContentResult?.data === 'string' ? JSON.parse(sContentResult?.data) : sContentResult?.data;
                return Error(sContentResult?.reason ?? sParseData?.reason);
            }
            let sTmpBoard: any = { id: sTmpId, name: file.name, type: sFileExtension, path: file.path, savedCode: sContentResult, code: '' };
            if (sFileExtension === 'wrk') {
                const sTmpData = JSON.parse(sContentResult);
                if (sTmpData.data) {
                    sTmpBoard.sheet = sTmpData.data;
                    sTmpBoard.savedCode = JSON.stringify(sTmpData.data);
                } else if (sTmpData.sheet) {
                    sTmpBoard.sheet = sTmpData.sheet;
                    sTmpBoard.savedCode = JSON.stringify(sTmpData.sheet);
                } else {
                    sTmpBoard.sheet = sTmpData;
                    sTmpBoard.savedCode = JSON.stringify(sTmpData);
                }
            } else if (sFileExtension === 'dsh') {
                const sTmpData: any = CheckDataCompatibility(sContentResult, sFileExtension);
                sTmpBoard = {
                    ...sTmpData,
                    id: sTmpBoard.id,
                    name: sTmpBoard.name,
                    type: sFileExtension,
                    path: sTmpBoard.path,
                    savedCode: JSON.stringify(JSON.parse(sContentResult).dashboard),
                };
            } else if (sFileExtension === 'taz') {
                const sTmpData: any = CheckDataCompatibility(sContentResult, sFileExtension);
                sTmpBoard = { ...sTmpData, id: sTmpBoard.id, name: sTmpBoard.name, type: sFileExtension, path: sTmpBoard.path, savedCode: JSON.stringify(sTmpData.panels) };
            } else if (isImage(file.id)) {
                const base64 = binaryCodeEncodeBase64(sContentResult);
                const updateBoard = {
                    ...sTmpBoard,
                    code: base64,
                    savedCode: base64,
                    type: extractionExtension(file.id),
                };
                sTmpBoard = updateBoard;
                setBoardList([...sBoardList, sTmpBoard]);
            } else sTmpBoard.code = sContentResult;

            pGetInfo();
            setBoardList([...sBoardList, sTmpBoard]);
            setSelectedTab(sTmpId);
        }
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
                if (!sReturn?.success) {
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
        // file 100px | folder 155px | git 185px
        const sMaxMenuH = file.type === 0 ? 100 : (file as any)?.gitClone ? 185 : 155;
        const sWindowH = window.innerHeight;
        const sTreeH = (sFileTreeRef.current as any).clientHeight;
        const sWindowHWithoutTree = sWindowH - sTreeH;
        const sEventInTreeY = e.pageY - sWindowHWithoutTree;
        if (sEventInTreeY + sMaxMenuH > sTreeH) {
            setMenuX(e.pageX);
            setMenuY(e.pageY - sMaxMenuH);
        } else {
            setMenuX(e.pageX);
            setMenuY(e.pageY);
        }
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
        for (const aItem of aDelList) {
            const aResult: any = await deleteContextFile(aItem.path, aItem.query);
            if (aResult.success || (isImage(aItem.name) && binaryCodeEncodeBase64(aResult))) {
                sReslutList.push(aItem);
                DeleteFileTree(aItem);
            } else {
                setConsoleList((prev: any) => [
                    ...prev,
                    {
                        timestamp: new Date().getTime(),
                        level: 'ERROR',
                        task: '',
                        message: aResult.data.reason,
                    },
                ]);
            }
        }
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
            const sRecursivePath: any = { path: undefined, query: undefined };
            const sDeleteList = JSON.parse(JSON.stringify(sDeleteFileList)).map((aDelFile: any) => {
                return {
                    path: aDelFile.path,
                    query: isRecursive && aDelFile.type === 1 ? aDelFile.name + '?recursive=true' : aDelFile.name,
                    name: aDelFile.name,
                    type: aDelFile.type,
                    depth: aDelFile.depth,
                };
            });
            if (selectedContextFile && selectedContextFile.path && selectedContextFile.name) {
                sRecursivePath.path = selectedContextFile.path;
                if (isRecursive && selectedContextFile.type === 1) sRecursivePath.query = selectedContextFile.name + '?recursive=true';
                else sRecursivePath.query = selectedContextFile.name;
            }

            if (!sDeleteList.some((aItem: any) => aItem.path === sRecursivePath.path && aItem.query === sRecursivePath.query)) sDeleteList.push(sRecursivePath);
            setDeleteFileList(undefined);
            multiDelete(sDeleteList);
        } else {
            if (selectedContextFile && selectedContextFile.path && selectedContextFile.name) {
                const sRecursivePath = isRecursive ? selectedContextFile.name + '?recursive=true' : selectedContextFile.name;
                const sResult: any = await deleteContextFile(selectedContextFile.path, sRecursivePath);
                if (sResult.reason === 'success' || (isImage(selectedContextFile.name) && binaryCodeEncodeBase64(sResult))) {
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
                            message: sResult.data.reason,
                        },
                    ]);
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
                console.error('');
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
    };

    // const HandleUrlDownload = () => {
    //     setIsUrlDownloadModal(true);
    // };

    const handleRefresh = (e?: MouseEvent) => {
        if (e) e.stopPropagation();
        getFileTree();
    };

    // const handleSearch = (aValue: string) => {
    //     setSearchTxt(aValue);
    //     if (!aValue) {
    //         handleSearchReset();
    //     }
    //     if (aValue && aValue !== '') {
    //         const sFilterTree = TreeViewFilter({
    //             origin: sFileTree,
    //             filterTxt: aValue,
    //         });
    //         setRootDir(sFilterTree);
    //     }
    // };

    // const handleSearchReset = () => {
    //     setRootDir(JSON.parse(JSON.stringify(sFileTree)));
    // };

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
            // setRename(sCopiedFile);
        }
        closeContextMenu();
    };

    const handleFile = (aEvent: any) => {
        if (aEvent) {
            aEvent.stopPropagation();
        }
        setIsFileModal(true);
    };

    useOutsideClick(MenuRef, () => setIsContextMenu(false));

    return (
        <div className="side-form" style={{ display: pDisplay ? '' : 'none' }}>
            <div className="side-title">
                <span>machbase-neo {pServer && pServer.version}</span>
            </div>
            <SplitPane className="split-body" sashRender={() => <></>} split="horizontal" sizes={sSideSizes} onChange={setSideSizes}>
                <Pane minSize={22} maxSize="40%">
                    <div
                        onClick={() => {
                            if (sSideSizes[0] !== 22) {
                                setSideSizes([22, 'calc(100% - 22px)']);
                            } else {
                                setSideSizes(['15%', '85%']);
                            }
                        }}
                        className="side-sub-title editors-title"
                    >
                        <div className="collapse-icon">{sSideSizes[0] !== 22 ? <VscChevronDown /> : <VscChevronRight />}</div>
                        <span className="title-text">OPEN EDITORS</span>
                    </div>
                    {
                        <div className="editors-form">
                            {sBoardList.length !== 0 &&
                                sBoardList.map((aBoard: any, aIdx: any) => {
                                    return <OpenFile pBoard={aBoard} pSetSelectedTab={setSelectedTab} pIdx={aIdx} key={aBoard.id} />;
                                })}
                        </div>
                    }
                </Pane>
                <Pane minSize={22}>
                    <div className="side-sub-title editors-title" onClick={() => setCollapseTree(!sCollapseTree)}>
                        <div className="collapse-icon">{sCollapseTree ? <VscChevronDown /> : <VscChevronRight />}</div>
                        <div className="files-open-option">
                            <span>EXPLORER</span>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {/* <div style={{ marginRight: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <SearchInput
                                        pWidth={120}
                                        pHeight={20}
                                        pClickStopPropagation
                                        pIsExpand={sSearchFilter}
                                        onChange={handleSearch}
                                        onResetFilter={handleSearchReset}
                                        onChangeExpand={setSearchFilter}
                                    />
                                </div> */}
                                {/* <IconButton pWidth={20} pHeight={20} pIcon={<TbFolder size={15} />} onClick={(aEvent: any) => handleIsOpenModal(true, aEvent)} /> */}
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="New file"
                                    pToolTipId="file-explorer-new-file"
                                    pWidth={20}
                                    pHeight={20}
                                    pIcon={<VscNewFile size={15} />}
                                    onClick={(aEvent: any) => handleFile(aEvent)}
                                />
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="New folder"
                                    pToolTipId="file-explorer-new-folder"
                                    pWidth={20}
                                    pHeight={20}
                                    pIcon={<TbFolderPlus size={15} />}
                                    onClick={(aEvent: any) => handleFolder(true, aEvent, false)}
                                />
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Git clone"
                                    pToolTipId="file-explorer-git-clone"
                                    pWidth={20}
                                    pHeight={20}
                                    pIcon={<TbCloudDown size={15} />}
                                    onClick={(aEvent: any) => handleFolder(true, aEvent, true)}
                                />
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Refresh"
                                    pToolTipId="file-explorer-refresh"
                                    pWidth={20}
                                    pHeight={20}
                                    pIcon={<MdRefresh size={15} />}
                                    onClick={(e: any) => handleRefresh(e)}
                                />
                            </div>
                        </div>
                    </div>
                    {sCollapseTree &&
                        (sLoadFileTree ? (
                            <span>...</span>
                        ) : (
                            <>
                                <div
                                    ref={sFileTreeRef}
                                    style={{
                                        backgroundColor: '#333333',
                                        height: `calc(100% - 22px)`,
                                        overflow: 'auto',
                                    }}
                                >
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
                                </div>
                                <div ref={MenuRef} className="side-file-tree-context-menu" style={{ top: menuY, left: menuX }}>
                                    <Menu isOpen={sIsContextMenu}>
                                        {(selectedContextFile as any)?.type === 1 && !(selectedContextFile as any)?.virtual ? (
                                            <>
                                                <Menu.Item onClick={(aEvent: any) => handleFile(aEvent)}>
                                                    <VscNewFile size={12} />
                                                    <span>New File...</span>
                                                </Menu.Item>
                                                <Menu.Item onClick={(aEvent: any) => handleFolder(true, aEvent, false)}>
                                                    <TbFolderPlus size={12} />
                                                    <span>New Folder...</span>
                                                </Menu.Item>
                                                <Menu.Item onClick={(aEvent: any) => handleFolder(true, aEvent, true)}>
                                                    <TbCloudDown size={12} />
                                                    <span>Git Clone...</span>
                                                </Menu.Item>
                                                {/* <Menu.Item onClick={HandleUrlDownload}>
                                                    <TbCloudDown size={12} />
                                                    <span>Url Download...</span>
                                                </Menu.Item> */}
                                            </>
                                        ) : null}
                                        {(selectedContextFile as any)?.type === 0 &&
                                            !isImage((selectedContextFile as any).name as string) &&
                                            EXTENSION_SET.has(extractionExtension((selectedContextFile as any)?.id)) && (
                                                <Menu.Item onClick={handleCopy}>
                                                    <VscCopy />
                                                    <span>Duplicate</span>
                                                </Menu.Item>
                                            )}
                                        {!(selectedContextFile as any)?.readOnly &&
                                            ((selectedContextFile as any)?.type === 1 || EXTENSION_SET.has(extractionExtension((selectedContextFile as any)?.id))) && (
                                                <Menu.Item onClick={handleRename}>
                                                    <Rename />
                                                    <span>Rename</span>
                                                </Menu.Item>
                                            )}
                                        {(selectedContextFile as any)?.gitClone ? (
                                            <Menu.Item onClick={updateGitFolder}>
                                                <Update />
                                                <span>Update</span>
                                            </Menu.Item>
                                        ) : null}
                                        {!(selectedContextFile as any)?.readOnly &&
                                            ((selectedContextFile as any)?.type === 1 || EXTENSION_SET.has(extractionExtension((selectedContextFile as any)?.id))) && (
                                                <Menu.Item onClick={deleteFile}>
                                                    <Delete />
                                                    <span>Delete</span>
                                                </Menu.Item>
                                            )}
                                        {(selectedContextFile as any)?.content ? (
                                            <Menu.Item onClick={downloadFile}>
                                                <Download />
                                                <span>Saved to local</span>
                                            </Menu.Item>
                                        ) : null}
                                    </Menu>
                                </div>
                            </>
                        ))}
                </Pane>
            </SplitPane>
            {sIsOpenModal ? <SaveModal pIsDarkMode pIsSave={false} setIsOpen={handleIsOpenModal} /> : null}
            {sIsFileModal ? <FileModal pIsDarkMode={true} setIsOpen={setIsFileModal} /> : null}
            {sIsFolderModal ? <FolderModal pIsGit={sIsGit} pIsDarkMode={true} setIsOpen={handleFolder} /> : null}
            {sIsDeleteModal ? <DeleteModal pIsDarkMode setIsOpen={setIsDeleteModal} pFileInfo={selectedContextFile} pCallback={handleDeleteFile} /> : null}
            {sIsUrlDownloadModal && <UrlDownloadModal setIsOpen={setIsUrlDownloadModal} pCallback={handleRefresh} />}
        </div>
    );
};

export default Side;
