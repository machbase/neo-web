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

export const logOut = async () => {
    return await request({
        method: 'POST',
        url: '/api/logout',
        data: { refreshToken: localStorage.getItem('refreshToken') },
    });
};

export const changePwd = async (aUser: string, aNewPwd: string) => {
    // ALTER USER user1 IDENTIFIED BY password
    const sSql = `ALTER USER ${aUser} IDENTIFIED BY ${aNewPwd}`;
    const queryString = `/machbase?q=${sSql}`;
    const sData = await request({
        method: 'GET',
        url: encodeURI(queryString),
    });

    return sData;
};
