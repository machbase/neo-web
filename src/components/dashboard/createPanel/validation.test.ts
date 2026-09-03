import {
    TAG_INDEPENDENT_PANEL_TYPES,
    TAG_SELECTION_REQUIRED_MESSAGE,
    getFirstMissingTagSelectionBlockId,
    getFirstMissingTimeFieldBlockId,
    getTagSelectionValidationMessage,
    getTimeFieldValidationMessage,
    TIME_FIELD_REQUIRED_MESSAGE,
    getFirstMissingValueFieldBlockId,
    getValueFieldValidationMessage,
    VALUE_FIELD_REQUIRED_MESSAGE,
} from './validation';

const createTagBlock = (overrides: Record<string, any> = {}) => ({
    id: 'b1',
    type: 'tag',
    tag: '',
    useCustom: false,
    customFullTyping: { use: false, text: '' },
    ...overrides,
});

const createPanelOption = (type: string, blockList: any[] = []) => ({
    type,
    blockList,
});

describe('getFirstMissingTagSelectionBlockId', () => {
    const cases: Array<{
        name: string;
        panelOption: any;
        expectedBlockId: string | undefined;
        expectedMessage: string | undefined;
    }> = [
        {
            name: 'excludes Tql chart panels even with an empty default tag block',
            panelOption: createPanelOption('Tql chart', [createTagBlock({ id: 'b1', tag: '' })]),
            expectedBlockId: undefined,
            expectedMessage: undefined,
        },
        {
            name: 'excludes Video panels with an empty tag block (regression)',
            panelOption: createPanelOption('Video', [createTagBlock({ id: 'b1', tag: '' })]),
            expectedBlockId: undefined,
            expectedMessage: undefined,
        },
        {
            name: 'flags tag-dependent Line panels with an unselected tag',
            panelOption: createPanelOption('Line', [createTagBlock({ id: 'b1', tag: '' })]),
            expectedBlockId: 'b1',
            expectedMessage: TAG_SELECTION_REQUIRED_MESSAGE,
        },
        {
            name: 'skips blocks that use custom query (useCustom)',
            panelOption: createPanelOption('Line', [createTagBlock({ id: 'b1', tag: '', useCustom: true })]),
            expectedBlockId: undefined,
            expectedMessage: undefined,
        },
        {
            name: 'skips blocks that use full typing (customFullTyping.use)',
            panelOption: createPanelOption('Line', [createTagBlock({ id: 'b1', tag: '', customFullTyping: { use: true, text: 'select 1' } })]),
            expectedBlockId: undefined,
            expectedMessage: undefined,
        },
        {
            name: 'accepts a tag-dependent panel with a selected tag',
            panelOption: createPanelOption('Line', [createTagBlock({ id: 'b1', tag: 'SENSOR-1' })]),
            expectedBlockId: undefined,
            expectedMessage: undefined,
        },
        {
            name: 'returns the first missing block among multiple blocks',
            panelOption: createPanelOption('Line', [
                createTagBlock({ id: 'b1', tag: 'SENSOR-1' }),
                createTagBlock({ id: 'b2', tag: '' }),
            ]),
            expectedBlockId: 'b2',
            expectedMessage: TAG_SELECTION_REQUIRED_MESSAGE,
        },
    ];

    test.each(cases)('$name', ({ panelOption, expectedBlockId, expectedMessage }) => {
        expect(getFirstMissingTagSelectionBlockId(panelOption)).toBe(expectedBlockId);
        expect(getTagSelectionValidationMessage(panelOption)).toBe(expectedMessage);
    });

    test('handles undefined / empty panel options without throwing', () => {
        expect(getFirstMissingTagSelectionBlockId(undefined)).toBeUndefined();
        expect(getFirstMissingTagSelectionBlockId({})).toBeUndefined();
        expect(getTagSelectionValidationMessage(undefined)).toBeUndefined();
    });

    test('TAG_INDEPENDENT_PANEL_TYPES matches the ChartTypeList keys used for exclusion', () => {
        expect(TAG_INDEPENDENT_PANEL_TYPES).toEqual(['Video', 'Tql chart']);
    });
});

