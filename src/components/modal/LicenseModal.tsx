import { getLicense, postLicense } from '@/api/repository/api';
import { Modal, Button } from '@/design-system/components';
import { useEffect, useState } from 'react';
import { Key } from '@/assets/icons/Icon';
import './LicenseModal.scss';

export interface LicenseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LicenseModal = (props: LicenseModalProps) => {
    const { isOpen, onClose } = props;
    const [sLicense, setLicense] = useState<any>();

    useEffect(() => {
        if (isOpen) {
            getLicenseData();
        }
    }, [isOpen]);

    const getLicenseData = async () => {
        const sResult: any = await getLicense();
        if (sResult.success) {
            setLicense(sResult.data);
        }
    };

    const onUploadLicense = async (aEvent: React.ChangeEvent<HTMLInputElement>) => {
        const sFormData: FormData = new FormData();
        const sInputEl = aEvent.target as HTMLInputElement;

        if (sInputEl.files !== null) {
            sFormData.append('license.dat', sInputEl.files[0]);

            const sResult: any = await postLicense(sFormData);

            if (sResult.success) {
                setLicense(sResult.data);
            } else {
                if (sResult.data.reason.indexOf('token') !== -1) onClose();
            }
        } else {
            console.error('files is null');
        }
    };

    return (
        <Modal.Root isOpen={isOpen} onClose={onClose}>
            <Modal.Header>
                <Modal.Title>
                    <Key />
                    <span>License</span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>

            <Modal.Body className="license-modal-body">
                <Modal.Content>
                    <div className="license-modal-content">
                        <div>Type</div>
                        <div>{sLicense?.type}</div>
                    </div>
                </Modal.Content>
                <Modal.Content>
                    <div className="license-modal-content">
                        <div>Customer</div>
                        <div>{sLicense?.customer}</div>
                    </div>
                </Modal.Content>
                <Modal.Content>
                    <div className="license-modal-content">
                        <div>Country Code</div>
                        <div>{sLicense?.countryCode}</div>
                    </div>
                </Modal.Content>
                <Modal.Content>
                    <div className="license-modal-content">
                        <div>Project</div>
                        <div>{sLicense?.project}</div>
                    </div>
                </Modal.Content>
                <Modal.Content>
                    <div className="license-modal-content">
                        <div>Install Date</div>
                        <div>{sLicense?.installDate}</div>
                    </div>
                </Modal.Content>
                <Modal.Content>
                    <div className="license-modal-content">
                        <div>License Status</div>
                        <div>{sLicense?.licenseStatus}</div>
                    </div>
                </Modal.Content>
            </Modal.Body>

            <Modal.Footer className="license-modal-footer">
                <Button variant="secondary">
                    <div className="license-modal-register">
                        <label htmlFor="license-register">Register License...</label>
                        <input id="license-register" type="file" onChange={onUploadLicense} />
                    </div>
                </Button>
                <Modal.Cancel onClick={onClose}>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
