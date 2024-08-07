import { useState, useEffect, useRef } from 'react';
import { getFileList, postFileList } from '@/api/repository/api';
import Modal from './Modal';
import { gFileTree, gRecentModalPath } from '@/recoil/fileTree';
import './SaveModal.scss';
import { gBoardList, gSelectedBoard, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState, useRecoilValue } from 'recoil';
import { getId, extractionExtension, elapsedTime, elapsedSize } from '@/utils';
import { FileType, FileTreeType, fileTreeParser } from '@/utils/fileTreeParser';
import { getFiles as getFilesTree, deleteFile as deleteContextFile } from '@/api/repository/fileTree';
import { Menu } from '@/components/contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import { gSaveWorkSheets } from '@/recoil/workSheet';
import { Error } from '@/components/toast/Toast';
import { Home, TreeFolder, Delete, Download, Play, Search, Save, Close, ArrowLeft, ArrowRight, NewFolder, FolderOpen } from '@/assets/icons/Icon';
import icons from '@/utils/icons';
import { TextButton } from '../buttons/TextButton';
import EnterCallback from '@/hooks/useEnter';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import { FileNameAndExtensionValidator } from '@/utils/FileExtansion';
import { IconButton } from '../buttons/IconButton';

export interface SaveModalProps {
    setIsOpen: any;
    pIsSave: boolean;
    pIsDarkMode?: boolean;
}

