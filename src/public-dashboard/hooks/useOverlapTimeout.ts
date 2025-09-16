import { useEffect, useRef } from 'react';

export function useOverlapTimeout(callback: () => void, delay: number | null) {
    const savedCallback = useRef(callback);

    // Remember the latest callback if it changes.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the timeout.
    useEffect(() => {
        // Don't schedule if no delay is specified.
        // Note: 0 is a valid value for delay.
        if (!delay && delay !== 0) {
            return;
        }

        let id = setTimeout(function tick() {
            savedCallback.current();
            id = setTimeout(tick, delay);
        }, delay);

        return () => clearTimeout(id);
    }, [delay]);
}