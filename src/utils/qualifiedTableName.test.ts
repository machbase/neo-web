import { isMountedTableName, isQualifiedTableName, matchesQualifiedName, qualifySiblingObject, qualifyTableName, qualifyThreePart, splitQualifiedTableName } from './qualifiedTableName';
import { resetCurrentDatabase, setCurrentDatabase, setDatabases } from './currentDatabaseState';

describe('qualifyTableName', () => {
    test('adds the owner to a bare name', () => {
        expect(qualifyTableName('SYS', 'SENSOR')).toBe('SYS.SENSOR');
    });

    test('leaves an owner-qualified name alone', () => {
        expect(qualifyTableName('SYS', 'ADMIN.SENSOR')).toBe('ADMIN.SENSOR');
    });

    test('leaves a database-qualified name alone rather than prefixing it again', () => {
        // The bug this guards: `SYS.FACTORY_A.SYS.SENSOR` resolves to nothing.
        expect(qualifyTableName('SYS', 'FACTORY_A.SYS.SENSOR')).toBe('FACTORY_A.SYS.SENSOR');
    });

    test('returns the table alone when there is no owner to add', () => {
        expect(qualifyTableName('', 'SENSOR')).toBe('SENSOR');
        expect(qualifyTableName(undefined, 'SENSOR')).toBe('SENSOR');
    });

    test('returns empty for a missing table instead of a lone dot', () => {
        expect(qualifyTableName('SYS', '')).toBe('');
        expect(qualifyTableName('SYS', undefined)).toBe('');
    });

    test('ignores surrounding whitespace', () => {
        expect(qualifyTableName('  SYS  ', '  SENSOR  ')).toBe('SYS.SENSOR');
    });
});

describe('qualifySiblingObject', () => {
    const stat = (aName: string) => `V$${aName}_STAT`;

    test('decorates a bare name and adds the owner', () => {
        expect(qualifySiblingObject('SYS', 'SENSOR', stat)).toBe('SYS.V$SENSOR_STAT');
    });

    test('decorates only the last segment of a qualified name', () => {
        // Wrapping the whole name would give `V$FACTORY_A.SYS.SENSOR_STAT`, naming a
        // database that does not exist.
        expect(qualifySiblingObject('SYS', 'FACTORY_A.SYS.SENSOR', stat)).toBe('FACTORY_A.SYS.V$SENSOR_STAT');
    });

    test('decorates the last segment of an owner-qualified name too', () => {
        expect(qualifySiblingObject('SYS', 'ADMIN.SENSOR', stat)).toBe('ADMIN.V$SENSOR_STAT');
    });

    test('returns empty for a missing table', () => {
        expect(qualifySiblingObject('SYS', '', stat)).toBe('');
    });

    test('works for the meta-table decoration as well', () => {
        expect(qualifySiblingObject('SYS', 'FACTORY_A.SYS.SENSOR', (n) => `_${n}_META`)).toBe('FACTORY_A.SYS._SENSOR_META');
    });
});

describe('isQualifiedTableName', () => {
    test.each([
        ['SENSOR', false],
        ['SYS.SENSOR', true],
        ['FACTORY_A.SYS.SENSOR', true],
        ['', false],
        [undefined, false],
    ])('%s → %s', (aInput, aExpected) => {
        expect(isQualifiedTableName(aInput as string | undefined)).toBe(aExpected);
    });
});

describe('qualifyThreePart', () => {
    test('joins the three parts a table row carries', () => {
        expect(qualifyThreePart('FACTORY_A', 'SYS', 'SENSOR')).toBe('FACTORY_A.SYS.SENSOR');
    });

    test('shortens rather than emitting an empty segment', () => {
        // `.SYS.SENSOR` resolves to nothing, so a row without a database name gives two parts.
        expect(qualifyThreePart('', 'SYS', 'SENSOR')).toBe('SYS.SENSOR');
        expect(qualifyThreePart(null, undefined, 'SENSOR')).toBe('SENSOR');
    });

    test('trims each part', () => {
        expect(qualifyThreePart(' FACTORY_A ', ' SYS ', ' SENSOR ')).toBe('FACTORY_A.SYS.SENSOR');
    });
});

