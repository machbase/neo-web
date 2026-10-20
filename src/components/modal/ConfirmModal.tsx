import React from 'react';
import { VscQuestion } from 'react-icons/vsc';
import { Modal } from '@/design-system/components';

export interface DeleteModalProps {
    'data-testid'?: string;
    setIsOpen: (isOpen: boolean) => void;
    pContents: React.ReactNode;
    pCallback: () => void;
    pIsDarkMode?: boolean;
    pState?: boolean;
}

export const ConfirmModal = (props: DeleteModalProps) => {
    const { setIsOpen, pContents, pCallback, pState, 'data-testid': testId } = props;

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleCallback = () => {
        pCallback();
    };

    return (
        <Modal.Root isOpen={true} onClose={handleClose} data-testid={testId}>
            <Modal.Header>
                <Modal.Title>
                    <VscQuestion />
                    <span>Confirm</span>
                </Modal.Title>
                <Modal.Close data-testid="close" />
            </Modal.Header>
            <Modal.Body>
                <div>{pContents}</div>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm data-testid="confirm" loading={pState} onClick={handleCallback}>
                    OK
                </Modal.Confirm>
                <Modal.Cancel data-testid="cancel" autoFocus onClick={handleClose}>
                    Cancel
                </Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
