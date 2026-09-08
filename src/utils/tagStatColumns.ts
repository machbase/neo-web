/**
 * The axis columns of a tag table's `V$<TABLE>_STAT` view.
 *
 * The view names its columns after what the table's BASETIME column measures, and the two sets are
 * mutually exclusive — asking for the wrong one is not a wrong answer, it is `MACHCLI-ERR-2056,
 * Column name (...) not found`. Measured against a server carrying the base-distance stat support:
 *
 *   select * from V$DEMO_TAG_STAT          -> NAME, ROW_COUNT, MIN_TIME, MAX_TIME, MIN_VALUE,
 *                                             MIN_VALUE_TIME, MAX_VALUE, MAX_VALUE_TIME,
 *                                             RECENT_ROW_TIME          (datetime)
 *   select * from V$DISTANCE_SENSOR_STAT   -> NAME, ROW_COUNT, MIN_DISTANCE, MAX_DISTANCE,
 *                                             MIN_VALUE, MIN_VALUE_DISTANCE, MAX_VALUE,
 *                                             MAX_VALUE_DISTANCE, RECENT_ROW_DISTANCE
 *   select min(MIN_TIME) from V$DISTANCE_SENSOR_STAT  -> MACHCLI-ERR-2056
 *   select min(MIN_DISTANCE) from V$DEMO_TAG_STAT     -> MACHCLI-ERR-2056
 *
 * The distance columns carry the base column's own declared type — DOUBLE, LONG or ULONG, the three
 * types a BASE DISTANCE column may have — so `MIN_DISTANCE` comes back as `double`, `int64` or
 * `uint64` and always in the column's own unit. Nothing here needs reinterpreting: an earlier server
 * published a distance extent through the *time* columns as the raw eight bytes of a double, and the
 * bit-pattern arithmetic that undid that is gone with it.
 */
export type TagStatBaseKind = 'time' | 'distance';

export interface TagStatAxisColumns {
    /** Per-tag minimum of the base column. */
    min: string;
    /** Per-tag maximum of the base column. */
    max: string;
    /** Where the minimum summarized value occurred. NULL when the table has no summarized column. */
    minValueAt: string;
    /** Where the maximum summarized value occurred. NULL when the table has no summarized column. */
    maxValueAt: string;
    /** The base value of the most recently appended row. */
    recent: string;
}

const TIME_AXIS_COLUMNS: TagStatAxisColumns = {
    min: 'MIN_TIME',
    max: 'MAX_TIME',
    minValueAt: 'MIN_VALUE_TIME',
    maxValueAt: 'MAX_VALUE_TIME',
    recent: 'RECENT_ROW_TIME',
};

const DISTANCE_AXIS_COLUMNS: TagStatAxisColumns = {
    min: 'MIN_DISTANCE',
    max: 'MAX_DISTANCE',
    minValueAt: 'MIN_VALUE_DISTANCE',
    maxValueAt: 'MAX_VALUE_DISTANCE',
    recent: 'RECENT_ROW_DISTANCE',
};

/** The stat view's axis columns for a base kind. Anything but `'distance'` is read as time. */
export const tagStatAxisColumns = (aBaseKind: TagStatBaseKind | undefined): TagStatAxisColumns =>
    aBaseKind === 'distance' ? DISTANCE_AXIS_COLUMNS : TIME_AXIS_COLUMNS;

/** The kind a stat query should be retried as, when the view turned out to hold the other set. */
export const otherTagStatBaseKind = (aBaseKind: TagStatBaseKind | undefined): TagStatBaseKind =>
    aBaseKind === 'distance' ? 'time' : 'distance';

/**
 * The aggregated extent of a tag set, as a SELECT list.
 *
 * Aggregated rather than plain `MIN_x, MAX_x` for two reasons. A tag set wider than one tag has one
 * stat row per tag, so the extent is the aggregate across them; and on a cluster the view answers a
 * row per warehouse, so even a single tag can arrive several times. Both cases collapse to the one
 * row the callers all read as `rows[0]`.
 */
export const buildTagStatExtentSelect = (aBaseKind: TagStatBaseKind | undefined, aMinAlias: string, aMaxAlias: string) => {
    const sColumns = tagStatAxisColumns(aBaseKind);
    return `min(${sColumns.min}) as ${aMinAlias}, max(${sColumns.max}) as ${aMaxAlias}`;
};

/**
 * Did this query fail because the stat view holds the other kind's axis columns?
 *
 * Two situations produce it, and both want the same recovery — ask again for the other set. A block
 * whose persisted schema is too old to say which axis it has guesses wrong; and a server that
 * predates the base-distance stat columns answers ERR-2056 for every one of them, which the retry
 * turns back into the time columns it does publish.
 */
export const isMissingStatColumnError = (aReason: unknown) => /ERR-2056|column name\s*\(?[^)]*\)?\s*not found/i.test(String(aReason ?? ''));
