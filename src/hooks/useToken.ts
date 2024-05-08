import { useEffect, useRef } from 'react';
import moment from 'moment';

export const useToken = (callback: (val: boolean) => void) => {
    const DEFAULT_LATENCY = 10; // 10s
    const savedCallback = useRef(callback);
    const sAccToken = localStorage.getItem('accessToken');

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (sAccToken) {
            const sBase64Url = sAccToken.split('.')[1];
            const sBase64 = sBase64Url.replace(/-/g, '+').replace(/_/g, '/');
            const sJwtInfo = decodeURIComponent(
                atob(sBase64)
                    .split('')
                    .map(function (c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    })
                    .join('')
            );
            if (JSON.parse(sJwtInfo).exp - DEFAULT_LATENCY >= moment().unix()) return callback(true);
            else return callback(false);
        } else return callback(false);
    }, [sAccToken]);
};
