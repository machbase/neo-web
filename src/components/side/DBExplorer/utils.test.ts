import { buildDataViewerColumnConfigFromColumnRows, buildDisplayColumnInfo, buildDropObjectQuery, buildQualifiedTableName, E_COLUMN_FLAG, GettColumnFlag } from './utils';

const DATETIME_TYPE = 6;
const DOUBLE_TYPE = 20;

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

describe('GettColumnFlag', () => {
    test('labels a datetime BASETIME column as base time', () => {
        expect(GettColumnFlag(E_COLUMN_FLAG.BASETIME, DATETIME_TYPE)).toBe('base time');
    });

    test('labels a non-datetime (double) BASETIME column as base distance', () => {
        // base distance and base time share the BASETIME flag; the double TYPE disambiguates them.
        expect(GettColumnFlag(E_COLUMN_FLAG.BASETIME, DOUBLE_TYPE)).toBe('base distance');
    });

    test('defaults to base time when the column type is unknown', () => {
        expect(GettColumnFlag(E_COLUMN_FLAG.BASETIME)).toBe('base time');
    });

    test('keeps other flag labels regardless of type', () => {
        expect(GettColumnFlag(E_COLUMN_FLAG.TAGNAME, DOUBLE_TYPE)).toBe('tag name');
        expect(GettColumnFlag(E_COLUMN_FLAG.SUMMARIZED, DOUBLE_TYPE)).toBe('summarized');
    });
});

describe('buildDisplayColumnInfo', () => {
    test('shows base distance for a double basetime-flagged column (odometer base distance)', () => {
        const displayColumnInfo = buildDisplayColumnInfo({
            columns: ['NAME', 'TYPE', 'LENGTH', 'DESC'],
            rows: [
                ['NAME', 5, 32, E_COLUMN_FLAG.TAGNAME],
                ['ODOMETER_M', DOUBLE_TYPE, 8, E_COLUMN_FLAG.BASETIME],
                ['VALUE', DOUBLE_TYPE, 8, E_COLUMN_FLAG.SUMMARIZED],
            ],
            types: ['string', 'number', 'number', 'number'],
        });

        const descByName = new Map(displayColumnInfo.rows.map((row) => [String(row[0]), row[4]]));
        expect(descByName.get('ODOMETER_M')).toBe('base distance');
        expect(descByName.get('NAME')).toBe('tag name');
    });

    test('still shows base time for a datetime basetime-flagged column', () => {
        const displayColumnInfo = buildDisplayColumnInfo({
            columns: ['NAME', 'TYPE', 'LENGTH', 'DESC'],
            rows: [['TS', DATETIME_TYPE, 8, E_COLUMN_FLAG.BASETIME]],
            types: ['string', 'number', 'number', 'number'],
        });

        expect(displayColumnInfo.rows[0][4]).toBe('base time');
    });
});

describe('buildDataViewerColumnConfigFromColumnRows', () => {
    test('resolves the base column from a base distance display desc', () => {
        expect(
            buildDataViewerColumnConfigFromColumnRows([
                ['NAME', 'varchar', 32, 32, 'tag name'],
                ['ODOMETER_M', 'double', 8, 8, 'base distance'],
                ['VALUE', 'double', 8, 8, 'summarized'],
            ])
        ).toEqual({
            tagColumn: 'NAME',
            timeColumn: 'ODOMETER_M',
            valueColumn: 'VALUE',
            metaTagColumn: 'NAME',
        });
    });

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
