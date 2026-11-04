import { useEffect, useState } from 'react';
import { checkShareAvailable, getKnownShareAvailable } from '@/utils/shareAvailability';

/**
 * checkShareAvailable for a component: `undefined` while the server is being asked, then `true`/`false`.
 * Callers show a share control only on `true`, so it never appears and then vanishes (#1576).
 */
export const useShareAvailability = (): boolean | undefined => {
    const [sAvailable, setAvailable] = useState<boolean | undefined>(getKnownShareAvailable);

    useEffect(() => {
        if (sAvailable !== undefined) return;
        let sMounted = true;
        checkShareAvailable().then((aAvailable) => {
            if (sMounted) setAvailable(aAvailable);
        });
        return () => {
            sMounted = false;
        };
    }, []);

    return sAvailable;
};
