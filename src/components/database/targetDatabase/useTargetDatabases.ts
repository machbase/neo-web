import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureCurrentDatabase, findDatabaseByName, getCurrentDatabaseName, getDatabases, refreshDatabases } from '@/api/repository/currentDatabase';
import { getConnectableDatabases } from '@/api/repository/api';
import { readRecentDatabases } from '@/utils/targetDatabaseStore';

/**
 * One row of the database chip's menu.
 *
 * Three separate answers, because they fail for different reasons and the menu says which:
 *   - `canUse` is the server's own `V$DATABASES.CAN_USE`. Measured on v8.7 as SYS, a MOUNTED
 *     backup reports 0 and `use()` on it answers *MACHCLI-ERR-2840, … is not an active database*,
 *     so a mounted database can never be a target however readable its tables are.
 *   - `hasPrivilege` is CONNECT, which is about the user rather than the database.
 *   - `readOnly` still allows a target; it only forbids writing once you are there.
 *
 * A row that fails the first two is listed and disabled rather than hidden: "why is FACTORY_C
 * missing" is a worse question than "why is FACTORY_C greyed out".
 */
export type TargetDatabaseEntry = {
    name: string;
    kind: string;
    accessMode: string;
    /** An attached backup rather than a database you work in. Always read only, never a target. */
    mounted: boolean;
    readOnly: boolean;
    /** `V$DATABASES.CAN_USE` — the server's answer to "may this be a target". */
    canUse: boolean;
    /** Does this user hold CONNECT on it? */
    hasPrivilege: boolean;
    /** When this editor last picked it, from local storage. */
    lastUsedAt?: number;
};

const buildEntries = (aConnectable: string[] | undefined): TargetDatabaseEntry[] => {
    const sAllowed = aConnectable === undefined ? undefined : new Set(aConnectable.map((aName) => aName.trim().toUpperCase()));
    const sRecents = readRecentDatabases();

    return getDatabases().map((aDb) => {
        const sKey = aDb.name.toUpperCase();
        return {
            name: aDb.name,
            kind: aDb.kind,
            accessMode: aDb.accessMode,
            mounted: aDb.kind === 'MOUNTED',
            readOnly: aDb.accessMode === 'READ_ONLY' || aDb.kind === 'MOUNTED',
            // Undefined means the column was never reported (a pre-v8.7 fixture); nothing to object to.
            canUse: aDb.canUse !== false,
            hasPrivilege: sAllowed === undefined || sAllowed.has(sKey),
            lastUsedAt: sRecents[aDb.name],
        };
    });
};

/**
 * The catalogue behind the chip: what to list, and how to ask again.
 *
 * `reload` re-reads `V$DATABASES` rather than trusting the resolver's page-lifetime memo, because
 * the menu is expected to show a database another session created a moment ago. It is called on
 * every open, so it also has to be safe to call repeatedly — the in-flight guard below keeps a
 * double-click from firing two rounds of queries.
 */
export const useTargetDatabases = () => {
    const [sDatabases, setDatabases] = useState<TargetDatabaseEntry[]>([]);
    const [sSessionDatabase, setSessionDatabase] = useState<string>(getCurrentDatabaseName());
    const [sLoading, setLoading] = useState<boolean>(false);
    const sMounted = useRef(true);
    const sInFlight = useRef(false);

    useEffect(() => {
        sMounted.current = true;
        return () => {
            sMounted.current = false;
        };
    }, []);

    const load = useCallback(async (aRefresh: boolean) => {
        if (sInFlight.current) return;
        sInFlight.current = true;
        if (aRefresh) setLoading(true);
        try {
            await (aRefresh ? refreshDatabases() : ensureCurrentDatabase());
            // Only ask who may connect once the catalogue says there is more than one database to
            // choose between — on a pre-v8.7 server the chip never renders, so nothing should fire.
            const sConnectable = getDatabases().length > 1 ? await getConnectableDatabases().catch(() => undefined) : undefined;
            if (!sMounted.current) return;
            setSessionDatabase(getCurrentDatabaseName());
            setDatabases(buildEntries(sConnectable));
        } finally {
            sInFlight.current = false;
            if (sMounted.current) setLoading(false);
        }
    }, []);

    /** First paint: resolve once so `databases.length` can decide whether the chip renders at all. */
    useEffect(() => {
        load(false);
    }, [load]);

    const reload = useCallback(() => {
        load(true);
    }, [load]);

    return { databases: sDatabases, sessionDatabase: sSessionDatabase, loading: sLoading, reload };
};

/**
 * Is this name still in the catalogue?
 *
 * Answers `true` when the catalogue is empty, because empty means "we could not ask" — refusing to
 * run a query on the strength of a list we never loaded would be worse than letting the server
 * answer.
 */
export const isKnownDatabase = (aName: string | null | undefined): boolean => {
    if (!aName) return true;
    if (getDatabases().length === 0) return true;
    return !!findDatabaseByName(aName);
};
