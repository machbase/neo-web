import { useEffect, useRef } from 'react';

/**
 * useSchedule
 * @param callback fun | undefined (undefined = stop)
 * @param delay number
 */
export const useSchedule = (callback: any, delay: number) => {
    const savedCallback = useRef<any>();

    useEffect(() => {
        if (delay > 0 && !!callback) {
            savedCallback.current = setInterval(() => {
                callback();
            }, delay);
        } else savedCallback.current = undefined;

        return () => {
            if (savedCallback && savedCallback?.current) clearInterval(savedCallback.current);
            else savedCallback.current = undefined;
        };
    }, [callback, delay]);
};
