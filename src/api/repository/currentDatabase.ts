import { fetchQuery } from '@/api/repository/database';
import { CurrentDatabase, LEGACY_DATABASE, getCurrentDatabase, setCurrentDatabase } from '@/utils/currentDatabaseState';

/**
 * Resolve which logical database this session is talking to, once per page load.
 *
 * Resolution is lazy and memoised rather than run at boot. Boot-time initialisation looked
 * tempting — the `V$ROLLUP_VER` probe in `src/view/Home/Home.tsx` does exactly that — but it
 * is bypassable: `/view/*` renders DashboardView without ever mounting Home, and the public
 * dashboard boots from its own tree that imports nothing from `src/view`. Resolving on first
 * use means there is no boot site to forget, and no window in which one caller races another's
 * in-flight probe: everybody awaits the same promise.
 *
 * Servers older than v8.7 have neither `V$DATABASES` nor `CURRENT_DATABASE()`, so the query
 * fails and the legacy answer stands. That fallback is the entire version gate — nothing
 * downstream has to branch on a server version or cache one in localStorage.
 */

/**
 * `CURRENT_DATABASE()` returns only a name, so it is joined back to `V$DATABASES` to pick up
 * the id in the same round trip. It is preferred over `IS_DEFAULT = 1` because it describes
 * the session rather than the instance, which is what the manual recommends.
 */
const RESOLVE_SQL = 'select DATABASE_ID, NAME from V$DATABASES where NAME = CURRENT_DATABASE()';

let sPending: Promise<CurrentDatabase> | null = null;

const resolve = async (): Promise<CurrentDatabase> => {
    try {
        const { svrState, svrData } = await fetchQuery(RESOLVE_SQL);
        const sRow = svrState ? svrData?.rows?.[0] : undefined;
        if (sRow && sRow[0] !== undefined && sRow[0] !== null) {
            setCurrentDatabase({ id: Number(sRow[0]), name: String(sRow[1] ?? LEGACY_DATABASE.name) });
        }
    } catch {
        // Pre-v8.7 server, or the query endpoint is unreachable. Either way the legacy answer
        // is the best available one, and it is what the rest of the app already assumed.
    }
    return getCurrentDatabase();
};

/**
 * Await this before assembling SQL that mentions a database id or name.
 *
 * The repository functions that need it are already async, so it costs them one `await`.
 */
export const ensureCurrentDatabase = (): Promise<CurrentDatabase> => {
    if (!sPending) sPending = resolve();
    return sPending;
};

/** Test seam. Not used by application code. */
export const __resetCurrentDatabaseResolver = () => {
    sPending = null;
};

export { getCurrentDatabase, getCurrentDatabaseId, getCurrentDatabaseName, hasLogicalDatabases } from '@/utils/currentDatabaseState';
export type { CurrentDatabase } from '@/utils/currentDatabaseState';
