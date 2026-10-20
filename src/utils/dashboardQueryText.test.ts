import { DashboardQueryParser } from './DashboardQueryParser';
import { DashboardQueryParser as PublicDashboardQueryParser } from '../public-dashboard/utils/DashboardQueryParser';
import { buildFullTypingQuery } from './fullTypingDateBin';
import { createLogTimeMinMaxQuery, createTableScanTimeMinMaxQuery } from './dashboardTimeMinMax';
import { buildRollupAwareAggregationSql, createJsonRollupAggregationMetric, createRollupAggregationMetric } from './rollupQueryBuilder';
import { jsonValueFieldToNumericSql, jsonValueFieldToSql } from './dashboardJsonValue';
import { createMapValueForTag } from './dashboardUtil';
import { createMapValueForTag as createPublicMapValueForTag } from '../public-dashboard/utils/dashboardUtil';
import { toSqlColumnName, toSqlTableName } from './dashboardSqlName';

/**
 * Runtime values and catalogue names inside the SQL/TQL a dashboard block generates.
 *
 * Each non-ordinary shape below was run against a machbase-neo 8.7.2 sandbox (tables Q1545 and
 * "Q-1545") and returned the rows it names, or no error.
 */

const TAG_COLUMNS = [
    ['NAME', 5, 0, 0, 0],
    ['TIME', 6, 0, 0, 0],
    ['VALUE', 20, 0, 0, 0],
];

const createBlock = (overrides: Record<string, any> = {}) => ({
    id: 'block-1',
    table: 'Q1545',
    customTable: false,
    customFullTyping: { use: false, text: '' },
    time: 'TIME',
    type: 'tag',
    userName: 'SYS',
    name: 'NAME',
    tag: 'p50',
    value: 'VALUE',
    aggregator: 'none',
    alias: '',
    diff: 'none',
    useCustom: false,
    filter: [{ id: 'filter-1', column: 'NAME', operator: 'in', value: '', useFilter: false, useTyping: false, typingValue: '' }],
    values: [{ id: 'value-1', alias: '', value: 'VALUE', jsonKey: '', aggregator: 'none' }],
    color: '#000000',
    tableInfo: TAG_COLUMNS,
    math: '',
    isValidMath: true,
    duration: { from: '', to: '' },
    isVisible: true,
    ...overrides,
});

const time = { interval: { IntervalType: 'min', IntervalValue: 1 }, start: 1700000000000, end: 1900000000000 };

const parse = (parser: typeof DashboardQueryParser, block: Record<string, any>, chart = 'line', dataType = 'TIME_VALUE') => {
    const [queries] = parser(chart, dataType as any, [block], [], {}, [], time as any);
    return queries[0] as { sql: string; query: string };
};

const expandFilter = (value: string) => ({
    useCustom: true,
    filter: [{ id: 'filter-1', column: 'NAME', operator: 'in', value, useFilter: true, useTyping: false, typingValue: '' }],
});

describe.each([
    ['editor', DashboardQueryParser],
    ['public', PublicDashboardQueryParser],
])('%s DashboardQueryParser', (_, parser) => {
    test('ordinary input keeps its SQL and only the wrapper quote is a double quote', () => {
        const { sql, query } = parse(parser, createBlock());
        expect(sql).toBe('SELECT TO_TIMESTAMP(TIME) / 1000000 as TIME, VALUE as VALUE FROM SYS.Q1545 WHERE TIME BETWEEN 1700000000000000000 AND 1900000000000000000 AND NAME in (\'p50\')  ORDER BY TIME');
        expect(query.startsWith(`SQL("${sql}")\n`)).toBe(true);
    });

    test.each([
        ["o'brien", "NAME in ('o''brien')"],
        ['tail\\', String.raw`NAME in (('tail' || RTRIM('\\ ')))`],
        ['q"t', `NAME in ('q"t')`],
        ['100%', "NAME in ('100%')"],
    ])('a collapsed tag %s is written as a SQL value', (tag, expected) => {
        expect(parse(parser, createBlock({ tag })).sql).toContain(expected);
    });

    test('an expanded in-list quotes each value', () => {
        expect(parse(parser, createBlock(expandFilter("o'brien,p_0"))).sql).toContain("NAME in ('o''brien','p_0')");
    });

    test('the TQL wrapper escapes what the SQL carries', () => {
        const { query } = parse(parser, createBlock({ table: 'Q-1545', tag: 'q"t' }));
        expect(query.split('\n')[0]).toBe(
            String.raw`SQL("SELECT TO_TIMESTAMP(TIME) / 1000000 as TIME, VALUE as VALUE FROM SYS.\"Q-1545\" WHERE TIME BETWEEN 1700000000000000000 AND 1900000000000000000 AND NAME in ('q\"t')  ORDER BY TIME")`
        );
    });

    test('an aggregated block quotes its table inside the rollup-aware builder', () => {
        expect(parse(parser, createBlock({ table: 'Q-1545', aggregator: 'avg' })).sql).toContain('from SYS."Q-1545" where TIME BETWEEN');
    });

    test('a board variable table is left for the variable replacer', () => {
        expect(parse(parser, createBlock({ table: '{{table}}', customTable: true, aggregator: 'avg' })).sql).toContain('from {{table}} where');
        expect(parse(parser, createBlock({ table: '{{table}}', customTable: true })).sql).toContain('FROM {{table}} WHERE');
    });

    test('a pie series name is a TQL string literal', () => {
        expect(parse(parser, createBlock({ alias: 'a"b', aggregator: 'count' }), 'pie', 'NAME_VALUE').query).toContain(String.raw`dict("name", "a\"b", "value", value(0))`);
    });

    test('a full-typing statement is wrapped as a TQL string', () => {
        const text = "SELECT TIME, VALUE FROM Q1545\nWHERE NAME = 'q\"t'";
        expect(parse(parser, createBlock({ customFullTyping: { use: true, text } })).query.split('\n')[0]).toBe(String.raw`SQL("SELECT TIME, VALUE FROM Q1545\nWHERE NAME = 'q\"t'")`);
    });
});

