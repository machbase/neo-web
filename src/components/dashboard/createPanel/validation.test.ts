import {
    TAG_INDEPENDENT_PANEL_TYPES,
    TAG_SELECTION_REQUIRED_MESSAGE,
    getFirstMissingTagSelectionBlockId,
    getTagSelectionValidationMessage,
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
