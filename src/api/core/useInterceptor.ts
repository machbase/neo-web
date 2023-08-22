import { useEffect } from 'react';
import axios, { AxiosError } from "axios";
import { reLogin } from "@/api/repository/login";
import { useNavigate } from 'react-router-dom';

interface CustomHeaders {
    [key: string]: string;
}

const baseURL = "/web";
const request = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const useInterceptor = () => {
	const sNavigate = useNavigate();
  
  useEffect(() => {
    const requestHandler = (config: any) => {
        const sHeaders = config.headers as CustomHeaders;
  
        const sFileOption = config.url?.split("?")[0].indexOf("/api/files");
        const sFileSql = config.url?.split("?")[0].indexOf(".sql");
        const sFileTql = config.url?.split("?")[0].indexOf(".tql");
        const sFileTaz = config.url?.split("?")[0].indexOf(".taz");
        const sFileWrk = config.url?.split("?")[0].indexOf(".wrk");
        if ((sFileTaz !== -1 || sFileWrk !== -1) && config.method === "post") {
          sHeaders["Content-Type"] = "text/plain";
        }
    
        if (
          sHeaders &&
          (config.url === "/api/md?darkMode=false" ||
            config.url === "/api/md?darkMode=true")
        ) {
          sHeaders["Content-Type"] = "text/plain";
        }
    
        if (
          sFileOption !== -1 &&
          (sFileSql !== -1 ||
            sFileTql !== -1 ||
            sFileTaz !== -1 ||
            sFileWrk !== -1) &&
          config.method === "get"
        ) {
          config.transformResponse = function (data: any) {
            return data;
          };
    
          sHeaders["Content-Type"] = "text/plain";
        }
        if (config.url === "/api/tql") {
          sHeaders["Content-Type"] = "text/plain";
        }
        if (
          sHeaders &&
          config.url !== `${baseURL}/api/login` &&
          config.url !== `${baseURL}/api/login`
        ) {
          const accessToken = localStorage.getItem("accessToken");
          if (accessToken) {
            sHeaders.Authorization = `Bearer ${accessToken}`;
          }
        }
        return config;
    };
  
  const responseHandler = (response: any) => {
        if (response && response.config && response.config.url === "/api/tql") {
            return response;
        }
        const res = response && response.data;
        // do something with respones
        return res;
    };
  
    const requestErrorHandler = (error: AxiosError) => {
        console.log(error); // for debug
        return Promise.reject(error);
    }
  
    const responseErrorHandler = async (error: any) => {
      let sData;
      if (error.response && error.response.status === 401) {
            if (error.response.config.url !== `/api/relogin`) {
                const sRefresh: any = await reLogin();
  
                if (sRefresh.success) {
                    localStorage.setItem("accessToken", sRefresh.accessToken);
                    localStorage.setItem("refreshToken", sRefresh.refreshToken);
  
                    if (error.response.config.url !== `/api/login`) {
                        sData = request(error.config);
                    } else {
                        return error;
                    }
                } else {
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("refreshToken");
                  sNavigate("/login");
                }
            } else {
                localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              sNavigate("/login");
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
  
    const requestInterceptor = request.interceptors.request.use(requestHandler, requestErrorHandler);
  
    const responseInterceptor = request.interceptors.response.use(
      (response) => responseHandler(response),
      (error) => responseErrorHandler(error)
    );
        return () => {
            request.interceptors.request.eject(requestInterceptor);
            request.interceptors.response.eject(responseInterceptor);
        };
    }, []);

	return request;
};