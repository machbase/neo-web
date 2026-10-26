import request from '../core';
import { fetchTqlQuery, fetchTqlWithoutConsole } from './database';

jest.mock('../core', () => jest.fn());

const mockedRequest = request as unknown as jest.Mock;

const sentScript = () => String(mockedRequest.mock.calls[0][0].data);

/**
 * `use()` moves the session for one statement, for catalogue views that are scoped to the
 * session's own database and carry no column a WHERE clause could use.
 *
 * `V$RETENTION_JOB` is the view that forced this in and no longer needs it — engine dev-4158
 * gave it `DATABASE_ID`/`DATABASE_NAME` and made it report every database, so its caller filters
 * instead (`buildRetentionQuery`). No caller passes a database today; these tests hold the
 * directive's shape — quoting and escaping — for whichever view needs it next.
 */
describe('fetchTqlWithoutConsole can run a statement against another database', () => {
    beforeEach(() => {
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValue({ status: 200, data: '{"success":true,"data":{"columns":[],"rows":[]}}' });
    });

    test('a database name becomes a use() directive ahead of the statement', async () => {
        await fetchTqlWithoutConsole('select * from V$RETENTION_JOB', 'FACTORY_A');

        expect(sentScript()).toContain('SQL(use("FACTORY_A"), "select * from V$RETENTION_JOB")');
    });

    test('no database leaves the statement exactly as it was', async () => {
        // Older servers do not know the directive and answer `unknown env: use`, so callers on
        // those servers pass nothing and must get the untouched script.
        await fetchTqlWithoutConsole('select * from V$RETENTION_JOB');

        expect(sentScript()).toContain('SQL("select * from V$RETENTION_JOB")');
        expect(sentScript()).not.toContain('use(');
    });

    test('a name that could close the literal stays inside it', async () => {
        await fetchTqlWithoutConsole('select 1', 'X"), SQL("drop table T');

        expect(sentScript()).toBe('SQL(use("X\\"), SQL(\\"drop table T"), "select 1")\nJSON()');
    });

    test.each([['', false], ['   ', false], ['A-B', true], ['MACHBASEDB', true], ['_TMP9', true]])(
        'database %p is passed through: %p',
        async (aName, aExpected) => {
            await fetchTqlWithoutConsole('select 1', aName as string);
            expect(sentScript().includes('use(')).toBe(aExpected);
        }
    );

    test('a backtick, quote or backslash in the statement survives the TQL literal', async () => {
        // A backtick-quoted literal cannot carry a backtick at all — measured, `\`` answers
        // `unclosed string literal` — which is why the statement travels double-quoted.
        await fetchTqlWithoutConsole(String.raw`select name from T where name in ('bq${'`'}x', 'q"t', 'tail\\')`, 'FACTORY_A');

        expect(sentScript()).toBe(String.raw`SQL(use("FACTORY_A"), "select name from T where name in ('bq${'`'}x', 'q\"t', 'tail\\\\')")` + '\nJSON()');
    });
});

describe('fetchTqlQuery reports why a read failed', () => {
    beforeEach(() => mockedRequest.mockReset());

    test.each([
        ['an HTTP 500 with a JSON body', { status: 500, data: '{"success":false,"reason":"forced failure"}' }],
        ['an HTTP 500 with a parsed body', { status: 500, data: { success: false, reason: 'forced failure' } }],
        ['a 200 answering success:false', { status: 200, data: { success: false, reason: 'forced failure' } }],
    ])('%s', async (_aCase, aResponse) => {
        mockedRequest.mockResolvedValue(aResponse);
        const { svrState, svrReason } = await fetchTqlQuery('select 1', 0);
        expect(svrState).toBe(false);
        expect(svrReason).toBe('forced failure');
    });
});

// F-49: before the console connected the header read "null, console-log-level=NONE".
describe('fetchTqlWithoutConsole X-Console-Id', () => {
    const sentHeaders = () => mockedRequest.mock.calls[0][0].headers;
    beforeEach(() => {
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValue({ status: 200, data: '{"success":true,"data":{"columns":[],"rows":[]}}' });
        localStorage.removeItem('consoleId');
    });
    afterAll(() => localStorage.removeItem('consoleId'));

    test('no console yet: no console id header, log level still NONE', async () => {
        await fetchTqlWithoutConsole('select 1');
        expect(sentHeaders()).not.toHaveProperty('X-Console-Id');
        expect(sentHeaders()['X-Console-Log-Level']).toBe('NONE');
    });
    test('a connected console is named as before', async () => {
        localStorage.setItem('consoleId', 'abc');
        await fetchTqlWithoutConsole('select 1');
        expect(sentHeaders()['X-Console-Id']).toBe('abc, console-log-level=NONE');
    });
});
