import request from '@/api/core';
import { getVirtualTableInfo } from './api';

jest.mock('@/api/core', () => jest.fn());

const mockedRequest = request as unknown as jest.Mock;

const sentQuery = () => decodeURIComponent(String(mockedRequest.mock.calls[0][0].url));

/**
 * v8.7 gives every logical database its own copy of a `V$` view, so a lookup keyed on the view
 * name alone stopped identifying one row.
 *
 * Measured on a server holding MACHBASEDB and FACTORY_A: `select ID from v$tables where name =
 * 'V$DEMO_TAG_STAT'` answered two rows (462 and 480), and the single-row subquery it feeds
 * failed the whole statement with `MACHCLI-ERR-2131, Single-row subquery returns more than one
 * row`. The panel that asks — Gauge, Pie, Liquid fill — was left with no columns at all.
 *
 * The outer `DATABASE_ID` filter cannot save it: that one constrains `v$columns`, and the
 * subquery has already failed by then.
 */
describe('getVirtualTableInfo scopes its lookup to one database', () => {
    beforeEach(() => {
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValue({ status: 200, data: '' });
    });

    test('the v$tables subquery carries DATABASE_ID, not just the view name', async () => {
        await getVirtualTableInfo('2', 'V$DEMO_TAG_STAT', 'SYS');

        const sQuery = sentQuery();
        const sSubQuery = sQuery.slice(sQuery.indexOf('(select ID from v$tables'));
        expect(sSubQuery).toContain("name = 'V$DEMO_TAG_STAT'");
        expect(sSubQuery).toContain('DATABASE_ID = 2');
    });

    test('the outer filter still scopes v$columns to the same database', async () => {
        await getVirtualTableInfo('2', 'V$DEMO_TAG_STAT', 'SYS');

        expect(sentQuery()).toContain('v$columns WHERE DATABASE_ID = 2');
    });

    test('a mounted database id survives as digits rather than being rounded', async () => {
        // Ids are carried as text precisely so this one arrives intact; a JSON number would
        // have become 4611686018427388000 and matched no row.
        await getVirtualTableInfo('4611686018427387913', 'V$ATABLE_STAT', 'SYS');

        expect(sentQuery()).toContain('DATABASE_ID = 4611686018427387913');
        expect(sentQuery()).not.toContain('4611686018427388000');
    });
});
