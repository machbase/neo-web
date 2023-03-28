import request from '../core';
import { BasePrefix } from '@/helpers/prefix';

export const postLogin = async (params: any) => {
    return await request({
        method: 'POST',
        url: BasePrefix + '/api/login',
        data: params,
    });
};

export const reLogin = async () => {
    return await request({
        method: 'POST',
        url: BasePrefix + '/api/relogin',
        data: { refreshToken: localStorage.getItem('refreshToken') },
    });
};

export const logOut = async () => {
    return await request({
        method: 'POST',
        url: BasePrefix + '/api/logout',
        data: { refreshToken: localStorage.getItem('refreshToken') },
    });
};
