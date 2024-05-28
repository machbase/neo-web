import { getCommandState } from './bridgeCommandHelper';

test.each([
    ['select', 'select', 'query'],
    [' select', ' select', 'query'],
    [' select ', ' select ', 'query'],
    [' Select', ' Select', 'query'],
    [' SelecT ', ' SelecT ', 'query'],
    [' aaa select ', ' aaa select ', 'exec'],
    ['sselect ', 'sselect ', 'exec'],
])('BRIDGE_COMMAND - %s', (_, aString, expected) => {
    expect(getCommandState(aString)).toEqual(expected);
});
