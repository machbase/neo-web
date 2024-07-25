import request from '../core';

export const getLogin = () => {
    return request({
        method: 'GET',
        url: '/api/check',
    });
};

export const postLogin = (params: { loginName: string; password: string }) => {
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
export const getAdminName = async () => {
    return await request({
        method: 'POST',
        url: '/api/query',
        data: { q: 'select name from m$sys_users where user_id = 1' },
    });
};

export const logOut = async () => {
    return await request({
        method: 'POST',
        url: '/api/logout',
        data: { refreshToken: localStorage.getItem('refreshToken') },
    });
};

export const changePwd = async (aUser: string, aNewPwd: string) => {
    const sData = await request({
        method: 'POST',
        url: '/api/query',
        data: { q: 'ALTER USER ' + aUser + ' IDENTIFIED BY ' + "'" + aNewPwd + "'" },
    });

    return sData;
};
