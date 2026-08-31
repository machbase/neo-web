/**
 * Which logical database are we talking to? — the value, with no way to fetch it.
 *
 * Before v8.7 there was only one database and every table reported `DATABASE_ID = -1`, so the
 * front end wrote that -1 straight into SQL and compared against it in render code. v8.7
 * introduced real databases (MACHBASEDB is 1, further ones get 2, 3, …) and the old constant
 * now matches nothing.
 *
 * The resolver lives in `@/api/repository/currentDatabase` because it needs the query
 * endpoint. This module deliberately imports nothing: `src/utils` is imported *by* the
 * repository layer, so holding the state here — rather than in the module that fetches it —
 * keeps render-time consumers in `src/utils` from creating an import cycle.
 */
export type CurrentDatabase = {
    /** `DATABASE_ID` as the catalogue reports it. `-1` on servers without logical databases. */
    id: number;
    name: string;
};

/** What every pre-v8.7 server means, and what we assume until the resolver says otherwise. */
export const LEGACY_DATABASE: CurrentDatabase = { id: -1, name: 'MACHBASEDB' };

let sCurrent: CurrentDatabase = LEGACY_DATABASE;

/**
 * The database this session is talking to, for callers that cannot await.
 *
 * Returns the legacy answer until the resolver settles, which is the same answer the code
 * assumed before v8.7 — so an early read degrades to the old behaviour rather than to garbage.
 * Anything that builds SQL should await `ensureCurrentDatabase()` instead.
 */
export const getCurrentDatabase = (): CurrentDatabase => sCurrent;

export const getCurrentDatabaseId = (): number => sCurrent.id;

export const getCurrentDatabaseName = (): string => sCurrent.name;

/** True when the server reports logical databases at all — i.e. it is v8.7 or newer. */
export const hasLogicalDatabases = (): boolean => sCurrent.id !== -1;

/** Called by the resolver. Not application code. */
export const setCurrentDatabase = (aDatabase: CurrentDatabase) => {
    sCurrent = aDatabase;
};

/** Test seam. Not used by application code. */
export const resetCurrentDatabase = () => {
    sCurrent = LEGACY_DATABASE;
};
