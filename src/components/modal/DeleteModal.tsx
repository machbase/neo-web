import { useState } from 'react';
import { Close, VscWarning } from '@/assets/icons/Icon';
import { TextButton } from '@/components/buttons/TextButton';
import { FileTreeType, FileType } from '@/utils/fileTreeParser';
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
    const sIsFile = (pFileInfo as any).dirs ? false : true;
    const [sIsRecursive, setIsRecursive] = useState<boolean>(false);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleDelete = (aBool: boolean) => {
        pCallback(aBool);
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
                            Do you want to delete this {sIsFile ? 'file' : 'folder'} {pFileInfo?.name}?
                        </div>
                        {!sIsFile ? (
                            <>
                                <div style={{ height: '10px' }} />
                                <div className="body-content">
                                    <input id="fileCheck" type="checkbox" onChange={() => setIsRecursive((prev) => !prev)} />
                                    <label className="label" htmlFor="fileCheck">
                                        Recursive delete directory
                                    </label>
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
