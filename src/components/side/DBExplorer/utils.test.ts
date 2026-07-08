import { buildDataViewerColumnConfigFromColumnRows, buildDropObjectQuery, buildQualifiedTableName, E_COLUMN_FLAG } from './utils';

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

describe('buildDropObjectQuery', () => {
    test('uses DROP VIEW without CASCADE for VIEW objects (flag 7)', () => {
        expect(
            buildDropObjectQuery({
                tableType: 7,
                userName: 'USER',
                tableName: 'V1',
                cascade: true,
            })
        ).toBe('DROP VIEW USER.V1');
    });

    test('appends CASCADE for TAG objects (flag 6) when cascade is true', () => {
        expect(
            buildDropObjectQuery({
                tableType: 6,
                userName: 'USER',
                tableName: 'T1',
                cascade: true,
            })
        ).toBe('DROP TABLE USER.T1 CASCADE');
    });

    test('omits CASCADE for TAG objects (flag 6) when cascade is false', () => {
        expect(
            buildDropObjectQuery({
                tableType: 6,
                userName: 'USER',
                tableName: 'T1',
                cascade: false,
            })
        ).toBe('DROP TABLE USER.T1');
    });

    test('uses plain DROP TABLE for LOG objects (flag 0) since the call site never enables cascade for them', () => {
        expect(
            buildDropObjectQuery({
                tableType: 0,
                userName: 'USER',
                tableName: 'NM',
                cascade: false,
            })
        ).toBe('DROP TABLE USER.NM');
    });

    test('uses plain DROP TABLE for LOOKUP objects (flag 4) since the call site never enables cascade for them', () => {
        expect(
            buildDropObjectQuery({
                tableType: 4,
                userName: 'USER',
                tableName: 'NM',
                cascade: false,
            })
        ).toBe('DROP TABLE USER.NM');
    });
});

describe('buildDataViewerColumnConfigFromColumnRows', () => {
    test('uses TAG table flags before hard-coded column names', () => {
        expect(
            buildDataViewerColumnConfigFromColumnRows([
                ['TAG_NAME', 5, 40, 0, E_COLUMN_FLAG.TAGNAME],
                ['TS', 6, 8, 1, E_COLUMN_FLAG.BASETIME],
                ['READING', 20, 8, 2, E_COLUMN_FLAG.SUMMARIZED],
            ])
        ).toEqual({
            tagColumn: 'TAG_NAME',
            timeColumn: 'TS',
            valueColumn: 'READING',
            metaTagColumn: 'TAG_NAME',
        });
    });

    test('falls back to column order when flags are not available', () => {
        expect(
            buildDataViewerColumnConfigFromColumnRows([
                ['MY_NAME', 5, 40],
                ['MY_TIME', 6, 8],
                ['MY_VALUE', 20, 8],
            ])
        ).toEqual({
            tagColumn: 'MY_NAME',
            timeColumn: 'MY_TIME',
            valueColumn: 'MY_VALUE',
            metaTagColumn: 'MY_NAME',
        });
    });

    test('uses safe defaults when column rows are unavailable', () => {
        expect(buildDataViewerColumnConfigFromColumnRows(undefined)).toEqual({
            tagColumn: 'NAME',
            timeColumn: 'TIME',
            valueColumn: 'VALUE',
            metaTagColumn: 'NAME',
        });
    });
});
