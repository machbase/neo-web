import request from '../core';

export const getLogin = async () => {
    return await request({
        method: 'GET',
        url: '/api/check',
    });
};

export const postLogin = async (params: any) => {
    return await request({
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
