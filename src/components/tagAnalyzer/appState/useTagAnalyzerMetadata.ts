import { useEffect, useState } from 'react';
import { fetchRollupMetadata } from '../fetch/RollupMetadataFetcher';
import { fetchAvailableSourceTableNames } from '../fetch/SourceTableNameFetcher';
import type { RollupTableMap } from '../fetch/FetchContracts';

export function useTagAnalyzerMetadata({
    enabled = true,
    onAvailableSourceTableNamesLoaded,
    onRollupTableListLoaded,
}: {
    enabled?: boolean;
    onAvailableSourceTableNamesLoaded?: (tableNames: string[]) => void;
    onRollupTableListLoaded?: (rollupMetadata: RollupTableMap) => void;
} = {}): {
    availableSourceTableNames: string[];
    rollupTableList: RollupTableMap;
    isLoadingMetadata: boolean;
} {
    const [availableSourceTableNames, setAvailableSourceTableNames] =
        useState<string[]>([]);
    const [rollupTableList, setRollupTableList] = useState<RollupTableMap>({});
    const [hasLoadedMetadata, setHasLoadedMetadata] = useState(false);

    useEffect(() => {
        if (!enabled || hasLoadedMetadata) {
            return undefined;
        }

        let sIsActive = true;

        void (async () => {
            const [sSourceTableNames, sRollupTables] = await Promise.all([
                fetchAvailableSourceTableNames(),
                fetchRollupMetadata(),
            ]);

            if (!sIsActive) {
                return;
            }

            const sResolvedSourceTableNames = sSourceTableNames ?? [];

            setAvailableSourceTableNames(sResolvedSourceTableNames);
            setRollupTableList(sRollupTables);
            onAvailableSourceTableNamesLoaded?.(sResolvedSourceTableNames);
            onRollupTableListLoaded?.(sRollupTables);
            setHasLoadedMetadata(true);
        })();

        return () => {
            sIsActive = false;
        };
    }, [
        enabled,
        hasLoadedMetadata,
        onAvailableSourceTableNamesLoaded,
        onRollupTableListLoaded,
    ]);

    return {
        availableSourceTableNames,
        rollupTableList,
        isLoadingMetadata: enabled && !hasLoadedMetadata,
    };
}
