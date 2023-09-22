import { useState, useEffect } from 'react';

const useDebounce = (aDebounceList: any[], aCallback: () => void, aTime: number | undefined = 200) => {
    const [sDebounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (sDebounceTimer) clearTimeout(sDebounceTimer);
        setDebounceTimer(
            setTimeout(() => {
                aCallback();
            }, aTime)
        );
    }, [...aDebounceList]);
};

export default useDebounce;
