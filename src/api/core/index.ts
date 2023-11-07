import axios, { AxiosError, AxiosResponse } from 'axios';
import { reLogin } from '@/api/repository/login';
import { isImage } from '@/utils';

// Define custom type for headers
interface CustomHeaders {
    [key: string]: any;
}

// Create an axios instance
const baseURL = '/web';
const request = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
request.interceptors.request.use(
    (config: any) => {
        const sHeaders = config.headers as CustomHeaders;
        const sUrlSplit = config.url?.split('?');
        const sFileOption = sUrlSplit[0].indexOf('/api/files');
        const sFileSql = sUrlSplit[0].indexOf('.sql');
        const sFileTql = sUrlSplit[0].indexOf('.tql');
        const sFileTaz = sUrlSplit[0].indexOf('.taz');
        const sFileDsh = sUrlSplit[0].indexOf('.dsh');
        const sFileWrk = sUrlSplit[0].indexOf('.wrk');
        const sFileMd = sUrlSplit[0].indexOf('.md');
        const sFileCsv = sUrlSplit[0].indexOf('.csv');
        const sFileText = sUrlSplit[0].indexOf('.txt');
        const sFileImg = isImage(sUrlSplit[0]);

        if (!config.url.includes('login') && !config.url.includes('logout') && !config.url.includes('relogin') && !config.url.includes('check')) {
            sHeaders['X-Console-Id'] = localStorage.getItem('consoleId');
        }

        if (config.url.includes('/api/files') && config.method === 'put') {
            sHeaders['Content-Type'] = 'application/json';
        }

        if (sFileImg) {
            config.responseType = 'arraybuffer';
        }
        if ((sFileTaz !== -1 || sFileWrk !== -1 || sFileDsh !== -1) && config.method === 'post') {
            sHeaders['Content-Type'] = 'text/plain';
        }

        if (sFileOption !== -1 && (sFileTql !== -1 || sFileSql !== -1) && sFileTaz === -1 && sFileWrk === -1 && config.method === 'post') {
            sHeaders['Content-Type'] = 'text/plain';
        }
        if ((sFileMd !== -1 || sFileCsv !== -1 || sFileText !== -1) && config.method === 'post') {
            sHeaders['Content-Type'] = 'text/plain';
        }
        if (sHeaders && (config.url === '/api/md?darkMode=false' || config.url === '/api/md?darkMode=true')) {
            sHeaders['Content-Type'] = 'text/plain';
        }

        if (sFileOption !== -1 && (sFileSql !== -1 || sFileTql !== -1 || sFileTaz !== -1 || sFileDsh !== -1 || sFileWrk !== -1) && config.method === 'get') {
            config.transformResponse = function (data: any) {
                return data;
            };
            sHeaders['Content-Type'] = 'text/plain';
        }
        if (config.url === '/api/tql') {
            sHeaders['Content-Type'] = 'text/plain';
        }
        if (sHeaders && config.url !== `${baseURL}/api/login` && config.url !== `${baseURL}/api/login`) {
            const accessToken = localStorage.getItem('accessToken');
            if (accessToken) {
                sHeaders.Authorization = `Bearer ${accessToken}`;
            }
        }

        if (config.url.includes('/api/files') && config?.data?.url && config.method === 'post') {
            sHeaders['Content-Type'] = 'application/json';
        }

        if (config.url.includes('/api/license') && config.method === 'post') {
            sHeaders['Content-Type'] = 'multipart/form-data';
        }

        return config;
    },
    (error: AxiosError) => {
        console.log(error); // for debug
        return Promise.reject(error);
    }
);

// Response interceptor
request.interceptors.response.use(
    (response: AxiosResponse) => {
        if (response.config.url === '/api/tql') {
            return response;
        }
        const res = response.data;

        // do something with respones
        return res;
    },
    async (error: any) => {
        // status code check
        // const sNavigate = useNavigate();

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
                        return error;
                    }
                }
            } else {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.dispatchEvent(new Event('logoutEvent'));
                return error;
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
