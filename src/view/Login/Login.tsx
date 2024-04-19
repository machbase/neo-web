import React, { ChangeEvent, useState, useEffect, useRef } from 'react';
import LoginLogo from '../../assets/image/logo_machbaseNeo_general_a.png';

import './Login.scss';
import { postLogin } from '../../api/repository/login';
import { useNavigate } from 'react-router-dom';
import LOGIN_BG_IMG from '@/assets/image/neow_img_login_bg.webp';
import { VscWarning } from 'react-icons/vsc';

const Login = () => {
    const sNavigate = useNavigate();

    const [sLoginId, setLoginId] = useState<string>('');
    const [sPassword, setPassword] = useState<string>('');
    const [sRememberId, setRememberId] = useState(false);
    const sIdRef = useRef<HTMLInputElement>(null);
    const sPasswordRef = useRef<HTMLInputElement>(null);
    const [sIsLogin, setIsLogin] = useState<any>(undefined);

    const handleLoginId = (aEvent: ChangeEvent<HTMLInputElement>) => {
        setLoginId(aEvent.target.value);
    };

    const handleRememberId = (aEvent: any) => {
        setRememberId(aEvent.target.checked);
    };

    const handlePassword = (aEvent: ChangeEvent<HTMLInputElement>) => {
        setPassword(aEvent.target.value);
    };

    useEffect(() => {
        const sData = localStorage.getItem('rememberId');
        if (sData) {
            setRememberId(true);
            setLoginId(sData);
            if (sPasswordRef.current) sPasswordRef.current.focus();
        } else {
            if (sIdRef.current) sIdRef.current.focus();
        }
    }, []);

    const login = async () => {
        const sParams = {
            loginName: sLoginId,
            password: sPassword,
        };

        const sReturn: any = await postLogin(sParams);

        if (sReturn && sReturn.success) {
            setIsLogin(undefined);
            if (sRememberId) {
                localStorage.setItem('rememberId', sLoginId);
            } else {
                localStorage.removeItem('rememberId');
            }
            const sIsView = localStorage.getItem('view');
            localStorage.setItem('accessToken', sReturn.accessToken);
            localStorage.setItem('refreshToken', sReturn.refreshToken);
            sReturn.option && sReturn.option.experimentMode ? localStorage.setItem('experimentMode', sReturn.option.experimentMode) : localStorage.removeItem('experimentMode');
            if (sIsView) {
                sNavigate(JSON.parse(sIsView).path);
                localStorage.removeItem('view');
            } else {
                sNavigate('/');
            }
        } else {
            if (sReturn?.data && sReturn?.data.reason) setIsLogin(sReturn?.data.reason);
            else setIsLogin(sReturn.statusText);
        }
    };

    const keyDownLogin = (aEvent: React.KeyboardEvent) => {
        if (aEvent.key === 'Enter') {
            login();
        }
    };

    return (
        <div className="login-form">
            <img style={{ width: '100%', height: '100%', zIndex: 10, position: 'absolute' }} src={`${LOGIN_BG_IMG}`} />
            <div className="login-card" style={{ zIndex: 100 }}>
                <img alt="" src={LoginLogo} />
                <div className="input-form">
                    <input ref={sIdRef} className="input-id input normal-text" placeholder="User" type="text" onKeyDown={keyDownLogin} value={sLoginId} onInput={handleLoginId} />
                    <input
                        ref={sPasswordRef}
                        className="input-password input normal-text"
                        value={sPassword}
                        onInput={handlePassword}
                        onKeyDown={keyDownLogin}
                        placeholder="Password"
                        type="password"
                    />
                </div>
                {sIsLogin && (
                    <div className="input-form-response-wrapper">
                        <div className="input-form-response">
                            <VscWarning />
                            <pre>{sIsLogin}</pre>
                        </div>
                    </div>
                )}
                <div className="input-cehck-wrapper">
                    <div className="input-checkboxwrap">
                        {sRememberId ? (
                            <input checked={sRememberId} onChange={handleRememberId} className="checkbox" type="checkbox" />
                        ) : (
                            <div onClick={() => setRememberId(true)}></div>
                        )}
                        <p className="input-checkbox-p">Remember User ID</p>
                    </div>
                </div>
                <div className="button-form">
                    <button className="login-button" type="submit" onKeyDown={keyDownLogin} onClick={login}>
                        SIGN IN
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
