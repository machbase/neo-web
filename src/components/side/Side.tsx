import { GBoardListType, gBoardList, gSelectedTab } from '@/recoil/recoil';
import { gFileTree } from '@/recoil/fileTree';
import { getId } from '@/utils';
import { useState, useRef } from 'react';
import { Delete, Download, VscChevronRight, VscChevronDown, FolderOpen } from '@/assets/icons/Icon';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { FileTree } from '../fileTree/file-tree';
import Sidebar from '../fileTree/sidebar';
import { useEffect } from 'react';
import './Side.scss';
import { getFiles, deleteFile as deleteContextFile } from '@/api/repository/fileTree';
import { FileTreeType, FileType, fileTreeParser } from '@/utils/fileTreeParser';
import Menu from '../contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import icons from '@/utils/icons';
import { Error } from '@/components/toast/Toast';
import { SaveModal } from '../modal/SaveModal';
import OpenFile from './OpenFile';

const Side = ({ pRecentFiles, pGetInfo, pSavedPath, pServer }: any) => {
    const sParedData: FileTreeType = {
        depth: 0,
        dirs: [],
        files: [],
        id: '',
        name: '',
        parentId: undefined,
        type: 0,
        path: 'ROOT',
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
    const [sCollapseRecent, setCollapseRecent] = useState(true);
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sIsOpenModal, setIsOpenModal] = useState<boolean>(false);
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
            let sTmpBoard: any = { id: sTmpId, name: file.name, type: file.id.slice(-3) as string, path: file.path, savedCode: sContentResult };

            if (file.id.slice(-3) === 'wrk') {
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
            } else if (file.id.slice(-3) === 'taz') {
                const sTmpData: any = JSON.parse(sContentResult);
                sTmpBoard = { ...sTmpData, id: sTmpBoard.id, name: sTmpBoard.name, type: file.id.slice(-3), path: sTmpBoard.path, savedCode: JSON.stringify(sContentResult) };
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
    const checkRecentExistBoard = (aName: string, aPath: string) => {
        return sBoardList.filter((aBoard: any) => aBoard.name === aName && aBoard.path === aPath)[0];
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

    const openRecentFile = async (file: any) => {
        const sTmpId = getId();
        const sAddress = file.address.replace('serverfile://', '');
        const sNameSplit = file.title.split('/');
        const sFileName = sNameSplit[sNameSplit.length - 1];
        const sExistBoard = checkRecentExistBoard(sFileName, sAddress.substr(0, sAddress.length - sFileName.length));
        if (sExistBoard) {
            setSelectedTab(sExistBoard.id as string);
        } else {
            const sContentResult: any = await getFiles(sAddress);
            let sTmpBoard: any = { id: sTmpId, name: sFileName, type: file.type, path: sAddress.substr(0, sAddress.length - sFileName.length), savedCode: sContentResult };
            if (file.type === 'wrk') {
                const sTmpData = JSON.parse(sContentResult);
                if (sTmpData.data) sTmpBoard.sheet = sTmpData.data;
                else if (sTmpData.sheet) sTmpBoard.sheet = sTmpData.sheet;
                else sTmpBoard.sheet = sTmpData;
            } else if (file.title.slice(-3) === 'taz') {
                const sTmpData: any = JSON.parse(sContentResult);
                sTmpBoard = { ...sTmpData, id: sTmpBoard.id, name: sTmpBoard.name, type: file.title.slice(-3), path: sTmpBoard.path };
            } else sTmpBoard.code = sContentResult;
            setBoardList([...sBoardList, sTmpBoard]);
            setSelectedTab(sTmpId);
        }
    };
    useOutsideClick(MenuRef, () => setIsContextMenu(false));

    return (
        <div className="side-form">
            <div className="side-title">machbase-neo {pServer && pServer.version}</div>
            <div>
                <div onClick={() => setCollapseRecent(!sCollapseRecent)} className="side-sub-title recent-title">
                    <div className="collapse-icon">{sCollapseRecent ? <VscChevronDown></VscChevronDown> : <VscChevronRight></VscChevronRight>}</div>
                    Open Tab
                </div>
                {sCollapseRecent && (
                    <div className="recent-form">
                        {sBoardList.length !== 0 &&
                            sBoardList.map((aBoard: any, aIdx: any) => {
                                return <OpenFile pBoard={aBoard} pSetSelectedTab={setSelectedTab} pIdx={aIdx} key={aBoard.id}></OpenFile>;
                            })}
                    </div>
                )}
            </div>
            <div className="side-sub-title recent-title" onClick={() => setCollapseTree(!sCollapseTree)}>
                <div className="collapse-icon">{sCollapseTree ? <VscChevronDown></VscChevronDown> : <VscChevronRight></VscChevronRight>}</div>

                <div className="files-open-option">
                    <div>Files</div> <FolderOpen onClick={(aEvent: any) => handleIsOpenModal(true, aEvent)} />
                </div>
            </div>
            {sCollapseTree &&
                (sLoadFileTree ? (
                    // 🚧TODO
                    <>...</>
                ) : (
                    <>
                        <Sidebar pRecentFileLength={pRecentFiles.length}>
                            <FileTree rootDir={rootDir} selectedFile={selectedFile} onSelect={onSelect} onFetchDir={onFetchDir} onContextMenu={onContextMenu} />
                        </Sidebar>
                        <div ref={MenuRef} style={{ position: 'fixed', top: menuY, left: menuX, zIndex: 10 }}>
                            <Menu isOpen={sIsContextMenu}>
                                <Menu.Item onClick={deleteFile}>
                                    <Delete />
                                    <span>delete</span>
                                </Menu.Item>
                                <Menu.Item onClick={downloadFile}>
                                    <Download />
                                    <span>download</span>
                                </Menu.Item>
                            </Menu>
                        </div>
                    </>
                ))}
            {sIsOpenModal ? <SaveModal pIsDarkMode pIsSave={false} setIsOpen={handleIsOpenModal} /> : null}
        </div>
    );
};

export default Side;
