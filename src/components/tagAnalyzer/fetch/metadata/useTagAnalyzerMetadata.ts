import { useEffect, useState } from 'react';
import { fetchAllRollupTableInfo } from './RollupMetadata';
import type { RollupTableMap } from '../panelData/PanelDataFetchTypes';

export function useTagAnalyzerMetadata({
    enabled = true,
}: {
    enabled?: boolean;
} = {}): {
    rollupTableList: RollupTableMap;
    isLoadingMetadata: boolean;
} {
    const [rollupTableList, setRollupTableList] = useState<RollupTableMap>({});
    const [hasLoadedMetadata, setHasLoadedMetadata] = useState(false);

    useEffect(() => {
        if (!enabled || hasLoadedMetadata) {
            return undefined;
        }

        let sIsActive = true;

        void (async () => {
            const sRollupTables = await fetchAllRollupTableInfo();

            if (!sIsActive) {
                return;
            }

            setRollupTableList(sRollupTables);
            setHasLoadedMetadata(true);
        })();

        return () => {
            sIsActive = false;
        };
    }, [enabled, hasLoadedMetadata]);

    return {
        rollupTableList,
        isLoadingMetadata: enabled && !hasLoadedMetadata,
    };
}