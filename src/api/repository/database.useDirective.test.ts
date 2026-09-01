import request from '../core';
import { fetchTqlWithoutConsole } from './database';

jest.mock('../core', () => jest.fn());

const mockedRequest = request as unknown as jest.Mock;

const sentScript = () => String(mockedRequest.mock.calls[0][0].data);

/**
 * Some catalogue views are scoped to the session's own database and carry no column saying so.
 *
 * `V$RETENTION_JOB` is the one that forced this: measured against a server holding MACHBASEDB
 * and FACTORY_A, each with a `SYS.DEMO_TAG`, the identical `SYS`/`DEMO_TAG` row answers
 * `ZZRET_DEMO` from a MACHBASEDB session and `ZZRET_FACTORY` from a FACTORY_A one. A statement
 * cannot filter what the view will not distinguish, so the session is moved instead.
 */
describe('fetchTqlWithoutConsole can run a statement against another database', () => {
    beforeEach(() => {
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValue({ status: 200, data: '{"success":true,"data":{"columns":[],"rows":[]}}' });
    });

    test('a database name becomes a use() directive ahead of the statement', async () => {
        await fetchTqlWithoutConsole('select * from V$RETENTION_JOB', 'FACTORY_A');

        expect(sentScript()).toContain("SQL(use('FACTORY_A'), `select * from V$RETENTION_JOB`)");
    });

    test('no database leaves the statement exactly as it was', async () => {
        // Older servers do not know the directive and answer `unknown env: use`, so callers on
        // those servers pass nothing and must get the untouched script.
        await fetchTqlWithoutConsole('select * from V$RETENTION_JOB');

        expect(sentScript()).toContain('SQL(`select * from V$RETENTION_JOB`)');
        expect(sentScript()).not.toContain('use(');
    });

    test('a name that is not an identifier is dropped rather than quoted', async () => {
        // There is no placeholder for this position, so a name that could close the literal
        // must not reach the statement at all.
        await fetchTqlWithoutConsole('select 1', "X') , `drop table T`)--");

        expect(sentScript()).not.toContain('use(');
        expect(sentScript()).toContain('SQL(`select 1`)');
    });

    test.each([['', false], ['   ', false], ['1DB', false], ['A-B', false], ['MACHBASEDB', true], ['_TMP9', true]])(
        'database %p is passed through: %p',
        async (aName, aExpected) => {
            await fetchTqlWithoutConsole('select 1', aName as string);
            expect(sentScript().includes('use(')).toBe(aExpected);
        }
    );

    test('backticks in the statement stay escaped with a directive present', async () => {
        await fetchTqlWithoutConsole('select `X` from T', 'FACTORY_A');

        expect(sentScript()).toContain("SQL(use('FACTORY_A'), `select \\`X\\` from T`)");
    });
});
