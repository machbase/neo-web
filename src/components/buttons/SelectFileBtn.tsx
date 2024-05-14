import { useEffect, useState } from 'react';
import { ArrowLeft, Close, FolderOpen, TreeFolder } from '@/assets/icons/Icon';
import { TextButton } from './TextButton';
import { elapsedSize, elapsedTime } from '@/utils';
import { getFileList } from '@/api/repository/api';
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
        setOpen(false);
    };
    const handleSelectFile = (aItem: any) => {
        const currentPath = JSON.parse(JSON.stringify(sSelectedDir));
        switch (aItem.isDir) {
            case true:
                currentPath.push(aItem.name);
                setSelectedDir([...currentPath]);
                break;
            case false:
                setSelectedFile(aItem.name);
        }
    };
    const handleBackPath = () => {
        const currentPath = JSON.parse(JSON.stringify(sSelectedDir)).slice(0, sSelectedDir.length - 1);
        setSelectedDir([...currentPath]);
    };
    const initPathNFile = () => {
        setSelectedDir([]);
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
                                <div className={`select-input-modal-input-wrapper`}>{'/ ' + sSelectedDir.join(' / ')}</div>
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
                                                    onClick={() => handleSelectFile(aItem)}
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
