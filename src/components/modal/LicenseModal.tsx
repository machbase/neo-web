import { getLicense, postLicense } from '@/api/repository/api';
import { Modal } from '@/components/modal/Modal';
import './LicenseModal.scss';
import { useEffect, useState } from 'react';
import { Close, Key } from '@/assets/icons/Icon';
import { TextButton } from '../buttons/TextButton';
import useEsc from '@/hooks/useEsc';

export interface LicenseModalProps {
    pIsDarkMode: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const LicenseModal = (props: LicenseModalProps) => {
    const { pIsDarkMode, setIsOpen } = props;
    const [sLicense, setLicense] = useState<any>();

    useEffect(() => {
        getLicenseData();
    }, []);

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
                if (sResult.data.reason.indexOf('token') !== -1) setIsOpen(false);
            }
        } else {
            console.error('files is null');
        }
    };

    useEsc(() => setIsOpen && setIsOpen(false));

    return (
        <div className="license-modal">
            <Modal pIsDarkMode={pIsDarkMode} className="license-modal-wh" onOutSideClose={() => setIsOpen(false)}>
                <Modal.Header>
                    <div className="license-modal-header">
                        <div className="title">
                            <Key />
                            <span>License</span>
                        </div>
                        <Close style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)} />
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className="license-modal-body">
                        <div className="content">
                            <div>Type</div>
                            <div>{sLicense?.type}</div>
                        </div>
                        <div className="content">
                            <div>Customer</div>
                            <div>{sLicense?.customer}</div>
                        </div>
                        <div className="content">
                            <div>Conntry Code</div>
                            <div>{sLicense?.countryCode}</div>
                        </div>
                        <div className="content">
                            <div>Project</div>
                            <div>{sLicense?.project}</div>
                        </div>
                        <div className="content">
                            <div>install Date</div>
                            <div>{sLicense?.installDate}</div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="license-modal-footer">
                        <div className="register">
                            <label htmlFor="license-register">Register License...</label>
                            <input id="license-register" type="file" onChange={onUploadLicense} />
                        </div>
                        <TextButton pWidth={120} pHeight={40} pText="Close" pBackgroundColor="#666979" onClick={() => setIsOpen(false)} />
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
