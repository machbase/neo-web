import { useEffect, useState } from 'react';
import { Routes as Switch, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Home from '@/view/Home/Home';
import DashboardView from './view/Dashboard/DashboardView';
import PublicApp from './public-dashboard/PublicApp';
import Login from '@/view/Login/Login';
import RpcProbe from '@/components/rpcProbe/RpcProbe';
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
            localStorage.removeItem('V$ROLLUP_VER');
            sNavigate('/login');
        }
    }, [sHome]);

    return (
        <Switch>
            <Route
                path={'/login'}
                element={!sHome ? <Login /> : <Navigate replace to="/" />}
            />
            <Route path={'/'} element={<Home />} />
            <Route path={'/view/*'} element={<DashboardView />} />
            {/* Temporary: #1334 dummy page for checking RPC reads. Remove with RpcProbe once wired into the real UI. */}
            <Route path={'/rpcprobe'} element={<RpcProbe />} />
            <Route path={'/*'} element={<Navigate replace to="/" />} />
        </Switch>
    );
};
