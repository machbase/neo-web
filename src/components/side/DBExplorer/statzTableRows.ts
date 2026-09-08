import moment from 'moment';

/**
 * Display formatting for a `V$<TABLE>_STAT` result read with `SELECT *`.
 *
 * The Info panel used to name the nine columns it wanted and wrap the datetime ones in `TO_CHAR`.
 * That cannot work any more: the view's axis columns are named after what the table's BASETIME
 * column measures, so a distance table answers `MACHCLI-ERR-2056, Column name (MIN_TIME) not found`
 * for the very SELECT that reads a time table, and the panel showed nothing but "N/A". `SELECT *`
 * asks the view what it has instead of telling it, which also keeps the panel working if the view
 * gains a column later — and the server's own column order is the order the panel already showed
 * (NAME, ROW_COUNT, min, max, MIN_VALUE, min-at, MAX_VALUE, max-at, recent).
 *
 * What `TO_CHAR` was doing has to happen here now. A datetime arrives as a nanosecond epoch integer,
 * which would otherwise render as 1788134400000000000. A distance table's axis columns are DOUBLE,
 * LONG or ULONG — numbers that are already the answer — so they pass through untouched, which is the
 * whole reason this keys on the declared type rather than on the column name.
 */
const NANOSECONDS_PER_MILLISECOND = 1000000;

export const STATZ_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const isDateTimeType = (aType: unknown) => String(aType ?? '').trim().toLowerCase().startsWith('datetime');

/**
 * One datetime cell as text. Anything this cannot read as an epoch is returned unchanged — a server
 * that formats the timestamp itself sends a string that is already the answer, and a NULL (no rows
 * for that tag yet, or no summarized column behind `MIN_VALUE_DISTANCE`) has to stay NULL so the
 * table renders it as one instead of as the epoch.
 */
export const formatStatzDateTimeCell = (aValue: unknown) => {
    if (aValue === null || aValue === undefined) return aValue;
    const sNumeric = typeof aValue === 'number' ? aValue : /^\d+$/.test(String(aValue).trim()) ? Number(String(aValue).trim()) : Number.NaN;
    if (!Number.isFinite(sNumeric)) return aValue;

    const sMoment = moment(sNumeric / NANOSECONDS_PER_MILLISECOND);
    return sMoment.isValid() ? sMoment.format(STATZ_TIME_FORMAT) : aValue;
};

/** The same result, with every datetime column rendered as text. Columns and types are untouched. */
export const formatStatzResult = (aData: any) => {
    if (!aData || !Array.isArray(aData.rows) || !Array.isArray(aData.types)) return aData;

    const sTimeColumns: boolean[] = aData.types.map(isDateTimeType);
    if (!sTimeColumns.some(Boolean)) return aData;

    return {
        ...aData,
        rows: aData.rows.map((aRow: any) => (Array.isArray(aRow) ? aRow.map((aCell: unknown, aIndex: number) => (sTimeColumns[aIndex] ? formatStatzDateTimeCell(aCell) : aCell)) : aRow)),
    };
};
