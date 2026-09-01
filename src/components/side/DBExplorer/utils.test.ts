import { buildDatabaseNodeList, buildDataViewerColumnConfigFromColumnRows, buildDisplayColumnInfo, buildDropObjectQuery, buildQualifiedTableName, describeTablePrivilege, E_COLUMN_FLAG, GettColumnFlag, parseTablePrivilege } from './utils';

const DATETIME_TYPE = 6;
const DOUBLE_TYPE = 20;

describe('buildQualifiedTableName', () => {
    test('always qualifies with the database, even for the current user on the current DB', () => {
        expect(
            buildQualifiedTableName({
                dbName: 'MACHBASEDB',
                userName: 'SYS',
                tableName: 'TAG',
                databaseId: 1,
                currentUserName: 'SYS',
            })
        ).toBe('MACHBASEDB.SYS.TAG');
    });

    test('qualifies a table owned by someone else the same way', () => {
        expect(
            buildQualifiedTableName({
                dbName: 'MACHBASEDB',
                userName: 'USER',
                tableName: 'TAG',
                databaseId: 1,
                currentUserName: 'SYS',
            })
        ).toBe('MACHBASEDB.USER.TAG');
    });

    test('keeps a table in a second database distinct from a same-named one in the first', () => {
        expect(
            buildQualifiedTableName({
                dbName: 'FACTORY_A',
                userName: 'SYS',
                tableName: 'ATABLE',
                databaseId: 2,
                currentUserName: 'SYS',
            })
        ).toBe('FACTORY_A.SYS.ATABLE');
    });

    test('falls back to the parts it has rather than emitting an empty segment', () => {
        expect(
            buildQualifiedTableName({
                dbName: '',
                userName: 'SYS',
                tableName: 'TAG',
                databaseId: -1,
                currentUserName: 'SYS',
            })
        ).toBe('SYS.TAG');
    });
});

