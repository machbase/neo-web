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

        const sFileOption = config.url?.split('?')[0].indexOf('/api/files');
        const sFileSql = config.url?.split('?')[0].indexOf('.sql');
        const sFileTql = config.url?.split('?')[0].indexOf('.tql');
        const sFileTaz = config.url?.split('?')[0].indexOf('.taz');
        const sFileWrk = config.url?.split('?')[0].indexOf('.wrk');
        if ((sFileTaz !== -1 || sFileWrk !== -1) && config.method === 'post') {
            config.headers[`Content-Type`] = 'text/plain';
        }

        if (sHeaders && (config.url === '/api/md?darkMode=false' || config.url === '/api/md?darkMode=true')) {
            config.headers[`Content-Type`] = 'text/plain';
        }

        if (sFileOption !== -1 && (sFileSql !== -1 || sFileTql !== -1 || sFileTaz !== -1 || sFileWrk !== -1) && config.method === 'get') {
            config.transformResponse = function (data) {
                return data;
            };

            config.headers[`Content-Type`] = 'text/plain';
        }
        if (config.url === '/api/tql') {
            config.headers[`Content-Type`] = 'text/plain';
        }
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
        if (response.config.url === '/api/tql') {
            return response;
        }
        const res = response.data;
        // do something with respones
        return res;
    },
    async (error: AxiosError) => {
        // status code check

        let sData;
        if (error.response && error.response.status === 401) {
            if (error.response.config.url !== `/api/relogin`) {
                const sRefresh: any = await reLogin();

                if (sRefresh.success) {
                    localStorage.setItem('accessToken', sRefresh.accessToken);
                    localStorage.setItem('refreshToken', sRefresh.refreshToken);

                    if (error.response.config.url !== `/api/login`) {
                        sData = request(error.config);
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
            if (sData) {
                return sData;
            }
            return error;
        }
        if (error.response && error.response.status !== 401) {
            return error.response;
        }
    }
);

export default request;
