import { useEffect, useState } from 'react';
import { Routes as Switch, Route, Navigate, useNavigate } from 'react-router-dom';
import Home from '@/view/Home/Home';
import Login from '@/view/Login/Login';
import DashboardView from './view/Dashboard/DashboardView';
import { useToken } from './hooks/useToken';

export const Routes = () => {
    const [sHome, setHome] = useState<boolean>(false);
    const sNavigate = useNavigate();

    useToken(setHome);

    useEffect(() => {
        if (!sHome) {
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
