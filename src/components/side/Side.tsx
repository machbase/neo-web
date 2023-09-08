import { GBoardListType, gBoardList, gSelectedTab } from '@/recoil/recoil';
import { gFileTree, gRecentDirectory } from '@/recoil/fileTree';
import { getId, isImage, binaryCodeEncodeBase64, extractionExtension } from '@/utils';
import { useState, useRef } from 'react';
import { Delete, Download, Update, VscChevronRight, VscChevronDown, TbFolderPlus, TbCloudDown, TbFolder, MdRefresh } from '@/assets/icons/Icon';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { FileTree } from '../fileTree/file-tree';
import Sidebar from '../fileTree/sidebar';
import { useEffect } from 'react';
import './Side.scss';
import { getFiles, deleteFile as deleteContextFile } from '@/api/repository/fileTree';
import { FileTreeType, FileType, fileTreeParser } from '@/utils/fileTreeParser';
import Menu from '../contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import { Error } from '@/components/toast/Toast';
import { SaveModal } from '../modal/SaveModal';
import OpenFile from './OpenFile';
import { FolderModal } from '../modal/FolderModal';
import { postFileList } from '@/api/repository/api';

const Side = ({ pGetInfo, pSavedPath, pServer }: any) => {
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
    };
    const [menuX, setMenuX] = useState<number>(0);
    const [menuY, setMenuY] = useState<number>(0);
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const MenuRef = useRef<HTMLDivElement>(null);
    const setSelectedTab = useSetRecoilState<string>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);
    const [rootDir, setRootDir] = useState<FileTreeType>(sParedData);
    const [selectedFile, setSelectedFile] = useState<FileType | undefined>(undefined);
    const [selectedContextFile, setSelectedContextFile] = useState<FileType | FileTreeType | undefined>(undefined);
    const [sLoadFileTree, setLoadFileTree] = useState<boolean>(false);
    const [sCollapseEditors, setCollapseEditors] = useState(true);
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sIsOpenModal, setIsOpenModal] = useState<boolean>(false);
    const [sIsFolderModal, setIsFoldermodal] = useState<boolean>(false);
    const [sIsGit, setIsGit] = useState(false);
    const setRecentDirectory = useSetRecoilState(gRecentDirectory);
    // const sFileTreeRoot = useRecoilValue(gFileTreeRoot);

    useEffect(() => {
        getFileTree();
    }, []);

    useEffect(() => {
        if (!pSavedPath) {
            return;
        }
        const pathArray: any = pSavedPath.split('/');
        onFetchDir({
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
        });
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

    const onFetchDir = async (aSelectedDir: FileTreeType) => {
        const sReturn = await getFiles(`${aSelectedDir.path}${aSelectedDir.name}/`);
        const sParedData = fileTreeParser(sReturn.data, `${aSelectedDir.path}${aSelectedDir.name}/`, aSelectedDir.depth, aSelectedDir.name);

        if (sParedData.dirs.length > 0 || sParedData.files.length > 0) {
            const sTmpDir = findDir(rootDir, sParedData, aSelectedDir);
            const sResult = JSON.parse(JSON.stringify(rootDir));
            sResult.dirs = sTmpDir;
            setFileTree(JSON.parse(JSON.stringify(sResult)));
        }
    };

    const findDir = (aOriginDir: FileTreeType, aParedData: FileTreeType, aTargetDir: FileTreeType): FileTreeType[] => {
        return aOriginDir.dirs.map((aDir: FileTreeType) => {
            if (aDir.name === aTargetDir.name && aDir.depth === aTargetDir.depth) return { ...aParedData, path: aTargetDir.path };
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
    };

    const closeContextMenu = () => {
        setIsContextMenu(false);
    };

    const deleteFile = async () => {
        const sConfirm = confirm(`Do you want to delete this file (${selectedContextFile?.name})?`);
        if (sConfirm && selectedContextFile !== undefined) {
            const sResult: any = await deleteContextFile(selectedContextFile.path, selectedContextFile.name);
            if (sResult.reason === 'success') {
                getFileTree();
                setRecentDirectory('/');
            } else {
                Error('Failed');
            }
        }
        closeContextMenu();
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

    useOutsideClick(MenuRef, () => setIsContextMenu(false));

    return (
        <div className="side-form">
            <div className="side-title">
                <span>machbase-neo {pServer && pServer.version}</span>
            </div>
            <div>
                <div onClick={() => setCollapseEditors(!sCollapseEditors)} className="side-sub-title editors-title">
                    <div className="collapse-icon">{sCollapseEditors ? <VscChevronDown></VscChevronDown> : <VscChevronRight></VscChevronRight>}</div>
                    <span className="title-text">OPEN EDITORS</span>
                </div>
                {sCollapseEditors && (
                    <div className="editors-form">
                        {sBoardList.length !== 0 &&
                            sBoardList.map((aBoard: any, aIdx: any) => {
                                return <OpenFile pBoard={aBoard} pSetSelectedTab={setSelectedTab} pIdx={aIdx} key={aBoard.id}></OpenFile>;
                            })}
                    </div>
                )}
            </div>
            <div className="side-sub-title editors-title" onClick={() => setCollapseTree(!sCollapseTree)}>
                <div className="collapse-icon">{sCollapseTree ? <VscChevronDown></VscChevronDown> : <VscChevronRight></VscChevronRight>}</div>

                <div className="files-open-option">
                    <div>EXPLORER</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TbFolder onClick={(aEvent: any) => handleIsOpenModal(true, aEvent)} />
                        <div style={{ marginLeft: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TbFolderPlus onClick={(aEvent: any) => handleFolder(true, aEvent, false)} />
                        </div>
                        <div style={{ marginLeft: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TbCloudDown onClick={(aEvent: any) => handleFolder(true, aEvent, true)} />
                        </div>
                        <div style={{ marginLeft: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MdRefresh onClick={(e: any) => handleRefresh(e)} />
                        </div>
                    </div>
                </div>
            </div>
            {sCollapseTree &&
                (sLoadFileTree ? (
                    // 🚧TODO
                    <>...</>
                ) : (
                    <>
                        <Sidebar pBoardListLength={sBoardList.length}>
                            <FileTree
                                rootDir={rootDir}
                                selectedFile={selectedFile}
                                onSelect={onSelect}
                                onFetchDir={onFetchDir}
                                onContextMenu={onContextMenu}
                                onRefresh={() => handleRefresh()}
                            />
                        </Sidebar>
                        <div ref={MenuRef} style={{ position: 'fixed', top: menuY, left: menuX, zIndex: 10 }}>
                            <Menu isOpen={sIsContextMenu}>
                                {
                                    <Menu.Item onClick={updateGitFolder}>
                                        <Update />
                                        <span>Update</span>
                                    </Menu.Item>
                                }
                                <Menu.Item onClick={deleteFile}>
                                    <Delete />
                                    <span>Delete</span>
                                </Menu.Item>
                                <Menu.Item onClick={downloadFile}>
                                    <Download />
                                    <span>Saved to local</span>
                                </Menu.Item>
                            </Menu>
                        </div>
                    </>
                ))}
            {sIsOpenModal ? <SaveModal pIsDarkMode pIsSave={false} setIsOpen={handleIsOpenModal} /> : null}
            {sIsFolderModal ? <FolderModal pIsGit={sIsGit} pIsDarkMode={true} setIsOpen={handleFolder} pCallback={handleRefresh} /> : null}
        </div>
    );
};

export default Side;
