import moment from 'moment';
import { useEffect, useRef } from 'react';

export const useToken = (callback: (val: boolean) => void) => {
    const savedCallback = useRef(callback);
    const sAccToken = localStorage.getItem('accessToken');
    const sRefreshToken = localStorage.getItem('refreshToken');

    const checkExpire = () => {
        const sTmpRefreshToken = localStorage.getItem('refreshToken');
        if (!sTmpRefreshToken) return false;
        try {
            const sBase64Url = sTmpRefreshToken.split('.')[1];
            const sBase64 = sBase64Url.replace(/-/g, '+').replace(/_/g, '/');
            const sJwtInfo = decodeURIComponent(
                atob(sBase64)
                    .split('')
                    .map(function (c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    })
                    .join('')
            );
            const sExpTime = JSON.parse(sJwtInfo).exp;
            const sNowTime = moment().unix();
            if (sExpTime > sNowTime) return true;
            else return false;
        } catch {
            return false;
        }
    };

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        const sTmpAccToken = localStorage.getItem('accessToken');
        if (sTmpAccToken) {
            const sRJWTStatus = checkExpire();
            if (sRJWTStatus) return callback(true);
            else return callback(false);
        } else return callback(false);
    }, [sAccToken, sRefreshToken]);
};
