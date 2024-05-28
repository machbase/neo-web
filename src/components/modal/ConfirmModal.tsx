import { Close } from '@/assets/icons/Icon';
import { TextButton } from '@/components/buttons/TextButton';
import Modal from './Modal';
import './ConfirmModal.scss';
import React from 'react';
import { VscQuestion } from 'react-icons/vsc';

export interface DeleteModalProps {
    setIsOpen: any;
    pContents: React.ReactNode;
    pCallback: () => void;
    pIsDarkMode?: boolean;
}

export const ConfirmModal = (props: DeleteModalProps) => {
    const { setIsOpen, pIsDarkMode, pContents, pCallback } = props;

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleCallback = () => {
        pCallback();
    };

    return (
        <div className="confirm-modal">
            <Modal pIsDarkMode={pIsDarkMode} onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="confirm-modal-title">
                        <div className="confirm-modal-title-content">
                            <div className="confirm-modal-title-icon">
                                <VscQuestion />
                            </div>
                            <span>Confirm</span>
                        </div>
                        <Close className="close" onClick={handleClose} />
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className="body">{pContents}</div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="button-group">
                        <TextButton pText="OK" pBackgroundColor="#4199ff" onClick={() => handleCallback()} />
                        <div style={{ width: '10px' }}></div>
                        <TextButton pText="Cancel" pBackgroundColor="#666979" onClick={handleClose} />
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
