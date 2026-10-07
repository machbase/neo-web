import { createCurrentDatabaseResolver, type CurrentDatabaseQuery } from './currentDatabaseResolver';
import { getCurrentDatabaseName, getDatabases, isDatabaseWritable, resetCurrentDatabase } from './currentDatabaseState';

/**
 * The resolver's caching contract, which the DB Explorer's refresh now depends on.
 *
 * Rows are shaped as `V$DATABASES` returns them, in the column order `RESOLVE_SQL` names:
 * DATABASE_ID, NAME, KIND, ACCESS_MODE, IS_DEFAULT, CAN_USE. A mounted id carries the bit-30 tag
 * the server puts there (measured on v8.7: a mounted `ZZPROBE` reports 1073741828).
 */
const ACTIVE_ONLY = [
    [1, 'MACHBASEDB', 'ACTIVE', 'READ_WRITE', 1, 1],
    [2, 'FACTORY_A', 'ACTIVE', 'READ_WRITE', 0, 1],
];
const WITH_MOUNT = [...ACTIVE_ONLY, [1073741828, 'ZZPROBE', 'MOUNTED', 'READ_ONLY', 0, 1]];

const ok = (aRows: any[][]) => ({ svrState: true, svrData: { rows: aRows } });

/** A query that answers whatever the current script says, and counts how often it was asked. */
const scripted = (aReplies: (() => ReturnType<CurrentDatabaseQuery>)[]) => {
    let sCalls = 0;
    const query: CurrentDatabaseQuery = () => {
        const sReply = aReplies[Math.min(sCalls, aReplies.length - 1)];
        sCalls += 1;
        return sReply();
    };
    return { query, calls: () => sCalls };
};

beforeEach(() => resetCurrentDatabase());

describe('ensureCurrentDatabase', () => {
    test('asks once and shares the answer, so concurrent callers cannot race', async () => {
        const sQuery = scripted([async () => ok(ACTIVE_ONLY)]);
        const sResolver = createCurrentDatabaseResolver(sQuery.query);

        await Promise.all([sResolver.ensureCurrentDatabase(), sResolver.ensureCurrentDatabase()]);
        await sResolver.ensureCurrentDatabase();

        expect(sQuery.calls()).toBe(1);
        expect(getDatabases().map((aDb) => aDb.name)).toEqual(['MACHBASEDB', 'FACTORY_A']);
    });

    test('does not cache a failure — the next caller tries again', async () => {
        const sQuery = scripted([
            async () => {
                throw new Error('unreachable');
            },
            async () => ok(ACTIVE_ONLY),
        ]);
        const sResolver = createCurrentDatabaseResolver(sQuery.query);

        await sResolver.ensureCurrentDatabase();
        expect(getDatabases()).toEqual([]);
        expect(getCurrentDatabaseName()).toBe('MACHBASEDB');

        await sResolver.ensureCurrentDatabase();
        expect(sQuery.calls()).toBe(2);
        expect(getDatabases()).toHaveLength(2);
    });
});

describe('refreshDatabases', () => {
    test('re-reads the catalogue, which is what the explorer refresh is for', async () => {
        const sQuery = scripted([async () => ok(ACTIVE_ONLY), async () => ok(WITH_MOUNT)]);
        const sResolver = createCurrentDatabaseResolver(sQuery.query);

        await sResolver.ensureCurrentDatabase();
        expect(getDatabases().map((aDb) => aDb.name)).not.toContain('ZZPROBE');

        // A database mounted from another session — the case where only F5 used to help.
        await sResolver.refreshDatabases();
        expect(getDatabases().map((aDb) => aDb.name)).toContain('ZZPROBE');
        expect(getDatabases().find((aDb) => aDb.name === 'ZZPROBE')?.kind).toBe('MOUNTED');
    });

    test('drops a database that is gone, so an unmounted node can stop being rendered', async () => {
        const sQuery = scripted([async () => ok(WITH_MOUNT), async () => ok(ACTIVE_ONLY)]);
        const sResolver = createCurrentDatabaseResolver(sQuery.query);

        await sResolver.ensureCurrentDatabase();
        await sResolver.refreshDatabases();

        expect(getDatabases().map((aDb) => aDb.name)).toEqual(['MACHBASEDB', 'FACTORY_A']);
    });

    test('hands the fresh probe to the callers that follow it, not a second round trip', async () => {
        // This is what lets `getDatabaseList` await the refresh and then call `getTableList`,
        // which awaits `ensureCurrentDatabase()` of its own to build its SQL.
        const sQuery = scripted([async () => ok(ACTIVE_ONLY), async () => ok(WITH_MOUNT)]);
        const sResolver = createCurrentDatabaseResolver(sQuery.query);

        await sResolver.ensureCurrentDatabase();
        await sResolver.refreshDatabases();
        await sResolver.ensureCurrentDatabase();

        expect(sQuery.calls()).toBe(2);
        expect(getDatabases().map((aDb) => aDb.name)).toContain('ZZPROBE');
    });

    test('keeps the catalogue it already had when the probe fails', async () => {
        // Emptying it would answer "not writable" for every database, greying out DROP, metadata
        // editing and rollup across the whole explorer with nothing on screen to explain it.
        const sQuery = scripted([
            async () => ok(ACTIVE_ONLY),
            async () => {
                throw new Error('unreachable');
            },
            async () => ok(WITH_MOUNT),
        ]);
        const sResolver = createCurrentDatabaseResolver(sQuery.query);

        await sResolver.ensureCurrentDatabase();
        await sResolver.refreshDatabases();

        expect(getDatabases().map((aDb) => aDb.name)).toEqual(['MACHBASEDB', 'FACTORY_A']);
        expect(isDatabaseWritable('2')).toBe(true);

        // And the memo is dropped, so the next reader retries rather than serving the stale list
        // for the rest of the page's life.
        await sResolver.ensureCurrentDatabase();
        expect(sQuery.calls()).toBe(3);
        expect(getDatabases().map((aDb) => aDb.name)).toContain('ZZPROBE');
    });

    test('an empty result is left alone too — it is "could not ask", not "no databases"', async () => {
        // A pre-v8.7 server has no `V$DATABASES`; a v8.7 one never answers zero rows.
        const sQuery = scripted([async () => ok(ACTIVE_ONLY), async () => ok([])]);
        const sResolver = createCurrentDatabaseResolver(sQuery.query);

        await sResolver.ensureCurrentDatabase();
        await sResolver.refreshDatabases();

        expect(getDatabases().map((aDb) => aDb.name)).toEqual(['MACHBASEDB', 'FACTORY_A']);
    });
});
