import { useRecoilValue } from 'recoil';
import { gRecentDirectory } from '@/recoil/fileTree';
import { BsGit, Close } from '@/assets/icons/Icon';
import { TextButton } from '../buttons/TextButton';
import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';

import './FolderModal.scss';
import { postFileList } from '@/api/repository/api';
import useDebounce from '@/hooks/useDebounce';

export interface FolderModalProps {
    setIsOpen: any;
    pIsGit: boolean;
    pIsDarkMode?: boolean;
    pCallback: () => void;
}

export const FolderModal = (props: FolderModalProps) => {
    const { setIsOpen, pIsDarkMode, pIsGit, pCallback } = props;
    const [sFolderName, setFolderName] = useState<string>('');
    const [sGitUrl, setGitUrl] = useState<string>('');
    const sRecentDirectory = useRecoilValue(gRecentDirectory);
    const [sFolderPath, setFolderPath] = useState<string>('');
    const sGitUrlRef: any = useRef(null);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleSave = async () => {
        if (!sFolderName) return;
        let sPath = '';
        const sDirectoryList = (sRecentDirectory as string).split('/').filter((aDir: string) => aDir);
        let sPayload: any = {};

        if (sDirectoryList.length > 0) {
            sPath = sDirectoryList.join('/') + '/' + sFolderName;
        } else sPath = sFolderName;

        if (pIsGit) {
            if (sGitUrl) sPayload = { url: sGitUrl, command: 'clone' };
            else sPayload = undefined;
        } else {
            sPayload = undefined;
        }

        const sResult: any = await postFileList(sPayload, sPath, '');
        if (sResult && sResult.success) {
            pCallback();
            handleClose();
        } else {
            console.error('');
        }
    };

    const handleFoldername = () => {
        if (!sGitUrl) return;
        if (sFolderName) return;
        const sPathList = sGitUrl.split('/');
        if (sPathList.length <= 0) return;
        setFolderName(sPathList[sPathList.length - 1].split('.')[0]);
    };

    useDebounce(sGitUrlRef, [sGitUrl], handleFoldername);

    useEffect(() => {
        if (setIsOpen) {
            setFolderPath(sRecentDirectory as string);
        }
    }, [setIsOpen]);

    return (
        <div className="FolderModal">
            <Modal pIsDarkMode={pIsDarkMode} onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="title">
                        <div className="title-content">
                            <span>{pIsGit ? 'Git Clone' : 'New Folder'}</span>
                        </div>
                        <Close onClick={handleClose} />
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className={`${pIsDarkMode ? 'folder-dark' : 'folder'}`}>
                        <div className={`folder-${pIsDarkMode ? 'dark-' : ''}header`}>{sFolderName && sFolderName.length > 0 ? sFolderPath + sFolderName + '/' : sFolderPath}</div>
                        <div className={`folder-${pIsDarkMode ? 'dark-' : ''}content`}>
                            {pIsGit ? (
                                <div className={`folder-${pIsDarkMode ? 'dark-' : ''}content-url`}>
                                    <div className={`folder-${pIsDarkMode ? 'dark-' : ''}content-url-wrap`}>
                                        <BsGit />
                                        <span>Url</span>
                                    </div>
                                    <div className={`input-wrapper ${pIsDarkMode ? 'input-wrapper-dark' : ''}`}>
                                        <input ref={sGitUrlRef} onChange={(e: any) => setGitUrl(e.target.value)} value={sGitUrl} />
                                    </div>
                                </div>
                            ) : null}
                            <div className={`folder-${pIsDarkMode ? 'dark-' : ''}content-name`}>
                                <div className={`folder-${pIsDarkMode ? 'dark-' : ''}content-name-wrap`}>
                                    <span>Name</span>
                                </div>
                                <div className={`input-wrapper ${pIsDarkMode ? 'input-wrapper-dark' : ''}`}>
                                    <input onChange={(e: any) => setFolderName(e.target.value)} value={sFolderName} />
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="button-group">
                        <TextButton pText="OK" pBackgroundColor="#4199ff" pIsDisabled={pIsGit ? !sFolderName || !sGitUrl : !sFolderName} onClick={handleSave} />
                        <div style={{ width: '10px' }}></div>
                        <TextButton pText="Cancel" pBackgroundColor="#666979" onClick={handleClose} />
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
};