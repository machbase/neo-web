import { useState, useEffect } from 'react';

const useDebounce = (aRef: React.MutableRefObject<HTMLElement>, aDebounceList: any[], aCallback: () => void) => {
    const [sDebounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (sDebounceTimer) clearTimeout(sDebounceTimer);
        setDebounceTimer(
            setTimeout(() => {
                if (aRef && aRef.current) aCallback();
            }, 200)
        );
    }, [...aDebounceList]);
};

export default useDebounce;
