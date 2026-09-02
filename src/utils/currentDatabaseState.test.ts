import {
    getCurrentDatabaseId,
    getCurrentDatabaseName,
    hasLogicalDatabases,
    isDatabaseWritable,
    isMountedDatabase,
    isMountedDatabaseName,
    findDatabaseById,
    findDatabaseByName,
    getDatabases,
    normalizeDatabaseId,
    isSameDatabaseId,
    resetCurrentDatabase,
    setCurrentDatabase,
    setDatabases,
} from './currentDatabaseState';

/**
 * The three rows a v8.7 server reports once a backup is attached.
 *
 * Ids are carried as text (see `DatabaseId`) even though the server now keeps them inside int32:
 * `MOUNT_DDD`'s is tagged in bit 30, the same shape a live server reports for a mounted `AA2`
 * (measured: 1073741825 = 2^30 + 1).
 */
const V87_CATALOGUE = [
    { id: '1', name: 'MACHBASEDB', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: true },
    { id: '2', name: 'FACTORY_A', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: false },
    { id: '1073741825', name: 'MOUNT_DDD', kind: 'MOUNTED', accessMode: 'READ_ONLY', isDefault: false },
];

beforeEach(() => resetCurrentDatabase());

describe('before the resolver has answered', () => {
    test('reports the pre-v8.7 database, so callers behave as they always did', () => {
        expect(getCurrentDatabaseId()).toBe('-1');
        expect(getCurrentDatabaseName()).toBe('MACHBASEDB');
        expect(hasLogicalDatabases()).toBe(false);
    });

    test('keeps DDL on the session database, and only there', () => {
        // A pre-v8.7 server has no V$DATABASES, so the list stays empty and writability falls
        // back to identity. This used to answer `true` for every id, which read as harmless
        // only because such a server's own tables all report -1 — a mounted backup's rows
        // report their BACKUP_TBSID, and answering yes there opened DROP on a read-only image.
        expect(isDatabaseWritable('-1')).toBe(true);
        expect(isDatabaseWritable('1')).toBe(false);
    });

    test('claims nothing is mounted when nothing is known', () => {
        expect(isMountedDatabase('1')).toBe(false);
        expect(isMountedDatabaseName('ANYTHING')).toBe(false);
    });
});

