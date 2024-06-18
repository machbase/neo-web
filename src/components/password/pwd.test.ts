/* eslint-disable no-useless-escape */
import { checkPwdPolicy, parsePwd } from './utils';

test.each([
    ['대소문자 - [new 에만 대문자 포함]', 'TEST', 'test', undefined],
    ['대소문자 - [confirm 에만 대문자 포함]', 'test', 'TEST', undefined],
    ['최소길이 - [0자]', '', '', 'Password must be at least 1 character.'],
    [
        '최대길이 - [256자]',
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        undefined,
    ],
    [
        '최대길이 - [257자]',
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'Password can be up to 256 characters long.',
    ],
    ['특수문자 - [;]', 'ab;c', 'ab;c', 'Password cannot contain ";".'],
])('PWD - %s', (_, aNew, aConf, expected) => {
    expect(checkPwdPolicy(aNew, aConf)).toEqual(expected);
});

test.each([
    ["특수문자 - [']", "a''", "a\\'\\'"],
    ['특수문자 - [\\]', '\\\\b', '\\\\\\\\b'],
    ["특수문자 - [\\']", "\\\\b'", "\\\\\\\\b\\'"],
    ["특수문자 - ['\\'\\\\\\']", "'\\'\\\\\\'", "\\'\\\\\\'\\\\\\\\\\\\\\'"],
])('PWD - %s', (_, aNew, expected) => {
    expect(parsePwd(aNew)).toEqual(expected);
});
