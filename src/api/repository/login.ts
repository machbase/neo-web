import request from '../core';

const host = window.location.host;
const path = window.location.pathname;
const prefix = path.split('/ui/');
export const BasePrefix = prefix[0].replace(/\/+$/, '');
export const BaseUrl = host+BasePrefix;

console.log('baseUrl', BaseUrl);
console.log('baseprefix', BasePrefix);

export const postLogin = async (params: any) => {
    return await request({
        method: 'POST',
        url: BasePrefix+'/api/login',
        data: params,
    });
};

export const reLogin = async () => {
    return await request({
        method: 'POST',
        url: BasePrefix+'/api/relogin',
        data: { refreshToken: localStorage.getItem('refreshToken') },
    });
};

export const logOut = async () => {
    return await request({
        method: 'POST',
        url: BasePrefix+'/api/logout',
        data: { refreshToken: localStorage.getItem('refreshToken') },
    });
};
