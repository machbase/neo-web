import { useEffect, useState } from 'react';
import {
    buildNeoUpdateStatus,
    fetchLatestNeoVersion,
    NEO_UPDATE_CHECK_INTERVAL_MS,
    normalizeNeoVersion,
    type NeoUpdateStatus,
} from '@/api/repository/neoUpdate';

const toErrorMessage = (error: unknown): string => {
    return error instanceof Error ? error.message : String(error);
};

export const useNeoUpdateStatus = (serverVersion: string | null | undefined, intervalMs: number = NEO_UPDATE_CHECK_INTERVAL_MS): NeoUpdateStatus => {
    const [status, setStatus] = useState<NeoUpdateStatus>({ state: 'idle' });

    useEffect(() => {
        const currentVersion = normalizeNeoVersion(serverVersion);
        if (!currentVersion) {
            setStatus({ state: 'idle' });
            return;
        }

        let cancelled = false;
        let intervalId: number | undefined;

        const checkUpdateStatus = async () => {
            setStatus((prev) => ({ ...prev, state: 'checking', currentVersion }));

            try {
                const latestVersion = await fetchLatestNeoVersion(currentVersion);
                if (cancelled) return;
                setStatus(buildNeoUpdateStatus(currentVersion, latestVersion));
            } catch (error) {
                if (cancelled) return;
                setStatus({
                    state: 'error',
                    currentVersion,
                    checkedAt: Date.now(),
                    error: toErrorMessage(error),
                });
            }
        };

        checkUpdateStatus();
        if (intervalMs > 0) intervalId = window.setInterval(checkUpdateStatus, intervalMs);

        return () => {
            cancelled = true;
            if (intervalId !== undefined) window.clearInterval(intervalId);
        };
    }, [serverVersion, intervalMs]);

    return status;
};