describe('getFirstMissingTimeFieldBlockId', () => {
    const block = (over: Record<string, any> = {}) => ({
        id: 'b1',
        type: 'transaction',
        table: 'MACHBASEDB.SYS.ORDERS',
        time: '',
        useCustom: true,
        customFullTyping: { use: false, text: '' },
        tableInfo: [
            ['ORDER_ID', 8, 4, 0, 0],
            ['ITEM', 5, 40, 1, 0],
            ['QTY', 8, 4, 2, 0],
        ],
        ...over,
    });
    const panel = (blocks: any[], type = 'Line') => ({ type, blockList: blocks });

    // DEMO_TRANSACTION is exactly this: ORDER_ID / ITEM / QTY, no DATETIME column anywhere.
    test('a block whose table has no time column is caught', () => {
        expect(getFirstMissingTimeFieldBlockId(panel([block()]))).toBe('b1');
        expect(getTimeFieldValidationMessage(panel([block()]))).toBe(TIME_FIELD_REQUIRED_MESSAGE);
    });

    test('a block that resolved a time column is fine', () => {
        expect(getFirstMissingTimeFieldBlockId(panel([block({ time: 'TS' })]))).toBeUndefined();
        expect(getTimeFieldValidationMessage(panel([block({ time: 'TS' })]))).toBeUndefined();
    });

    test('it names the first offending block, not just any', () => {
        expect(getFirstMissingTimeFieldBlockId(panel([block({ id: 'ok', time: 'TS' }), block({ id: 'bad' })]))).toBe('bad');
    });

    // Columns not loaded yet, or a table typed as a `{{variable}}` — the absence proves nothing.
    test('a block with no loaded columns is not judged', () => {
        expect(getFirstMissingTimeFieldBlockId(panel([block({ tableInfo: [] })]))).toBeUndefined();
        expect(getFirstMissingTimeFieldBlockId(panel([block({ tableInfo: undefined })]))).toBeUndefined();
    });

    test('a block writing its own SQL owns the time predicate itself', () => {
        expect(getFirstMissingTimeFieldBlockId(panel([block({ customFullTyping: { use: true, text: 'SELECT 1' } })]))).toBeUndefined();
    });

    // A V$<TABLE>_STAT read is already aggregated and its query carries no time predicate.
    test('a stat-view block needs no time field', () => {
        expect(getFirstMissingTimeFieldBlockId(panel([block({ table: 'MACHBASEDB.SYS.V$DEMO_TAG_STAT' })]))).toBeUndefined();
    });

    test('panels that do not use blocks are skipped', () => {
        expect(getFirstMissingTimeFieldBlockId(panel([block()], 'Tql chart'))).toBeUndefined();
        expect(getFirstMissingTimeFieldBlockId(panel([block()], 'Video'))).toBeUndefined();
    });

    test('a malformed panel is not an error', () => {
        expect(getFirstMissingTimeFieldBlockId(undefined)).toBeUndefined();
        expect(getFirstMissingTimeFieldBlockId({})).toBeUndefined();
        expect(getTimeFieldValidationMessage(undefined)).toBeUndefined();
    });
});

/**
 * Value-field validation. Column rows are `[name, type, ...]` with the type codes the server
 * reports: 5 VARCHAR, 6 DATETIME, 12 LONG, 20 DOUBLE, 61 JSON.
 *
 * The case that motivated this is a view whose only numeric column is the phantom `_RID` the
 * engine refuses to select — unfiltered it looks plottable, which is why the block's own table
 * type has to take part in the decision.
 */
describe('getFirstMissingValueFieldBlockId', () => {
    const blockWith = (columns: any[], overrides: Record<string, any> = {}) => ({
        id: 'b1',
        type: 'view',
        useCustom: true,
        customFullTyping: { use: false, text: '' },
        tableInfo: columns,
        ...overrides,
    });
    const VARCHAR = ['DEVICE', 5];
    const DATETIME = ['TS', 6];
    const RID = ['_RID', 12];
    const DOUBLE = ['VALUE', 20];
    const JSON_COL = ['PAYLOAD', 61];

    test('a view with only text and datetime columns has nothing to plot', () => {
        expect(getFirstMissingValueFieldBlockId(createPanelOption('Line', [blockWith([VARCHAR, DATETIME])]))).toBe('b1');
    });

    test("a view's phantom _RID does not count as plottable", () => {
        expect(getFirstMissingValueFieldBlockId(createPanelOption('Line', [blockWith([VARCHAR, DATETIME, RID])]))).toBe('b1');
    });

    test('a numeric column clears it', () => {
        expect(getFirstMissingValueFieldBlockId(createPanelOption('Line', [blockWith([VARCHAR, DATETIME, DOUBLE])]))).toBeUndefined();
    });

    test('a JSON column clears it too', () => {
        expect(getFirstMissingValueFieldBlockId(createPanelOption('Line', [blockWith([VARCHAR, DATETIME, JSON_COL])]))).toBeUndefined();
    });

    test('_RID on a log table is a real column, so it counts', () => {
        expect(getFirstMissingValueFieldBlockId(createPanelOption('Line', [blockWith([VARCHAR, RID], { type: 'log' })]))).toBeUndefined();
    });

    test('columns not loaded yet is not a verdict', () => {
        expect(getFirstMissingValueFieldBlockId(createPanelOption('Line', [blockWith([])]))).toBeUndefined();
    });

    test('a block writing its own SQL is left alone', () => {
        expect(
            getFirstMissingValueFieldBlockId(createPanelOption('Line', [blockWith([VARCHAR], { customFullTyping: { use: true, text: 'select 1' } })]))
        ).toBeUndefined();
    });

    test('a stat view block is left alone, since it saves with an empty value on purpose', () => {
        expect(getFirstMissingValueFieldBlockId(createPanelOption('Gauge', [blockWith([VARCHAR], { table: 'V$DEMO_STAT', type: 'tag' })]))).toBeUndefined();
    });

    test('panels that do not read a table are skipped', () => {
        TAG_INDEPENDENT_PANEL_TYPES.forEach((aType) => {
            expect(getFirstMissingValueFieldBlockId(createPanelOption(aType, [blockWith([VARCHAR, DATETIME])]))).toBeUndefined();
        });
    });

    test('the message is returned only when a block is missing one', () => {
        expect(getValueFieldValidationMessage(createPanelOption('Line', [blockWith([VARCHAR, DATETIME])]))).toBe(VALUE_FIELD_REQUIRED_MESSAGE);
        expect(getValueFieldValidationMessage(createPanelOption('Line', [blockWith([DOUBLE])]))).toBeUndefined();
    });

    test('a malformed panel is not an error', () => {
        expect(getFirstMissingValueFieldBlockId(undefined)).toBeUndefined();
        expect(getFirstMissingValueFieldBlockId({ type: 'Line' })).toBeUndefined();
    });
});
