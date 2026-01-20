import { SetStateAction, useEffect, useState } from 'react';
import { Key } from '@/assets/icons/Icon';
import { apiGetEula, apiPostEulaAccept } from '@/api/repository/api';
import { getLogin } from '@/api/repository/login';
import { useSetRecoilState } from 'recoil';
import { gLicense } from '@/recoil/recoil';
import { Alert, Modal, Button } from '@/design-system/components';

export interface modalProps {
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const EulaModal = ({ set }: { set: React.Dispatch<SetStateAction<boolean>> }) => {
    const [svrState, setSvrState] = useState<boolean>(false);
    const [sEulaInfo, setEulaInfo] = useState<string>('');
    const [sErrMsg, setErrMsg] = useState<string | undefined>(undefined);
    const setLicense = useSetRecoilState(gLicense);

    const handleAccept = async () => {
        setSvrState(() => true);
        setErrMsg(undefined);
        const svrRes: any = await apiPostEulaAccept();
        if (svrRes && svrRes?.success) {
            const svrCheck: any = await getLogin();
            if (svrCheck && svrCheck?.success) {
                setLicense((prev: any) => {
                    return { ...prev, eulaRequired: svrCheck?.eulaRequired };
                });
                setErrMsg(undefined);
                set(() => false);
            } else setErrMsg(svrCheck?.data ? (svrCheck as any).data?.reason : (svrCheck?.statusText as string));
        } else setErrMsg(svrRes?.data ? (svrRes as any).data?.reason : (svrRes?.statusText as string));
        setSvrState(() => false);
    };

    const init = async () => {
        const res: any = await apiGetEula();
        if (res && typeof res === 'string') {
            setEulaInfo(res);
        }
    };

    useEffect(() => {
        init();
    }, []);

    return (
        <Modal.Root isOpen={true} onClose={() => set(false)} closeOnEscape closeOnOutsideClick style={{ minHeight: '80vh', maxHeight: '80vh' }}>
            <Modal.Header>
                <Modal.Title>
                    <Key />
                    <span>LICENSE</span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '600px', overflowY: 'auto', fontSize: '14px' }}>
                <pre>{sEulaInfo}</pre>
            </Modal.Body>
            {sErrMsg && (
                <div style={{ paddingTop: '16px' }}>
                    <Alert variant="warning" message={sErrMsg ?? ''} />
                </div>
            )}
            <Modal.Footer>
                <Button variant="primary" onClick={handleAccept} loading={svrState}>
                    Agree
                </Button>
                <Button variant="danger" onClick={() => set(false)}>
                    Decline
                </Button>
            </Modal.Footer>
        </Modal.Root>
    );
};
