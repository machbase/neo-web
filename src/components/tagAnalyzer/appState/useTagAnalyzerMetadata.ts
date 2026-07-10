import { useEffect, useState } from 'react';
import { fetchAllRollupTableInfo } from '../fetch/metadata/RollupMetadata';
import type { RollupTableMap } from '../fetch/panelData/PanelDataFetchTypes';
import { fetchTableInfoSearchTableNames } from '../fetch/tableInfoSearch/TableInfoSearchFetch';

type SourceTableMetadata = {
    tableNames: string[];
};

export function useTagAnalyzerMetadata({
    enabled = true,
}: {
    enabled?: boolean;
} = {}): {
    rollupTableList: RollupTableMap;
    sourceTableNames: string[];
    isLoadingMetadata: boolean;
} {
    const [rollupTableList, setRollupTableList] = useState<RollupTableMap>({});
    const [sourceTableNames, setSourceTableNames] = useState<string[]>([]);
    const [hasLoadedMetadata, setHasLoadedMetadata] = useState(false);

    useEffect(() => {
        if (!enabled || hasLoadedMetadata) {
            return undefined;
        }

        let sIsActive = true;

        void (async () => {
            const [sRollupTables, sSourceTables] = await Promise.all([
                fetchAllRollupTableInfo(),
                fetchSourceTableMetadata(),
            ]);

            if (!sIsActive) {
                return;
            }

            setRollupTableList(sRollupTables);
            setSourceTableNames(sSourceTables.tableNames);
            setHasLoadedMetadata(true);
        })();

        return () => {
            sIsActive = false;
        };
    }, [enabled, hasLoadedMetadata]);

    return {
        rollupTableList,
        sourceTableNames,
        isLoadingMetadata: enabled && !hasLoadedMetadata,
    };
}

async function fetchSourceTableMetadata(): Promise<SourceTableMetadata> {
    try {
        const sTableNames = await fetchTableInfoSearchTableNames();

        return {
            tableNames: sTableNames,
        };
    } catch {
        return {
            tableNames: [],
        };
    }
}
