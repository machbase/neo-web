import { useRecoilState } from 'recoil';
import { gRecentDirectory } from '@/recoil/fileTree';
import { BsGit, Close } from '@/assets/icons/Icon';
import { TextButton } from '../buttons/TextButton';
import { useState, useEffect } from 'react';
import Modal from './Modal';

import './FolderModal.scss';
import { postFileList } from '@/api/repository/api';

export interface FolderModalProps {
    setIsOpen: any;
    pIsDarkMode?: boolean;
    pReName?: { isReName: boolean; curName: string };
}

export const FolderModal = (props: FolderModalProps) => {
    const { setIsOpen, pIsDarkMode, pReName } = props;
    const [sFolderName, setFolderName] = useState<string>('');
    const [sGitUrl, setGitUrl] = useState<string>('https://github.com/machbase/neo-samples.git');
    const [sRecentDirectory, setRecentDirectory] = useRecoilState(gRecentDirectory);
    const [sFolderPath, setFolderPath] = useState<string>('');

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

        // GIT
        if (sGitUrl) {
            sPayload = { url: sGitUrl };
            // const sRegUrl = new RegExp(/^http[s]?:\/\/github.com/i);
            // if (sGitUrl.includes('.git') && sRegUrl.test(sGitUrl)) {
            //     console.log('.git 도 포함');
            // }
            // if (!sGitUrl.includes('.git') && sRegUrl.test(sGitUrl)) {
            //     console.log('.git 은 미포함');
            // }
        } else {
            sPayload = {
                isDir: true,
                name: sFolderName,
            };
        }

        console.log('reuslt', sPath);
        console.log('payload', sPayload);
        const sResult = await postFileList(sPayload, sPath, '');
        console.log('post result', sResult);

        // postFileList
        // * GitCloneReq
        // { url: ''}

        // GIT URL EX
        // 1. https://github.com/machbase/neo-samples.git
        // 2. https://github.com/machbase/neo-samples

        // handleClose()
    };

    useEffect(() => {
        if (setIsOpen) {
            setFolderPath(sRecentDirectory as string);
            if (pReName) {
                console.log('rename');
            }
        }
    }, [setIsOpen]);

    return (
        <div className="FolderModal">
            <Modal pIsDarkMode={pIsDarkMode} onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="title">
                        <div className="title-content">
                            <span>New Folder</span>
                        </div>
                        <Close onClick={handleClose} />
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className={`${pIsDarkMode ? 'folder-dark' : 'folder'}`}>
                        <div className={`folder-${pIsDarkMode ? 'dark-' : ''}header`}>{sFolderPath}</div>
                        <div className={`folder-${pIsDarkMode ? 'dark-' : ''}content`}>
                            <div className={`folder-${pIsDarkMode ? 'dark-' : ''}content-name`}>
                                <div className={`folder-${pIsDarkMode ? 'dark-' : ''}content-name-wrap`}>
                                    <span>name</span>
                                </div>
                                <div className={`input-wrapper ${pIsDarkMode ? 'input-wrapper-dark' : ''}`}>
                                    <input onChange={(e: any) => setFolderName(e.target.value)} value={sFolderName} />
                                </div>
                            </div>
                            <div className={`folder-${pIsDarkMode ? 'dark-' : ''}content-url`}>
                                <div className={`folder-${pIsDarkMode ? 'dark-' : ''}content-url-wrap`}>
                                    <BsGit />
                                    <span>Clone</span>
                                </div>
                                <div className={`input-wrapper ${pIsDarkMode ? 'input-wrapper-dark' : ''}`}>
                                    <input onChange={(e: any) => setGitUrl(e.target.value)} value={sGitUrl} />
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="button-group">
                        <TextButton pText="OK" pBackgroundColor="#4199ff" pIsDisabled={!sFolderName} onClick={handleSave} />
                        <div style={{ width: '10px' }}></div>
                        <TextButton pText="Cancel" pBackgroundColor="#666979" onClick={handleClose} />
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
