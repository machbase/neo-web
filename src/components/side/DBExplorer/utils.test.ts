import { buildQualifiedTableName } from './utils';

describe('buildQualifiedTableName', () => {
    test('returns table name only when owner is the current user on the local DB', () => {
        expect(
            buildQualifiedTableName({
                dbName: 'MACHBASEDB',
                userName: 'SYS',
                tableName: 'TAG',
                databaseId: -1,
                currentUserName: 'SYS',
            })
        ).toBe('TAG');
    });

    test('returns USER.TABLE when owner differs from current user on the local DB', () => {
        expect(
            buildQualifiedTableName({
                dbName: 'MACHBASEDB',
                userName: 'USER',
                tableName: 'TAG',
                databaseId: -1,
                currentUserName: 'SYS',
            })
        ).toBe('USER.TAG');
    });

    test('returns DB.USER.TABLE when table is on a mounted database', () => {
        expect(
            buildQualifiedTableName({
                dbName: 'MNTDB',
                userName: 'SYS',
                tableName: 'TAG',
                databaseId: 1,
                currentUserName: 'SYS',
            })
        ).toBe('MNTDB.SYS.TAG');
    });

    test('ignores case when comparing owner with current user', () => {
        expect(
            buildQualifiedTableName({
                dbName: 'MACHBASEDB',
                userName: 'SYS',
                tableName: 'TAG',
                databaseId: -1,
                currentUserName: 'sys',
            })
        ).toBe('TAG');
    });
});
