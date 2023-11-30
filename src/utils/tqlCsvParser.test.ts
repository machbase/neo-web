import { TqlCsvParser } from './tqlCsvParser';

test.each([
    ['CSV - "기본 응답 형식"', `world,3.141792,hello world? 3.14,33`, [[['world', 3.141792, 'hello world? 3.14', 33]], ['column0', 'column1', 'column2', 'column3']]],
    [
        'CSV - "로 감싸진 ,',
        `"world,3.141792",3.141792,"hello world,3.141792? 3.14"`,
        [[['world,3.141792', 3.141792, 'hello world,3.141792? 3.14']], ['column0', 'column1', 'column2']],
    ],
])('TQL - %s', (_, aQueryText, expected) => {
    expect(TqlCsvParser(aQueryText)).toEqual(expected);
});
