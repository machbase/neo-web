import { removeV$Table } from './dbUtils';

test.each([
    ['TAG TABLE', `T_TEST`, 'T_TEST'],
    ['TAG TABLE - _STAT 포함', `T_TEST_STAT`, 'T_TEST_STAT'],
    ['VIRTUAL TABLE', `V$T_TEST_STAT`, 'T_TEST'],
    ['VIRTUAL TABLE - _STAT 미포함', `V$T_TEST`, 'V$T_TEST'],
])('SQL - %s', (_, aQueryText, expected) => {
    expect(removeV$Table(aQueryText)).toEqual(expected);
});
