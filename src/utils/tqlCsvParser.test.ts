import { TagzCsvParser, TqlCsvParser, tqlCsvColumnTypes } from './tqlCsvParser';
import { TqlCsvParser as PublicTqlCsvParser } from '../public-dashboard/utils/tqlCsvParser';

test.each([
    ['CSV - "기본 응답 형식"', `world,3.141792,hello world? 3.14,33`, [[['world', '3.141792', 'hello world? 3.14', '33']], ['column0', 'column1', 'column2', 'column3']]],
    [
        'CSV - "로 감싸진 ,',
        `"world,3.141792",3.141792,"hello world,3.141792? 3.14"`,
        [[['world,3.141792', '3.141792', 'hello world,3.141792? 3.14']], ['column0', 'column1', 'column2']],
    ],
    ['CSV - "629 issue"', `"A,B,C"`, [[['A,B,C']], ['column0']]],
])('TQL - %s', (_, aQueryText, expected) => {
    expect(TqlCsvParser(aQueryText)).toEqual(expected);
});

// Contract: an empty / whitespace-only CSV body must not crash. papaparse with
// skipEmptyLines drops blank lines, leaving `data === []` (or a single blank
// cell for whitespace-only input), which would otherwise throw a TypeError on
// `data[0].length`. Guard returns an empty body + empty header so the result
// area renders an empty table instead of surfacing an error. (machbase/neo #1421)
test.each([
    ['CSV - empty string', ''],
    ['CSV - single newline', '\n'],
    ['CSV - double newline', '\n\n'],
    ['CSV - whitespace only', '   '],
])('TQL - %s returns empty body + empty header (no crash)', (_, aQueryText) => {
    expect(TqlCsvParser(aQueryText)).toEqual([[], []]);
});

// Contract: a multi-row CSV must be returned as a body containing EVERY data
// row (no header row split off). This guards the TQL header-toggle regression
// where the first data row was being consumed as a header.
test('TQL - multi-row CSV keeps all rows in the body (no header row split off)', () => {
    const sMultiRowCsv = `a,1\nb,2\nc,3`;
    const [sBody, sHeader] = TqlCsvParser(sMultiRowCsv);

    // All 3 rows present in the body, first row not consumed as a header.
    expect(sBody).toHaveLength(3);
    expect(sBody).toEqual([
        ['a', '1'],
        ['b', '2'],
        ['c', '3'],
    ]);

    // Header is synthesized from the column count, not taken from the data.
    expect(sHeader).toEqual(['column0', 'column1']);
});

// #1566 (F-25): the result table shows what the server sent.
test.each([
    ['editor', TqlCsvParser],
    ['public', PublicTqlCsvParser],
])('%s TQL CSV result keeps every row and value as sent', (_, parse) => {
    const [sBody] = parse('//host/path,10\n007,20\n1e3,30\ntrue,40\nNORMAL,50\n,60');
    expect(sBody).toEqual([
        ['//host/path', '10'],
        ['007', '20'],
        ['1e3', '30'],
        ['true', '40'],
        ['NORMAL', '50'],
        // An empty field is NULL, as before: Machbase stores '' as NULL.
        [null, '60'],
    ]);
});

test('a CSV result column is numeric when every value in it is a number; NULL does not decide it', () => {
    const [sBody] = TqlCsvParser('1,NULL,NULL,a\n2,NULL,1.5,007\n3,x,,1e3\n');
    // id: numbers · s: NULL and text · d: NULL, an empty field and a number · mixed: text and numbers
    expect(tqlCsvColumnTypes(sBody)).toEqual(['double', 'string', 'double', 'string']);
    expect(tqlCsvColumnTypes([['NULL'], [null]])).toEqual(['string']);
    expect(tqlCsvColumnTypes([])).toEqual([]);
});

test('tag data CSV still reads numbers as numbers', () => {
    expect(TagzCsvParser('roll-sine,1767193200000,1.5\n')).toEqual([['roll-sine', 1767193200000, 1.5]]);
});
