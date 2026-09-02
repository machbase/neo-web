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
    id: DatabaseId;
    name: string;
};

/** What every pre-v8.7 server means, and what we assume until the resolver says otherwise. */
export const LEGACY_DATABASE: CurrentDatabase = { id: '-1', name: 'MACHBASEDB' };

/**
 * A database id as decimal text — the only form that survives the trip from the server.
 *
 * `DATABASE_ID` is int64, and v8.7 tags a mounted database's id in bit 62: `MOUNT_DDD` reports
 * `4611686018427387913`. That exceeds `Number.MAX_SAFE_INTEGER`, and JSON has only one numeric
 * type, so `JSON.parse` rounds the value to `4611686018427388000` before any of our code sees
 * it. Nothing downstream can undo that — writing the rounded id back into SQL matches no rows
 * at all, and two mounts less than 1024 apart collapse onto the same JavaScript number.
 *
 * So the queries that *produce* an id select `TO_CHAR(DATABASE_ID)` and we carry the digits as
 * a string from there on. Interpolating a string back into SQL yields the same bare literal a
 * number would, so only the comparisons had to change.
 *
 * This covers the statements the front end writes itself. Results of user-typed SQL — the SQL
 * editor, TQL — still show the rounded value, which needs the server to stop sending
 * out-of-range int64 as a JSON number.
 */
export type DatabaseId = string;

/** Whatever a caller happens to hold — string from TO_CHAR, number from a legacy row — as text. */
export const normalizeDatabaseId = (aId: unknown): DatabaseId => String(aId ?? '').trim();

/**
 * Do these two ids name the same database?
 *
 * An absent id answers `false`: "unknown" is not "the current one", and the callers that ask
 * this are choosing between a local shortcut and a fully qualified name, where the qualified
 * form is the safe default.
 */
export const isSameDatabaseId = (aLeft: unknown, aRight: unknown): boolean => {
    const sLeft = normalizeDatabaseId(aLeft);
    return sLeft !== '' && sLeft === normalizeDatabaseId(aRight);
};

/**
 * One row of `V$DATABASES`, for the questions that are about a database other than the
 * current one — chiefly "may I run DDL against a table I see in the tree?".
 *
 * The manual answers that with `ACCESS_MODE`, not with identity: a READ ONLY database
 * "조회할 수 있지만 쓰기 DML, append와 변경 DDL을 실행할 수 없습니다", and a mounted database
 * "는 항상 READ ONLY" and holds only the `USAGE` privilege. So writability, not "is this the
 * database I am connected to", is what gates destructive actions — another *active*
 * READ_WRITE database accepts DDL perfectly well through a three-part name.
 */
export type DatabaseEntry = {
    id: DatabaseId;
    name: string;
    /** `ACTIVE` for a logical database, `MOUNTED` for an attached backup. */
    kind: string;
    /** `READ_WRITE` or `READ_ONLY`. */
    accessMode: string;
    isDefault: boolean;
    /**
     * `V$DATABASES.CAN_USE` — may this session make the database its target?
     *
     * Distinct from `accessMode`: a MOUNTED backup is queryable through a three-part name but
     * reports `CAN_USE = 0`, and `use()` on it answers *MACHCLI-ERR-2840, … is not an active
     * database*. Undefined on any server or fixture that did not report the column, which callers
     * read as "no reason to think otherwise".
     */
    canUse?: boolean;
};

let sCurrent: CurrentDatabase = LEGACY_DATABASE;
let sDatabases: DatabaseEntry[] = [];

/**
 * The database this session is talking to, for callers that cannot await.
 *
 * Returns the legacy answer until the resolver settles, which is the same answer the code
 * assumed before v8.7 — so an early read degrades to the old behaviour rather than to garbage.
 * Anything that builds SQL should await `ensureCurrentDatabase()` instead.
 */
export const getCurrentDatabase = (): CurrentDatabase => sCurrent;

export const getCurrentDatabaseId = (): DatabaseId => sCurrent.id;

export const getCurrentDatabaseName = (): string => sCurrent.name;

/** True when the server reports logical databases at all — i.e. it is v8.7 or newer. */
export const hasLogicalDatabases = (): boolean => sCurrent.id !== LEGACY_DATABASE.id;

/**
 * Every database the server reports, or an empty list on a server without `V$DATABASES`.
 *
 * Empty is not "no databases" but "we could not ask" — callers treat it as "assume the old
 * single-database world" rather than as a reason to disable everything.
 */
export const getDatabases = (): DatabaseEntry[] => sDatabases;

export const findDatabaseById = (aId: unknown): DatabaseEntry | undefined => {
    const sId = normalizeDatabaseId(aId);
    if (!sId) return undefined;
    return sDatabases.find((aDb) => aDb.id === sId);
};

/**
 * Lookup by name, for the places that only ever carry one — the explorer's database node, for
 * instance. Names are compared case-insensitively because the catalogue and the UI do not
 * always agree on case.
 *
 * Ids work as keys too, now that they are carried as text (see `DatabaseId`) — but only where
 * the value came from a `TO_CHAR(DATABASE_ID)` query. A row that reached us as a JSON number
 * has already been rounded, and a name is the safer key when the provenance is unclear.
 */
export const findDatabaseByName = (aName: string | undefined | null): DatabaseEntry | undefined => {
    const sName = String(aName ?? '').trim().toUpperCase();
    if (!sName) return undefined;
    return sDatabases.find((aDb) => aDb.name.toUpperCase() === sName);
};

/**
 * May a table in this database be created, altered or dropped?
 *
 * With a catalogue the answer comes off `KIND` / `ACCESS_MODE`, which is the question that
 * actually matters: another *active* READ_WRITE database takes DDL through a three-part name,
 * while a mounted backup is always READ ONLY and carries only `USAGE`.
 *
 * Without one the fallback is the identity test these callers ran before the catalogue
 * existed, not a blanket "yes". `sDatabases` is empty on every pre-v8.7 server and on any
 * server whose probe failed, and answering "writable" there looks harmless only because a
 * pre-v8.7 server's own tables all report -1 — a *mounted* row reports its `BACKUP_TBSID`
 * instead, so a blanket yes would newly offer DROP, metadata editing and rollup editing on a
 * read-only backup that the `=== -1` tests had always refused.
 */
export const isDatabaseWritable = (aId: unknown): boolean => {
    const sDb = findDatabaseById(aId);
    if (sDb) return sDb.accessMode !== 'READ_ONLY' && sDb.kind !== 'MOUNTED';
    return isSameDatabaseId(aId, sCurrent.id);
};

/** True only when the database is known to be an attached backup. */
export const isMountedDatabase = (aId: unknown): boolean => findDatabaseById(aId)?.kind === 'MOUNTED';

/** True only when the named database is known to be an attached backup. */
export const isMountedDatabaseName = (aName: string | undefined | null): boolean => findDatabaseByName(aName)?.kind === 'MOUNTED';

/** Called by the resolver. Not application code. */
export const setCurrentDatabase = (aDatabase: CurrentDatabase) => {
    sCurrent = aDatabase;
};

/** Called by the resolver. Not application code. */
export const setDatabases = (aList: DatabaseEntry[]) => {
    sDatabases = aList;
};

/** Test seam. Not used by application code. */
export const resetCurrentDatabase = () => {
    sCurrent = LEGACY_DATABASE;
    sDatabases = [];
};
