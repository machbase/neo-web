import { removeV$Table } from './dbUtils';

test.each([
    ['TAG TABLE', `T_TEST`, 'T_TEST'],
    ['TAG TABLE - _STAT 포함', `T_TEST_STAT`, 'T_TEST_STAT'],
    ['VIRTUAL TABLE', `V$T_TEST_STAT`, 'T_TEST'],
    ['VIRTUAL TABLE - _STAT 미포함', `V$T_TEST`, 'V$T_TEST'],
    // The lazy, unanchored regex this replaced stopped at the first `_STAT` anywhere in the
    // string, so a table whose own name contains it came back truncated to nothing useful.
    ['VIRTUAL TABLE - 이름 안에 _STAT 포함', `V$X_STATION_STAT`, 'X_STATION'],
    ['VIRTUAL TABLE - _STATUS 포함', `V$A_STATUS_LOG_STAT`, 'A_STATUS_LOG'],
    ['VIRTUAL TABLE - 소문자', `v$t_test_stat`, 't_test'],
])('SQL - %s', (_, aQueryText, expected) => {
    expect(removeV$Table(aQueryText)).toEqual(expected);
});
