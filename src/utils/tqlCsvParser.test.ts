import { TqlCsvParser } from './tqlCsvParser';

test.each([
    ['CSV - "기본 응답 형식"', `world,3.141792,hello world? 3.14,33`, [[['world', 3.141792, 'hello world? 3.14', 33]], ['column0', 'column1', 'column2', 'column3']]],
    [
        'CSV - "로 감싸진 ,',
        `"world,3.141792",3.141792,"hello world,3.141792? 3.14"`,
        [[['world,3.141792', 3.141792, 'hello world,3.141792? 3.14']], ['column0', 'column1', 'column2']],
    ],
    ['CSV - "629 issue"', `"A,B,C"`, [[['A,B,C']], ['column0']]],
])('TQL - %s', (_, aQueryText, expected) => {
    expect(TqlCsvParser(aQueryText)).toEqual(expected);
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
        ['a', 1],
        ['b', 2],
        ['c', 3],
    ]);

    // Header is synthesized from the column count, not taken from the data.
    expect(sHeader).toEqual(['column0', 'column1']);
});
