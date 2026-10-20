import { sqlContains, sqlIdentifier, sqlIdentifierPath, sqlQueryUrl, sqlString, tqlString } from './queryText';

/**
 * Every expected string here was sent to a machbase-neo 8.7.2 sandbox and matched exactly the
 * row it names (tags `o'brien`, `p_0`, `p50`, `100%`, `tail\`, `q"t`, ``bq`x``; table `Q-1545`).
 */
describe('sqlString', () => {
    test('an ordinary value is quoted and otherwise untouched', () => {
        expect(sqlString('sensor1')).toBe("'sensor1'");
        expect(sqlString(42)).toBe("'42'");
        expect(sqlString(undefined)).toBe("''");
    });

    test('a quote is doubled', () => {
        expect(sqlString("o'brien")).toBe("'o''brien'");
    });

    test('a backslash is written as its own trimmed literal, never next to a quote', () => {
        expect(sqlString('tail\\')).toBe(String.raw`('tail' || RTRIM('\\ '))`);
        expect(sqlString(String.raw`a\nb`)).toBe(String.raw`('a' || RTRIM('\\ ') || 'nb')`);
        expect(sqlString(String.raw`q\'x`)).toBe(String.raw`('q' || RTRIM('\\ ') || '''x')`);
        expect(sqlString(String.raw`a\\`)).toBe(String.raw`('a' || RTRIM('\\\\ '))`);
    });
});

describe('sqlContains', () => {
    test('wraps the text in % and leaves ordinary text alone', () => {
        expect(sqlContains('http')).toBe("'%http%'");
    });

    test.each([
        ['p_0', String.raw`('%p' || RTRIM('\\ ') || '_0%')`],
        ['100%', String.raw`('%100' || RTRIM('\\ ') || '%%')`],
        ['tail\\', String.raw`('%tail' || RTRIM('\\\\ ') || '%')`],
        ["o'b", "'%o''b%'"],
    ])('%p matches only itself', (aTerm, aExpected) => {
        expect(sqlContains(aTerm)).toBe(aExpected);
    });
});

describe('sqlIdentifier / sqlIdentifierPath', () => {
    test.each(['TAG', 'V$TAG_STAT', '_TAG_META', 'tag1', '_X'])('a plain name %p is written as it is', (aName) => {
        expect(sqlIdentifier(aName)).toBe(aName);
    });

    test('any other name is double-quoted, with its own quote doubled', () => {
        expect(sqlIdentifier('Q-1545')).toBe('"Q-1545"');
        expect(sqlIdentifier('Q"X')).toBe('"Q""X"');
        expect(sqlIdentifier('1ABC')).toBe('"1ABC"');
    });

    test('a path quotes each part and skips the empty ones', () => {
        expect(sqlIdentifierPath('MACHBASEDB', 'SYS', 'TAG')).toBe('MACHBASEDB.SYS.TAG');
        expect(sqlIdentifierPath('MACHBASEDB', 'SYS', 'Q-1545')).toBe('MACHBASEDB.SYS."Q-1545"');
        expect(sqlIdentifierPath('', 'SYS', 'TAG')).toBe('SYS.TAG');
        expect(sqlIdentifierPath(undefined, undefined, 'TAG')).toBe('TAG');
    });

    test('a stored dotted name is split into its parts', () => {
        expect(sqlIdentifierPath('MACHBASEDB.SYS.Q-1545')).toBe('MACHBASEDB.SYS."Q-1545"');
        expect(sqlIdentifierPath('MACHBASEDB.SYS', 'V$Q-1545_STAT')).toBe('MACHBASEDB.SYS."V$Q-1545_STAT"');
    });
});

describe('tqlString', () => {
    test('an ordinary statement is only wrapped', () => {
        expect(tqlString("select * from TAG where name = 'a'")).toBe(`"select * from TAG where name = 'a'"`);
    });

    test('quote, backslash, backtick and line breaks survive the literal', () => {
        expect(tqlString('a"b')).toBe(String.raw`"a\"b"`);
        expect(tqlString(String.raw`a\b`)).toBe(String.raw`"a\\b"`);
        expect(tqlString('a`b')).toBe('"a`b"');
        expect(tqlString('select 1\nfrom T\r\t')).toBe(String.raw`"select 1\nfrom T\r\t"`);
    });
});

describe('sqlQueryUrl', () => {
    test('the statement travels as one encoded query value', () => {
        const sSql = "select * from T where name = 'a&b#c+d'";
        const sUrl = sqlQueryUrl(sSql);
        expect(sUrl.startsWith('/api/query?q=')).toBe(true);
        expect(new URLSearchParams(sUrl.split('?')[1]).get('q')).toBe(sSql);
    });
});
