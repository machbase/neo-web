import { getTableList } from '@/api/repository/api';
import { resetCurrentDatabase, setCurrentDatabase, setDatabases } from '@/utils/currentDatabaseState';
import { tableMetadataApi } from './tableMetadataApi';

jest.mock('@/api/repository/api', () => ({ getTableList: jest.fn() }));
jest.mock('@/api/repository/currentDatabase', () => ({
    ensureCurrentDatabase: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/api/repository/machiot', () => ({
    fetchDashboardJsonColumnSamples: jest.fn(),
}));
jest.mock('@/design-system/components', () => ({ Toast: { error: jest.fn() } }));

const mockedGetTableList = getTableList as unknown as jest.Mock;

const COLUMNS = ['DB_NAME', 'USER_NAME', 'TABLE_ID', 'TABLE_NAME', 'TABLE_TYPE', 'TABLE_FLAG', 'DBID', 'priv'];

/** `TYPE` / `FLAG` exactly as a v8.7 catalogue reports them — see the FLAG note below. */
const row = (db: string, user: string, name: string, type: number, flag: number) =>
    [db, user, 1, name, type, flag, '1', ''];

const respondWith = (rows: unknown[][]) =>
    mockedGetTableList.mockResolvedValue({ success: true, data: { columns: [...COLUMNS], rows } });

/**
 * The Tag Analyzer's table list, after it stopped asking `GET /api/tables`.
 *
 * That endpoint is the one table source in the app the front end does not build, and measured
 * against a v8.7 server holding four active databases and a mounted backup it answers only the
 * session database — 15 rows, every `DB` column `MACHBASEDB`, and still all `MACHBASEDB` with
 * `showall=true`. The same server answers 139 rows across three databases through `getTableList()`.
 * So the picker could not offer another database's table, or a mounted one, at all: the rows were
 * never in it. These tests pin the replacement to the shape that query really returns.
 */
