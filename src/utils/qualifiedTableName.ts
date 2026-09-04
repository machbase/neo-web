import { findDatabaseByName, getCurrentDatabaseName } from '@/utils/currentDatabaseState';

/**
 * Qualifying a table name that may already be qualified.
 *
 * Panel and chart configs carry a table as two loose fields: `table`, which may be bare
 * (`SENSOR`) or already carry its owner and database (`FACTORY_A.SYS.SENSOR`), and `userName`,
 * which is meaningful only in the first case. Prefixing unconditionally is wrong in the second
 * — it produces `SYS.FACTORY_A.SYS.SENSOR`, which resolves to nothing.
 *
 * Two places in the tree already guard against that (`combineTableUser` in dashboardTimeMinMax,
 * `getBlockTableName` in Block.tsx). This is the same rule in one place, so the sites that
 * lacked it stop being the odd ones out.
 *
 * Why it matters more on v8.7: a bare or owner-only name resolves against the *current*
 * database. With several databases on one server, the same table name can exist in each, so an
 * under-qualified name reads the wrong table without raising an error.
 */

/**
 * `database.owner.object`, skipping any part the row did not carry.
 *
 * Emitting an empty segment (`.SYS.TAG`) would resolve to nothing, so a missing database or
 * owner shortens the name rather than corrupting it — which is also what a pre-v8.7 response
 * looks like, where there is no database column to read.
 *
 * Lives here rather than beside its callers because both `src/utils` and the standalone
 * `src/public-dashboard` tree qualify table rows, and the two copies had already drifted: one
 * emitted three parts unconditionally while the other still shortened names for the current
 * database, which is exactly the ambiguity v8.7 introduced.
 */
export const qualifyThreePart = (aDb: unknown, aUser: unknown, aTable: unknown): string =>
    [aDb, aUser, aTable]
        .map((aPart) => String(aPart ?? '').trim())
        .filter(Boolean)
        .join('.');

/**
 * A qualified name split into what a picker should show: the table's own name, and the parts
 * that qualify it.
 *
 * `database.owner.table` is 225-277px wide at 13px Pretendard, against 118px of usable width in
 * the dashboard's Table field — one line showed `MACHBASEDB.SYS.` and no table name at all. The
 * qualifying parts are still needed, because the same table name can exist in several databases
 * and under several owners, so they move to a second line instead of being dropped.
 *
 * Shorter names degrade rather than break: `SYS.TAG` describes as `SYS`, a bare `TAG` as nothing.
 */
export const splitQualifiedTableName = (aName: string | undefined | null): { label: string; description: string } => {
    const sName = String(aName ?? '').trim();
    const sSegments = sName.split('.');
    const sLabel = sSegments.pop() ?? '';
    return { label: sLabel || sName, description: sSegments.join(' · ') };
};

/** True when the name already carries at least an owner. */
export const isQualifiedTableName = (aTable: string | undefined | null): boolean => String(aTable ?? '').includes('.');

/**
 * `table` if it is already qualified, otherwise `owner.table`.
 *
 * Returns the table alone when there is no owner to add, rather than emitting a leading dot.
 */
export const qualifyTableName = (aUserName: string | undefined | null, aTable: string | undefined | null): string => {
    const sTable = String(aTable ?? '').trim();
    const sUser = String(aUserName ?? '').trim();
    if (!sTable) return '';
    if (isQualifiedTableName(sTable) || !sUser) return sTable;
    return `${sUser}.${sTable}`;
};

/**
 * A sibling object in the same database and owner — the `V$X_STAT` view, the `_X_META` table.
 *
 * The decoration belongs to the last segment only. Wrapping a qualified name whole would give
 * `V$FACTORY_A.SYS.SENSOR_STAT`, naming a database that does not exist.
 */
export const qualifySiblingObject = (
    aUserName: string | undefined | null,
    aTable: string | undefined | null,
    aDecorate: (aBareName: string) => string
): string => {
    const sQualified = qualifyTableName(aUserName, aTable);
    if (!sQualified) return '';
    const sParts = sQualified.split('.');
    sParts[sParts.length - 1] = aDecorate(sParts[sParts.length - 1]);
    return sParts.join('.');
};

/**
 * Does a stored table name refer to this fully qualified one?
 *
 * Panel configs written before v8.7 hold whatever was unambiguous at the time — `SENSOR`, or
 * `SYS.SENSOR`. Table-list rows are `database.owner.table` on every server now, so an exact
 * comparison stopped matching those configs, and a panel that cannot find its own row loses
 * its column list.
 *
 * A stored name matches when it is the tail of the qualified one at a segment boundary, which
 * is the same shortening the engine itself accepts. The boundary matters: without the dot,
 * `SENSOR` would also match `HEAT_SENSOR`.
 *
 * Comparison is exact-case, as the equality it replaces was — both sides originate in the
 * catalogue, which reports upper case.
 */
export const matchesQualifiedName = (aQualified: string | undefined | null, aStored: string | undefined | null): boolean => {
    const sQualified = String(aQualified ?? '').trim();
    const sStored = String(aStored ?? '').trim();
    if (!sQualified || !sStored) return false;
    return sQualified === sStored || sQualified.endsWith(`.${sStored}`);
};

