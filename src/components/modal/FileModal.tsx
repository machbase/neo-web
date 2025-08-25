import { useRecoilState, useRecoilValue } from 'recoil';
import { gFileTree, gRecentDirectory } from '@/recoil/fileTree';
import { Close } from '@/assets/icons/Icon';
import { TextButton } from '../buttons/TextButton';
import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { postFileList } from '@/api/repository/api';
import useDebounce from '@/hooks/useDebounce';
import { FileNameAndExtensionValidator, FileTazDfltVal, FileDshDfltVal, FileWrkDfltVal, PathRootValidator } from '@/utils/FileExtansion';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import { getFileNameAndExtension } from '@/utils/fileNameUtils';
import './FileModal.scss';

export interface FileModalProps {
    setIsOpen: any;
    pIsDarkMode?: boolean;
}

export const FileModal = (props: FileModalProps) => {
    const { setIsOpen, pIsDarkMode } = props;
    const sRecentDirectory = useRecoilValue(gRecentDirectory);
    const [sFilePath, setFilePath] = useState<string>('');
    const [sValResult, setValResut] = useState<boolean>(true);
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);
    const sInputRef = useRef<HTMLInputElement>(null);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleSave = async () => {
        if (!sFilePath || sFilePath === '') return;
        const fullFileName = sFilePath.split('/').at(-1) as string;
        const { extension } = getFileNameAndExtension(fullFileName);
        const parsedExtension = extension.toLowerCase();
        let sPayload: any = undefined;

        if (parsedExtension.includes('wrk')) sPayload = FileWrkDfltVal;
        if (parsedExtension.includes('taz')) sPayload = FileTazDfltVal;
        if (parsedExtension.includes('dsh')) sPayload = FileDshDfltVal;

        const sResult: any = await postFileList(sPayload, '', sFilePath);
        if (sResult && sResult.success) {
            const sDrillRes = await TreeFetchDrilling(sFileTree, sFilePath, true);
            setFileTree(JSON.parse(JSON.stringify(sDrillRes.tree)));
            handleClose();
        } else {
            setValResut(false);
        }
    };

    const handlefileName = () => {
        setValResut(FileNameAndExtensionValidator((sFilePath.split('/').at(-1) as string).toLowerCase()));
    };

    const handleEnter = (e: any) => {
        if (!sValResult) return;
        if (e.code === 'Enter') {
            handleSave();
            e.stopPropagation();
        }
    };

    const pathHandler = (e: any) => {
        if (e.target.value === '') return setFilePath('/');
        if (!e.nativeEvent.data && sFilePath === '/') return;
        if (!PathRootValidator(e.target.value)) return;
        if (e.target.value[0] !== '/') return;

        setFilePath(e.target.value);
    };

    useDebounce([sFilePath], handlefileName);

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
                        <div className={`file-${pIsDarkMode ? 'dark-' : ''}header`}>{sFilePath}</div>
                        <div className={`file-${pIsDarkMode ? 'dark-' : ''}content`}>
                            <div className={`file-${pIsDarkMode ? 'dark-' : ''}content-name`}>
                                <div className={`file-${pIsDarkMode ? 'dark-' : ''}content-name-wrap`}>
                                    <span>Name</span>
                                </div>
                                <div className={`input-wrapper ${pIsDarkMode ? 'input-wrapper-dark' : ''}`}>
                                    <input ref={sInputRef} onChange={pathHandler} value={sFilePath} onKeyDown={handleEnter} />
                                </div>
                                {sValResult ? null : <div className={`file-${pIsDarkMode ? 'dark-' : ''}val-result-false`}> {'* Please check name and path.'}</div>}
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
