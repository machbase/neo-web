import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
// import { failToast } from '@/helpers/alert';
import { LocalStorageKeys } from '@/enums/localStorage';
import storage from '@/storage';
import router from '@/routes';
import { baseURL } from '../../../env';
import { reLogin } from '@/api/repository/login';
// create an axios instance
const request = axios.create({
    baseURL: baseURL(),
    // baseURL: import.meta.env.VITE_BASE_URL,
    timeout: 5000, // request timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// request interceptor
request.interceptors.request.use(
    // <Header>
    (config: AxiosRequestConfig) => {
        // return config;
        // do something before request is sent
        const sHeaders = config.headers;

        console.log(config.url);
        if (sHeaders && config.url !== '/web/api/login') {
            sHeaders.Authorization = `Bearer ${localStorage.getItem('AccessToken')}`;
            // if (import.meta.env.VITE_IS_TEST_CHART) {
            //     sHeaders.Authorization = `${localStorage.getItem(LocalStorageKeys.ACCESS_TOKEN)}`;
            //     sHeaders.company_id = `${localStorage.getItem(LocalStorageKeys.COMPANY_ID)}`;
            //     sHeaders.member_permission = `${localStorage.getItem(LocalStorageKeys.MEMBER_PERMISSION)}`;
            //     sHeaders.member_id = `${localStorage.getItem(LocalStorageKeys.MEMBER_ID)}`;
            // }
            return config;
        }
        return config;
    },
    (error: AxiosError) => {
        // do something with request error
        console.log(error); // for debug
        return Promise.reject(error);
    }
);

// response interceptor
request.interceptors.response.use(
    (response: AxiosResponse) => {
        const res = response.data;
        // do something with respones
        return res;
    },
    async (error: AxiosError) => {
        // status code check

        if (error.response && error.response.status === 401) {
            const sRefresh = error.response && error.response.config.url !== 'api/login' ? ((await reLogin()) as any) : false;
            // }
            // if status code 401 to reLogin
            // const sRefreshToken = error.response.config.url !== AUTH_API.RE_LOGIN ? ((await reLogin()) as any) : false;
            // RefreshToken === true
            if (sRefresh) {
                localStorage.setItem('accessToken', sRefresh.accessToken);
                localStorage.setItem('refreshToken', sRefresh.refreshToken);
                //     const sValue = JSON.parse(Buffer.from(sRefreshToken.accessToken.split('.')[1], 'base64').toString()).values;
                //     if (sRefreshToken && sValue) {
                //         storage.saveHeader(sValue);
                //         storage.saveTimezone();
                //         // localstorage 에 member_permission 있는지 확인  / 없음 아래 method 실행
                //     }
                if (error.response.config.url !== 'api/login') {
                    request(error.config);
                }
            } else {
                return router.push('/login').then(() => {});
            }
            // }
            // if (error.message === 'Network Error') {
            //
            // } else {
            // failToast(error.message); // for debug
            // }
            return error;
        }
    }
);

export default request;