describe('buildFullTypingQuery', () => {
    test('ordinary input is unchanged', () => {
        expect(buildFullTypingQuery(createBlock())).toContain("FROM SYS.Q1545 WHERE (TIME BETWEEN FROM_TIMESTAMP({{from_ns}}) AND FROM_TIMESTAMP({{to_ns}})) AND NAME IN ('p50')");
    });

    test('quotes the table and the tag', () => {
        const sql = buildFullTypingQuery(createBlock({ table: 'Q-1545', tag: "o'brien" }));
        expect(sql).toContain(`FROM SYS."Q-1545" WHERE`);
        expect(sql).toContain("NAME IN ('o''brien')");
    });

    test('quotes expanded filter values', () => {
        expect(buildFullTypingQuery(createBlock({ ...expandFilter("o'brien,tail\\") }))).toContain(String.raw`NAME in ('o''brien',('tail' || RTRIM('\\ ')))`);
    });
});

describe('dashboard time min/max queries', () => {
    test('ordinary names are unchanged', () => {
        expect(createTableScanTimeMinMaxQuery({ type: 'view', time: 'TS', table: 'ORDERS', userName: 'SYS' })).toBe('select min(TS) as min_time, max(TS) as max_time from SYS.ORDERS');
    });

    test('quotes table and time column', () => {
        expect(createLogTimeMinMaxQuery({ time: 'T-1', table: 'MACHBASEDB.SYS.Q-1545' })).toBe('select min("T-1") as min_time, max("T-1") as max_time from MACHBASEDB.SYS."Q-1545"');
    });
});

describe('rollupQueryBuilder', () => {
    const build = (tableName: string) =>
        buildRollupAwareAggregationSql({
            sourceMode: 'raw',
            tableName,
            timeColumn: 'TIME',
            timeRange: { start: 1, end: 2 },
            intervalType: 'min',
            intervalValue: 1,
            metrics: [createRollupAggregationMetric({ aggregator: 'max', outputAlias: 'VALUE', valueExpression: 'VALUE' })],
        });

    test('quotes the raw table name it is given', () => {
        expect(build('SYS.Q1545')).toContain('from SYS.Q1545 where');
        expect(build('SYS.Q-1545')).toContain('from SYS."Q-1545" where');
        expect(build('{{table}}')).toContain('from {{table}} where');
    });

    test('a JSON rollup path is a SQL literal', () => {
        const metric = createJsonRollupAggregationMetric({ aggregator: 'avg', outputAlias: 'VALUE', jsonColumn: 'PAYLOAD', jsonPath: `["o'brien"]` });
        expect(metric.outerSelect).toBe(`MAX(TO_NUMBER_SAFE(JSONVAL_VALUE->'$["o''brien"]')) AS VALUE`);
    });
});