/**
 * Does this qualified name point into a mounted backup?
 *
 * The tree used to answer that by counting dots — three parts meant a mounted database,
 * because nothing else was ever qualified that far. v8.7 makes every name three parts, so the
 * count no longer distinguishes anything; the catalogue does, through `V$DATABASES.KIND`.
 *
 * It matters because a mounted database has no `V$<TABLE>_STAT` view (measured: querying one
 * answers `ERR-2025 Table ... does not exist`), so callers must fall back to scanning for
 * min/max instead of reading the precomputed statistics.
 */
export const isMountedTableName = (aTable: string | undefined | null): boolean => {
    const sParts = String(aTable ?? '').split('.');
    if (sParts.length < 3) return false;
    const sDb = findDatabaseByName(sParts[0]);
    if (sDb) return sDb.kind === 'MOUNTED';
    // The catalogue cannot answer: a pre-v8.7 server has no `V$DATABASES`, and the probe can
    // also simply fail. The dot count is no longer a usable stand-in — every name is three
    // parts on both engines now — but the name still is. Pre-v8.7 the only database that was
    // not a mounted backup was the one the session is in, which reports itself as MACHBASEDB;
    // this is the same rule `getRollupMatch` applies. Answering "not mounted" here instead
    // sent a mounted table to `V$<TABLE>_STAT`, which does not exist there (ERR-2025).
    return sParts[0].trim().toUpperCase() !== getCurrentDatabaseName().trim().toUpperCase();
};

/**
 * May `V$<TABLE>_STAT` be read for this table?
 *
 * The tree used to ask `isMountedTableName` here, on the reasoning that a mounted backup is the
 * only database without the view. Measured against a v8.7 server from a MACHBASEDB session, that
 * is not what the engine does — the view is unreachable through *any* three-part name, and the two
 * cases fail differently:
 *
 *   select * from SYS.V$DEMO_TAG_STAT            -> 2 rows
 *   select * from FACTORY_A.SYS.V$DEMO_TAG_STAT  -> MACHCLI-ERR-3031, Protocol error
 *   select * from EEEEE.SYS.V$DEMO_TAG_STAT      -> MACHCLI-ERR-2025, Table ... does not exist
 *
 * FACTORY_A is an ordinary active database and `V$TABLES` lists the view in it, so its absence is
 * not a catalogue fact the way the mounted one's is; the name simply does not resolve across
 * databases. Either way the caller must scan the source table instead, so both answer `false`
 * here and the mounted test is absorbed rather than kept alongside.
 *
 * A name with fewer than three parts belongs to the session's own database, which is exactly where
 * the view does work — that is the fast path, and it stays the default for every pre-v8.7 name.
 */
export const isStatViewReadable = (aTable: string | undefined | null): boolean => {
    const sParts = String(aTable ?? '').split('.');
    if (sParts.length < 3) return true;
    return sParts[0].trim().toUpperCase() === getCurrentDatabaseName().trim().toUpperCase();
};

/**
 * What a stored table name refers to, once the current table list is known.
 *
 * A `.taz` board, a dashboard hand-off and the table list are written at different times and do not
 * agree on how much of a name to carry: files saved before v8.7 hold `SENSOR` or `SYS.SENSOR`,
 * while every row of the list is `database.owner.table` now. Comparing them as strings — which is
 * what the series editor did — fails on that difference alone, and the editor's response was to
 * silently swap in the first table of the list, so a board opened after the upgrade charted
 * somebody else's data under its own title.
 *
 * `matchesQualifiedName` is the same tail rule the engine accepts, so a short stored name is
 * *promoted* to the full one rather than discarded. What is new here is the ambiguity that v8.7
 * introduces: `SYS.ATABLE` now matches a row in three databases at once. The session's own database
 * breaks that tie, because a short name is exactly what the engine would have resolved there.
 *
 * `missing` and `ambiguous` are reported rather than repaired. There is no name that means what the
 * board intended, and choosing one anyway is the failure this function exists to remove.
 */
export type ResolvedTableName =
    /** The stored name is already a row of the list. */
    | { status: 'exact'; name: string }
    /** A shorter stored name resolved to exactly one row — `name` is the qualified form. */
    | { status: 'promoted'; name: string }
    /** Several rows match and none is in the session database. `name` is the stored name, unchanged. */
    | { status: 'ambiguous'; name: string; candidates: string[] }
    /** Nothing in the list matches. `name` is the stored name, unchanged. */
    | { status: 'missing'; name: string };

export const resolveStoredTableName = (
    aStored: string | undefined | null,
    aAvailable: readonly string[]
): ResolvedTableName => {
    const sStored = String(aStored ?? '').trim();
    if (!sStored) return { status: 'missing', name: '' };
    if (aAvailable.includes(sStored)) return { status: 'exact', name: sStored };

    const sCandidates = aAvailable.filter((aName) => matchesQualifiedName(aName, sStored));
    if (sCandidates.length === 0) return { status: 'missing', name: sStored };
    if (sCandidates.length === 1) return { status: 'promoted', name: sCandidates[0] };

    // The engine resolves a short name against the database the session is in, so that is the
    // reading the board had when it was saved — not a guess.
    const sCurrentDb = getCurrentDatabaseName().trim().toUpperCase();
    const sInCurrent = sCandidates.filter((aName) => {
        const sParts = aName.split('.');
        return sParts.length >= 3 && sParts[0].trim().toUpperCase() === sCurrentDb;
    });
    if (sInCurrent.length === 1) return { status: 'promoted', name: sInCurrent[0] };
    return { status: 'ambiguous', name: sStored, candidates: sCandidates };
};
