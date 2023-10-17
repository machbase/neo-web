import { GBoardListType, gBoardList, gConsoleList, gSelectedTab } from '@/recoil/recoil';
import { gDeleteFileList, gFileTree, gRecentDirectory, gRenameFile } from '@/recoil/fileTree';
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
import Sidebar from '../fileTree/sidebar';
import { useEffect } from 'react';
import './Side.scss';
import { getFiles, deleteFile as deleteContextFile } from '@/api/repository/fileTree';
import { FileTreeType, FileType, fileTreeParser } from '@/utils/fileTreeParser';
import Menu from '../contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import { SaveModal } from '../modal/SaveModal';
import OpenFile from './OpenFile';
import { FolderModal } from '../modal/FolderModal';
import { postFileList } from '@/api/repository/api';
import { DeleteModal } from '../modal/DeleteModal';
import SplitPane, { Pane } from 'split-pane-react';
import { IconButton } from '@/components/buttons/IconButton';
// import { SearchInput } from '../inputs/SearchInput';
// import { TreeViewFilter } from '@/utils/treeViewFilter';
import { renameManager } from '@/utils/file-manager';
import { FileModal } from '../modal/FileModal';

const Side = ({
    pGetInfo,
    pSavedPath,
    pServer,
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
    const [sIsGit, setIsGit] = useState(false);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const setRecentDirectory = useSetRecoilState(gRecentDirectory);
    const [, setConsoleList] = useRecoilState<any>(gConsoleList);
    const [sSideSizes, setSideSizes] = useState<any>(['15%', '85%']);
    // const [sSearchFilter, setSearchFilter] = useState<boolean>(false);
    // const [sSearchTxt, setSearchTxt] = useState<string>('');
    const [sDeleteFileList, setDeleteFileList] = useRecoilState(gDeleteFileList);
    const [sIsFetch, setIsFetch] = useState<boolean>(false);
    const [sIsFileModal, setIsFileModal] = useState<boolean>(false);

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

    const handleIsOpenModal = (aBool: boolean, aEvent?: any) => {
        if (aEvent) {
            aEvent.stopPropagation();
        }

        setIsOpenModal(aBool);
        pGetInfo();
    };

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
        const sReturn = await getFiles('/');
        const sParedData = fileTreeParser(sReturn.data, '/', 0, '0');
        setFileTree(JSON.parse(JSON.stringify(sParedData)));
        setLoadFileTree(false);
    };

    const onSelect = async (file: FileType) => {
        const sTmpId = getId();
        const sExistBoard = getExistBoard(file);
        if (sExistBoard) {
            setSelectedTab(sExistBoard.id as string);
        } else {
            const sContentResult: any = await getFiles(`${file.path}${file.name}`);
            const sFileExtension = extractionExtension(file.id);
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
            } else if (sFileExtension === 'taz') {
                const sTmpData: any = JSON.parse(sContentResult);
                sTmpBoard = { ...sTmpData, id: sTmpBoard.id, name: sTmpBoard.name, type: sFileExtension, path: sTmpBoard.path, savedCode: JSON.stringify(sContentResult) };
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
        if (!sIsFetch) {
            setIsFetch(true);
            let sReturn = null;
            let sParedData = null;

            if (aIsOpen) {
                sReturn = await getFiles(`${aSelectedDir.path}${aSelectedDir.name}/`);
                sParedData = fileTreeParser(sReturn.data, `${aSelectedDir.path}${aSelectedDir.name}/`, aSelectedDir.depth, aSelectedDir.name);
            } else {
                sParedData = aSelectedDir;
            }

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
        setMenuX(e.pageX);
        setMenuY(e.pageY);
        setIsContextMenu(true);
        setSelectedContextFile(file);
        setRecentDirectory(`${file.path + file.name}/`);
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
        try {
            const deleteApi = (aDelItem: any) => {
                return new Promise((resolve, reject) => {
                    setTimeout(async () => {
                        const sResult = await deleteContextFile(aDelItem.path, aDelItem.query);
                        sReslutList.push(sResult);
                        if ((sResult as any).success) resolve(true);
                        else reject(false);
                    }, 1);
                });
            };

            await aDelList.reduce(async (previousPromise: any, curQuery: string) => {
                await previousPromise;
                return deleteApi(curQuery);
            }, Promise.resolve());
        } catch {
            setConsoleList((prev: any) => [
                ...prev,
                {
                    timestamp: new Date().getTime(),
                    level: 'ERROR',
                    task: '',
                    message: sReslutList.at(-1).data.reason,
                },
            ]);
            setRecentDirectory('/');
        }

        if (sReslutList.some((aResult: any) => aResult.success === true)) {
            getFileTree();
            setRecentDirectory('/');
        }
    };

    const handleDeleteFile = async (isRecursive: boolean) => {
        if (sDeleteFileList && (sDeleteFileList as any).length > 0) {
            const sRecursivePath: any = { path: undefined, query: undefined };
            const sDeleteList = JSON.parse(JSON.stringify(sDeleteFileList)).map((aDelFile: any) => {
                return { path: aDelFile.path, query: isRecursive && aDelFile.type === 1 ? aDelFile.name + '?recursive=true' : aDelFile.name };
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
                if (sResult.reason === 'success') {
                    getFileTree();
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
                getFileTree();
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

    const handleFile = (aEvent: any) => {
        if (aEvent) {
            aEvent.stopPropagation();
        }
        // if (selectedContextFile) setRecentDirectory(`${selectedContextFile.path + selectedContextFile.name}`);
        // else setRecentDirectory('/');
        setIsFileModal(true);
    };

    useOutsideClick(MenuRef, () => setIsContextMenu(false));

    return (
        <div className="side-form">
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
                        <div className="collapse-icon">{sSideSizes[0] !== 22 ? <VscChevronDown></VscChevronDown> : <VscChevronRight></VscChevronRight>}</div>
                        <span className="title-text">OPEN EDITORS</span>
                    </div>
                    {
                        <div className="editors-form">
                            {sBoardList.length !== 0 &&
                                sBoardList.map((aBoard: any, aIdx: any) => {
                                    return <OpenFile pBoard={aBoard} pSetSelectedTab={setSelectedTab} pIdx={aIdx} key={aBoard.id}></OpenFile>;
                                })}
                        </div>
                    }
                </Pane>
                <Pane minSize={22}>
                    <div className="side-sub-title editors-title" onClick={() => setCollapseTree(!sCollapseTree)}>
                        <div className="collapse-icon">{sCollapseTree ? <VscChevronDown></VscChevronDown> : <VscChevronRight></VscChevronRight>}</div>
                        <div className="files-open-option">
                            <div>EXPLORER</div>
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
                                <IconButton pWidth={20} pHeight={20} pIcon={<VscNewFile size={15} />} onClick={(aEvent: any) => handleFile(aEvent)} />
                                <IconButton pWidth={20} pHeight={20} pIcon={<TbFolderPlus size={15} />} onClick={(aEvent: any) => handleFolder(true, aEvent, false)} />
                                <IconButton pWidth={20} pHeight={20} pIcon={<TbCloudDown size={15} />} onClick={(aEvent: any) => handleFolder(true, aEvent, true)} />
                                <IconButton pWidth={20} pHeight={20} pIcon={<MdRefresh size={15} />} onClick={(e: any) => handleRefresh(e)} />
                            </div>
                        </div>
                    </div>
                    {sCollapseTree &&
                        (sLoadFileTree ? (
                            <>...</>
                        ) : (
                            <>
                                <Sidebar>
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
                                </Sidebar>
                                <div ref={MenuRef} style={{ position: 'fixed', top: menuY, left: menuX, zIndex: 10 }}>
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
                                            </>
                                        ) : null}
                                        <Menu.Item onClick={handleRename}>
                                            <Rename />
                                            <span>Rename</span>
                                        </Menu.Item>
                                        {(selectedContextFile as any)?.gitClone ? (
                                            <Menu.Item onClick={updateGitFolder}>
                                                <Update />
                                                <span>Update</span>
                                            </Menu.Item>
                                        ) : null}
                                        <Menu.Item onClick={deleteFile}>
                                            <Delete />
                                            <span>Delete</span>
                                        </Menu.Item>
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
            {sIsFileModal ? <FileModal pIsDarkMode={true} setIsOpen={setIsFileModal} pCallback={handleRefresh} /> : null}
            {sIsFolderModal ? <FolderModal pIsGit={sIsGit} pIsDarkMode={true} setIsOpen={handleFolder} pCallback={handleRefresh} /> : null}
            {sIsDeleteModal ? <DeleteModal pIsDarkMode setIsOpen={setIsDeleteModal} pFileInfo={selectedContextFile} pCallback={handleDeleteFile} /> : null}
        </div>
    );
};

export default Side;
