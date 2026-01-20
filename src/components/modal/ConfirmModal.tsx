import React from 'react';
import { VscQuestion } from 'react-icons/vsc';
import { Modal } from '@/design-system/components';

export interface DeleteModalProps {
    setIsOpen: (isOpen: boolean) => void;
    pContents: React.ReactNode;
    pCallback: () => void;
    pIsDarkMode?: boolean;
    pState?: boolean;
}

export const ConfirmModal = (props: DeleteModalProps) => {
    const { setIsOpen, pContents, pCallback, pState } = props;

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleCallback = () => {
        pCallback();
    };

    return (
        <Modal.Root isOpen={true} onClose={handleClose}>
            <Modal.Header>
                <Modal.Title>
                    <VscQuestion />
                    <span>Confirm</span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <div>{pContents}</div>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm loading={pState} onClick={handleCallback}>
                    OK
                </Modal.Confirm>
                <Modal.Cancel autoFocus onClick={handleClose}>
                    Cancel
                </Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
