import {
    MAIN_FULL_TYPING_QUERY_PLACEHOLDER,
    MAIN_FULL_TYPING_QUERY_PLACEHOLDER_WITHOUT_VAR,
    PUBLIC_FULL_TYPING_QUERY_PLACEHOLDER,
    PUBLIC_FULL_TYPING_QUERY_PLACEHOLDER_WITHOUT_VAR,
    buildFullTypingQuery,
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
});
