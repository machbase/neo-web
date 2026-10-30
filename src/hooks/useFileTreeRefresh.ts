import { useCallback } from 'react';
import { useRecoilCallback } from 'recoil';
import { getRequestSession } from '@/api/core/requestSession';
import { gFileTree } from '@/recoil/fileTree';
import { TreeFetchDrilling } from '@/utils/UpdateTree';

type TreeReadOptions = {canApply?: () => boolean; retry?: boolean};

/** Compare each result with the live tree. Current intents can re-read after a
 * conflicting update; the shared guard stops superseded intents. */
export const useFileTreeRead = () => {
    const getTree = useRecoilCallback(({snapshot}) => () => snapshot.getLoadable(gFileTree).getValue(), []);
    const publish = useRecoilCallback(({snapshot, set}) => (previous: unknown, next: any) => {
        if (snapshot.getLoadable(gFileTree).getValue() !== previous) return false;
        // A failed lookup may return its input unchanged. Re-publishing that
        // copy must not invalidate another read that can still bring new data.
        if (JSON.stringify(previous) !== JSON.stringify(next)) set(gFileTree, JSON.parse(JSON.stringify(next)));
        return true;
    }, []);
    return useCallback(async (
        load: (previous: ReturnType<typeof getTree>, isCurrent: () => boolean) => Promise<any>,
        {canApply = () => true, retry = true}: TreeReadOptions = {},
    ): Promise<void> => {
        const session = getRequestSession();
        const isCurrent = () => session === getRequestSession() && canApply();
        while (isCurrent()) {
            const previous = getTree();
            const next = await load(previous, isCurrent);
            if (!isCurrent() || !next) return;
            if (publish(previous, next) || !retry) return;
        }
    }, [getTree, publish]);
};

/** Reuse the existing file loader; root and folder navigation supply their own
 * existing loaders through the same publication check. */
export const useFileTreeRefresh = () => {
    const readTree = useFileTreeRead();
    return useCallback((path: string, canApply?: () => boolean) => readTree(async previous => {
        const result = await TreeFetchDrilling(previous, path, true);
        return result?.tree;
    }, {canApply}), [readTree]);
};
