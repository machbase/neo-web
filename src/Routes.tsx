import { useEffect } from 'react';
import { Routes as Switch, Route, Navigate, useNavigate } from 'react-router-dom';

import Login from '@/view/Login/Login';
import Home from '@/view/Home/Home';
import DashboardView from './view/Dashboard/DashboardView';

export const Routes = () => {
    const sIsLogin = localStorage.getItem('accessToken');
    const sNavigate = useNavigate();

    useEffect(() => {
        if (!sIsLogin) {
            sNavigate('/login');
        }
    }, []);

    return (
        <Switch>
            <Route path={'/login'} element={!sIsLogin ? <Login /> : <Navigate replace to="/" />} />
            <Route path={'/'} element={<Home />} />
            <Route path={'/view/:file'} element={<DashboardView />} />
            <Route path={'/*'} element={<Navigate replace to="/" />} />
        </Switch>
    );
};
