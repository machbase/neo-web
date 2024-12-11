import './EulaModal.scss';
import { Modal } from '@/components/modal/Modal';
import { SetStateAction, useEffect,  useState } from 'react';
import { Close, Key, VscWarning } from '@/assets/icons/Icon';
import { TextButton } from '../buttons/TextButton';
import useEsc from '@/hooks/useEsc';
import { apiGetEula, apiPostEulaAccept } from '@/api/repository/api';
import { getLogin } from '@/api/repository/login';
import { useSetRecoilState } from 'recoil';
import { gLicense } from '@/recoil/recoil';

export interface modalProps {
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const EulaModal = ({ set }: { set: React.Dispatch<SetStateAction<boolean>> }) => {
    const [svrState, setSvrState] = useState<boolean>(false);
    const [sEulaInfo, setEulaInfo] = useState<string>('');
    const [sErrMsg, setErrMsg] = useState<string | undefined>(undefined);
    const setLicense = useSetRecoilState(gLicense)
    
    const handleAccept = async () => {
        setSvrState(() => true);
        setErrMsg(undefined);
        const svrRes: any = await apiPostEulaAccept();
        if (svrRes && svrRes?.success) {
            const svrCheck: any = await getLogin();
            if (svrCheck && svrCheck?.success) {
                setLicense((prev: any) => { return {...prev, eulaRequired: svrCheck?.eulaRequired}})
                setErrMsg(undefined)
                set(() => false);
            } else setErrMsg(svrCheck?.data ? (svrCheck as any).data?.reason : (svrCheck?.statusText as string));
        } else setErrMsg(svrRes?.data ? (svrRes as any).data?.reason : (svrRes?.statusText as string));
        setSvrState(() => false);
    }
    const init = async () => {
        const res: any = await apiGetEula();
        if ((res) && typeof res  === 'string') {
            setEulaInfo(res)
        }
    }

    useEffect(() => {
        init()
    }, [])
    useEsc(() => set && set(false));

    return (
        <div className="eula-license-modal">
            <Modal pIsDarkMode onOutSideClose={() => set(false)}>
                <div className="eula-license-modal-header">
                    <div className="title">
                        <Key />
                        <span>LICENSE</span>
                    </div>
                    <Close style={{ cursor: 'pointer' }} onClick={() => set(false)} />
                </div>
                <div className="eula-license-modal-body-wrap">
                    <div className='eula-license-modal-body'>
                        <pre>{sEulaInfo}</pre>
                    </div>
                </div>
               {sErrMsg && <div className='res-err'>
                    <VscWarning style={{ fill: '#ff5353' }} />
                    <span className="res-err-text">{sErrMsg ?? ''}</span>
                </div>}
                <div className="eula-license-modal-footer">
                    <TextButton pIsLoad={svrState} pWidth={120} pHeight={40} pText="Agree" pBackgroundColor="#005fb8" onClick={handleAccept} />
                    <TextButton pWidth={120} pHeight={40} pText="Decline" pBackgroundColor="#ff4747" onClick={() => set(false)} />
                </div>
            </Modal>
        </div>
    );
};
