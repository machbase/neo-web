import request from '@/api/core';
import { getTableList } from '@/api/repository/api';
import { resetCurrentDatabase, setCurrentDatabase } from '@/utils/currentDatabaseState';
import { tableMetadataApi } from './tableMetadataApi';

jest.mock('@/api/core', () => jest.fn());
jest.mock('@/api/repository/api', () => ({
    getTableList: jest.fn(),
}));
jest.mock('@/api/repository/currentDatabase', () => ({
    ensureCurrentDatabase: jest.fn().mockResolvedValue(undefined),
}));

const mockedRequest = request as unknown as jest.Mock;
const mockedGetTableList = getTableList as jest.MockedFunction<
    typeof getTableList
>;

describe('tableMetadataApi.fetchTableNames', () => {
    beforeEach(() => {
        mockedGetTableList.mockReset();
    });

    it('retains database-qualified tag tables from the repository list', async () => {
        mockedGetTableList.mockResolvedValue({
            success: true,
            data: {
                columns: [
                    'DB_NAME',
                    'USER_NAME',
                    'TABLE_NAME',
                    'TABLE_TYPE',
                ],
                rows: [
                    ['FACTORY_A', 'USER_A', 'TAG', 6],
                    ['FACTORY_B', 'USER_B', 'TAG', 6],
                    ['FACTORY_B', 'USER_B', 'LOG_DATA', 0],
                ],
            },
        } as unknown as Awaited<ReturnType<typeof getTableList>>);

        await expect(tableMetadataApi.fetchTableNames()).resolves.toEqual([
            'FACTORY_A.USER_A.TAG',
            'FACTORY_B.USER_B.TAG',
        ]);
    });
});

describe('tableMetadataApi.fetchTableColumns', () => {
    beforeEach(() => {
        resetCurrentDatabase();
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValue({
            success: true,
            data: { rows: [['TIME', 6, 0]], columns: [] },
        });
    });

    afterEach(() => resetCurrentDatabase());

    it.each(['MACHBASEDB.SYS.TAG', 'machbasedb.SYS.TAG', 'SYS.TAG', 'TAG'])('uses the current database id for the legacy table %s', async (tableName) => {
        await tableMetadataApi.fetchTableColumns(tableName);

        const sql = decodeURIComponent(mockedRequest.mock.calls[0][0].url);
        expect(sql).toContain('AND SYSTEM_COLUMNS.DATABASE_ID = -1');
        expect(sql).not.toContain('V$STORAGE_MOUNT_DATABASES');
    });

    it('looks up a mounted backup on a legacy server', async () => {
        await tableMetadataApi.fetchTableColumns('BACKUP.SYS.TAG');

        const sql = decodeURIComponent(mockedRequest.mock.calls[0][0].url);
        expect(sql).toContain("AND SYSTEM_COLUMNS.DATABASE_ID = (SELECT BACKUP_TBSID FROM V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = 'BACKUP')");
        expect(sql).not.toContain('V$DATABASES');
    });

    it.each(['FACTORY_A.SYS.TAG', 'factory_a.SYS.TAG', 'SYS.TAG', 'TAG'])('uses the resolved current database id for %s on a logical-database server', async (tableName) => {
        setCurrentDatabase({ id: '7', name: 'FACTORY_A' });
        await tableMetadataApi.fetchTableColumns(tableName);

        const sql = decodeURIComponent(mockedRequest.mock.calls[0][0].url);
        expect(sql).toContain('AND SYSTEM_COLUMNS.DATABASE_ID = 7');
        expect(sql).not.toContain('V$DATABASES');
        expect(sql).not.toContain('V$STORAGE_MOUNT_DATABASES');
    });

    it.each(['FACTORY_B', 'MACHBASEDB'])('looks up another logical database %s rather than using the current id', async (databaseName) => {
        setCurrentDatabase({ id: '7', name: 'FACTORY_A' });
        await tableMetadataApi.fetchTableColumns(`${databaseName}.SYS.TAG`);

        const sql = decodeURIComponent(mockedRequest.mock.calls[0][0].url);
        expect(sql).toContain(`AND SYSTEM_COLUMNS.DATABASE_ID = (SELECT DATABASE_ID FROM V$DATABASES WHERE NAME = '${databaseName}')`);
        expect(sql).not.toContain('V$STORAGE_MOUNT_DATABASES');
    });
});
