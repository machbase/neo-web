import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { HostRefresh, HostRefreshReason } from './hostTypes';

/** Keep all causes in a React batch, including a manual request followed by an automatic tick. */
export function useHostRefresh(): [HostRefresh, (reason: HostRefreshReason, ...additional: HostRefreshReason[]) => void] {
    const pending = useRef(new Set<HostRefreshReason>());
    const [refresh, setRefresh] = useState<HostRefresh>({ revision: 0, reasons: [] });
    const request = useCallback((reason: HostRefreshReason, ...additional: HostRefreshReason[]) => {
        pending.current.add(reason);
        for (const cause of additional) pending.current.add(cause);
        const reasons = [...pending.current];
        setRefresh((previous) => ({ revision: previous.revision + 1, reasons }));
    }, []);
    useLayoutEffect(() => { pending.current.clear(); }, [refresh.revision]);
    return [refresh, request];
}

export function createDashboardRangeRequests() {
    let manualRevision = 0;
    let manualPending = false;
    let issuedAuto = 0;
    let appliedAuto = 0;

    return async function updateRange<T>(automatic: boolean, read: () => Promise<T>, apply: (value: T) => void) {
        const startedDuringManual = automatic && manualPending;
        const revision = automatic ? manualRevision : ++manualRevision;
        const auto = automatic ? ++issuedAuto : 0;
        if (!automatic) manualPending = true;
        try {
            const value = await read();
            if (revision !== manualRevision || (automatic && (auto <= appliedAuto || (startedDuringManual && !manualPending)))) return;
            if (automatic) appliedAuto = auto;
            apply(value);
        } finally {
            if (!automatic && revision === manualRevision) manualPending = false;
        }
    };
}
