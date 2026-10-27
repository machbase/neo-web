import { useEffect } from 'react';

// The pending call is dropped when the inputs change again or the screen goes away: a check or a
// search for a screen that was already closed sent its request and showed its error toast late.
const useDebounce = (aDebounceList: any[], aCallback: () => void, aTime: number | undefined = 200, aIIFE?: boolean) => {
    useEffect(() => {
        if (aIIFE) return aCallback();
        const sTimer = setTimeout(() => {
            aCallback();
        }, aTime);
        return () => clearTimeout(sTimer);
    }, [...aDebounceList, aIIFE]);
};

export default useDebounce;
