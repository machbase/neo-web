import request from '../core';

export const getLogin = () => {
    return request({
        method: 'GET',
        url: '/api/check',
    });
};

export const postLogin = (params: { loginName: string, password: string }) => {
    return request({
        method: 'POST',
        url: '/api/login',
        data: params,
    });
};

export const reLogin = async () => {
    return await request({
        method: 'POST',
        url: '/api/relogin',
        data: { refreshToken: localStorage.getItem('refreshToken') },
    });
};

export const logOut = async () => {
    return await request({
        method: 'POST',
        url: '/api/logout',
        data: { refreshToken: localStorage.getItem('refreshToken') },
    });
};
