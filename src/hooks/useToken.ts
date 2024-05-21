import { useEffect, useRef } from 'react';

export const useToken = (callback: (val: boolean) => void) => {
    const savedCallback = useRef(callback);
    const sAccToken = localStorage.getItem('accessToken');

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (sAccToken) {
            return callback(true);
        } else return callback(false);
    }, [sAccToken]);
};
