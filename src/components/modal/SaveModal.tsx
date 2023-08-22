import { useState, useEffect, useRef } from 'react';
import { getFileList, postFileList } from '@/api/repository/api';
import Modal from './Modal';
import { gFileTree } from '@/recoil/fileTree';
import './SaveModal.scss';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState, useRecoilValue } from 'recoil';
import { getId } from '@/utils';
import { FileType, FileTreeType, fileTreeParser } from '@/utils/fileTreeParser';
import { getFiles as getFilesTree, deleteFile as deleteContextFile } from '@/api/repository/fileTree';
import { Menu } from '@/components/contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import { gSaveWorkSheets } from '@/recoil/workSheet';
import {
    DotChart,
    Home,
    TreeFolder,
    Delete,
    Download,
    Play,
    Search,
    Save,
    Close,
    ArrowLeft,
    ArrowRight,
    NewFolder,
    FolderOpen,
} from '@/assets/icons/Icon';

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
    let sCurrentTab;

    const sCheckType = (aValue: string) => aValue === '.sql' || aValue === '.tql' || aValue === '.taz' || aValue === '.wrk';

    useEffect(() => {
        sCurrentTab = sBoardList.find((aItem) => aItem.id === sSelectedTab);
        sCurrentTab && sCurrentTab.type ? setFileType(sCurrentTab.type) : setFileType('');

        setSaveFileName(sCurrentTab ? (sCheckType(sCurrentTab.name.slice(-4)) ? sCurrentTab.name : sCurrentTab.name + `.${sCurrentTab.type}`) : `new.${sFileType}`);
    }, []);

    useEffect(() => {
        getFiles();
    }, [sSelectedDir, sFileType]);

    const handleClose = () => {
        setIsOpen(false, sSelectedDir.join('/'));
    };

    const getFiles = async () => {
        const sData = await getFileList(`?filter=*.${sFileType}`, sSelectedDir.join('/'), '');
        setFileList(sData.data.children);
        setFilterFileList(sData.data.children);
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
                const sData = await getFileList(`?filter=*.${sFileType}`, currentPath.join('/'), '');
                setFileList(sData.data.children);
                setFilterFileList(sData.data.children);
            }
        }
    };

    const saveFile = async () => {
        const sFileName = sSaveFileName;
        const sTab = sBoardList.find((aItem) => aItem.id === sSelectedTab);
        const sDupFile = sFileList && sFileList.find((aItem) => aItem.name === sFileName);
        const sSaveData = sFileType === 'wrk' ? { data: sSaveWorkSheet } : sFileType === 'taz' ? sTab : sTab?.code;
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
                                            savedCode: sFileType === 'wrk' ? JSON.stringify(aItem.sheet) : aItem.code,
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
                                        savedCode: sFileType === 'wrk' ? JSON.stringify(aItem.sheet) : aItem.code,
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
        if (sResult.success) {
            updateFileTree(sPath);

            handleClose();

            setBoardList(
                sBoardList.map((aItem: any) => {
                    if (aItem.id === sSelectedTab) {
                        const sSaveData = {
                            ...aItem,
                            name: sFileName,
                            savedCode: sFileType === 'wrk' ? JSON.stringify(aItem.sheet) : aItem.code,
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
            const sTmpDir = findDir(sFileTree, sParedData);
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
            alert('please select file');
            return;
        }
        const sTmpId = getId();
        const sExistBoard = getExistBoard(file);
        if (file.isDir) {
            handleForwardPath(file.name);
            return;
        }
        if (sExistBoard) {
            setSelectedTab(sExistBoard.id as string);
        } else {
            const sPath = sSelectedDir.length > 0 ? '/' + sSelectedDir.join('/') + '/' : '/';
            const sType = file.name.split('.').pop() as string;
            const sData = await getFilesTree(`${sSelectedDir.join('/')}/${file.name}`);
            let sParseData;
            if ((sType === 'wrk' && typeof sData === 'string') || (typeof sData === 'string' && sType === 'taz')) {
                sParseData = JSON.parse(sData);
            }
            const sDataObj = sType === 'wrk' ? { sheet: sParseData.data } : { code: sData };
            if (sType === 'taz') {
                setBoardList([
                    ...sBoardList,
                    {
                        ...sParseData,
                        id: sTmpId,
                        name: file.name,
                        type: file.name.split('.').pop() as string,
                        path: sPath,
                        savedCode: JSON.stringify(sParseData),
                    },
                ]);
                setSelectedTab(sTmpId);
                handleClose();
                return;
            } else if (sType === 'wrk') {
                setBoardList([
                    ...sBoardList,
                    {
                        id: sTmpId,
                        name: file.name,
                        type: file.name.split('.').pop() as string,
                        path: sPath,
                        savedCode: JSON.stringify(sDataObj.sheet),
                        ...sDataObj,
                    },
                ]);
            } else {
                setBoardList([
                    ...sBoardList,
                    {
                        id: sTmpId,
                        name: file.name,
                        type: file.name.split('.').pop() as string,
                        path: sPath,
                        savedCode: sDataObj.code,
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

        if (sFilterList.length === 0) {
            postFileList('', sSelectedDir.join('/'), `new`);
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
                postFileList('', sSelectedDir.join('/'), `new`);
            } else if (sIdx !== -1) {
                postFileList('', sSelectedDir.join('/'), `new-${sIdx}`);
            } else {
                postFileList('', sSelectedDir.join('/'), `new-${sSortData.length}`);
            }
        }
        getFiles();
    };

    const onContextMenu = (e: React.MouseEvent, file: FileType | FileTreeType) => {
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
                getFiles();
            } else {
                console.log('delete fail');
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

    const elapsedTime = (date: number): string => {
        if (typeof date === 'string') return '';
        const start = date;
        const end = new Date();

        const seconds = Math.floor((end.getTime() - start) / 1000);
        if (seconds < 60) return 'just a moment ago';

        const minutes = seconds / 60;
        if (minutes < 60) return `${Math.floor(minutes)}min ago`;

        const hours = minutes / 60;
        if (hours < 24) return `${Math.floor(hours)}hour ago`;

        const days = hours / 24;
        if (days < 30) return `${Math.floor(days)}day ago`;

        const months = days / 30;
        return `${Math.floor(months)}month ago`;
    };

    const elapsedSize = (aSize: number): string => {
        if (aSize === undefined || aSize === null) return '';
        if (typeof aSize === 'string') return '';
        if (aSize < 1000) return aSize + ' B';
        return Math.floor(aSize / 1000) + ' KB';
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
                            <ArrowLeft />
                        </div>
                        <div className={`tool-bar-content ${pIsDarkMode ? 'dark dark-border' : ''} ${sDeletePath.length > 0 ? 'active' : ''}`} style={{ marginLeft: '8px' }}>
                            <ArrowRight onClick={() => handleForwardPath(sDeletePath[sDeletePath.length - 1])} />
                        </div>
                        <div className={`input-wrapper ${pIsDarkMode ? 'input-wrapper-dark dark' : ''}`} style={{ marginLeft: '1rem' }}>
                            {sIsSearchMode ? (
                                <Search />
                            ) : (
                                <>
                                    <Home />
                                    <Play />
                                </>
                            )}
                            {sIsSearchMode ? <input onChange={changeSearchText} value={sSearchText} /> : <input readOnly value={sSelectedDir.join(' / ')} />}
                        </div>
                        <div className={`file-button ${pIsDarkMode ? 'dark' : ''}`} onClick={() => setIsSearchMode(!sIsSearchMode)}>
                            <Search size={20} />
                        </div>
                        <div className={`file-button ${pIsDarkMode ? 'dark' : ''}`} onClick={makeFolder}>
                            <NewFolder size={28} />
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
                                            <div className="pl" style={{ width: '50%', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {aItem.type === 'dir' ? <TreeFolder height={100} /> : <DotChart height={100} />}
                                                <span>{aItem.name}</span>
                                            </div>
                                            <span className="pl" style={{ width: '30%' }}>
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
                                <input onChange={changeSaveFileName} value={sSaveFileName}></input>
                            </div>
                        </div>
                    ) : null}
                    <div className="button-group">
                        <div
                            className={`button ${pIsDarkMode ? 'theme-dark' : 'theme-white'} ok ${pIsSave && !sSaveFileName.endsWith(`.${sFileType}`) ? 'disabled' : ''}`}
                            onClick={sSaveFileName.slice(-3) === `${sFileType}` && pIsSave ? saveFile : () => openFile(sSelectedFile)}
                        >
                            OK
                        </div>
                        <div style={{ width: '10px' }}></div>
                        <div
                            className={`button cancel ${pIsDarkMode ? 'theme-dark' : 'theme-white'}`}
                            style={{ color: pIsDarkMode ? 'white' : 'rgba(38, 40, 49, 0.5)' }}
                            onClick={handleClose}
                        >
                            Cancel
                        </div>
                    </div>
                </Modal.Footer>
            </Modal>
            <div ref={MenuRef} style={{ position: 'fixed', top: sMenuY, left: sMenuX, zIndex: 999 }}>
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
