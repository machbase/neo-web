import { useEffect, useState } from 'react';
import { fetchRollupMetadata } from '../../fetch/RollupMetadataFetcher';

export function useRollupMetadata(): unknown {
    const [rollupMetadata, setRollupMetadata] = useState<unknown>(undefined);

    useEffect(() => {
        let sIsActive = true;

        void fetchRollupMetadata().then((metadata) => {
            if (sIsActive) {
                setRollupMetadata(metadata);
            }
        });

        return () => {
            sIsActive = false;
        };
    }, []);

    return rollupMetadata;
}