describe('with a v8.7 catalogue', () => {
    beforeEach(() => {
        setDatabases(V87_CATALOGUE);
        setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
    });

    test('a second active database is writable, not just the current one', () => {
        // The bug this guards: gating DDL on "is this the database I am connected to" hides
        // the context menu for FACTORY_A, which accepts DDL through a three-part name.
        expect(isDatabaseWritable('1')).toBe(true);
        expect(isDatabaseWritable('2')).toBe(true);
    });

    test('a mounted backup is not writable', () => {
        expect(isDatabaseWritable(V87_CATALOGUE[2].id)).toBe(false);
        expect(isMountedDatabase(V87_CATALOGUE[2].id)).toBe(true);
    });

    test('a read-only active database is not writable but is not mounted either', () => {
        setDatabases([{ id: '2', name: 'FACTORY_A', kind: 'ACTIVE', accessMode: 'READ_ONLY', isDefault: false }]);
        expect(isDatabaseWritable('2')).toBe(false);
        expect(isMountedDatabase('2')).toBe(false);
    });

    test('finds a database by name regardless of case', () => {
        expect(findDatabaseByName('factory_a')?.id).toBe('2');
        expect(findDatabaseByName('  MOUNT_DDD  ')?.kind).toBe('MOUNTED');
        expect(findDatabaseByName('')).toBeUndefined();
        expect(findDatabaseByName(undefined)).toBeUndefined();
    });

    test('names a mounted database as mounted, and an active one as not', () => {
        expect(isMountedDatabaseName('MOUNT_DDD')).toBe(true);
        expect(isMountedDatabaseName('FACTORY_A')).toBe(false);
        expect(isMountedDatabaseName('MACHBASEDB')).toBe(false);
    });

    test('a mounted id resolves whether it arrives as text or as a number', () => {
        // A mounted id is tagged, but the tag sits in bit 30 and the value stays inside int32,
        // so JSON carries it exactly and both forms normalise to the same key. This is what
        // let the `TO_CHAR(DATABASE_ID)` wrappers come back out of the queries that produce it.
        expect(Number(V87_CATALOGUE[2].id)).toBeLessThan(Number.MAX_SAFE_INTEGER);
        expect(JSON.parse('1073741825')).toBe(1073741825);

        expect(findDatabaseById('1073741825')?.name).toBe('MOUNT_DDD');
        expect(findDatabaseById(1073741825)?.name).toBe('MOUNT_DDD');
        expect(isMountedDatabase('1073741825')).toBe(true);
        expect(isMountedDatabase(1073741825)).toBe(true);

        // A neighbouring mount is still a different database — the rounding that used to
        // collapse ids 9 apart onto one number cannot happen in this range.
        expect(findDatabaseById('1073741826')).toBeUndefined();
        expect(findDatabaseById(1073741826)).toBeUndefined();

        expect(isMountedDatabaseName('MOUNT_DDD')).toBe(true);
    });

    test('id comparison is by text, and an absent id is never the current database', () => {
        expect(isSameDatabaseId('1073741825', V87_CATALOGUE[2].id)).toBe(true);
        // A caller holding the number form off a row compares equal, because normalisation gets
        // the same digits out of it now that the id is inside int32.
        expect(isSameDatabaseId(1073741825, V87_CATALOGUE[2].id)).toBe(true);
        // A different id is still a different database.
        expect(isSameDatabaseId(1073741826, V87_CATALOGUE[2].id)).toBe(false);
        // Whitespace and the legacy numeric -1 normalise to the same key.
        expect(isSameDatabaseId(' 2 ', '2')).toBe(true);
        expect(isSameDatabaseId(-1, '-1')).toBe(true);
        expect(isSameDatabaseId('', '')).toBe(false);
        expect(isSameDatabaseId(undefined, getCurrentDatabaseId())).toBe(false);
        expect(normalizeDatabaseId(null)).toBe('');
    });

    test('hasLogicalDatabases turns on once a real id is resolved', () => {
        expect(hasLogicalDatabases()).toBe(true);
        expect(getCurrentDatabaseId()).toBe('1');
    });
});

describe('without a catalogue, writability falls back to identity rather than yes', () => {
    /**
     * A pre-v8.7 server has no V$DATABASES, so the list stays empty — and a mounted backup's
     * rows there report their BACKUP_TBSID, not -1. Answering "writable" for every unknown id
     * would newly offer DROP, metadata editing and rollup editing on a read-only backup that
     * the `=== -1` tests these callers used to run had always refused.
     */
    beforeEach(() => {
        resetCurrentDatabase();
        expect(getDatabases()).toHaveLength(0);
    });

    test('the pre-v8.7 local database is still writable', () => {
        expect(isDatabaseWritable(-1)).toBe(true);
        expect(isDatabaseWritable('-1')).toBe(true);
    });

    test('a mounted backup on that same server is not', () => {
        // 508 is a real BACKUP_TBSID from V$STORAGE_MOUNT_DATABASES.
        expect(isDatabaseWritable(508)).toBe(false);
        expect(isDatabaseWritable('508')).toBe(false);
    });

    test('and an absent id is not writable either', () => {
        expect(isDatabaseWritable(undefined)).toBe(false);
        expect(isDatabaseWritable('')).toBe(false);
    });

    test('once the catalogue answers, KIND and ACCESS_MODE decide instead', () => {
        setDatabases(V87_CATALOGUE);
        setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
        // A second *active* database takes DDL through a three-part name, so identity is not
        // the question once the catalogue can answer the real one.
        expect(isDatabaseWritable('2')).toBe(true);
        expect(isDatabaseWritable('1073741825')).toBe(false);
    });
});
