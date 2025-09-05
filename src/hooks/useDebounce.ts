import { useState, useEffect } from 'react';

const useDebounce = (aDebounceList: any[], aCallback: () => void, aTime: number | undefined = 200, aIIFE?: boolean) => {
    const [sDebounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (sDebounceTimer) clearTimeout(sDebounceTimer);
        if (aIIFE) return aCallback();
        setDebounceTimer(
            setTimeout(() => {
                aCallback();
            }, aTime)
        );
    }, [...aDebounceList, aIIFE]);
};

export default useDebounce;
