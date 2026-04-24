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
});
