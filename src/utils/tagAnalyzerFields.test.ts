import {
    canUseTagAnalyzerRollup,
    createTagAnalyzerColumnInfoFromDashboardBlock,
    getTagAnalyzerTimeColumns,
} from './tagAnalyzerFields';

const BASETIME_FLAG = 0x01000000;

const createBlock = (overrides: Record<string, any> = {}) => ({
    name: 'NAME',
    time: 'TIME',
    value: 'VALUE',
    jsonKey: '',
    tableInfo: [
        ['NAME', 5, 0, 0, 0],
        ['TIME', 6, 0, 1, 0],
        ['VALUE', 20, 0, 2, 0],
        ['PAYLOAD', 61, 0, 3, 0],
    ],
    ...overrides,
});

describe('createTagAnalyzerColumnInfoFromDashboardBlock', () => {
    test('preserves dashboard JSON value and key', () => {
        const colName = createTagAnalyzerColumnInfoFromDashboardBlock(
            createBlock({
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
            })
        );

        expect(colName).toEqual({
            name: 'NAME',
            time: 'TIME',
            timeType: 6,
            timeBaseTime: false,
            value: 'PAYLOAD',
            jsonKey: '[metrics][temperature]',
        });
        expect(canUseTagAnalyzerRollup(colName)).toBe(true);
    });

    test('normalizes legacy JSON value field format', () => {
        const colName = createTagAnalyzerColumnInfoFromDashboardBlock(
            createBlock({
                value: 'PAYLOAD->$metrics.temperature',
                jsonKey: '',
            })
        );

        expect(colName.value).toBe('PAYLOAD');
        expect(colName.jsonKey).toBe('[metrics][temperature]');
    });

    test('preserves explicit dotted JSON key from dashboard block', () => {
        const colName = createTagAnalyzerColumnInfoFromDashboardBlock(
            createBlock({
                value: 'PAYLOAD',
                jsonKey: '[metrics.temperature]',
            })
        );

        expect(colName.value).toBe('PAYLOAD');
        expect(colName.jsonKey).toBe('[metrics.temperature]');
    });

    test('uses selected numeric value instead of tableInfo fallback', () => {
        const colName = createTagAnalyzerColumnInfoFromDashboardBlock(
            createBlock({
                value: 'QUALITY',
                tableInfo: [
                    ['NAME', 5, 0, 0, 0],
                    ['TIME', 6, 0, 1, 0],
                    ['VALUE', 20, 0, 2, 0],
                    ['QUALITY', 8, 0, 3, 0],
                ],
            })
        );

        expect(colName.value).toBe('QUALITY');
    });

    test('keeps basetime metadata for selected time field', () => {
        const colName = createTagAnalyzerColumnInfoFromDashboardBlock(
            createBlock({
                time: 'ODOMETER_M',
                value: 'VALUE',
                tableInfo: [
                    ['NAME', 5, 0, 0, 0],
                    ['ODOMETER_M', 20, 0, 1, BASETIME_FLAG],
                    ['VALUE', 20, 0, 2, 0],
                ],
            })
        );

        expect(colName.time).toBe('ODOMETER_M');
        expect(colName.timeType).toBe(20);
        expect(colName.timeBaseTime).toBe(true);
    });
});

describe('getTagAnalyzerTimeColumns', () => {
    test('returns every basetime column and every DateTime column', () => {
        expect(
            getTagAnalyzerTimeColumns([
                { name: 'NAME', type: 5, flag: 0 },
                { name: 'TIME', type: 6, flag: 0 },
                { name: 'EVENT_AT', type: 6, flag: 0 },
                { name: 'ODOMETER', type: 20, flag: BASETIME_FLAG },
                { name: 'SEQ', type: 12, flag: BASETIME_FLAG },
                { name: 'VALUE', type: 20, flag: 0 },
            ]),
        ).toEqual([
            ['TIME', 6],
            ['EVENT_AT', 6],
            ['ODOMETER', 20],
            ['SEQ', 12],
        ]);
    });
});