describe('buildDropObjectQuery', () => {
    test('uses DROP VIEW without CASCADE for VIEW objects (flag 7)', () => {
        expect(
            buildDropObjectQuery({
                tableType: 7,
                dbName: 'MACHBASEDB',
                userName: 'USER',
                tableName: 'V1',
                cascade: true,
            })
        ).toBe('DROP VIEW MACHBASEDB.USER.V1');
    });

    test('appends CASCADE for TAG objects (flag 6) when cascade is true', () => {
        expect(
            buildDropObjectQuery({
                tableType: 6,
                dbName: 'MACHBASEDB',
                userName: 'USER',
                tableName: 'T1',
                cascade: true,
            })
        ).toBe('DROP TABLE MACHBASEDB.USER.T1 CASCADE');
    });

    test('omits CASCADE for TAG objects (flag 6) when cascade is false', () => {
        expect(
            buildDropObjectQuery({
                tableType: 6,
                dbName: 'MACHBASEDB',
                userName: 'USER',
                tableName: 'T1',
                cascade: false,
            })
        ).toBe('DROP TABLE MACHBASEDB.USER.T1');
    });

    test('uses plain DROP TABLE for LOG objects (flag 0) since the call site never enables cascade for them', () => {
        expect(
            buildDropObjectQuery({
                tableType: 0,
                dbName: 'MACHBASEDB',
                userName: 'USER',
                tableName: 'NM',
                cascade: false,
            })
        ).toBe('DROP TABLE MACHBASEDB.USER.NM');
    });

    test('names the database the row belongs to, not the one the session is in', () => {
        // Measured on v8.7: with ZZDROPTEST present in both databases, `DROP TABLE SYS.ZZDROPTEST`
        // issued for the FACTORY_A row deleted the MACHBASEDB one. The two-part form resolves
        // against the current database, so the database part is what keeps the drop honest.
        expect(
            buildDropObjectQuery({
                tableType: 0,
                dbName: 'FACTORY_A',
                userName: 'SYS',
                tableName: 'ZZDROPTEST',
                cascade: false,
            })
        ).toBe('DROP TABLE FACTORY_A.SYS.ZZDROPTEST');
    });

    test('builds nothing when the database is unknown, rather than a two-part DROP', () => {
        // `DROP TABLE USER.NM` resolves against whichever database the session is in, so it
        // would delete that database's copy of a table the tree showed under another one.
        expect(
            buildDropObjectQuery({
                tableType: 0,
                dbName: '',
                userName: 'USER',
                tableName: 'NM',
                cascade: false,
            })
        ).toBe('');
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

describe('parseTablePrivilege / describeTablePrivilege', () => {
    test('reads the v8.7 int64 bitmask straight through', () => {
        // The crash this guards: PRIV became a number, and `.split('|')` on a number throws
        // inside render, taking the whole explorer down rather than one badge.
        expect(parseTablePrivilege(1)).toBe(1);
        expect(parseTablePrivilege(575)).toBe(575);
    });

    test('still reads the older "<mask>|<label>" string form', () => {
        expect(parseTablePrivilege('3|SELECT, INSERT')).toBe(3);
        expect(parseTablePrivilege('3')).toBe(3);
    });

    test('answers 0 — no privileges — for anything it cannot read', () => {
        expect(parseTablePrivilege('')).toBe(0);
        expect(parseTablePrivilege(null)).toBe(0);
        expect(parseTablePrivilege(undefined)).toBe(0);
        expect(parseTablePrivilege('nonsense')).toBe(0);
        expect(parseTablePrivilege(NaN)).toBe(0);
    });

    test('spells out the granted privileges from the mask', () => {
        expect(describeTablePrivilege(1)).toBe('SELECT');
        expect(describeTablePrivilege(3)).toBe('SELECT, INSERT');
        expect(describeTablePrivilege(15)).toBe('SELECT, INSERT, DELETE, UPDATE');
        expect(describeTablePrivilege(0)).toBe('');
    });

    test('a numeric PRIV never throws where the old parser did', () => {
        expect(() => describeTablePrivilege(575)).not.toThrow();
        expect(describeTablePrivilege(575)).toContain('SELECT');
    });
});

describe('buildDropObjectQuery refuses a name it cannot fully qualify', () => {
    /**
     * A two-part name resolves against the current database, so `DROP TABLE SYS.ATABLE` issued
     * for a FACTORY_A row deletes MACHBASEDB's copy — measured. buildQualifiedTableName
     * shortens rather than emitting an empty segment, so an empty dbName used to degrade into
     * exactly that statement, and the confirmation modal showed the same shortened label.
     */
    test('an empty database name yields no statement at all', () => {
        expect(
            buildDropObjectQuery({ tableType: 6, dbName: '', userName: 'SYS', tableName: 'ATABLE', cascade: false })
        ).toBe('');
    });

    test('a missing owner is refused for the same reason', () => {
        expect(
            buildDropObjectQuery({ tableType: 6, dbName: 'FACTORY_A', userName: '', tableName: 'ATABLE', cascade: false })
        ).toBe('');
    });

    test('a fully qualified row still drops, cascade and all', () => {
        expect(
            buildDropObjectQuery({ tableType: 6, dbName: 'FACTORY_A', userName: 'SYS', tableName: 'ATABLE', cascade: true })
        ).toBe('DROP TABLE FACTORY_A.SYS.ATABLE CASCADE');
    });

    test('a view is refused on the same rule', () => {
        expect(
            buildDropObjectQuery({ tableType: 7, dbName: '', userName: 'SYS', tableName: 'AVIEW', cascade: false })
        ).toBe('');
    });
});

describe('buildDatabaseNodeList', () => {
    // V$DATABASES as the live v8.7 server reports it, in DATABASE_ID order.
    const CATALOGUE = [{ name: 'MACHBASEDB' }, { name: 'FACTORY_A' }, { name: 'MOUNT_DDD' }];

    test('an administrator sees every database, including one holding no tables', () => {
        // The whole point: `CREATE DATABASE FACTORY_B` used to leave no trace in the UI, because
        // the node list was derived from table rows and a new database has none.
        expect(
            buildDatabaseNodeList({
                catalogue: [...CATALOGUE, { name: 'FACTORY_B' }],
                connectable: undefined,
                tableRowDbNames: ['MACHBASEDB', 'MACHBASEDB'],
            })
        ).toEqual(['MACHBASEDB', 'FACTORY_A', 'MOUNT_DDD', 'FACTORY_B']);
    });

    test('a non-admin sees the databases they may connect to, tables or not', () => {
        // KEV with CONNECT on FACTORY_A but no table grants there: the database is still theirs
        // to open, so it gets a node even though the table query returned nothing for it.
        expect(
            buildDatabaseNodeList({
                catalogue: CATALOGUE,
                connectable: ['MACHBASEDB', 'FACTORY_A'],
                tableRowDbNames: ['MACHBASEDB'],
            })
        ).toEqual(['MACHBASEDB', 'FACTORY_A']);
    });

    test('a database the user cannot connect to is hidden', () => {
        expect(
            buildDatabaseNodeList({
                catalogue: CATALOGUE,
                connectable: ['MACHBASEDB'],
                tableRowDbNames: ['MACHBASEDB'],
            })
        ).toEqual(['MACHBASEDB']);
    });

    test('...unless its tables are in the list, which must never be orphaned', () => {
        // Reachable for a non-admin whose CONNECT was revoked while they still own tables there.
        // Dropping the node would drop their tables out of the tree; showing it is the lesser ill.
        expect(
            buildDatabaseNodeList({
                catalogue: CATALOGUE,
                connectable: ['MACHBASEDB'],
                tableRowDbNames: ['MACHBASEDB', 'FACTORY_A'],
            })
        ).toEqual(['MACHBASEDB', 'FACTORY_A']);
    });

    test('a database absent from the catalogue is appended rather than dropped', () => {
        expect(
            buildDatabaseNodeList({
                catalogue: [{ name: 'MACHBASEDB' }],
                connectable: undefined,
                tableRowDbNames: ['MACHBASEDB', 'LATE_ARRIVAL'],
            })
        ).toEqual(['MACHBASEDB', 'LATE_ARRIVAL']);
    });

    test('an empty catalogue falls back to the pre-v8.7 behaviour', () => {
        // No V$DATABASES on the server, or it would not answer. The old table-derived list is
        // the best available one, and it is what this code did before.
        expect(
            buildDatabaseNodeList({
                catalogue: [],
                connectable: undefined,
                tableRowDbNames: ['MACHBASEDB', 'MACHBASEDB', 'MNTDB'],
            })
        ).toEqual(['MACHBASEDB', 'MNTDB']);
    });

    test('names are matched without regard to case, and the catalogue spelling wins', () => {
        expect(
            buildDatabaseNodeList({
                catalogue: CATALOGUE,
                connectable: ['factory_a'],
                tableRowDbNames: ['machbasedb'],
            })
        ).toEqual(['MACHBASEDB', 'FACTORY_A']);
    });
});

describe('buildDatabaseNodeList ordering', () => {
    test('the catalogue order is preserved, so mounted backups stay at the bottom', () => {
        // The resolver asks for `order by KIND, DATABASE_ID`, which puts ACTIVE above MOUNTED.
        // Re-sorting here would undo that, so the only job is not to disturb it — note the
        // table rows lead with the mounted database and must not drag it up the list.
        expect(
            buildDatabaseNodeList({
                catalogue: [{ name: 'MACHBASEDB' }, { name: 'FACTORY_A' }, { name: 'FACTORY_B' }, { name: 'MOUNT_DDD' }],
                connectable: undefined,
                tableRowDbNames: ['MOUNT_DDD', 'FACTORY_A'],
            })
        ).toEqual(['MACHBASEDB', 'FACTORY_A', 'FACTORY_B', 'MOUNT_DDD']);
    });
});
