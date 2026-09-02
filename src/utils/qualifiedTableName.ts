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
