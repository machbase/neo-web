import useEsc from '@/hooks/useEsc';
import { Modal } from '@/components/modal/Modal';
import { RiLockPasswordLine } from 'react-icons/ri';
import { Close } from '@/assets/icons/Icon';
import { decodeJwt } from '@/utils';
import { VscEye, VscEyeClosed, VscWarning } from 'react-icons/vsc';
import { useRef, useState } from 'react';
import { changePwd } from '@/api/repository/login';
import './index.scss';

export const Password = ({ setIsOpen }: { setIsOpen: (aState: boolean) => void }) => {
    const sCurrentUserName = decodeJwt(JSON.stringify(localStorage.getItem('accessToken'))).sub.toUpperCase();
    const [sNewPassword, setNewPassword] = useState<string>('');
    const [sConfirmPassword, setConfirmPassword] = useState<string>('');
    const [sRes, setRes] = useState<any>(undefined);
    const sRef = useRef(null);

    const handleChange = async () => {
        if (sNewPassword !== sConfirmPassword) return;
        if (!sCurrentUserName) return;
        const sPwdRes = await changePwd(sCurrentUserName, sNewPassword);
        const sParsedRes = sPwdRes?.data ? sPwdRes.data : sPwdRes;
        setRes(sParsedRes);

        if (sParsedRes.success) {
            const test = setTimeout(() => {
                setIsOpen(false);
                clearTimeout(test);
            }, 1000);
        }
    };

    useEsc(() => setIsOpen && setIsOpen(false));

    return (
        <div className="change-password-wrapper">
            <div ref={sRef} style={{ display: 'flex' }}>
                <Modal pIsDarkMode className="change-password-modal" onOutSideClose={() => setIsOpen(false)}>
                    {sRes && sRes.success && (
                        <div className="res-success">
                            <span>{sRes.reason}</span>
                        </div>
                    )}
                    <Modal.Header>
                        <div className="change-password-modal-header">
                            <div className="title">
                                <RiLockPasswordLine />
                                <span className="text">Change password</span>
                            </div>
                            <Close style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)} />
                        </div>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="change-password-modal-body">
                            <div className="content-user-name">
                                <div>{sCurrentUserName}</div>
                            </div>
                            <PasswordForm pTitle="New password:" pCallback={setNewPassword} pFocus />
                            <PasswordForm pTitle="Confirm password:" pCallback={setConfirmPassword} />

                            {sRes && !sRes.success && (
                                <div className="res-err">
                                    <VscWarning style={{ fill: 'rgb(236 118 118)' }} />
                                    <span className="res-err-text">{sRes.reason}</span>
                                </div>
                            )}
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <div className="change-password-modal-footer">
                            <button onClick={handleChange}>Change password</button>
                        </div>
                    </Modal.Footer>
                </Modal>
            </div>
        </div>
    );
};

const PasswordForm = ({ pTitle, pCallback, pFocus = false }: { pTitle: string; pCallback: (aText: string) => void; pFocus?: boolean }) => {
    const [sState, setState] = useState<boolean>(false);

    const handleText = (e: any) => {
        pCallback(e.target.value);
    };

    return (
        <div className="content">
            <div className="title">{pTitle}</div>
            <div className="item-wrapper">
                <input autoFocus={pFocus} onChange={handleText} type={sState ? 'text' : 'password'} style={{ imeMode: 'inactive' }} />
                <button className={sState ? 'btn-active' : 'btn-none'} onClick={() => setState(!sState)}>
                    {sState && <VscEye />}
                    {!sState && <VscEyeClosed />}
                </button>
            </div>
        </div>
    );
};
