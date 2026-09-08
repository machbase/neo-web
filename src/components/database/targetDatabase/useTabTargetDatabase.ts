import { useEffect, useState } from 'react';
import { useTargetDatabases } from './useTargetDatabases';

/** A target belongs to the open tab, never to the saved SQL/worksheet file. */
export const useTabTargetDatabase = () => {
    const catalogue = useTargetDatabases();
    const [selectedDatabase, setTargetDatabase] = useState<string | null>(null);
    const useDefaultDatabase = catalogue.databases.length === 1;

    useEffect(() => {
        // Clear the old selection as well, so it cannot return if another DB is added later.
        // An empty/unresolved catalogue is not evidence that only the default DB remains.
        if (useDefaultDatabase) setTargetDatabase(null);
    }, [useDefaultDatabase]);

    return {
        ...catalogue,
        // Switch the execution target in the same render that hides the selector.
        targetDatabase: useDefaultDatabase ? null : selectedDatabase,
        setTargetDatabase,
    };
};
