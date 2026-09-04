import { buildTagStatExtentSelect, isMissingStatColumnError, otherTagStatBaseKind, tagStatAxisColumns } from './tagStatColumns';

/**
 * `V$<TABLE>_STAT` names its axis columns after what the table's base column measures, and the two
 * sets are mutually exclusive. Measured against a server with base-distance stat support:
 *
 *   select * from V$DEMO_TAG_STAT         -> ... MIN_TIME, MAX_TIME, MIN_VALUE, MIN_VALUE_TIME,
 *                                                MAX_VALUE, MAX_VALUE_TIME, RECENT_ROW_TIME
 *   select * from V$DISTANCE_SENSOR_STAT  -> ... MIN_DISTANCE, MAX_DISTANCE, MIN_VALUE,
 *                                                MIN_VALUE_DISTANCE, MAX_VALUE, MAX_VALUE_DISTANCE,
 *                                                RECENT_ROW_DISTANCE
 *   select min(MIN_TIME) from V$DISTANCE_SENSOR_STAT -> MACHCLI-ERR-2056
 *   select min(MIN_DISTANCE) from V$DEMO_TAG_STAT    -> MACHCLI-ERR-2056
 */
describe('tagStatAxisColumns', () => {
    test('a distance base names the distance columns', () => {
        expect(tagStatAxisColumns('distance')).toEqual({
            min: 'MIN_DISTANCE',
            max: 'MAX_DISTANCE',
            minValueAt: 'MIN_VALUE_DISTANCE',
            maxValueAt: 'MAX_VALUE_DISTANCE',
            recent: 'RECENT_ROW_DISTANCE',
        });
    });

    test('a time base names the time columns', () => {
        expect(tagStatAxisColumns('time')).toEqual({
            min: 'MIN_TIME',
            max: 'MAX_TIME',
            minValueAt: 'MIN_VALUE_TIME',
            maxValueAt: 'MAX_VALUE_TIME',
            recent: 'RECENT_ROW_TIME',
        });
    });

    // An unresolved kind is time, matching every caller's own default. Guessing distance would send
    // an ordinary time table to columns it does not have.
    test('an unknown kind is read as time', () => {
        expect(tagStatAxisColumns(undefined)).toEqual(tagStatAxisColumns('time'));
    });
});

describe('buildTagStatExtentSelect', () => {
    test('aggregates the kind’s own columns under the requested aliases', () => {
        expect(buildTagStatExtentSelect('distance', 'mn', 'mx')).toBe('min(MIN_DISTANCE) as mn, max(MAX_DISTANCE) as mx');
        expect(buildTagStatExtentSelect('time', 'min_tm', 'max_tm')).toBe('min(MIN_TIME) as min_tm, max(MAX_TIME) as max_tm');
    });
});

describe('otherTagStatBaseKind', () => {
    test('is the kind a rejected query should be retried as', () => {
        expect(otherTagStatBaseKind('distance')).toBe('time');
        expect(otherTagStatBaseKind('time')).toBe('distance');
    });
});

describe('isMissingStatColumnError', () => {
    // The two messages the server actually answers, in both directions.
    test('recognises the engine’s missing-column error', () => {
        expect(isMissingStatColumnError('MACHCLI-ERR-2056, Column name (MIN_TIME) not found.')).toBe(true);
        expect(isMissingStatColumnError('MACHCLI-ERR-2056, Column name (MIN_DISTANCE) not found.')).toBe(true);
    });

    // Everything else must fall through to the ordinary failure path: retrying a syntax error or a
    // missing table with the other column set just asks the same broken question twice.
    test('is not fooled by other failures', () => {
        expect(isMissingStatColumnError('MACHCLI-ERR-2025, Table V$ATABLE_STAT does not exist.')).toBe(false);
        expect(isMissingStatColumnError('MACHCLI-ERR-2080, User (FACTORY_A) does not exist.')).toBe(false);
        expect(isMissingStatColumnError('Query failed: Internal Server Error')).toBe(false);
        expect(isMissingStatColumnError('')).toBe(false);
        expect(isMissingStatColumnError(undefined)).toBe(false);
        expect(isMissingStatColumnError(null)).toBe(false);
    });
});
