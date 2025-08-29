import { useRecoilValue } from 'recoil';
import { gRecentDirectory } from '@/recoil/fileTree';
import { Close } from '@/assets/icons/Icon';
import { TextButton } from '../buttons/TextButton';
import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import './UrlDownloadModal.scss';
import { postFileList } from '@/api/repository/api';
import { FileType } from '@/utils/FileExtansion';
import { getFileNameAndExtension } from '@/utils/fileNameUtils';

export interface FolderModalProps {
    setIsOpen: any;
    pCallback: () => void;
}

export const UrlDownloadModal = (props: FolderModalProps) => {
    const { setIsOpen, pCallback } = props;
    const [sDownloadUrl, setDownloadUrl] = useState<string>('');
    const sRecentDirectory = useRecoilValue(gRecentDirectory);
    const [sFolderPath, setFolderPath] = useState<string>('');
    const [sIsLoad, setIsLoad] = useState<boolean>(false);
    const sInputRef = useRef<HTMLInputElement>(null);
    // const [sValResult, setValResut] = useState<boolean>(true);

    const handleClose = () => {
        setIsOpen(false);
    };

    // check extension
    const CheckAllowExtension = (aExtension: string) => {
        if (FileType.some((aType) => aType === aExtension)) {
            return true;
        } else {
            return false;
        }
    };

    const handleSave = async () => {
        if (!sFolderPath) return;
        if (!sDownloadUrl) return;
        setIsLoad(() => true);

        const fullFileName = sDownloadUrl.split('/').at(-1) as string;
        const { fileName, extension } = getFileNameAndExtension(fullFileName);
        const sIsAllowExtension = CheckAllowExtension(extension.toLowerCase());
        const sDownloadRes = await fetch(sDownloadUrl);
        let sPayload: any = undefined;

        // sql | tql | taz | dsh | wrk | json | csv | md | txt
        if (!sIsAllowExtension) return setIsLoad(() => false);

        if (sDownloadRes.status === 200) {
            switch (extension.toLowerCase()) {
                case 'sql':
                case 'tql':
                case 'md':
                case 'csv':
                case 'txt':
                    sPayload = await sDownloadRes.text();
                    break;
                default:
                    sPayload = await sDownloadRes.json();
                    break;
            }
            const sResult: any = await postFileList(sPayload, sRecentDirectory, `${fileName}.${extension}`);
            if (sResult && sResult.success) {
                setIsLoad(() => false);
                pCallback();
                handleClose();
            } else {
                setIsLoad(() => false);
                // setValResut(false);
            }
        } else {
            console.error('error', sDownloadRes);
        }
        setIsLoad(() => false);
    };

    const pathHandler = (e: any) => {
        setDownloadUrl(e.target.value);
    };

    useEffect(() => {
        if (sInputRef && sInputRef.current) {
            sInputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (setIsOpen) {
            setFolderPath(sRecentDirectory as string);
        }
    }, [setIsOpen]);

    return (
        <div className="urldownloadModal">
            <Modal pIsDarkMode onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="title">
                        <div className="title-content">
                            <span>Url Download</span>
                        </div>
                        <Close onClick={handleClose} />
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className={`url-download-body`}>
                        <div className={`url-download-body-header`}>{sFolderPath}</div>
                        <div className={`url-download-body-content`}>
                            <div className={`url-download-body-content-name`}>
                                <div className={`url-download-body-content-name-wrap`}>
                                    <span>Url</span>
                                </div>
                                <div className={`input-wrapper input-wrapper-dark`}>
                                    <input ref={sInputRef} onChange={pathHandler} value={sDownloadUrl} />
                                </div>
                                {/* {sValResult ? null : (
                                    <div className={`folder-${pIsDarkMode ? 'dark-' : ''}val-result-false`}> {`* Please check ${pIsGit ? 'url,' : ''} name and path.`}</div>
                                )} */}
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="button-group">
                        <TextButton pText="OK" pBackgroundColor="#4199ff" pIsDisabled={!sDownloadUrl || sIsLoad} onClick={handleSave} />
                        <div style={{ width: '10px' }}></div>
                        <TextButton pText="Cancel" pBackgroundColor="#666979" pIsDisabled={sIsLoad} onClick={handleClose} />
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
