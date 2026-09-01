import { CurrentDatabase, DatabaseEntry, getCurrentDatabase, normalizeDatabaseId, setCurrentDatabase, setDatabases } from '@/utils/currentDatabaseState';

/**
 * Resolving which logical database a session is talking to — the logic, over a given transport.
 *
 * Resolution is lazy and memoised rather than run at boot. Boot-time initialisation looked
 * tempting — the `V$ROLLUP_VER` probe in `src/view/Home/Home.tsx` does exactly that — but it is
 * bypassable: `/view/*` renders DashboardView without ever mounting Home. Resolving on first use
 * means there is no boot site to forget, and no window in which one caller races another's
 * in-flight probe: everybody awaits the same promise.
 *
 * The transport is a parameter because the two trees do not share one. The editor sends a bearer
 * token to `/web/api/query`; the public dashboard is unauthenticated and goes to `/db/query`.
 * That is not a stylistic difference — measured against a v8.7 server, `/web/api/query` without a
 * token answers `401 missing authorization header`, and a resolver that swallowed that would
 * leave every public board believing it was on a pre-v8.7 single-database server: SQL scoped to
 * `DATABASE_ID = -1` returns nothing, and `getRollupTableList` falls back to a join that yields a
 * NULL `root_table`. `src/utils/dashboardBaseMinMax.ts` splits its fetchers for the same reason.
 *
 * Servers older than v8.7 have neither `V$DATABASES` nor `CURRENT_DATABASE()`, so the query fails
 * and the legacy answer stands. That fallback is the entire version gate — nothing downstream has
 * to branch on a server version or cache one in localStorage.
 */

/** The shape both trees' query helpers already return, narrowed to what the resolver reads. */
export type CurrentDatabaseQuery = (aSql: string) => Promise<{ svrState?: boolean; svrData?: { rows?: any[][] } } | undefined>;

/**
 * Every database the server knows, with the two attributes the tree needs about databases it is
 * not connected to: `KIND` (`ACTIVE` / `MOUNTED`) and `ACCESS_MODE` (`READ_WRITE` / `READ_ONLY`).
 * Those, not identity, decide whether a table may be written to.
 *
 * The id goes through `TO_CHAR` because a mounted database's is tagged in bit 62 and exceeds
 * `Number.MAX_SAFE_INTEGER` — as a JSON number it arrives rounded, and writing that back into SQL
 * matches no rows (see `DatabaseId`).
 *
 * `KIND` leads the ordering so mounted backups sit below the active databases — they are
 * read-only attachments, not places to work, and the tree renders this list in order.
 *
 * `DATABASE_ID` breaks the tie, which means the active group reads in creation order. That is
 * the useful property here rather than an accident of the key: MACHBASEDB is always first
 * because it always existed, and a database you just created lands at the bottom of the active
 * group — the one place you would look for it. Alphabetical by NAME was the alternative and
 * scans better in a long list, but it scatters new databases into the middle and pushes
 * MACHBASEDB below anything named earlier, and MACHBASEDB is where every session starts.
 *
 * Some tie-break is required either way: `KIND` alone leaves the active group in whatever order
 * the server happens to return (measured: MACHBASEDB, FACTORY_C, FACTORY_B, FACTORY_A), which
 * would move the tree around between refreshes.
 *
 * Columns are named rather than `select *`. The view carries four more — TABLESPACE_ID,
 * SOURCE_DATABASE_ID, CAN_USE, STATE — and, more to the point, `*` would hand back the raw
 * DATABASE_ID and undo the `TO_CHAR` above.
 */
const RESOLVE_SQL = 'select TO_CHAR(DATABASE_ID) as DATABASE_ID, NAME, KIND, ACCESS_MODE, IS_DEFAULT from V$DATABASES order by KIND, DATABASE_ID';

/**
 * Which of those rows is ours. The manual names `CURRENT_DATABASE()` the recommended check — it
 * describes the session rather than the instance, so it stays right even where `IS_DEFAULT` would
 * not. It returns a name only, which is why the list above supplies the id.
 */
const CURRENT_SQL = 'select CURRENT_DATABASE()';

/**
 * Builds the resolver over one tree's transport.
 *
 * The memo lives in this closure rather than in module scope so the two trees cannot resolve each
 * other's probe. The *state* they write to is deliberately shared (`currentDatabaseState`) —
 * there is only ever one of these trees on a page, and render-time consumers import the state
 * module directly.
 */
export const createCurrentDatabaseResolver = (aQuery: CurrentDatabaseQuery) => {
    let sPending: Promise<CurrentDatabase> | null = null;

    const resolve = async (): Promise<CurrentDatabase> => {
        try {
            const [sList, sCurrent] = await Promise.all([aQuery(RESOLVE_SQL), aQuery(CURRENT_SQL)]);
            const sRows: any[][] = sList?.svrState ? sList.svrData?.rows ?? [] : [];
            if (sRows.length) {
                const sEntries: DatabaseEntry[] = sRows.map((aRow) => ({
                    id: normalizeDatabaseId(aRow[0]),
                    name: String(aRow[1] ?? ''),
                    kind: String(aRow[2] ?? ''),
                    accessMode: String(aRow[3] ?? ''),
                    isDefault: Number(aRow[4]) === 1,
                }));
                setDatabases(sEntries);

                const sName = sCurrent?.svrState ? sCurrent.svrData?.rows?.[0]?.[0] : undefined;
                // Match on the name the session reports; fall back to the flagged default so a
                // server that answers the list but not CURRENT_DATABASE() still resolves.
                const sMatch = sEntries.find((aDb) => aDb.name === String(sName ?? '')) ?? sEntries.find((aDb) => aDb.isDefault);
                if (sMatch) setCurrentDatabase({ id: sMatch.id, name: sMatch.name });
            }
        } catch {
            // Pre-v8.7 server, or the query endpoint is unreachable. Either way the legacy answer
            // is the best available one, and it is what the rest of the app already assumed.
            //
            // Rethrown so `ensureCurrentDatabase` can drop the memo: the answer is cached for
            // the life of the page, and a transient blip would otherwise persist. That matters
            // more than it used to, because `isDatabaseWritable` now reads an unresolved
            // catalogue as "not writable" — a single failed request would grey out DROP, rollup
            // and metadata editing across the explorer with nothing on screen to explain it.
            throw new Error('current database probe failed');
        }
        return getCurrentDatabase();
    };

    return {
        /**
         * Await this before assembling SQL that mentions a database id or name, and before any
         * synchronous read of the catalogue — `isMountedTableName`, `isDatabaseWritable` — that
         * would otherwise answer from an empty list.
         */
        ensureCurrentDatabase: (): Promise<CurrentDatabase> => {
            if (!sPending) {
                sPending = resolve().catch(() => {
                    // Let the next caller try again rather than caching the failure, and hand
                    // this one the legacy answer so nothing downstream has to handle a rejection.
                    sPending = null;
                    return getCurrentDatabase();
                });
            }
            return sPending;
        },
        /** Test seam. Not used by application code. */
        reset: () => {
            sPending = null;
        },
    };
};
