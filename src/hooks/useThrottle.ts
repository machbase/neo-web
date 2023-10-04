import { useState, useEffect } from 'react';

const useThrottle = (aObserve: string, aCallback: () => void, aTime: number | undefined = 1000) => {
    const [sThrottleTimer, setThrottleTimer] = useState<any>(null);

    useEffect(() => {
        if (!aObserve) return;
        if (sThrottleTimer) clearTimeout(sThrottleTimer);
        if (aObserve !== '')
            setThrottleTimer(
                setTimeout(() => {
                    aCallback();
                }, aTime)
            );
    }, [aObserve]);
};

export default useThrottle;