describe('matchesQualifiedName', () => {
    const QUALIFIED = 'MACHBASEDB.SYS.SENSOR';

    test('an exact name matches', () => {
        expect(matchesQualifiedName(QUALIFIED, QUALIFIED)).toBe(true);
    });

    test('the under-qualified names a pre-v8.7 config stored still match', () => {
        // The regression this guards: rows became three-part, so `===` stopped finding the row
        // for a panel whose config was written when `SENSOR` was unambiguous.
        expect(matchesQualifiedName(QUALIFIED, 'SYS.SENSOR')).toBe(true);
        expect(matchesQualifiedName(QUALIFIED, 'SENSOR')).toBe(true);
    });

    test('the tail has to start at a segment boundary', () => {
        // Without the dot, `SENSOR` would also match `MACHBASEDB.SYS.HEAT_SENSOR`.
        expect(matchesQualifiedName('MACHBASEDB.SYS.HEAT_SENSOR', 'SENSOR')).toBe(false);
        expect(matchesQualifiedName('MACHBASEDB.SYS.SENSOR', 'ENSOR')).toBe(false);
    });

    test('a longer stored name never matches a shorter qualified one', () => {
        expect(matchesQualifiedName('SENSOR', 'MACHBASEDB.SYS.SENSOR')).toBe(false);
    });

    test('a missing name on either side matches nothing', () => {
        expect(matchesQualifiedName(QUALIFIED, '')).toBe(false);
        expect(matchesQualifiedName('', QUALIFIED)).toBe(false);
        expect(matchesQualifiedName(undefined, undefined)).toBe(false);
    });

    test('comparison stays case-exact, as the equality it replaced was', () => {
        expect(matchesQualifiedName(QUALIFIED, 'sys.sensor')).toBe(false);
    });

    test('a stat view name resolves the same way', () => {
        const sStat = qualifySiblingObject('SYS', QUALIFIED, (aName) => `V$${aName}_STAT`);
        expect(sStat).toBe('MACHBASEDB.SYS.V$SENSOR_STAT');
        expect(matchesQualifiedName(sStat, 'V$SENSOR_STAT')).toBe(true);
        expect(matchesQualifiedName(sStat, 'SYS.V$SENSOR_STAT')).toBe(true);
    });
});

/**
 * Whether a `V$<TABLE>_STAT` view exists for a table is a property of its database, and only a
 * mounted backup lacks one. Measured from a session connected to MACHBASEDB:
 * `FACTORY_A.SYS.V$DEMO_TAG_STAT` → 2 rows, `MOUNT_DDD.SYS.V$ATABLE_STAT` →
 * `ERR-2025 Table V$ATABLE_STAT does not exist`.
 */
describe('isMountedTableName', () => {
    afterEach(() => resetCurrentDatabase());

    describe('with a catalogue', () => {
        beforeEach(() => {
            resetCurrentDatabase();
            setDatabases([
                { id: '1', name: 'MACHBASEDB', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: true },
                { id: '2', name: 'FACTORY_A', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: false },
                { id: '1073741825', name: 'MOUNT_DDD', kind: 'MOUNTED', accessMode: 'READ_ONLY', isDefault: false },
            ]);
            setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
        });

        test('a mounted backup is mounted', () => {
            expect(isMountedTableName('MOUNT_DDD.SYS.ATABLE')).toBe(true);
        });

        test('a second active database is not — it has its own statistics views', () => {
            // The bug this guards: gating the Info button and the Gauge stat-table picker on
            // "is this the database I am connected to" hid both from FACTORY_A for no reason.
            expect(isMountedTableName('FACTORY_A.SYS.ATABLE')).toBe(false);
        });

        test('the session database is not mounted either', () => {
            expect(isMountedTableName('MACHBASEDB.SYS.DEMO_TAG')).toBe(false);
        });

        test('a name that cannot carry a database answers no', () => {
            expect(isMountedTableName('SYS.ATABLE')).toBe(false);
            expect(isMountedTableName('ATABLE')).toBe(false);
            expect(isMountedTableName('')).toBe(false);
            expect(isMountedTableName(undefined)).toBe(false);
        });
    });

    describe('with no catalogue — a pre-v8.7 server, or a failed probe', () => {
        beforeEach(() => resetCurrentDatabase());

        test('the session database is not mounted', () => {
            expect(isMountedTableName('MACHBASEDB.SYS.TAG')).toBe(false);
        });

        test('any other database name is, which is what pre-v8.7 mounts are', () => {
            // Mount support predates V$DATABASES, so this is a pre-v8.7 server's permanent
            // state. Answering "not mounted" sent those tables to a view that does not exist.
            expect(isMountedTableName('MOUNTDB.SYS.ATABLE')).toBe(true);
        });

        test('case and whitespace do not change the answer', () => {
            expect(isMountedTableName(' machbasedb.SYS.TAG ')).toBe(false);
        });
    });
});

describe('splitQualifiedTableName — what a picker shows', () => {
    test('a three-part name gives the table name and the parts that qualify it', () => {
        expect(splitQualifiedTableName('MACHBASEDB.SYS.STOCK_HISTORY')).toEqual({
            label: 'STOCK_HISTORY',
            description: 'MACHBASEDB \u00B7 SYS',
        });
    });

    test('a stat view keeps its decoration on the label, where the decoration was applied', () => {
        // `qualifySiblingObject` decorates the last segment alone, so the leading segments are
        // still the database and owner the view is read under.
        expect(splitQualifiedTableName('FACTORY_A.SYS.V$SENSOR_STAT')).toEqual({
            label: 'V$SENSOR_STAT',
            description: 'FACTORY_A \u00B7 SYS',
        });
    });

    test('a pre-v8.7 owner-only name describes with the owner alone', () => {
        expect(splitQualifiedTableName('SYS.TAG')).toEqual({ label: 'TAG', description: 'SYS' });
    });

    test('a bare name has nothing to qualify it', () => {
        expect(splitQualifiedTableName('TAG')).toEqual({ label: 'TAG', description: '' });
    });

    test('no name at all is not a crash', () => {
        expect(splitQualifiedTableName(undefined)).toEqual({ label: '', description: '' });
    });
});
