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
 * Servers older than v8.7 have no `V$DATABASES` at all, so the query fails and the legacy answer
 * stands. That fallback is the entire version gate — nothing downstream has
 * to branch on a server version or cache one in localStorage.
 */

/** The shape both trees' query helpers already return, narrowed to what the resolver reads. */
export type CurrentDatabaseQuery = (aSql: string) => Promise<{ svrState?: boolean; svrData?: { rows?: any[][] } } | undefined>;

/**
 * Every database the server knows, with the two attributes the tree needs about databases it is
 * not connected to: `KIND` (`ACTIVE` / `MOUNTED`) and `ACCESS_MODE` (`READ_WRITE` / `READ_ONLY`).
 * Those, not identity, decide whether a table may be written to.
 *
 * `DATABASE_ID` is read as the plain column. It used to go through `TO_CHAR`: v8.7 tagged a
 * mounted database's id in bit 62, so `MOUNT_DDD` reported `4611686018427387913` — past
 * `Number.MAX_SAFE_INTEGER`, so `JSON.parse` handed it over already rounded and writing it back
 * into SQL matched no rows. The server now generates ids inside int32 and the tag has moved to
 * bit 30: measured on engine dev-4158, a mounted `AA2` reports `1073741825` (2^30 + 1), which
 * survives JSON exactly. Ids are still carried as text (see `DatabaseId`) — `normalizeDatabaseId`
 * absorbs the number form this column now returns.
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
 * That tie-break needs the plain column rather than an aliased expression. `TO_CHAR(DATABASE_ID)
 * as DATABASE_ID` makes `order by DATABASE_ID` bind to the alias and sort as text — measured,
 * that returned `1, 1073741825, 2, 5, 6`. Harmless while every active id is one digit, wrong the
 * moment a server holds ten of them.
 *
 * `CAN_USE` is the server's own answer to "may this session make this database its target", and it
 * is not derivable from the other columns: measured on v8.7 as SYS, a MOUNTED database reports
 * `CAN_USE = 0` while its STATE is still NORMAL, and `use()` on it fails with
 * *MACHCLI-ERR-2840, Database (AA2) is not an active database.*
 *
 * Columns are named rather than `select *`. The view carries three more — TABLESPACE_ID,
 * SOURCE_DATABASE_ID, STATE — that nothing here reads, and naming them keeps the row indices
 * below tied to this statement rather than to whatever order the view happens to declare.
 */
const RESOLVE_SQL = 'select DATABASE_ID, NAME, KIND, ACCESS_MODE, IS_DEFAULT, CAN_USE from V$DATABASES order by KIND, DATABASE_ID';

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
            const sList = await aQuery(RESOLVE_SQL);
            const sRows: any[][] = sList?.svrState ? sList.svrData?.rows ?? [] : [];
            if (sRows.length) {
                const sEntries: DatabaseEntry[] = sRows.map((aRow) => ({
                    id: normalizeDatabaseId(aRow[0]),
                    name: String(aRow[1] ?? ''),
                    kind: String(aRow[2] ?? ''),
                    accessMode: String(aRow[3] ?? ''),
                    isDefault: Number(aRow[4]) === 1,
                    canUse: Number(aRow[5]) === 1,
                }));
                setDatabases(sEntries);

                // `IS_DEFAULT` alone, because this transport has no way to be anywhere else.
                // `CURRENT_DATABASE()` used to be asked alongside — it describes the session while
                // `IS_DEFAULT` describes the instance — but measured against a v8.7 server the two
                // agree, and there is no mechanism to make them diverge here: `M$SYS_USERS` carries
                // no per-user default (USER_ID, NAME, PWD_POLICY_LEVEL, VALID_BEFORE) and only TQL's
                // `use()` moves a session, which this plain `/query` transport never sends.
                const sMatch = sEntries.find((aDb) => aDb.isDefault);
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
        /**
         * Ask the server again, for the callers that must not read a page-old catalogue — the SQL
         * editor's database chip re-reads on every open, so a database another session created,
         * dropped, mounted or unmounted shows up without a refresh.
         *
         * A failure here keeps the catalogue that is already loaded. Emptying it would be far worse
         * than a stale list: `sDatabases` is global, `isDatabaseWritable` reads an empty list as
         * "not writable", and DROP, rollup editing and metadata editing would grey out across the
         * whole explorer with nothing on screen to explain it. The memo is dropped instead, so the
         * next `ensureCurrentDatabase()` retries.
         */
        refreshDatabases: (): Promise<CurrentDatabase> => {
            const sNext = resolve().catch(() => {
                if (sPending === sNext) sPending = null;
                return getCurrentDatabase();
            });
            sPending = sNext;
            return sNext;
        },
        /** Test seam. Not used by application code. */
        reset: () => {
            sPending = null;
        },
    };
};
