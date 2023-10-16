import { useRecoilValue } from 'recoil';
import { gRecentDirectory } from '@/recoil/fileTree';
import { Close } from '@/assets/icons/Icon';
import { TextButton } from '../buttons/TextButton';
import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';

import './FileModal.scss';
import { postFileList } from '@/api/repository/api';
import useDebounce from '@/hooks/useDebounce';
import { FileTazDfltVal, FileTypeValidator, FileWrkDfltVal } from '@/utils/FileExtansion';

export interface FileModalProps {
    setIsOpen: any;
    pIsDarkMode?: boolean;
    pCallback: () => void;
}

export const FileModal = (props: FileModalProps) => {
    const { setIsOpen, pIsDarkMode, pCallback } = props;
    const [sFileName, setFileName] = useState<string>('');
    const sRecentDirectory = useRecoilValue(gRecentDirectory);
    const [sFilePath, setFilePath] = useState<string>('');
    const [sValResult, setValResut] = useState<boolean>(false);
    const sInputRef = useRef<HTMLInputElement>(null);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleSave = async () => {
        if (!sFileName) return;
        let sPath = '';
        const sDirectoryList = (sRecentDirectory as string).split('/').filter((aDir: string) => aDir);
        const fileName = sFileName.split('.');
        const parsedExtension = fileName[1].toLowerCase();
        let sPayload: any = undefined;

        if (sDirectoryList.length > 0) {
            sPath = sDirectoryList.join('/') + '/' + fileName[0] + '.' + parsedExtension;
        } else sPath = fileName[0] + '.' + parsedExtension;
        if (parsedExtension.includes('wrk')) sPayload = FileWrkDfltVal;
        if (parsedExtension.includes('taz')) sPayload = FileTazDfltVal;

        const sResult: any = await postFileList(sPayload, '', sPath);
        if (sResult && sResult.success) {
            pCallback();
            handleClose();
        } else {
            console.error('');
        }
    };

    const handlefileName = () => {
        setValResut(FileTypeValidator(sFileName.toLowerCase()));
    };

    const handleEnter = (e: any) => {
        if (!sValResult) return;
        if (e.code === 'Enter') {
            handleSave();
            e.stopPropagation();
        }
    };

    useDebounce([sFileName], handlefileName);

    useEffect(() => {
        if (setIsOpen) {
            setFilePath(sRecentDirectory as string);
        }
    }, [setIsOpen]);

    useEffect(() => {
        if (sInputRef && sInputRef.current) {
            sInputRef.current.focus();
        }
    }, []);

    return (
        <div className="fileModal">
            <Modal pIsDarkMode={pIsDarkMode} onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="title">
                        <div className="title-content">
                            <span>{'New File'}</span>
                        </div>
                        <Close onClick={handleClose} />
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className={`${pIsDarkMode ? 'file-dark' : 'file'}`}>
                        <div className={`file-${pIsDarkMode ? 'dark-' : ''}header`}>{sFileName && sFileName.length > 0 ? sFilePath + sFileName : sFilePath}</div>
                        <div className={`file-${pIsDarkMode ? 'dark-' : ''}content`}>
                            <div className={`file-${pIsDarkMode ? 'dark-' : ''}content-name`}>
                                <div className={`file-${pIsDarkMode ? 'dark-' : ''}content-name-wrap`}>
                                    <span>Name</span>
                                </div>
                                <div className={`input-wrapper ${pIsDarkMode ? 'input-wrapper-dark' : ''}`}>
                                    <input ref={sInputRef} onChange={(e: any) => setFileName(e.target.value)} value={sFileName} onKeyDown={handleEnter} />
                                </div>
                                {sValResult ? null : <div className={`file-${pIsDarkMode ? 'dark-' : ''}val-result-false`}> {'* Please check name.'}</div>}
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="button-group">
                        <TextButton pText="OK" pBackgroundColor="#4199ff" pIsDisabled={!sValResult} onClick={handleSave} />
                        <div style={{ width: '10px' }}></div>
                        <TextButton pText="Cancel" pBackgroundColor="#666979" onClick={handleClose} />
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
