import { useEffect, useState } from 'react';
import { fetchRollupMetadata } from '../fetch/RollupMetadataFetcher';
import { fetchAvailableSourceTableNames } from '../fetch/SourceTableNameFetcher';

export function useTagAnalyzerMetadata({
    onAvailableSourceTableNamesLoaded,
    onRollupTableListLoaded,
}: {
    onAvailableSourceTableNamesLoaded?: (tableNames: string[]) => void;
    onRollupTableListLoaded?: (tableNames: string[]) => void;
} = {}): {
    availableSourceTableNames: string[];
    rollupTableList: string[];
    isLoadingMetadata: boolean;
} {
    const [availableSourceTableNames, setAvailableSourceTableNames] =
        useState<string[]>([]);
    const [rollupTableList, setRollupTableList] = useState<string[]>([]);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

    useEffect(() => {
        void (async () => {
            setIsLoadingMetadata(true);

            const [sSourceTableNames, sRollupTables] = await Promise.all([
                fetchAvailableSourceTableNames(),
                fetchRollupMetadata(),
            ]);

            const sResolvedSourceTableNames = sSourceTableNames ?? [];
            const sResolvedRollupTableList = sRollupTables as unknown as string[];

            setAvailableSourceTableNames(sResolvedSourceTableNames);
            setRollupTableList(sResolvedRollupTableList);
            onAvailableSourceTableNamesLoaded?.(sResolvedSourceTableNames);
            onRollupTableListLoaded?.(sResolvedRollupTableList);
            setIsLoadingMetadata(false);
        })();
    }, [onAvailableSourceTableNamesLoaded, onRollupTableListLoaded]);

    return {
        availableSourceTableNames,
        rollupTableList,
        isLoadingMetadata,
    };
}
