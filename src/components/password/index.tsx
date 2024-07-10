import useEsc from '@/hooks/useEsc';
import { Modal } from '@/components/modal/Modal';
import { RiLockPasswordLine } from 'react-icons/ri';
import { Close } from '@/assets/icons/Icon';
import { decodeJwt } from '@/utils';
import { VscEye, VscEyeClosed, VscWarning } from 'react-icons/vsc';
import { useEffect, useRef, useState } from 'react';
import { changePwd, getLogin } from '@/api/repository/login';
import { checkPwdPolicy, parsePwd } from './utils';
import './index.scss';

export const Password = ({ setIsOpen }: { setIsOpen: (aState: boolean) => void }) => {
    const [sCurrentUserName, setCurUserName] = useState<string>('');
    const [sNewPassword, setNewPassword] = useState<string>('');
    const [sConfirmPassword, setConfirmPassword] = useState<string>('');
    const [sPwdDiff, setPwdDiff] = useState<string | undefined>(undefined);
    const [sRes, setRes] = useState<any>(undefined);
    const sRef = useRef(null);
    const sConfirmPwdRef = useRef(null);
    const sChangeBtnRef = useRef(null);

    const handleChange = async () => {
        const sPolicyRes = checkPwdPolicy(sNewPassword, sConfirmPassword);
        if (sPolicyRes) return setPwdDiff(sPolicyRes);
        else setPwdDiff(undefined);

        // eslint-disable-next-line no-useless-escape
        const sParsedNewPwd = parsePwd(sNewPassword);
        const sPwdRes = await changePwd(sCurrentUserName, sParsedNewPwd);
        const sParsedRes = sPwdRes?.data ? sPwdRes.data : sPwdRes;
        setRes(sParsedRes);

        if (sParsedRes.success) {
            const test = setTimeout(() => {
                setIsOpen(false);
                clearTimeout(test);
            }, 1000);
        }
    };
    const init = async () => {
        const sChcekRes: any = await getLogin();
        if (sChcekRes.success) setCurUserName(decodeJwt(JSON.stringify(localStorage.getItem('accessToken'))).sub.toUpperCase());
        else setCurUserName('');
    };

    useEffect(() => {
        init();
    }, []);

    useEsc(() => setIsOpen && setIsOpen(false));

    return (
        <div className="change-password-wrapper">
            <div ref={sRef} style={{ display: 'flex' }}>
                <Modal pIsDarkMode className="change-password-modal" onOutSideClose={() => setIsOpen(false)}>
                    <Modal.Header>
                        <div className="change-password-modal-header">
                            <div className="title">
                                <RiLockPasswordLine />
                                <span className="text">Change password</span>
                            </div>
                            <Close style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)} />
                        </div>
                    </Modal.Header>
                    {sRes && sRes.success ? (
                        <div className="res-success">
                            <span>{sRes.reason}</span>
                        </div>
                    ) : (
                        <>
                            <Modal.Body>
                                <div className="change-password-modal-body">
                                    <div className="content-user-name">
                                        <div>User: {sCurrentUserName}</div>
                                    </div>
                                    <PasswordForm pTitle="New password:" pCallback={setNewPassword} pFocus pTabIdx={1} pEnterNextRef={sConfirmPwdRef} />
                                    <div ref={sConfirmPwdRef}>
                                        <PasswordForm pTitle="Confirm password:" pCallback={setConfirmPassword} pTabIdx={2} pEnterNextRef={sChangeBtnRef} />
                                    </div>
                                    {sPwdDiff && (
                                        <div className="res-err">
                                            <VscWarning style={{ fill: '#ff5353' }} />
                                            <span className="res-err-text">{sPwdDiff}</span>
                                        </div>
                                    )}
                                    {sRes && !sRes.success && (
                                        <div className="res-err">
                                            <VscWarning style={{ fill: '#ff5353' }} />
                                            <span className="res-err-text">{sRes.reason}</span>
                                        </div>
                                    )}
                                </div>
                            </Modal.Body>
                            <Modal.Footer>
                                <div ref={sChangeBtnRef} className="change-password-modal-footer">
                                    <button onClick={handleChange}>Change password</button>
                                </div>
                            </Modal.Footer>
                        </>
                    )}
                </Modal>
            </div>
        </div>
    );
};

const PasswordForm = ({
    pTitle,
    pCallback,
    pFocus = false,
    pTabIdx,
    pEnterNextRef,
}: {
    pTitle: string;
    pCallback: (aText: string) => void;
    pFocus?: boolean;
    pTabIdx: number;
    pEnterNextRef?: any;
}) => {
    const [sState, setState] = useState<boolean>(false);

    const handleText = (e: any) => {
        pCallback(e.target.value);
    };
    const handleEnter = (e: any) => {
        if (e.which === 13 || e.keyCode === 13) {
            e.preventDefault();
            if (pEnterNextRef.current.getElementsByTagName('input').length > 0) return pEnterNextRef.current.getElementsByTagName('input')[0].focus();
            if (pEnterNextRef.current.getElementsByTagName('button').length > 0) return pEnterNextRef.current.getElementsByTagName('button')[0].focus();
            else return;
        }
    };

    return (
        <div className="content">
            <div className="title">{pTitle}</div>
            <div className="item-wrapper">
                <input autoFocus={pFocus} onChange={handleText} type={sState ? 'text' : 'password'} style={{ imeMode: 'inactive' }} tabIndex={pTabIdx} onKeyDown={handleEnter} />
                <button className={sState ? 'btn-active' : 'btn-none'} onClick={() => setState(!sState)} tabIndex={-1}>
                    {sState && <VscEye />}
                    {!sState && <VscEyeClosed />}
                </button>
            </div>
        </div>
    );
};
