import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Close, FolderOpen, Home, TreeFolder } from '@/assets/icons/Icon';
import { TextButton } from './TextButton';
import { elapsedSize, elapsedTime } from '@/utils';
import { getFileList } from '@/api/repository/api';
import { useRecoilState } from 'recoil';
import { gRecentModalPath } from '@/recoil/fileTree';
import Modal from '../modal/Modal';
import icons from '@/utils/icons';
import './SelectFileBtn.scss';

export const SelectFileBtn = ({
    btnTxt,
    btnWidth,
    btnHeight,
    pType,
    pCallback,
}: {
    pType: string;
    btnTxt?: string;
    btnWidth?: string | number;
    btnHeight?: string | number;
    pCallback: (aTqlPath: string) => void;
}) => {
    const [sOpen, setOpen] = useState<boolean>(false);
    const [sSelectedDir, setSelectedDir] = useState<string[]>([]);
    const [sSelectedFile, setSelectedFile] = useState<any>();
    const [sFileList, setFileList] = useState<any[]>([]);
    const [sModalPath, setModalPath] = useRecoilState(gRecentModalPath);
    const [sDeletePath, setDeletePath] = useState<string[]>([]);

    const getFiles = async () => {
        const sData = await getFileList(`?filter=*.${pType}`, sSelectedDir.join('/'), '');
        setFileList(sData.data.children ?? []);
    };
    const handleSave = () => {
        const sTargetPath = '/' + sSelectedDir.join('/') + '/' + sSelectedFile;
        const fullPath = sTargetPath
            .split('/')
            .filter((aPath: string) => aPath !== '')
            .join('/');
        pCallback(fullPath);
        setModalPath('/' + sSelectedDir.join('/') + '/');
        setOpen(false);
    };
    const handleSelectFile = (aEvent: React.MouseEvent<HTMLDivElement>, aItem: any) => {
        const currentPath = JSON.parse(JSON.stringify(sSelectedDir));

        switch (aEvent.detail) {
            // click
            case 1: {
                if (!aItem.isDir) setSelectedFile(aItem.name);
                return;
            }
            // double click
            case 2: {
                // dir type
                if (aItem.isDir) {
                    setDeletePath([]);
                    currentPath.push(aItem.name);
                    setSelectedDir([...currentPath]);
                    return;
                }
                // file type
                else {
                    handleSave();
                    return;
                }
            }
        }
    };
    const handleBackPath = () => {
        if (sSelectedDir.length === 0) return;
        const sOldPath = JSON.parse(JSON.stringify(sSelectedDir));
        const sForwardPath = JSON.parse(JSON.stringify(sDeletePath));
        const sBackItem = sOldPath.at(-1);
        const sCurPath = sOldPath.slice(0, sSelectedDir.length - 1);
        setDeletePath([...sForwardPath, sBackItem]);
        setSelectedDir([...sCurPath]);
    };
    const handleForwardPath = async () => {
        if (sDeletePath.length === 0) return;
        const sOldForwardPath = JSON.parse(JSON.stringify(sDeletePath));
        const sForwardItem = sOldForwardPath.pop();
        const sOldPath = JSON.parse(JSON.stringify(sSelectedDir));
        setDeletePath(sOldForwardPath);
        setSelectedDir([...sOldPath, sForwardItem]);
    };
    const handleDirectPath = (aPath: string) => {
        if (sSelectedDir.at(-1) === aPath) return;
        const sOldPath = JSON.parse(JSON.stringify(sSelectedDir));
        const sBackItemList = sOldPath.splice(sOldPath.findIndex((bPath: string) => aPath === bPath) + 1, sOldPath.length);
        setDeletePath([...sBackItemList.reverse()]);
        if (aPath === '') {
            setSelectedDir([]);
        } else {
            const sCurPath = sOldPath.slice(0, sOldPath.findIndex((bPath: string) => aPath === bPath) + 1);
            setSelectedDir([...sCurPath]);
        }
    };
    const initPathNFile = () => {
        setSelectedDir(sModalPath.split('/').filter((aPath: string) => !!aPath));
        setSelectedFile('');
    };

    useEffect(() => {
        if (sOpen) {
            initPathNFile();
            getFiles();
        }
    }, [sOpen]);
    useEffect(() => {
        getFiles();
    }, [sSelectedDir]);

    return (
        <div
            className="select-input"
            style={{
                width: Number(btnWidth) ? btnWidth + 'px' : String(btnWidth) ? btnWidth : '200px',
                height: Number(btnHeight) ? btnHeight + 'px' : String(btnHeight) ? btnHeight : '100px',
            }}
        >
            <button className="select-input-button" onClick={() => setOpen(true)}>
                {btnTxt ?? 'Select file'}
            </button>

            {sOpen && (
                <div className="select-input-modal">
                    <Modal pIsDarkMode onOutSideClose={() => setOpen(false)}>
                        <Modal.Header>
                            <div className="select-input-modal-title">
                                <div className="select-input-modal-title-content">
                                    <FolderOpen />
                                    <span>{'Open'}</span>
                                </div>
                                <Close onClick={() => setOpen(false)} />
                            </div>
                            <div className="select-input-modal-tool-bar">
                                <div
                                    className={`select-input-modal-tool-bar-content ${sSelectedDir.length > 0 ? 'select-input-modal-tool-bar-content-active' : ''}`}
                                    onClick={() => handleBackPath()}
                                >
                                    <ArrowLeft />
                                </div>
                                <div
                                    className={`select-input-modal-tool-bar-content ${sDeletePath.length > 0 ? 'select-input-modal-tool-bar-content-active' : ''}`}
                                    onClick={() => handleForwardPath()}
                                >
                                    <ArrowRight />
                                </div>
                                <div className={`select-input-modal-input-wrapper`}>
                                    <div className="select-input-modal-input-item-wrapper" onClick={() => handleDirectPath('')}>
                                        <div className="select-input-modal-input-item">
                                            <Home />
                                        </div>
                                    </div>
                                    {sSelectedDir.map((aDir: string) => {
                                        return (
                                            <div className="select-input-modal-input-item-wrapper" key={aDir} onClick={() => handleDirectPath(aDir)}>
                                                <div className="select-input-modal-input-item">{aDir}</div>
                                                <span className="select-input-modal-input-item-split">/</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Modal.Header>
                        <Modal.Body>
                            <div className="select-input-modal-file-broswer">
                                <div className="select-input-modal-file-broswer-header">
                                    <span style={{ width: '48%', paddingLeft: '1.5rem' }}>Name</span>
                                    <span style={{ width: '32%' }}>Last modified</span>
                                    <span style={{ width: '20%' }}>Size</span>
                                </div>
                                <div className="select-input-modal-file-broswer-content">
                                    {sFileList &&
                                        sFileList.map((aItem, aIdx) => {
                                            return (
                                                <div
                                                    key={aItem.name + aIdx}
                                                    className={`row ${sSelectedFile && sSelectedFile === aItem.name ? 'selected' : ''}`}
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
                            <div className="select-input-modal-button-group">
                                <TextButton pText="OK" pBackgroundColor="#4199ff" onClick={handleSave} />
                                <div style={{ width: '10px' }}></div>
                                <TextButton pText="Cancel" pBackgroundColor="#666979" onClick={() => setOpen(false)} />
                            </div>
                        </Modal.Footer>
                    </Modal>
                </div>
            )}
        </div>
    );
};
