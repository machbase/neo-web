import { useRecoilState, useRecoilValue } from 'recoil';
import { gFileTree, gRecentDirectory } from '@/recoil/fileTree';
import { BsGit, Close } from '@/assets/icons/Icon';
import { TextButton } from '../buttons/TextButton';
import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';

import { postFileList } from '@/api/repository/api';
import useDebounce from '@/hooks/useDebounce';
import { FileNameValidator } from '@/utils/FileExtansion';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import './FolderModal.scss';

export interface FolderModalProps {
    setIsOpen: any;
    pIsGit: boolean;
    pIsDarkMode?: boolean;
}

export const FolderModal = (props: FolderModalProps) => {
    const { setIsOpen, pIsDarkMode, pIsGit } = props;
    const [sGitUrl, setGitUrl] = useState<string>('');
    const [sIsLoad, setIsLoad] = useState<boolean>(false);
    const sRecentDirectory = useRecoilValue(gRecentDirectory);
    const [sFolderPath, setFolderPath] = useState<string>(sRecentDirectory ?? '/');
    const sGitUrlRef: any = useRef(null);
    const sInputRef = useRef<HTMLInputElement>(null);
    const [sValResult, setValResut] = useState<boolean>(true);
    const [sFileTree, setFileTree] = useRecoilState(gFileTree);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleSave = async () => {
        if (sIsLoad) return;
        if (!sFolderPath) return;
        let sPayload: any = {};
        setIsLoad(true);
        if (pIsGit) {
            if (sGitUrl) sPayload = { url: sGitUrl, command: 'clone' };
            else sPayload = undefined;
        } else {
            sPayload = undefined;
        }
        const sResult: any = await postFileList(sPayload, sFolderPath, '');
        if (sResult && sResult.success) {
            setValResut(true);
            const sDrillRes = await TreeFetchDrilling(sFileTree, sFolderPath);
            setFileTree(JSON.parse(JSON.stringify(sDrillRes.tree)));
            setValResut(true);
            handleClose();
        } else {
            setValResut(false);
        }
        setIsLoad(false);
    };

    const handleFoldername = () => {
        if (!sGitUrl) return;
        const sPathList = sGitUrl.split('/');
        if (sPathList.length <= 0) return;
        const folderName = sPathList[sPathList.length - 1];
        setFolderPath('/' + (folderName.endsWith('.git') ? folderName.slice(0, -4) : folderName));
    };

    const pathHandler = (e: any) => {
        if (e.target.value === '') return setFolderPath('/');
        if (!e.nativeEvent.data && sFolderPath === '/') return;
        if (!e.target.value.split('/').every((aV: string) => FileNameValidator(aV))) return;
        if (e.target.value[0] !== '/') return;
        if (e.target.value.includes('//')) return;
        setFolderPath(e.target.value);
    };

    const handleEnter = (e: any) => {
        if (!sFolderPath) return;
        if (e.code === 'Enter') {
            handleSave();
            e.stopPropagation();
        }
    };

    useEffect(() => {
        if (pIsGit) {
            if (sGitUrlRef && sGitUrlRef.current) {
                sGitUrlRef.current.focus();
            }
        } else {
            if (sInputRef && sInputRef.current) {
                sInputRef.current.focus();
            }
        }
    }, []);

    const isFormDisabled = (): boolean => {
        if (pIsGit && !sGitUrl) return true;
        if (!sFolderPath) return true;
        if (sFolderPath === '/') return true;
        return false;
    };

    useDebounce([sGitUrl], handleFoldername);

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
                        <div className={`folder-${pIsDarkMode ? 'dark-' : ''}header`}>{sFolderPath}</div>
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
                                    <input ref={sInputRef} onChange={pathHandler} value={sFolderPath} onKeyDown={handleEnter} />
                                </div>
                                {sValResult ? null : (
                                    <div className={`folder-${pIsDarkMode ? 'dark-' : ''}val-result-false`}> {`* Please check ${pIsGit ? 'url,' : ''} name and path.`}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="button-group">
                        <TextButton pText="OK" pBackgroundColor="#4199ff" pIsLoad={sIsLoad} pIsDisabled={isFormDisabled()} onClick={handleSave} />
                        <div style={{ width: '10px' }}></div>
                        <TextButton pText="Cancel" pBackgroundColor="#666979" onClick={handleClose} />
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
