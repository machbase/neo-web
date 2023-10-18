import { useState } from 'react';
import { Close, VscWarning } from '@/assets/icons/Icon';
import { TextButton } from '@/components/buttons/TextButton';
import { FileTreeType, FileType } from '@/utils/fileTreeParser';
import { gDeleteFileList } from '@/recoil/fileTree';
import { useRecoilState } from 'recoil';
import Modal from './Modal';
import './DeleteModal.scss';

export interface DeleteModalProps {
    setIsOpen: any;
    pIsDarkMode?: boolean;
    pFileInfo?: FileType | FileTreeType;
    pCallback: (isBool: boolean) => void;
}

export const DeleteModal = (props: DeleteModalProps) => {
    const { setIsOpen, pIsDarkMode, pFileInfo, pCallback } = props;
    const [sIsRecursive, setIsRecursive] = useState<boolean>(false);
    const [sDeleteFileList] = useRecoilState(gDeleteFileList);
    let sIsFile = (pFileInfo as any).dirs ? false : true;

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleDelete = (aBool: boolean) => {
        pCallback(aBool);
    };

    const getDeleteFileName = () => {
        const sNameList: string[] = [];

        if (sDeleteFileList && (sDeleteFileList as any).length > 0) {
            let sDupFile: boolean = false;
            (sDeleteFileList as any).map((dFile: any) => {
                if (dFile === pFileInfo) sDupFile = true;
                if (dFile.type === 1) sIsFile = false;
                sNameList.push(dFile.name);
            });
            if (!sDupFile) {
                sNameList.push((pFileInfo as any).name);
            }
        }
        return <div style={{ display: 'flex', textAlign: 'center' }}>{sNameList.length > 0 ? sNameList.join(', ') : pFileInfo?.name}?</div>;
    };

    return (
        <div className="DeleteModal">
            <Modal pIsDarkMode={pIsDarkMode} onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="title">
                        <div className="title-content">
                            <div className="title-icon">
                                <VscWarning />
                            </div>
                            <span>Delete</span>
                        </div>
                        <Close className="close" onClick={handleClose} />
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className="body">
                        <div className="body-content">
                            Do you want to delete this {sIsFile ? 'file' : 'folder'}
                            {getDeleteFileName()}
                        </div>
                        {!sIsFile ? (
                            <>
                                <div style={{ height: '10px' }} />
                                <div className="body-content">
                                    <span>
                                        <input id="fileCheck" type="checkbox" onChange={() => setIsRecursive((prev) => !prev)} />
                                        <label className="label" htmlFor="fileCheck">
                                            Recursive delete directory
                                        </label>
                                    </span>
                                </div>
                            </>
                        ) : null}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="button-group">
                        <TextButton pText="OK" pBackgroundColor="#4199ff" onClick={() => handleDelete(sIsRecursive)} />
                        <div style={{ width: '10px' }}></div>
                        <TextButton pText="Cancel" pBackgroundColor="#666979" onClick={handleClose} />
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
