import { useEffect, useState } from 'react';
import { Routes as Switch, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Home from '@/view/Home/Home';
import Login from '@/view/Login/Login';
import DashboardView from './view/Dashboard/DashboardView';
import PublicApp from './public-dashboard/PublicApp';
import { useToken } from './hooks/useToken';

export const Routes = () => {
    const location = useLocation();
    
    if (location.pathname.startsWith('/board')) {
        return <PublicApp />;
    }

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