export const SaveModal = (props: SaveModalProps) => {
    const { setIsOpen, pIsSave, pIsDarkMode } = props;
    const [sSelectedDir, setSelectedDir] = useState<string[]>([]);
    const [sDeletePath, setDeletePath] = useState<string[]>([]);
    const [sSelectedFile, setSelectedFile] = useState<any>();
    const [sFileList, setFileList] = useState<any[]>([]);
    const [sFilterFileList, setFilterFileList] = useState<any[]>([]);
    const [sSaveFileName, setSaveFileName] = useState<string>('');
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sSelectedTab, setSelectedTab] = useRecoilState(gSelectedTab);
    const [sMenuX, setMenuX] = useState<number>(0);
    const [sMenuY, setMenuY] = useState<number>(0);
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const [sSearchText, setSearchText] = useState<string>('');
    const [sIsSearchMode, setIsSearchMode] = useState<boolean>(false);
    const MenuRef = useRef<HTMLDivElement>(null);
    const [sFileType, setFileType] = useState<string>('');
    const sSaveWorkSheet = useRecoilValue(gSaveWorkSheets);
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);
    const sSelectedBoard = useRecoilValue(gSelectedBoard);
    const [sModalPath, setModalPath] = useRecoilState(gRecentModalPath);

    const sCheckType = (aValue: string) =>
        aValue === 'sql' ||
        aValue === 'tql' ||
        aValue === 'taz' ||
        aValue === 'dsh' ||
        aValue === 'wrk' ||
        aValue === 'json' ||
        aValue === 'csv' ||
        aValue === 'md' ||
        aValue === 'html' ||
        aValue === 'css' ||
        aValue === 'js' ||
        aValue === 'txt';

    useEffect(() => {
        sSelectedBoard && sSelectedBoard.type ? setFileType(sSelectedBoard.type) : setFileType('');
        setSaveFileName(
            sSelectedBoard ? (sCheckType(extractionExtension(sSelectedBoard.name)) ? sSelectedBoard.name : sSelectedBoard.name + `.${sSelectedBoard.type}`) : `new.${sFileType}`
        );
        const sInitPath = sSelectedBoard.path !== '' ? sSelectedBoard.path : sModalPath;
        setSelectedDir(sInitPath.split('/').filter((aPath: string) => !!aPath));
        getFiles(
            sSelectedBoard.type ?? '',
            sInitPath.split('/').filter((aPath: string) => !!aPath)
        );
    }, []);

    const handleClose = () => {
        setIsOpen(false);
    };

    const getFiles = async (aType: string, aPathArr?: any) => {
        const sData = await getFileList(pIsSave ? `?filter=*.${aType}` : '', aPathArr ? aPathArr.join('/') : sSelectedDir.join('/'), '');
        setFileList(sData.data?.children ?? []);
        setFilterFileList(sData.data?.children ?? []);
    };

    const changeSaveFileName = (aEvent: React.ChangeEvent<HTMLInputElement>) => {
        setSaveFileName(aEvent.target.value);
    };

    const changeSearchText = (aEvent: React.ChangeEvent<HTMLInputElement>) => {
        const sText = aEvent.target.value;
        setSearchText(sText);
        const sCopyList = JSON.parse(JSON.stringify(sFileList));
        const sFilterList = sCopyList.filter((aItem: any) => aItem.name.toLowerCase().includes(sText.toLowerCase()));
        setFilterFileList(sFilterList);
    };

    const handleSelectFile = (aEvent: React.MouseEvent<HTMLDivElement>, aItem: any) => {
        setSelectedFile(aItem);
        switch (aEvent.detail) {
            case 1:
                aItem.type !== 'dir' ? setSaveFileName(aItem.name) : null;
                break;
            case 2:
                handleForwardPath(aItem.name, true);
                if (aItem.type !== 'dir') {
                    if (pIsSave) setFilterFileList(sFileList);
                    else openFile(aItem);
                }
                break;
            default:
                break;
        }
    };

    const handleBackPath = () => {
        setSelectedFile(null);
        setSearchText('');
        setIsSearchMode(false);
        const currentPath = JSON.parse(JSON.stringify(sSelectedDir));
        const deletePath = JSON.parse(JSON.stringify(sDeletePath));
        if (currentPath.length > 0) {
            deletePath.push(currentPath.pop());
            setSelectedDir(currentPath);
            setDeletePath(deletePath);
            getFiles(sFileType, currentPath);
        }
    };

    const handleForwardPath = async (aName: string, aIsDoubleClick?: boolean) => {
        setSelectedFile(null);
        setSearchText('');
        setIsSearchMode(false);
        const currentPath = JSON.parse(JSON.stringify(sSelectedDir));
        let deletePath = JSON.parse(JSON.stringify(sDeletePath));
        if (aIsDoubleClick && deletePath[deletePath.length - 1] !== aName) {
            deletePath = [];
            setDeletePath([]);
        }
        if (aName && !aName.endsWith(`.${sFileType}`)) {
            currentPath.push(aName);
            setSelectedDir([...currentPath]);
            if (deletePath.length > 0) {
                deletePath.pop();
                setDeletePath(deletePath);
                const sData = await getFileList(pIsSave ? `?filter=*.${sFileType}` : '', currentPath.join('/'), '');
                setFileList(sData.data?.children ?? []);
                setFilterFileList(sData.data.children ?? []);
            } else {
                getFiles(sFileType, currentPath);
            }
        }
    };

    const saveFile = async () => {
        const sFileName = sSaveFileName;
        const sTab = sBoardList.find((aItem) => aItem.id === sSelectedTab);
        const sDupFile = sFileList && sFileList.find((aItem) => aItem.name === sFileName);
        const sSaveData = sFileType === 'wrk' ? { data: sSaveWorkSheet } : sFileType === 'taz' || sFileType === 'dsh' ? sTab : sTab?.code;
        if (sDupFile && sTab?.name !== sFileName) {
            const sConfirm = confirm('Do you want to overwrite it?');
            if (sConfirm) {
                const sResult: any = await postFileList(sSaveData, sSelectedDir.join('/'), sFileName);
                if (sResult.success) {
                    const sExist = getExistBoard(sDupFile);
                    const sPath = sSelectedDir.length > 0 ? '/' + sSelectedDir.join('/') + '/' : '/';
                    if (sExist) {
                        setBoardList(
                            sBoardList
                                .filter((aItem) => aItem.name !== sFileName && aItem.path !== sPath)
                                .map((aItem: any) => {
                                    if (aItem.id === sSelectedTab) {
                                        const sSaveData = {
                                            ...aItem,
                                            name: sFileName,
                                            savedCode: sFileType === 'wrk' ? JSON.stringify(aItem.sheet) : sFileType === 'taz' ? JSON.stringify(aItem.panels) : aItem.code,
                                            path: sPath,
                                        };
                                        return sSaveData;
                                    } else {
                                        return aItem;
                                    }
                                })
                        );
                    } else {
                        setBoardList(
                            sBoardList.map((aItem: any) => {
                                if (aItem.id === sSelectedTab) {
                                    const sSaveData = {
                                        ...aItem,
                                        name: sFileName,
                                        savedCode: sFileType === 'wrk' ? JSON.stringify(aItem.sheet) : sFileType === 'taz' ? JSON.stringify(aItem.panels) : aItem.code,
                                        path: sPath,
                                    };
                                    return sSaveData;
                                } else {
                                    return aItem;
                                }
                            })
                        );
                    }
                    handleClose();
                }
                return;
            } else return;
        }
        const sPath = sSelectedDir.length > 0 ? '/' + sSelectedDir.join('/') + '/' : '/';
        const sResult: any = await postFileList(sSaveData, sPath, sFileName);
        setModalPath(sPath);
        if (sResult.success) {
            handleClose();
            const sDrillRes = await TreeFetchDrilling(sFileTree, sPath + sFileName, true);
            setFileTree(JSON.parse(JSON.stringify(sDrillRes.tree)));
            setBoardList(
                sBoardList.map((aItem: any) => {
                    if (aItem.id === sSelectedTab) {
                        const sSaveData = {
                            ...aItem,
                            name: sFileName,
                            savedCode:
                                sFileType === 'wrk'
                                    ? JSON.stringify(aItem.sheet)
                                    : sFileType === 'taz'
                                    ? JSON.stringify(aItem.panels)
                                    : sFileType === 'dsh'
                                    ? JSON.stringify(aItem.dashboard)
                                    : aItem.code,
                            path: sPath,
                        };
                        return sSaveData;
                    } else {
                        return aItem;
                    }
                })
            );
        }
    };

    const updateFileTree = async (aPath: any) => {
        if (aPath === '/') {
            const sResponseData = await getFileList('', '/', '');
            const sParedData = fileTreeParser(sResponseData.data, '/', 0, '0');
            setFileTree(sParedData as any);
        } else {
            const sPath = sSelectedDir.filter((_, aIdx: number) => aIdx + 1 !== sSelectedDir.length).join('/');
            const sResponseData = await getFileList('', sPath ? '/' + sPath + '/' : '/', sSelectedDir.at(-1) as string);
            const sParedData = fileTreeParser(sResponseData.data, '/' + sSelectedDir.join('/') + '/', sSelectedDir.length, sSelectedDir.at(-1) as string);
            sParedData.parentId = sPath.split('/').at(-1);
            sParedData.path = '/' + sPath + '/';
            const sTmpDir = findDir(sFileTree as FileTreeType, sParedData);
            const sResult = JSON.parse(JSON.stringify(sFileTree));
            sResult.dirs = sTmpDir;
            setFileTree(sResult);
        }
    };

    const findDir = (aOriginDir: FileTreeType, aParedData: FileTreeType): FileTreeType[] => {
        return aOriginDir.dirs.map((aDir: FileTreeType) => {
            if (aDir.name === aParedData.name) {
                return { ...aParedData, parentId: aParedData.path.replaceAll('/', '') };
            } else if (aParedData.path.includes(aDir.name)) {
                return { ...aDir, dirs: findDir(aDir, aParedData) };
            } else return aDir;
        });
    };

    const openFile = async (file: any) => {
        if (!file) {
            Error('please select file');
            return;
        }
        const sExistBoard = getExistBoard(file);
        if (file.isDir) {
            handleForwardPath(file.name);
            return;
        }
        if (sExistBoard) {
            setSelectedTab(sExistBoard.id as string);
        } else {
            const sPath = sSelectedDir.length > 0 ? '/' + sSelectedDir.join('/') + '/' : '/';
            const sType = extractionExtension(file.name);
            const sData = await getFilesTree(`${sSelectedDir.join('/')}/${file.name}`);
            let sParseData;
            if ((sType === 'wrk' && typeof sData === 'string') || (typeof sData === 'string' && (sType === 'taz' || sType === 'dsh'))) {
                sParseData = JSON.parse(sData);
            }
            const sDataObj = sType === 'wrk' ? { sheet: sParseData.data } : { code: sData };
            const sTmpId = getId();
            if (sType === 'taz' || sType === 'dsh') {
                setBoardList([
                    ...sBoardList,
                    {
                        ...sParseData,
                        id: sTmpId,
                        name: file.name,
                        type: sType,
                        path: sPath,
                        savedCode: JSON.stringify(sParseData),
                    },
                ]);
                setSelectedTab(sTmpId);
                handleClose();
                return;
            } else {
                const savedCode = sType === 'wrk' ? JSON.stringify(sDataObj.sheet) : sDataObj.code;
                setBoardList([
                    ...sBoardList,
                    {
                        id: sTmpId,
                        name: file.name,
                        type: sType,
                        path: sPath,
                        savedCode: savedCode,
                        ...sDataObj,
                    },
                ]);
            }
            setSelectedTab(sTmpId);
        }
        handleClose();
    };

    const getExistBoard = (aTargetFile: FileType) => {
        const sPath = sSelectedDir.length > 0 ? '/' + sSelectedDir.join('/') + '/' : '/';
        return sBoardList.filter((aBoard) => aBoard.name === aTargetFile.name && aBoard.path === sPath)[0];
    };

    const makeFolder = () => {
        const sFilterList = sFileList.filter((aItem) => aItem.isDir && aItem.name.startsWith('new'));
        const sPath = sSelectedDir.length > 0 ? '/' + sSelectedDir.join('/') + '/' : '/';

        if (sFilterList.length === 0) {
            postFileList(undefined, sPath, `new`);
        } else {
            const sSortData = sFilterList
                .map((aItem) => {
                    return aItem.name;
                })
                .sort();

            const sData = sSortData.map((aItem, aIdx) => {
                if (aIdx === 0 && aItem === 'new') return true;
                if (aItem.split('-')[1] === String(aIdx)) {
                    return true;
                } else {
                    return false;
                }
            });

            const sIdx = sData.findIndex((aItem) => !aItem);
            if (sIdx === 0) {
                postFileList(undefined, sPath, `new`);
            } else if (sIdx !== -1) {
                postFileList(undefined, sPath, `new-${sIdx}`);
            } else {
                postFileList(undefined, sPath, `new-${sSortData.length}`);
            }
        }
        getFiles(sFileType);
        updateFileTree('/');
    };

    const onContextMenu = (e: React.MouseEvent, file: FileType | FileTreeType) => {
        return;
        e.preventDefault();
        setMenuX(e.pageX);
        setMenuY(e.pageY);
        setIsContextMenu(true);
        setSelectedFile(file);
    };

    const closeContextMenu = () => {
        setIsContextMenu(false);
    };

    const deleteFile = async () => {
        const sConfirm = confirm(`Do you want to delete this file (${sSelectedFile?.name})?`);
        if (sConfirm && sSelectedFile !== undefined) {
            const sResult: any = await deleteContextFile(sSelectedDir.join('/'), sSelectedFile.name);
            if (sResult.reason === 'success') {
                getFiles(sFileType);
                const sPath = sSelectedDir.length > 0 ? '/' + sSelectedDir.join('/') + '/' : '/';
                updateFileTree(sPath);
            } else {
                Error('delete fail');
            }
        }
        closeContextMenu();
    };

    const downloadFile = async () => {
        if (sSelectedFile !== undefined) {
            const sData: any = await getFilesTree(`${sSelectedDir.join('/')}${sSelectedFile.name}`);
            const sBlob = new Blob([sData], { type: `text/plain` });
            const sLink = document.createElement('a');
            sLink.href = URL.createObjectURL(sBlob);
            sLink.setAttribute('download', sSelectedFile.name);
            sLink.click();
            URL.revokeObjectURL(sLink.href);
            closeContextMenu();
        }
    };

    useOutsideClick(MenuRef, () => setIsContextMenu(false));

    return (
        <div className="tql">
            <Modal pIsDarkMode={pIsDarkMode} onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="title">
                        <div className="title-content">
                            {pIsSave ? <Save /> : <FolderOpen />}
                            <span>{pIsSave ? 'Save' : 'Open'}</span>
                        </div>
                        <Close onClick={handleClose} />
                    </div>
                    <div className="tool-bar">
                        <div className={`tool-bar-content ${pIsDarkMode ? 'dark dark-border' : ''} ${sSelectedDir.length > 0 ? 'active' : ''}`} onClick={() => handleBackPath()}>
                            <IconButton pIsToopTip pToolTipContent="Backward" pToolTipId="save-modal-backward" pIcon={<ArrowLeft />} onClick={() => null} />
                        </div>
                        <div
                            className={`tool-bar-content ${pIsDarkMode ? 'dark dark-border' : ''} ${sDeletePath.length > 0 ? 'active' : ''}`}
                            style={{ marginLeft: '8px' }}
                            onClick={() => handleForwardPath(sDeletePath[sDeletePath.length - 1])}
                        >
                            <IconButton pIsToopTip pToolTipContent="Forward" pToolTipId="save-modal-forward" pIcon={<ArrowRight />} onClick={() => null} />
                        </div>
                        <div className={`input-wrapper ${pIsDarkMode ? 'input-wrapper-dark dark' : ''}`} style={{ marginLeft: '1rem' }}>
                            {sIsSearchMode ? (
                                <Search style={{ cursor: 'default' }} />
                            ) : (
                                <>
                                    <Home style={{ cursor: 'default' }} />
                                    <Play style={{ cursor: 'default' }} />
                                </>
                            )}
                            {sIsSearchMode ? (
                                <input onChange={changeSearchText} value={sSearchText} />
                            ) : (
                                <input readOnly value={sSelectedDir.join(' / ')} style={{ cursor: 'default' }} />
                            )}
                        </div>
                        <div className={`file-button ${pIsDarkMode ? 'dark' : ''}`} onClick={() => setIsSearchMode(!sIsSearchMode)}>
                            <IconButton pIsToopTip pToolTipContent="Search" pToolTipId="save-modal-search" pIcon={<Search size={20} />} onClick={() => null} />
                        </div>
                        <div className={`file-button ${pIsDarkMode ? 'dark' : ''}`} onClick={makeFolder}>
                            <IconButton pIsToopTip pToolTipContent="New folder" pToolTipId="save-modal-new-folder" pIcon={<NewFolder size={28} />} onClick={() => null} />
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className={`${pIsDarkMode ? 'file-broswer-dark' : 'file-broswer'}`}>
                        <div className={`${pIsDarkMode ? 'file-broswer-dark-header' : 'file-broswer-header'}`}>
                            <span style={{ width: '48%', paddingLeft: '1.5rem' }}>Name</span>
                            <span style={{ width: '32%' }}>Last modified</span>
                            <span style={{ width: '20%' }}>Size</span>
                        </div>
                        <div className={`${pIsDarkMode ? 'file-broswer-dark-content' : 'file-broswer-content'}`}>
                            {sFilterFileList &&
                                sFilterFileList.map((aItem, aIdx) => {
                                    return (
                                        <div
                                            key={aItem.name + aIdx}
                                            onContextMenu={(aEvent) => onContextMenu(aEvent, aItem)}
                                            className={`row ${sSelectedFile && sSelectedFile.name === aItem.name ? 'selected' : ''}`}
                                            onClick={(aEvent) => handleSelectFile(aEvent, aItem)}
                                        >
                                            <div className="pl list-wrapper">
                                                <div className="pl-icon">
                                                    {aItem.type === 'dir' ? (
                                                        aItem.gitClone ? (
                                                            icons('gitClosedDirectory')
                                                        ) : (
                                                            <TreeFolder height={100} />
                                                        )
                                                    ) : (
                                                        icons(aItem.type.replace('.', ''))
                                                    )}
                                                </div>
                                                <span>{aItem.name}</span>
                                            </div>
                                            <span className="pl" style={{ width: '32%' }}>
                                                {elapsedTime(aItem.lastModifiedUnixMillis)}
                                            </span>
                                            <span className="pl" style={{ width: '20%' }}>
                                                {elapsedSize(aItem.size)}
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    {pIsSave ? (
                        <div className="file-name">
                            <span>File Name</span>
                            <div className={`input-wrapper ${pIsDarkMode ? 'input-wrapper-dark' : ''}`}>
                                {/* // onKeyDown={(e: any) => useEnter(e, saveFile)} */}
                                <input
                                    autoFocus
                                    onChange={changeSaveFileName}
                                    value={sSaveFileName}
                                    onKeyDown={(e: any) =>
                                        FileNameAndExtensionValidator(sSaveFileName) && extractionExtension(sSaveFileName) === sFileType && pIsSave
                                            ? EnterCallback(e, saveFile)
                                            : null
                                    }
                                />
                            </div>
                        </div>
                    ) : null}
                    <div className="button-group">
                        <TextButton
                            pText="OK"
                            pBackgroundColor="#4199ff"
                            pIsDisabled={pIsSave && !(FileNameAndExtensionValidator(sSaveFileName) && sSaveFileName.endsWith(`.${sFileType}`))}
                            onClick={
                                FileNameAndExtensionValidator(sSaveFileName) && extractionExtension(sSaveFileName) === sFileType && pIsSave
                                    ? saveFile
                                    : () => openFile(sSelectedFile)
                            }
                        />
                        <div style={{ width: '10px' }}></div>
                        <TextButton pText="Cancel" pBackgroundColor="#666979" onClick={handleClose} />
                    </div>
                </Modal.Footer>
            </Modal>
            <div ref={MenuRef} className="save-modal-context-menu" style={{ top: sMenuY, left: sMenuX }}>
                <Menu isOpen={sIsContextMenu}>
                    <Menu.Item onClick={deleteFile}>
                        <Delete />
                        <span>Delete</span>
                    </Menu.Item>
                    <Menu.Item onClick={downloadFile}>
                        <Download />
                        <span>Download</span>
                    </Menu.Item>
                </Menu>
            </div>
        </div>
    );
};
