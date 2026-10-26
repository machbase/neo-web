import Papa from 'papaparse';
import { mergeVariables, parseVariableCsv, variableCsvRow } from './variableCsv';

// #1566 (F-112): the variable CSV that Export writes and Import reads.
const rows = (aText: string) => Papa.parse<string[]>(aText, { header: false }).data;
const values = (aVariable: any) => aVariable.valueList.map((aValue: any) => aValue.value);

describe('parseVariableCsv', () => {
    test('a board export reads back as it was written', () => {
        const { variables, skipped, headerError } = parseVariableCsv(
            rows('LABEL,VARIABLE NAME,VALUES\nTag,{{tag}},"roll-sine,roll-step"\nTable,{{tbl}},"CHART_TEST_ROLLUP"\nAggregator,{{agg}},"avg,max,min"\nThreshold,{{th}},"50,60"\n')
        );
        expect(headerError).toBeUndefined();
        expect(skipped).toEqual([]);
        expect(variables.map((v) => [v.label, v.key, values(v), v.use.value])).toEqual([
            ['Tag', '{{tag}}', ['roll-sine', 'roll-step'], 'roll-sine'],
            ['Table', '{{tbl}}', ['CHART_TEST_ROLLUP'], 'CHART_TEST_ROLLUP'],
            ['Aggregator', '{{agg}}', ['avg', 'max', 'min'], 'avg'],
            ['Threshold', '{{th}}', ['50', '60'], '50'],
        ]);
    });

    test('a value quoted inside the field keeps its comma', () => {
        const { variables } = parseVariableCsv(rows('LABEL,VARIABLE NAME,VALUES\nCity,{{city}},"""Seoul, Korea"",Busan"'));
        expect(values(variables[0])).toEqual(['Seoul, Korea', 'Busan']);
    });

    test('only a comma separates values; `;`, `|`, a tab and a line break stay in the value', () => {
        const { variables } = parseVariableCsv([
            ['LABEL', 'VARIABLE NAME', 'VALUES'],
            ['S', '{{s}}', 'a;b,tag|a,x\ty'],
            ['N', '{{n}}', 'line1\nline2,c'],
        ]);
        expect(values(variables[0])).toEqual(['a;b', 'tag|a', 'x\ty']);
        expect(values(variables[1])).toEqual(['line1\nline2', 'c']);
    });

    test('a row with no values is reported, not dropped silently', () => {
        const { variables, skipped } = parseVariableCsv(rows('LABEL,VARIABLE NAME,VALUES\nCity,{{city}},"Seoul"\nEmpty,{{empty}},\n'));
        expect(variables.map((v) => v.label)).toEqual(['City']);
        expect(skipped).toEqual(['row 3 (Empty)']);
    });

    test('a header that is not the Export header is reported', () => {
        const { headerError, variables } = parseVariableCsv(rows('label,variable name,values\nCity,{{city}},"Seoul"'));
        expect(headerError).toContain('LABEL,VARIABLE NAME,VALUES');
        expect(variables).toEqual([]);
    });
});

describe('variableCsvRow', () => {
    const variable = (aValues: string[]) => ({ id: 'v', label: 'L', key: '{{k}}', type: 'SELECT', use: { id: '0', type: 'CSV', value: aValues[0] }, valueList: aValues.map((value, i) => ({ id: `${i}`, type: 'CSV', value })) }) as any;

    test('plain values are written exactly as before', () => {
        expect(variableCsvRow(variable(['roll-sine', 'roll-step']))).toBe('L,{{k}},"roll-sine,roll-step"');
        expect(variableCsvRow(variable(['50']))).toBe('L,{{k}},"50"');
    });

    test.each([[['Seoul, Korea', 'Busan']], [['say "hi"', 'x']], [['a', '']], [['a;b', 'c|d']], [['line1\nline2', ' pad ']]])('%j survives export and import', (aValues) => {
        const { variables } = parseVariableCsv(rows(`LABEL,VARIABLE NAME,VALUES\n${variableCsvRow(variable(aValues))}`));
        expect(values(variables[0])).toEqual(aValues);
    });
});

test('merge keeps the board variables and replaces one with the same name', () => {
    const v = (key: string, value: string) => ({ id: key + value, label: key, key, type: 'SELECT', use: { id: value, type: 'CSV', value }, valueList: [{ id: value, type: 'CSV', value }] }) as any;
    const sMerged = mergeVariables([v('{{a}}', '1'), v('{{b}}', '1')], [v('{{b}}', '2'), v('{{c}}', '2')]);
    expect(sMerged.map((x) => `${x.key}=${x.use.value}`)).toEqual(['{{a}}=1', '{{b}}=2', '{{c}}=2']);
});
