import request from '../core';

export const postLogin = async (params: any) => {
    return await request({
        method: 'POST',
        url: '/web/api/login',
        data: params,
    });
};
export const reLogin = async () => {
    return await request({
        method: 'POST',
        url: '/web/api/relogin',
        data: { refreshToken: localStorage.getItem('refreshToken') },
    });
};

export const logOut = async () => {
    return await request({
        method: 'POST',
        url: '/web/api/logout',
        data: { refreshToken: localStorage.getItem('refreshToken') },
    });
};