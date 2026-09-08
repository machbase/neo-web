import { formatStatzDateTimeCell, formatStatzResult } from './statzTableRows';

/**
 * The Info panel reads `V$<TABLE>_STAT` with `SELECT *` because the view's axis columns are named
 * after what the table's base column measures. Formatting therefore has to key on the declared type
 * rather than on a fixed list of column names.
 *
 * Both fixtures are rows the live server actually answers.
 */
const timeStat = {
    columns: ['NAME', 'ROW_COUNT', 'MIN_TIME', 'MAX_TIME', 'MIN_VALUE', 'MIN_VALUE_TIME', 'MAX_VALUE', 'MAX_VALUE_TIME', 'RECENT_ROW_TIME'],
    types: ['string', 'uint64', 'datetime', 'datetime', 'double', 'datetime', 'double', 'datetime', 'datetime'],
    rows: [['temp.line1', 503, 1788134400000000000, 1788246939452751104, 17.103, 1788242379452751104, 24.898, 1788225399452751104, 1788246939452751104]],
};

const distanceStat = {
    columns: ['NAME', 'ROW_COUNT', 'MIN_DISTANCE', 'MAX_DISTANCE', 'MIN_VALUE', 'MIN_VALUE_DISTANCE', 'MAX_VALUE', 'MAX_VALUE_DISTANCE', 'RECENT_ROW_DISTANCE'],
    types: ['string', 'uint64', 'double', 'double', 'double', 'double', 'double', 'double', 'double'],
    rows: [['SENSOR_01', 100000, 0, 999990, null, null, null, null, 999990]],
};

describe('formatStatzDateTimeCell', () => {
    test('renders a nanosecond epoch as a timestamp', () => {
        expect(formatStatzDateTimeCell(1788134400000000000)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    // A server that formats the timestamp itself has already answered the question.
    test('leaves an already-formatted value alone', () => {
        expect(formatStatzDateTimeCell('2026-04-08 03:42:08')).toBe('2026-04-08 03:42:08');
    });

    // NULL is a fact about the data — no rows yet, or no summarized column behind MIN_VALUE_TIME —
    // and rendering it as the epoch would claim a reading that does not exist.
    test('keeps NULL as NULL', () => {
        expect(formatStatzDateTimeCell(null)).toBeNull();
        expect(formatStatzDateTimeCell(undefined)).toBeUndefined();
    });
});

describe('formatStatzResult', () => {
    test('formats every datetime column of a time-base stat row', () => {
        const [row] = formatStatzResult(timeStat).rows;
        // NAME, ROW_COUNT and the two DOUBLE values are untouched; the five datetimes are text.
        expect(row[0]).toBe('temp.line1');
        expect(row[1]).toBe(503);
        expect(row[4]).toBe(17.103);
        [2, 3, 5, 7, 8].forEach((index) => expect(row[index]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/));
    });

    // The distance columns are DOUBLE / LONG / ULONG — numbers in the base column's own unit. Read
    // as an epoch, 999990 would render as 1970-01-01, which is the bug this keys on types to avoid.
    test('leaves a distance-base stat row exactly as it came', () => {
        const formatted = formatStatzResult(distanceStat);
        expect(formatted.rows[0]).toEqual(['SENSOR_01', 100000, 0, 999990, null, null, null, null, 999990]);
        expect(formatted).toBe(distanceStat);
    });

    // The columns and their declared types are what the table renders its header and alignment
    // from, so the formatting must not disturb them.
    test('keeps columns and types intact', () => {
        const formatted = formatStatzResult(timeStat);
        expect(formatted.columns).toEqual(timeStat.columns);
        expect(formatted.types).toEqual(timeStat.types);
    });

    test('passes through a result it cannot read', () => {
        expect(formatStatzResult(undefined)).toBeUndefined();
        expect(formatStatzResult({ rows: [[1]] })).toEqual({ rows: [[1]] });
    });
});
