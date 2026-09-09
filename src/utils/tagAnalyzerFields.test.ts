import {
    canUseTagAnalyzerRollup,
    createTagAnalyzerColumnInfoFromDashboardBlock,
    getTagAnalyzerTimeColumns,
    hasTagAnalyzerEligibleBlock,
    isTagAnalyzerEligibleBlock,
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

// What the panel menu asks before drawing "Show Taganalyzer". The hand-off filters by the same
// predicate, so every case here is also a statement about which blocks reach a TAZ board.
describe('isTagAnalyzerEligibleBlock', () => {
    const createPanelBlock = (overrides: Record<string, any> = {}) => ({
        type: 'tag',
        useCustom: false,
        isVisible: true,
        customFullTyping: { use: false, text: '' },
        ...overrides,
    });

    test('a drawn, collapsed tag block is eligible', () => {
        expect(isTagAnalyzerEligibleBlock(createPanelBlock())).toBe(true);
    });

    // The reported bug: v8.7's tagless types have no tag name to chart, yet the menu offered them.
    test.each(['view', 'transaction'])('a %s block is never eligible', (type) => {
        expect(isTagAnalyzerEligibleBlock(createPanelBlock({ type }))).toBe(false);
        // ...and the repaired shape a real one carries, with useCustom forced on
        expect(isTagAnalyzerEligibleBlock(createPanelBlock({ type, useCustom: true }))).toBe(false);
    });

    test('a log block is not eligible either', () => {
        expect(isTagAnalyzerEligibleBlock(createPanelBlock({ type: 'log' }))).toBe(false);
    });

    test('a tag block that is expanded, hidden, or hand-typed is not eligible', () => {
        expect(isTagAnalyzerEligibleBlock(createPanelBlock({ useCustom: true }))).toBe(false);
        expect(isTagAnalyzerEligibleBlock(createPanelBlock({ isVisible: false }))).toBe(false);
        expect(isTagAnalyzerEligibleBlock(createPanelBlock({ customFullTyping: { use: true, text: 'select 1' } }))).toBe(false);
    });

    // Boards saved before `customFullTyping` existed reach this with the field missing entirely.
    test('a legacy block with no customFullTyping stays eligible', () => {
        expect(isTagAnalyzerEligibleBlock({ type: 'tag', useCustom: false, isVisible: true })).toBe(true);
    });

    test('nothing at all is not eligible', () => {
        expect(isTagAnalyzerEligibleBlock(undefined)).toBe(false);
        expect(isTagAnalyzerEligibleBlock(null)).toBe(false);
    });

    describe('hasTagAnalyzerEligibleBlock', () => {
        test('one eligible tag block among tagless ones still opens the door', () => {
            expect(hasTagAnalyzerEligibleBlock([createPanelBlock({ type: 'view', useCustom: true }), createPanelBlock()])).toBe(true);
        });

        test('an all-tagless panel closes it', () => {
            expect(hasTagAnalyzerEligibleBlock([createPanelBlock({ type: 'view', useCustom: true }), createPanelBlock({ type: 'transaction', useCustom: true })])).toBe(false);
        });

        test('an empty or missing block list closes it', () => {
            expect(hasTagAnalyzerEligibleBlock([])).toBe(false);
            expect(hasTagAnalyzerEligibleBlock(undefined)).toBe(false);
            expect(hasTagAnalyzerEligibleBlock(null as any)).toBe(false);
        });
    });
});
