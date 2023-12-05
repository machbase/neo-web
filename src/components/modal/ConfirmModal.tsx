import { Close, VscWarning } from '@/assets/icons/Icon';
import { TextButton } from '@/components/buttons/TextButton';
import Modal from './Modal';
import './ConfirmModal.scss';

export interface DeleteModalProps {
    setIsOpen: any;
    pIsDarkMode?: boolean;
    pCallback: () => void;
}

export const ConfirmModal = (props: DeleteModalProps) => {
    const { setIsOpen, pIsDarkMode, pCallback } = props;

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
                                <VscWarning />
                            </div>
                            <span>Warning</span>
                        </div>
                        <Close className="close" onClick={handleClose} />
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className="body">
                        <div className="body-content">There are contents that have not been applied.</div>
                        <div className="body-content">Are you sure you want to save it?</div>
                    </div>
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
