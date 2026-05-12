import { buildQualifiedTableName, canOpenTagAnalyzerFromMetaColumns } from './utils';

describe('canOpenTagAnalyzerFromMetaColumns', () => {
    test('allows numeric default value column', () => {
        expect(
            canOpenTagAnalyzerFromMetaColumns([
                ['NAME', 'varchar'],
                ['TIME', 'datetime'],
                ['VALUE', 'double'],
            ])
        ).toBe(true);
    });

    test('blocks JSON default value column', () => {
        expect(
            canOpenTagAnalyzerFromMetaColumns([
                ['NAME', 'varchar'],
                ['TIME', 'datetime'],
                ['PAYLOAD', 'json'],
            ])
        ).toBe(false);
        expect(
            canOpenTagAnalyzerFromMetaColumns([
                ['NAME', 5],
                ['TIME', 6],
                ['PAYLOAD', 61],
            ])
        ).toBe(false);
    });

    test('blocks BINARY default value column', () => {
        expect(
            canOpenTagAnalyzerFromMetaColumns([
                ['NAME', 'varchar'],
                ['TIME', 'datetime'],
                ['FRAME', 'binary'],
            ])
        ).toBe(false);
        expect(
            canOpenTagAnalyzerFromMetaColumns([
                ['NAME', 5],
                ['TIME', 6],
                ['FRAME', 97],
            ])
        ).toBe(false);
    });

    test('blocks when default value column is missing', () => {
        expect(
            canOpenTagAnalyzerFromMetaColumns([
                ['NAME', 'varchar'],
                ['TIME', 'datetime'],
            ])
        ).toBe(false);
    });
});

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
