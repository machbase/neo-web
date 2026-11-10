import React, { ChangeEvent, useState, useEffect, useRef } from 'react';
import LoginLogo from '@/assets/image/logo_machbaseNeo_general_a.png?inline';

import './Login.scss';
import { postLogin } from '../../api/repository/login';
import { useNavigate } from 'react-router-dom';
import LOGIN_BG_IMG from '@/assets/image/neow_img_login_bg.webp?inline';
import { useExperiment } from '@/hooks/useExperiment';
import { Input } from '@/design-system/components/Input';
import { Alert } from '@/design-system/components/Alert';
import { Button, Page, PasswordInput, Checkbox } from '@/design-system/components';
import { readViewPath } from './loginRedirect';
import { applyStoredTheme, localLoginPictureRef, readStoredTheme, readThemePicture, themeLoginImageSrc } from '@/design-system/theme';

const Login = () => {
    const sNavigate = useNavigate();
    // The theme this browser last chose may bring its own picture: a package's file (neoTheme.loginImage),
    // or one set in the theme builder, kept in IndexedDB and read once the page is up — until then
    // (undefined) no picture shows, so the built-in one does not flash first. One that does not
    // load gives way to the built-in picture.
    const [sPictureRef] = useState(() => localLoginPictureRef(readStoredTheme()));
    const [sThemeImage, setThemeImage] = useState<string | null | undefined>(() => (sPictureRef ? undefined : themeLoginImageSrc(readStoredTheme())));
    useEffect(() => {
        if (!sPictureRef) return;
        let sLive = true;
        let sUrl: string | null = null;
        readThemePicture(sPictureRef.id).then((aBlob) => {
            if (!sLive) return;
            sUrl = aBlob ? URL.createObjectURL(aBlob) : null;
            setThemeImage(sUrl);
        });
        return () => {
            sLive = false;
            if (sUrl) URL.revokeObjectURL(sUrl);
        };
    }, [sPictureRef]);

    const [sLoginId, setLoginId] = useState<string>('');
    const [sPassword, setPassword] = useState<string>('');
    const [sRememberId, setRememberId] = useState(false);
    const sIdRef = useRef<HTMLInputElement>(null);
    const sPasswordRef = useRef<HTMLInputElement>(null);
    const [sIsLogin, setIsLogin] = useState<any>(undefined);
    const { setExperiment, rmExperiment } = useExperiment();

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
            // PKG URL REDIRECTION
            const sPkg = localStorage.getItem('package');
            const sIsView = localStorage.getItem('view');
            localStorage.setItem('accessToken', sReturn.accessToken);
            localStorage.setItem('refreshToken', sReturn.refreshToken);
            sReturn.option && sReturn.option.experimentMode ? setExperiment(sReturn.option.experimentMode) : rmExperiment();
            // Themes are an experiment: the server has just said whether it is on (the browser's theme, or the dark defaults).
            applyStoredTheme();
            const sViewPath = readViewPath(sIsView);
            // A broken value is dropped too, or every later sign-in would trip over it again.
            if (sIsView !== null && !sViewPath) localStorage.removeItem('view');
            if (sViewPath) {
                sNavigate(sViewPath);
                localStorage.removeItem('view');
            } else if (sPkg) {
                window.location.replace(sPkg);
                localStorage.removeItem('package');
            } else {
                sNavigate('/');
            }
        } else {
            if (sReturn?.data && sReturn?.data.reason) setIsLogin(sReturn?.data.reason);
            else setIsLogin('Cannot connect to server');
        }
    };

    const keyDownLogin = (aEvent: React.KeyboardEvent) => {
        if (aEvent.key === 'Enter') {
            login();
        }
    };

    return (
        <div className="login-form">
            <img
                className={sThemeImage ? 'login-bg-img login-bg-img--theme' : 'login-bg-img'}
                alt=""
                src={sThemeImage === undefined ? undefined : (sThemeImage ?? LOGIN_BG_IMG)}
                onError={sThemeImage ? () => setThemeImage(null) : undefined}
                data-testid="login-bg-img"
            />
            <Page style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="login-card">
                    <Page.Body fullHeight>
                        <Page.ContentBlock pHoverNone style={{ padding: '20px 12px' }}>
                            <Page.DpRow>
                                <img alt="" src={LoginLogo} />
                            </Page.DpRow>
                            <Page.Space pHeight="30px" />
                            <Input
                                data-testid="login-username-input"
                                ref={sIdRef}
                                className="input-id"
                                placeholder="User"
                                type="text"
                                onKeyDown={keyDownLogin}
                                value={sLoginId}
                                onInput={handleLoginId}
                                size="lg"
                                fullWidth
                            />
                            <Page.Space />
                            <PasswordInput
                                data-testid="login-password-input"
                                ref={sPasswordRef}
                                className="input-password"
                                value={sPassword}
                                onInput={handlePassword}
                                onKeyDown={keyDownLogin}
                                placeholder="Password"
                                size="lg"
                                fullWidth
                                style={{ height: '39px' }}
                            />
                            <Page.Space />
                            <Checkbox checked={sRememberId} onChange={handleRememberId} label="Remember User ID" size="sm" />
                            <Page.Space />
                            <Page.Space />
                            {sIsLogin ? <Alert variant="error" message={sIsLogin} /> : null}
                            <Page.Space />
                            <Button data-testid="login-submit" size="lg" fullWidth variant="primary" type="submit" onKeyDown={keyDownLogin} onClick={login}>
                                SIGN IN
                            </Button>
                        </Page.ContentBlock>
                    </Page.Body>
                </div>
            </Page>
        </div>
    );
};

export default Login;