describe('dashboardJsonValue column and path', () => {
    test('ordinary input is unchanged', () => {
        expect(jsonValueFieldToSql('PAYLOAD', 'temp')).toBe("PAYLOAD->'$[temp]'");
        expect(jsonValueFieldToNumericSql('VALUE')).toBe('VALUE');
    });

    // Measured on the sandbox DSH_JSON row {"o'brien":11,"a\\b":12,"q\"t":13}: each expression
    // returns its own key's value, and the single-backslash form of `a\b` returns NULL.
    test.each([
        [`["o'brien"]`, `PAYLOAD->'$["o''brien"]'`],
        [String.raw`['a\b']`, String.raw`PAYLOAD->('$[''a' || RTRIM('\\ ') || 'b'']')`],
        ['[q"t]', `PAYLOAD->'$[q"t]'`],
    ])('stored path %s survives the JSONPath and SQL layers', (path, expected) => {
        expect(jsonValueFieldToSql('PAYLOAD', path)).toBe(expected);
    });

    test('a column that is not a plain name is quoted', () => {
        expect(jsonValueFieldToSql('Q-1')).toBe('"Q-1"');
        expect(jsonValueFieldToNumericSql('Q-1', 'temp')).toBe(`TO_NUMBER_SAFE("Q-1"->'$[temp]')`);
    });
});

describe('dashboard name emitters', () => {
    test('plain names are unchanged, others quoted, variables and empty kept', () => {
        expect(toSqlTableName('MACHBASEDB.SYS.TAG')).toBe('MACHBASEDB.SYS.TAG');
        expect(toSqlTableName('SYS.V$Q-1545_STAT')).toBe('SYS."V$Q-1545_STAT"');
        expect(toSqlTableName('{{db}}.SYS.TAG')).toBe('{{db}}.SYS.TAG');
        expect(toSqlColumnName('')).toBe('');
        expect(toSqlColumnName('q"t')).toBe('"q""t"');
    });

    // #1558 (F-138): the Value field also takes a typed expression. Against the block's own columns a
    // value that is one of them is a name, anything else is the expression as typed (as before 5fae6b7f).
    const COLUMNS = [...TAG_COLUMNS, ['T-1', 20, 0, 3, 0]];
    test('against the block columns, a column is quoted and an expression is written as typed', () => {
        expect(toSqlColumnName('T-1', COLUMNS)).toBe('"T-1"');
        expect(toSqlColumnName('VALUE*2', COLUMNS)).toBe('VALUE*2');
        expect(toSqlColumnName('abs(VALUE)', COLUMNS)).toBe('abs(VALUE)');
        expect(toSqlColumnName('VALUE', COLUMNS)).toBe('VALUE');
        expect(toSqlColumnName('{{col}}', COLUMNS)).toBe('{{col}}');
    });

    test('without the block columns nothing changes', () => {
        expect(toSqlColumnName('T-1')).toBe('"T-1"');
        expect(toSqlColumnName('T-1', [])).toBe('"T-1"');
    });
});

describe.each([
    ['editor', DashboardQueryParser],
    ['public', PublicDashboardQueryParser],
])('%s Value field expression (#1558)', (_, parser) => {
    const withValue = (value: string, aggregator: string) => createBlock({ value, aggregator, values: [{ id: 'value-1', alias: '', value, jsonKey: '', aggregator }] });

    test.each([
        ['VALUE*2', 'none', 'VALUE*2 as VALUE'],
        ['abs(VALUE)', 'none', 'abs(VALUE) as VALUE'],
        ['VALUE*2', 'sum', 'sum(VALUE*2)'],
    ])('%s with %s is written as typed', (value, aggregator, expected) => {
        const { sql } = parse(parser, withValue(value, aggregator));
        expect(sql).toContain(expected);
        expect(sql).not.toContain('"VALUE*2"');
    });

    test('a column the table really has is still quoted', () => {
        const block = withValue('T-1', 'none');
        block.tableInfo = [...TAG_COLUMNS, ['T-1', 20, 0, 3, 0]];
        expect(parse(parser, block).sql).toContain('"T-1" as VALUE');
    });
});

test('full typing template writes a typed Value field expression as typed (#1558)', () => {
    const sql = buildFullTypingQuery(createBlock({ value: 'VALUE*2', aggregator: 'avg' }));
    expect(sql).toContain('VALUE*2 AS VALUE');
    expect(sql).not.toContain('"VALUE*2"');
});

describe.each([
    ['editor', createMapValueForTag],
    ['public', createPublicMapValueForTag],
])('%s createMapValueForTag', (_, create) => {
    test('a tag name is a TQL string literal', () => {
        expect(create(["o'brien", 'q"t'], true)).toContain(String.raw`MAPVALUE(3, value(1) == "o'brien" ? value(2) : NULL)
MAPVALUE(4, value(1) == "q\"t" ? value(2) : NULL)`);
    });
});