describe('tableMetadataApi.fetchTableNames', () => {
    beforeEach(() => {
        mockedGetTableList.mockReset();
        resetCurrentDatabase();
        setDatabases([
            { id: '1', name: 'MACHBASEDB', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: true },
            { id: '2', name: 'FACTORY_A', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: false },
            { id: '1073741827', name: 'EEEEE', kind: 'MOUNTED', accessMode: 'READ_ONLY', isDefault: false },
        ]);
        setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
    });

    afterEach(() => resetCurrentDatabase());

    test('lists tag tables from every database, fully qualified', async () => {
        respondWith([
            row('MACHBASEDB', 'SYS', 'DEMO_TAG', 6, 0),
            row('FACTORY_A', 'SYS', 'DEMO_TAG', 6, 0),
            row('FACTORY_A', 'KEV', 'K_TABLE', 6, 0),
        ]);

        await expect(tableMetadataApi.fetchTableNames()).resolves.toEqual([
            'MACHBASEDB.SYS.DEMO_TAG',
            'FACTORY_A.SYS.DEMO_TAG',
            'FACTORY_A.KEV.K_TABLE',
        ]);
    });

    test('a mounted backup is listed too, and sorts last', async () => {
        // The report that started this: a mounted database was nowhere in the picker. It is
        // read-only, which the Tag Analyzer never needed otherwise — it only reads.
        respondWith([
            row('EEEEE', 'SYS', 'ATABLE', 6, 0),
            row('FACTORY_A', 'SYS', 'ATABLE', 6, 0),
            row('MACHBASEDB', 'SYS', 'ATABLE', 6, 0),
        ]);

        await expect(tableMetadataApi.fetchTableNames()).resolves.toEqual([
            'MACHBASEDB.SYS.ATABLE',
            'FACTORY_A.SYS.ATABLE',
            'EEEEE.SYS.ATABLE',
        ]);
    });

    test('sorts by the table name, not by the qualified string', async () => {
        // Sorting the whole name puts the owner ahead of the table: `MACHBASEDB.KEV.KEV_TAG` led the
        // picker where `/api/tables` had always led with `ATABLE`. Observed in the browser.
        respondWith([
            row('MACHBASEDB', 'KEV', 'KEV_TAG', 6, 0),
            row('MACHBASEDB', 'SYS', 'ATABLE', 6, 0),
        ]);

        await expect(tableMetadataApi.fetchTableNames()).resolves.toEqual([
            'MACHBASEDB.SYS.ATABLE',
            'MACHBASEDB.KEV.KEV_TAG',
        ]);
    });

    test('the session database leads the list, because a new series takes the first entry', async () => {
        respondWith([
            row('FACTORY_A', 'SYS', 'AAA_FIRST_BY_NAME', 6, 0),
            row('MACHBASEDB', 'SYS', 'ZZZ_LAST_BY_NAME', 6, 0),
        ]);

        const sNames = await tableMetadataApi.fetchTableNames();
        expect(sNames[0]).toBe('MACHBASEDB.SYS.ZZZ_LAST_BY_NAME');
    });

    test('keeps every tag table even though its FLAG is 0', async () => {
        // The trap: a draft of this change filtered on `FLAG === 1`, reading 1 as "Data". Measured,
        // a tag table is TYPE=6/FLAG=0 and FLAG=1 belongs to its `_X_DATA_n` partitions (TYPE=5),
        // so that filter would have emptied the picker.
        respondWith([row('MACHBASEDB', 'SYS', 'DEMO_TAG', 6, 0)]);

        await expect(tableMetadataApi.fetchTableNames()).resolves.toEqual(['MACHBASEDB.SYS.DEMO_TAG']);
    });

    test('drops everything that is not a tag table', async () => {
        // `/api/tables?showall=false` hid the underscore names server-side; TYPE does it here.
        respondWith([
            row('MACHBASEDB', 'SYS', 'DEMO_TAG', 6, 0),
            row('MACHBASEDB', 'SYS', '_DEMO_TAG_META', 4, 4),
            row('MACHBASEDB', 'SYS', '_DEMO_TAG_DATA_0', 5, 1),
            row('MACHBASEDB', 'SYS', 'DEMO_LOG', 0, 0),
            row('MACHBASEDB', 'SYS', 'DEMO_TRANSACTION', 8, 0),
        ]);

        await expect(tableMetadataApi.fetchTableNames()).resolves.toEqual(['MACHBASEDB.SYS.DEMO_TAG']);
    });

    test('concurrent callers share one round trip', async () => {
        respondWith([row('MACHBASEDB', 'SYS', 'DEMO_TAG', 6, 0)]);

        await Promise.all([tableMetadataApi.fetchTableNames(), tableMetadataApi.fetchTableNames()]);
        expect(mockedGetTableList).toHaveBeenCalledTimes(1);
    });

    test('a later call asks again, so a database mounted meanwhile shows up', async () => {
        respondWith([row('MACHBASEDB', 'SYS', 'DEMO_TAG', 6, 0)]);
        await tableMetadataApi.fetchTableNames();
        respondWith([
            row('MACHBASEDB', 'SYS', 'DEMO_TAG', 6, 0),
            row('EEEEE', 'SYS', 'ATABLE', 6, 0),
        ]);

        await expect(tableMetadataApi.fetchTableNames()).resolves.toContain('EEEEE.SYS.ATABLE');
    });

    test('an unsuccessful response is an error, not an empty list', async () => {
        mockedGetTableList.mockResolvedValue({ success: false, reason: 'nope' });
        await expect(tableMetadataApi.fetchTableNames()).rejects.toThrow('Failed to fetch table names.');
    });

    test('a response without the columns it names is malformed', async () => {
        mockedGetTableList.mockResolvedValue({ success: true, data: { columns: ['ROWNUM', 'DB'], rows: [] } });
        await expect(tableMetadataApi.fetchTableNames()).rejects.toThrow('Table list response contained malformed rows.');
    });
});
