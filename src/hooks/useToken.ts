import { useEffect, useRef } from 'react';
import { getJwtExpTime } from '@/utils/jwt';

export const useToken = (callback: (val: boolean) => void) => {
    const savedCallback = useRef(callback);
    const sAccToken = localStorage.getItem('accessToken');
    const sRefreshToken = localStorage.getItem('refreshToken');

    const checkExpire = () => {
        const sTmpRefreshToken = localStorage.getItem('refreshToken');
        if (!sTmpRefreshToken) return false;
        const expTime = getJwtExpTime(sTmpRefreshToken);
        if (expTime === null) return false;
        return expTime > Math.floor(Date.now() / 1000);
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
