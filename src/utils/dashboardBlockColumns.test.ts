import { convertDashboardMinMaxRows, repairDashboardBlockForTableColumns } from './dashboardBlockColumns';

const BASETIME_FLAG = 0x01000000;

describe('dashboard block column helpers', () => {
    test('repairs stale tag columns when an edited block changes to a view table', () => {
        const repaired = repairDashboardBlockForTableColumns(
            {
                type: 'tag',
                name: 'NAME',
                time: 'TIME',
                value: 'VALUE',
                jsonKey: '',
                useCustom: false,
                filter: [{ id: 'filter-1', column: 'NAME', operator: 'in', value: 'wave.sin', useFilter: true }],
                values: [{ id: 'value-1', value: 'VALUE', jsonKey: '', aggregator: 'avg', alias: '' }],
            },
            [
                ['EVENT_TIME', 6, 0, 0, 0],
                ['SPEED', 20, 0, 1, 0],
                ['STATUS', 5, 0, 2, 0],
            ],
            'view'
        );

        expect(repaired.type).toBe('view');
        expect(repaired.useCustom).toBe(true);
        expect(repaired.name).toBe('STATUS');
        expect(repaired.time).toBe('EVENT_TIME');
        expect(repaired.value).toBe('SPEED');
        expect(repaired.values[0].value).toBe('SPEED');
        expect(repaired.filter[0]).toMatchObject({ column: 'STATUS', value: '', useFilter: false, useTyping: false, typingValue: '' });
    });

    test('adds a default value when an edited block changes to a view table with empty values', () => {
        const repaired = repairDashboardBlockForTableColumns(
            {
                type: 'tag',
                name: 'NAME',
                time: 'TIME',
                value: 'VALUE',
                jsonKey: '',
                useCustom: false,
                filter: [{ id: 'filter-1', column: 'NAME', operator: 'in', value: 'wave.sin', useFilter: true }],
                values: [],
                aggregator: 'max',
            },
            [
                ['EVENT_TIME', 6, 0, 0, 0],
                ['SPEED', 20, 0, 1, 0],
                ['STATUS', 5, 0, 2, 0],
            ],
            'view'
        );

        expect(repaired.useCustom).toBe(true);
        expect(repaired.values).toHaveLength(1);
        expect(repaired.values[0]).toMatchObject({ value: 'SPEED', jsonKey: '', aggregator: 'max' });
    });

    test('clears stale JSON key when the repaired value column is numeric', () => {
        const repaired = repairDashboardBlockForTableColumns(
            {
                type: 'view',
                name: 'STATUS',
                time: 'EVENT_TIME',
                value: 'SPEED',
                jsonKey: 'metrics.temperature',
                useCustom: true,
                filter: [],
                values: [{ id: 'value-1', value: 'SPEED', jsonKey: 'metrics.temperature', aggregator: 'avg', alias: '' }],
            },
            [
                ['EVENT_TIME', 6, 0, 0, 0],
                ['SPEED', 20, 0, 1, 0],
                ['STATUS', 5, 0, 2, 0],
            ],
            'view'
        );

        expect(repaired.jsonKey).toBe('');
        expect(repaired.values[0].jsonKey).toBe('');
    });

    test('keeps numeric basetime min max in the original unit', () => {
        const rows = convertDashboardMinMaxRows([[0, 20.7]], {
            time: 'ODOMETER_M',
            tableInfo: [
                ['ODOMETER_M', 20, 0, 0, BASETIME_FLAG],
                ['VALUE', 20, 0, 1, 0],
            ],
        });

        expect(rows).toEqual({ min: 0, max: 20.7 });
    });

    test('converts datetime min max from nanoseconds to milliseconds', () => {
        const rows = convertDashboardMinMaxRows([[1745910581000000000, 1745914181000000000]], {
            time: 'TIME',
            tableInfo: [
                ['TIME', 6, 0, 0, 0],
                ['VALUE', 20, 0, 1, 0],
            ],
        });

        expect(rows).toEqual({ min: 1745910581000, max: 1745914181000 });
    });

    test('persists timeType/timeBaseTime for a distance (non-datetime) base column', () => {
        const repaired = repairDashboardBlockForTableColumns(
            { type: 'tag', name: 'NAME', time: 'ODOMETER_M', value: 'VALUE', jsonKey: '', useCustom: false, filter: [], values: [] },
            [
                ['NAME', 5, 0, 0, 0],
                ['ODOMETER_M', 20, 0, 1, BASETIME_FLAG],
                ['VALUE', 20, 0, 2, 0],
            ],
            'tag'
        );

        expect(repaired.time).toBe('ODOMETER_M');
        expect(repaired.timeType).toBe(20);
        expect(repaired.timeBaseTime).toBe(true);
    });

    test('persists timeType/timeBaseTime for a datetime base column', () => {
        const repaired = repairDashboardBlockForTableColumns(
            { type: 'tag', name: 'NAME', time: 'TIME', value: 'VALUE', jsonKey: '', useCustom: false, filter: [], values: [] },
            [
                ['NAME', 5, 0, 0, 0],
                ['TIME', 6, 0, 1, BASETIME_FLAG],
                ['VALUE', 20, 0, 2, 0],
            ],
            'tag'
        );

        expect(repaired.time).toBe('TIME');
        expect(repaired.timeType).toBe(6);
        expect(repaired.timeBaseTime).toBe(true);
    });

    test('resolves a numeric (distance) base from stored timeType/timeBaseTime without tableInfo', () => {
        const rows = convertDashboardMinMaxRows([[0, 20.7]], {
            time: 'ODOMETER_M',
            timeType: 20,
            timeBaseTime: true,
        });

        expect(rows).toEqual({ min: 0, max: 20.7 });
    });

    // A BASE DISTANCE column may be DOUBLE, LONG or ULONG — those three and no others. Their type
    // codes, read off M$SYS_COLUMNS on a live server, are 20, 12 and 112. All three have to read as
    // distance: the kind is what routes the block to MIN_DISTANCE / MAX_DISTANCE and what stops the
    // extent being divided by a million on its way to the axis.
    test.each([
        ['DOUBLE', 20, 999990],
        ['LONG', 12, 12345],
        // Past 2^53, written as the double JS actually holds: the server answers 9007199254740995
        // and both the stat view and the column scan arrive as this same rounded value, which is
        // the property the fallback between them depends on.
        ['ULONG', 112, 9007199254740996],
    ])('reads a %s base distance column as a distance', (_label, timeType, max) => {
        expect(convertDashboardMinMaxRows([[0, max]], { time: 'ODO', timeType, timeBaseTime: true })).toEqual({ min: 0, max });
    });

    // The one type that is *not* a distance, for contrast: a DATETIME base is nanoseconds, and the
    // same rows come back divided into milliseconds.
    test('a DATETIME base is still read as time', () => {
        expect(convertDashboardMinMaxRows([[1745910581000000000, 1745914181000000000]], { time: 'TIME', timeType: 6, timeBaseTime: true })).toEqual({
            min: 1745910581000,
            max: 1745914181000,
        });
    });

    test('converts a datetime base from stored timeType without tableInfo', () => {
        const rows = convertDashboardMinMaxRows([[1745910581000000000, 1745914181000000000]], {
            time: 'TIME',
            timeType: 6,
            timeBaseTime: true,
        });

        expect(rows).toEqual({ min: 1745910581000, max: 1745914181000 });
    });
});
