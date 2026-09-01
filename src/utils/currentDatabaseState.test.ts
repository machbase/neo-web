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
 * Ids are text because the resolver selects `TO_CHAR(DATABASE_ID)`: `MOUNT_DDD`'s id is tagged
 * in bit 62 and does not survive `JSON.parse` as a number.
 */
const V87_CATALOGUE = [
    { id: '1', name: 'MACHBASEDB', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: true },
    { id: '2', name: 'FACTORY_A', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: false },
    { id: '4611686018427387913', name: 'MOUNT_DDD', kind: 'MOUNTED', accessMode: 'READ_ONLY', isDefault: false },
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

    test('a mounted id works as a key because it is carried as text', () => {
        // Why the ids are strings: the server tags a mounted id in bit 62, the value exceeds
        // Number.MAX_SAFE_INTEGER, and two mounts 9 apart land on the same JavaScript number.
        expect(Number(V87_CATALOGUE[2].id)).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
        expect(JSON.parse('4611686018427387913')).toBe(JSON.parse('4611686018427387904'));

        // TO_CHAR keeps the digits, so the lookup that a number would have broken resolves.
        expect(findDatabaseById('4611686018427387913')?.name).toBe('MOUNT_DDD');
        expect(isMountedDatabase('4611686018427387913')).toBe(true);

        // And a neighbouring mount is a different database rather than the same one. Passing
        // the rounded number instead matches nothing, which is the failure this guards.
        expect(findDatabaseById('4611686018427387904')).toBeUndefined();
        expect(findDatabaseById(Number('4611686018427387913'))).toBeUndefined();

        expect(isMountedDatabaseName('MOUNT_DDD')).toBe(true);
    });

    test('id comparison is by text, and an absent id is never the current database', () => {
        expect(isSameDatabaseId('4611686018427387913', V87_CATALOGUE[2].id)).toBe(true);
        // A caller holding the number form compares unequal rather than falsely matching.
        expect(isSameDatabaseId(Number('4611686018427387913'), V87_CATALOGUE[2].id)).toBe(false);
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
        expect(isDatabaseWritable('4611686018427387913')).toBe(false);
    });
});
