import { useEffect } from 'react';

// Like useDebounce: the pending call is dropped when the value changes again or the screen goes away.
const useThrottle = (aObserve: string, aCallback: () => void, aTime: number | undefined = 1000) => {
    useEffect(() => {
        const sTimer = setTimeout(() => {
            aCallback();
        }, aTime);
        return () => clearTimeout(sTimer);
    }, [aObserve]);
};

export default useThrottle;
