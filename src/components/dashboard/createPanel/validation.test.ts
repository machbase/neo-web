import {
    TAG_INDEPENDENT_PANEL_TYPES,
    TAG_SELECTION_REQUIRED_MESSAGE,
    getFirstMissingTagSelectionBlockId,
    getFirstMissingTimeFieldBlockId,
    getTagSelectionValidationMessage,
    getTimeFieldValidationMessage,
    TIME_FIELD_REQUIRED_MESSAGE,
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
