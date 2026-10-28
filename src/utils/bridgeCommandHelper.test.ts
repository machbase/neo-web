import { getCommandState } from './bridgeCommandHelper';

test.each([
    ['select', 'select', 'query'],
    [' select', ' select', 'query'],
    [' select ', ' select ', 'query'],
    [' Select', ' Select', 'query'],
    [' SelecT ', ' SelecT ', 'query'],
    [' aaa select ', ' aaa select ', 'exec'],
    ['sselect ', 'sselect ', 'exec'],
    // issue #1570 F-143
    ['SELECT + newline', 'SELECT\n  *\nFROM t', 'query'],
    ['select + tab', 'select\t* from t', 'query'],
    ['select(', 'select(1)', 'query'],
    ['WITH … SELECT', 'WITH x AS (SELECT 1) SELECT * FROM x', 'query'],
    ['with + newline', 'with\nx as (select 1)\nselect * from x', 'query'],
    ['WITH … INSERT', 'WITH x AS (SELECT 1) INSERT INTO t SELECT * FROM x', 'exec'],
    ['SELECTED', 'SELECTED', 'exec'],
    ['WITHOUT', 'WITHOUT x', 'exec'],
    ['INSERT', 'INSERT INTO t VALUES (1)', 'exec'],
    ['empty', '', 'exec'],
])('BRIDGE_COMMAND - %s', (_, aString, expected) => {
    expect(getCommandState(aString)).toEqual(expected);
});
