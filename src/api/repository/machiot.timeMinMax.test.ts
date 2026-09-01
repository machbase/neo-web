import request from '@/api/core';
import { fetchTimeMinMax } from './machiot';
import { resetCurrentDatabase, setCurrentDatabase, setDatabases } from '@/utils/currentDatabaseState';

jest.mock('@/api/core', () => jest.fn());

const mockedRequest = request as unknown as jest.Mock;

const sentQuery = () => decodeURIComponent(String(mockedRequest.mock.calls[0][0].url));

/**
 * A tag panel's time extent comes from `V$<TABLE>_STAT`, and the view exists once per database.
 *
 * Reducing the block's table to its bare name and re-attaching only the owner therefore named
 * the *session's* copy: a panel on FACTORY_A read `SYS.V$ATABLE_STAT`, which is MACHBASEDB's
 * and empty. `fetchTimeMinMax` treats an empty answer as "no extent" and falls back to a
 * `now - 1h` window, while the data query stayed correctly qualified — so the panel asked the
 * right table for the wrong hour and drew a blank chart with no error at all.
 *
 * Measured against a two-database server: `SYS.V$ATABLE_STAT` → 0 rows,
 * `FACTORY_A.SYS.V$ATABLE_STAT` → [1787903205532689458, 1787904411306247833].
 */
describe('fetchTimeMinMax keeps the database the block name carries', () => {
    const tagBlock = {
        type: 'tag',
        table: 'FACTORY_A.SYS.ATABLE',
        userName: 'SYS',
        tag: 'TAG_01',
        name: 'NAME',
        time: 'TIME',
    };

    beforeEach(() => {
        resetCurrentDatabase();
        setDatabases([
            { id: '1', name: 'MACHBASEDB', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: true },
            { id: '2', name: 'FACTORY_A', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: false },
        ]);
        setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValue({ status: 200, data: { data: { rows: [[1, 2]] } } });
    });

    afterEach(() => resetCurrentDatabase());

    test('the statistics view is read in the block table’s own database', async () => {
        await fetchTimeMinMax(tagBlock);

        expect(sentQuery()).toContain('from FACTORY_A.SYS.V$ATABLE_STAT');
        expect(sentQuery()).not.toContain('from SYS.V$ATABLE_STAT');
    });

    test('a block that already names the statistics view is not decorated twice', async () => {
        await fetchTimeMinMax({ ...tagBlock, table: 'FACTORY_A.SYS.V$ATABLE_STAT' });

        expect(sentQuery()).toContain('from FACTORY_A.SYS.V$ATABLE_STAT');
        expect(sentQuery()).not.toContain('V$V$');
    });

    test('a non-TIME base column scans the source table, still fully qualified', async () => {
        // The stat view holds no ODOMETER_M, so this branch reads the table itself — and the
        // stat-view decoration has to come off the last segment alone.
        await fetchTimeMinMax({ ...tagBlock, table: 'FACTORY_A.SYS.V$ATABLE_STAT', time: 'ODOMETER_M' });

        expect(sentQuery()).toContain('from FACTORY_A.SYS.ATABLE');
        expect(sentQuery()).toContain('min(ODOMETER_M)');
    });

    test('a table in the current database is unaffected', async () => {
        await fetchTimeMinMax({ ...tagBlock, table: 'MACHBASEDB.SYS.ATABLE' });

        expect(sentQuery()).toContain('from MACHBASEDB.SYS.V$ATABLE_STAT');
    });

    test('a bare legacy name still gets its owner, as before', async () => {
        await fetchTimeMinMax({ ...tagBlock, table: 'ATABLE' });

        expect(sentQuery()).toContain('from SYS.V$ATABLE_STAT');
    });
});
