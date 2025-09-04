import { useEffect, useState } from 'react';
import { Routes as Switch, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Home from '@/view/Home/Home';
import Login from '@/view/Login/Login';
import DashboardView from './view/Dashboard/DashboardView';
import PublicApp from './public-dashboard/PublicApp';
import { useToken } from './hooks/useToken';

export const Routes = () => {
    const location = useLocation();
    
    // Hook 호출 전에 공개 라우트 체크 - 인증 완전 우회
    if (location.pathname.startsWith('/public')) {
        return <PublicApp />;
    }

    // 기존 인증 로직 (일반 페이지들)
    const [sHome, setHome] = useState<boolean | undefined>(undefined);
    const sNavigate = useNavigate();

    useToken(setHome);

    useEffect(() => {
        if (sHome !== undefined && !sHome) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            sNavigate('/login');
        }
    }, [sHome]);

    return (
        <Switch>
            <Route path={'/login'} element={!sHome ? <Login /> : <Navigate replace to="/" />} />
            <Route path={'/'} element={<Home />} />
            <Route path={'/view/*'} element={<DashboardView />} />
            <Route path={'/*'} element={<Navigate replace to="/" />} />
        </Switch>
    );
};
