import React, { ChangeEvent, useState, useEffect } from 'react';
import LoginLogo from '../../assets/image/logo_machbaseNeo_general_a.png';

import './Login.scss';
import { postLogin } from '../../api/repository/login';
import { useNavigate } from 'react-router-dom';
import { Error } from '@/components/toast/Toast';

const Login = () => {
    const sNavigate = useNavigate();

    const [sLoginId, setLoginId] = useState<string>('');
    const [sPassword, setPassword] = useState<string>('');
    const [sRememberId, setRememberId] = useState(false);

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
        }
    }, []);

    const login = async () => {
        const sParams = {
            LoginName: sLoginId,
            Password: sPassword,
        };

        const sReturn: any = await postLogin(sParams);

        if (sReturn && sReturn.success) {
            if (sRememberId) {
                localStorage.setItem('rememberId', sLoginId);
            } else {
                localStorage.removeItem('rememberId');
            }
            localStorage.setItem('accessToken', sReturn.accessToken);
            localStorage.setItem('refreshToken', sReturn.refreshToken);
            sReturn.option && sReturn.option.experimentMode ? localStorage.setItem('experimentMode', sReturn.option.experimentMode) : localStorage.removeItem('experimentMode');
            sNavigate('/');
        } else {
            Error('Login fail');
        }
    };

    const keyDownLogin = (aEvent: React.KeyboardEvent) => {
        if (aEvent.key === 'Enter') {
            login();
        }
    };

    return (
        <div className="login-form">
            <div className="login-card">
                <img alt="" src={LoginLogo} />
                <div className="input-form">
                    <input
                        v-model="sLoginName"
                        className="input-id input normal-text"
                        placeholder="User ID"
                        type="text"
                        onKeyDown={keyDownLogin}
                        value={sLoginId}
                        onInput={handleLoginId}
                    />
                    <input
                        className="input-password input normal-text"
                        value={sPassword}
                        onInput={handlePassword}
                        onKeyDown={keyDownLogin}
                        placeholder="Password"
                        type="password"
                    />
                </div>
                <div className="input-checkboxwrap">
                    <input checked={sRememberId} onChange={handleRememberId} className="checkbox" type="checkbox" />
                    <p className="input-checkbox-p">Remember User ID</p>
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
