import { getRollupMatch } from '.';
import { resetCurrentDatabase, setCurrentDatabase, setDatabases } from './currentDatabaseState';

/**
 * Rollup metadata is keyed `database.root_table` — measured, `getRollupTableList` selects
 * `t1.database_name || '.' || t1.root_table`, and the live server answers keys of the form
 * `MACHBASEDB.S_JSON_TEST`.
 *
 * A table name that carries its database supplies the prefix itself. A shorter one — which is
 * what a dashboard saved before v8.7 holds — has to have it supplied, and the only right answer
 * is the database this session is in.
 */
/** A table that has a rollup in MACHBASEDB only — the shape on a single-database server. */
const IN_MACHBASEDB = { SYS: { 'MACHBASEDB.SENSOR': { VALUE: [60] } } } as any;

/** The same table, with its rollup in FACTORY_A instead. */
const IN_FACTORY_A = { SYS: { 'FACTORY_A.SENSOR': { VALUE: [60] } } } as any;

describe('getRollupMatch supplies the missing database from the session, not a literal', () => {
    beforeEach(() => {
        resetCurrentDatabase();
        localStorage.setItem('V$ROLLUP_VER', 'RECENT');
        setDatabases([
            { id: '1', name: 'MACHBASEDB', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: true },
            { id: '2', name: 'FACTORY_A', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: false },
        ]);
    });

    afterEach(() => {
        localStorage.removeItem('V$ROLLUP_VER');
        resetCurrentDatabase();
    });

    test('a qualified name is matched on the database it names', () => {
        setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
        expect(getRollupMatch(IN_FACTORY_A, 'FACTORY_A.SYS.SENSOR', 60, 'VALUE')).toBeDefined();
    });

    test('a legacy short name resolves against the session database', () => {
        // The bug this guards: the missing prefix was the literal 'MACHBASEDB', so a session on
        // FACTORY_A looked up `MACHBASEDB.SENSOR` — a key that does not exist — and found no
        // rollup for a table that has one. The panel then scans raw data instead.
        setCurrentDatabase({ id: '2', name: 'FACTORY_A' });
        expect(getRollupMatch(IN_FACTORY_A, 'SENSOR', 60, 'VALUE')).toBeDefined();
        expect(getRollupMatch(IN_FACTORY_A, 'SYS.SENSOR', 60, 'VALUE')).toBeDefined();
    });

    test('and still resolves against MACHBASEDB when that is the session database', () => {
        setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
        expect(getRollupMatch(IN_MACHBASEDB, 'SENSOR', 60, 'VALUE')).toBeDefined();
    });

    test('a pre-v8.7 server, where the catalogue is empty, still answers MACHBASEDB', () => {
        // getCurrentDatabaseName() reports the legacy database until the probe settles, which is
        // the same literal this replaced — so nothing changes on those servers.
        resetCurrentDatabase();
        expect(getRollupMatch(IN_MACHBASEDB, 'SENSOR', 60, 'VALUE')).toBeDefined();
    });

    test('a short name is not matched against another database', () => {
        // The session is on MACHBASEDB and the rollup lives in FACTORY_A: still a miss, because
        // the short name means "here", not "anywhere".
        setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
        expect(getRollupMatch(IN_FACTORY_A, 'SENSOR', 60, 'VALUE')).toBeUndefined();
    });

    test('a table with no rollup at all is still a miss', () => {
        setCurrentDatabase({ id: '2', name: 'FACTORY_A' });
        expect(getRollupMatch(IN_FACTORY_A, 'NO_SUCH_TABLE', 60, 'VALUE')).toBeUndefined();
    });
});

/**
 * The rollup map and the lookup have to agree on whether the key carries a database.
 *
 * `getRollupTableList` prefixes whenever the version is anything but `'OLD'` — including when
 * the probe has not run and the value is absent. The lookup asked the opposite question
 * (`=== 'RECENT'`), so an absent version split the two apart and every lookup missed.
 *
 * Absent is reachable, and not rarely: opening a shared `/view/...` link clears the flag along
 * with the tokens (`Routes.tsx`), and the post-login redirect goes straight back to `/view/...`
 * (`Login.tsx`) without ever mounting `Home`, which is the only place that probes.
 */
describe('the rollup key agrees with the map whatever the version says', () => {
    const IN_MACHBASEDB = { SYS: { 'MACHBASEDB.SENSOR': { VALUE: [60] } } } as any;
    /** What the `'OLD'` query shape emits: a bare root_table, no database. */
    const OLD_SHAPE = { SYS: { SENSOR: { VALUE: [60] } } } as any;

    beforeEach(() => {
        resetCurrentDatabase();
        setDatabases([{ id: '1', name: 'MACHBASEDB', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: true }]);
        setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
    });

    afterEach(() => {
        localStorage.removeItem('V$ROLLUP_VER');
        resetCurrentDatabase();
    });

    test('RECENT — prefixed map, prefixed lookup', () => {
        localStorage.setItem('V$ROLLUP_VER', 'RECENT');
        expect(getRollupMatch(IN_MACHBASEDB, 'SENSOR', 60, 'VALUE')).toBeDefined();
    });

    test('absent — the map is still prefixed, so the lookup must be too', () => {
        localStorage.removeItem('V$ROLLUP_VER');
        expect(getRollupMatch(IN_MACHBASEDB, 'SENSOR', 60, 'VALUE')).toBeDefined();
    });

    test('OLD — bare map, bare lookup', () => {
        localStorage.setItem('V$ROLLUP_VER', 'OLD');
        expect(getRollupMatch(OLD_SHAPE, 'SENSOR', 60, 'VALUE')).toBeDefined();
    });

    test('OLD still refuses a database it cannot address', () => {
        // Pre-v8.7 rollup metadata cannot describe a mounted database at all.
        localStorage.setItem('V$ROLLUP_VER', 'OLD');
        expect(getRollupMatch(OLD_SHAPE, 'MOUNTDB.SYS.SENSOR', 60, 'VALUE')).toBeUndefined();
    });
});
