import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { HostRefresh, HostRefreshReason } from './hostTypes';

/** Keep all causes in a React batch, including a manual request followed by an automatic tick. */
export function useHostRefresh(): [HostRefresh, (reason: HostRefreshReason) => void] {
    const pending = useRef(new Set<HostRefreshReason>());
    const [refresh, setRefresh] = useState<HostRefresh>({ revision: 0, reasons: [] });
    const request = useCallback((reason: HostRefreshReason) => {
        pending.current.add(reason);
        const reasons = [...pending.current];
        setRefresh((previous) => ({ revision: previous.revision + 1, reasons }));
    }, []);
    useLayoutEffect(() => { pending.current.clear(); }, [refresh.revision]);
    return [refresh, request];
}
