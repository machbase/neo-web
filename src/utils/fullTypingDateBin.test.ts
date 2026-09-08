import {
    MAIN_FULL_TYPING_QUERY_PLACEHOLDER,
    MAIN_FULL_TYPING_QUERY_PLACEHOLDER_WITHOUT_VAR,
    PUBLIC_FULL_TYPING_QUERY_PLACEHOLDER,
    PUBLIC_FULL_TYPING_QUERY_PLACEHOLDER_WITHOUT_VAR,
    buildFullTypingQuery,
    deactivateFullTyping,
    enterFullTyping,
    exitFullTyping,
    fullTypingAfterTableChange,
    normalizeFullTypingOption,
    updateFullTypingText,
} from './fullTypingDateBin';

const expectNoLegacyBucketSql = (sql: string) => {
    expect(sql).not.toContain('DATE_TRUNC(');
    expect(sql).not.toContain('FROM_TIMESTAMP(-32400000000000)');
    expect(sql).not.toContain('FROM_TIMESTAMP(0)');
    expect(sql).not.toMatch(/DATE_BIN\([^)]*DATE_BIN\('day', 1,/);
};

const createBlockInfo = (overrides: Record<string, any> = {}) => ({
    table: 'EXAMPLE',
    customTable: false,
    name: 'NAME',
    time: 'TIME',
    value: 'VALUE',
    aggregator: 'avg',
    alias: "'SERIES(0)'",
    tag: 'wave.sin',
    useCustom: false,
    values: [],
    filter: [],
    tableInfo: [
        ['NAME', 5],
        ['TIME', 6],
        ['VALUE', 20],
    ],
    ...overrides,
});

describe('full typing DATE_BIN SQL', () => {
    test.each([
        ['main placeholder', MAIN_FULL_TYPING_QUERY_PLACEHOLDER],
        ['main placeholder without variables', MAIN_FULL_TYPING_QUERY_PLACEHOLDER_WITHOUT_VAR],
        ['public placeholder', PUBLIC_FULL_TYPING_QUERY_PLACEHOLDER],
        ['public placeholder without variables', PUBLIC_FULL_TYPING_QUERY_PLACEHOLDER_WITHOUT_VAR],
    ])('%s uses 3-argument DATE_BIN only', (_, sql) => {
        expect(sql).toMatch(/DATE_BIN\('day', ({{period_value}}|10), TIME\)/);
        expect(sql).toMatch(/DATE_BIN\('hour', ({{period_value}}|10), TIME\)/);
        expect(sql).toMatch(/DATE_BIN\('minute', ({{period_value}}|10), TIME\)/);
        expect(sql).toMatch(/DATE_BIN\('second', ({{period_value}}|10), TIME\)/);
        expectNoLegacyBucketSql(sql);
    });

    test('buildFullTypingQuery uses 3-argument DATE_BIN', () => {
        const sql = buildFullTypingQuery(createBlockInfo());

        expect(sql).toContain("DATE_BIN('day', {{period_value}}, TIME)");
        expect(sql).toContain("DATE_BIN('hour', {{period_value}}, TIME)");
        expect(sql).toContain("DATE_BIN('minute', {{period_value}}, TIME)");
        expect(sql).toContain("DATE_BIN('second', {{period_value}}, TIME)");
        expect(sql).toContain("NAME IN ('wave.sin')");
        expectNoLegacyBucketSql(sql);
    });

    test('buildFullTypingQuery converts JSON value before avg aggregation', () => {
        const sql = buildFullTypingQuery(
            createBlockInfo({
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
                tableInfo: [
                    ['NAME', 5],
                    ['TIME', 6],
                    ['PAYLOAD', 61],
                ],
            })
        );

        expect(sql).toContain("TO_NUMBER_SAFE(PAYLOAD->'$[metrics][temperature]') AS VALUE");
        expect(sql).not.toContain('AVG(PAYLOAD)');
        expect(sql).not.toContain("AVG(PAYLOAD->'$[metrics][temperature]')");
        expect(sql).not.toContain('PAYLOAD AS VALUE');
        expectNoLegacyBucketSql(sql);
    });
});

describe('full typing mode state', () => {
    test('builds a fresh query from selecting settings when the draft was not edited', () => {
        const block = createBlockInfo({
            tag: 'new-tag',
            customFullTyping: { use: false, text: 'old generated query', dirty: false },
        });

        const next = enterFullTyping(block);

        expect(next).toEqual({
            use: true,
            text: expect.stringContaining("NAME IN ('new-tag')"),
            dirty: false,
        });
        expect(next.text).not.toBe('old generated query');
    });

    test('restores an edited query when returning to typing mode', () => {
        const block = createBlockInfo({
            customFullTyping: { use: false, text: 'SELECT edited', dirty: true },
        });

        expect(enterFullTyping(block)).toEqual({ use: true, text: 'SELECT edited', dirty: true });
    });

    test('marks the typing draft dirty as soon as its text changes', () => {
        const block = createBlockInfo({
            customFullTyping: { use: true, text: 'SELECT generated', dirty: false },
        });

        expect(updateFullTypingText(block, 'SELECT changed')).toEqual({ use: true, text: 'SELECT changed', dirty: true });
    });

    test('rebuilds an empty draft from selecting settings when returning to selecting mode', () => {
        const block = createBlockInfo({
            tag: 'kept-tag',
            customFullTyping: { use: true, text: '   ', dirty: true },
        });

        const next = exitFullTyping(block);

        expect(next).toEqual({
            use: false,
            text: expect.stringContaining("NAME IN ('kept-tag')"),
            dirty: false,
        });
    });

    test('keeps a non-empty edited draft when returning to selecting mode', () => {
        const block = createBlockInfo({
            customFullTyping: { use: true, text: 'SELECT edited', dirty: true },
        });

        expect(exitFullTyping(block)).toEqual({ use: false, text: 'SELECT edited', dirty: true });
    });

    test('treats non-empty legacy text as edited so it is never overwritten', () => {
        expect(normalizeFullTypingOption({ use: true, text: 'SELECT legacy' })).toEqual({
            use: true,
            text: 'SELECT legacy',
            dirty: true,
        });
    });

    test('keeps the typing draft but deactivates it when the chart type stops supporting typing', () => {
        const block = createBlockInfo({
            customFullTyping: { use: true, text: 'SELECT edited', dirty: true },
        });

        expect(deactivateFullTyping(block)).toEqual({ use: false, text: 'SELECT edited', dirty: true });
    });

    test('keeps an edited typing draft when the selecting table changes', () => {
        const block = createBlockInfo({
            customFullTyping: { use: false, text: 'SELECT edited', dirty: true },
        });

        expect(fullTypingAfterTableChange(block)).toEqual({ use: false, text: 'SELECT edited', dirty: true });
    });

    test('drops an unedited generated query when the selecting table changes', () => {
        const block = createBlockInfo({
            customFullTyping: { use: false, text: 'SELECT generated for old table', dirty: false },
        });

        expect(fullTypingAfterTableChange(block)).toEqual({ use: false, text: '', dirty: false });
    });
});
