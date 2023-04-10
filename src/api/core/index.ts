import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
// import { failToast } from '@/helpers/alert';
import { LocalStorageKeys } from '@/enums/localStorage';
import storage from '@/storage';
import router from '@/routes';
import { baseURL } from '../../../env';
import { reLogin } from '@/api/repository/login';
import { RouteNames } from '@/enums/routes';
// create an axios instance
const baseURL = '/web';
const request = axios.create({
    baseURL: baseURL,
    // baseURL: import.meta.env.VITE_BASE_URL,
    // timeout: 5000, // request timeout
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

        if (sHeaders && config.url !== `${baseURL}/api/login` && config.url !== `${baseURL}/api/login`) {
            sHeaders.Authorization = `Bearer ${localStorage.getItem('accessToken')}`;
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
            if (error.response.config.url !== `/api/relogin`) {
                const sRefresh: any = await reLogin();

                if (sRefresh.success) {
                    localStorage.setItem('accessToken', sRefresh.accessToken);
                    localStorage.setItem('refreshToken', sRefresh.refreshToken);

                    if (error.response.config.url !== `/api/login`) {
                        request(error.config);
                    } else {
                        router.push({
                            name: RouteNames.LOGIN,
                        });
                    }
                }
            } else {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                router.push({
                    name: RouteNames.LOGIN,
                });
            }

            return error;
        }
        if (error.response && error.response.status !== 401) {
            alert(error.response?.data.reason);
        }
    }
);

export default request;
