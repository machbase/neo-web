import { buildSeriesFullRangeSql } from './seriesSql';
import { parseSqlIdentifierPath, validatePanelSeriesSourceColumns } from '../seriesModel';
import { resetCurrentDatabase, setCurrentDatabase, setDatabases } from '@/utils/currentDatabaseState';

const timeColumns = validatePanelSeriesSourceColumns({ name: 'NAME', time: 'TIME', value: 'VALUE' });
const distanceColumns = validatePanelSeriesSourceColumns({ name: 'NAME', time: 'ODOMETER_M', value: 'VALUE' });
// The same column, declared BASE DISTANCE. `timeBaseTime` + a non-DATETIME `timeType` is what makes
// a base *distance*, and it is what sends the range read to MIN_DISTANCE / MAX_DISTANCE instead.
const baseDistanceColumns = validatePanelSeriesSourceColumns({ name: 'NAME', time: 'ODOMETER_M', value: 'VALUE', timeBaseTime: true, timeType: 20 } as any);

const rangeSql = (aTable: string, aColumns = timeColumns) =>
    buildSeriesFullRangeSql(parseSqlIdentifierPath(aTable), 'TAG_01', aColumns).join('\n');

/**
 * Which database a table lives in is a catalogue fact, not a dot count.
 *
 * It used to be both: only a mounted backup's name was ever qualified to three parts, so
 * `parts.length > 2` meant "mounted, therefore no V$<TABLE>_STAT view, therefore scan". Since
 * v8.7 every name carries three parts, so that test became universally true and the statistics
 * read went unreachable — every full-range query turned into a column scan. Measured on a
 * 54,372-row tag table: 0.886 ms through the stat view against 10.17 ms scanning, and the gap
 * grows with row count.
 */
describe('buildSeriesFullRangeSql picks the statistics view by catalogue, not by dot count', () => {
    beforeEach(() => {
        resetCurrentDatabase();
        setDatabases([
            { id: '1', name: 'MACHBASEDB', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: true },
            { id: '2', name: 'FACTORY_A', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: false },
            { id: '1073741825', name: 'MOUNT_DDD', kind: 'MOUNTED', accessMode: 'READ_ONLY', isDefault: false },
        ]);
        setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
    });

    afterEach(() => resetCurrentDatabase());

    test('a qualified table in an active database reads its statistics view', () => {
        expect(rangeSql('MACHBASEDB.SYS.TEST')).toContain('FROM MACHBASEDB.SYS.V$TEST_STAT');
    });

    test('a second active database reads its own copy of the view', () => {
        // Naming the view in the session's database instead would read an empty one.
        expect(rangeSql('FACTORY_A.SYS.ATABLE')).toContain('FROM FACTORY_A.SYS.V$ATABLE_STAT');
    });

    test('the database is never mistaken for the owner', () => {
        // Reading `parts[0]` as the owner produced `FACTORY_A.V$ATABLE_STAT`, which the engine
        // rejects with `ERR-2080, User (FACTORY_A) does not exist`.
        expect(rangeSql('FACTORY_A.SYS.ATABLE')).not.toContain('FROM FACTORY_A.V$');
    });

    test('a mounted database is scanned, because it has no statistics view', () => {
        const sSql = rangeSql('MOUNT_DDD.SYS.ATABLE');
        expect(sSql).toContain('FROM MOUNT_DDD.SYS.ATABLE');
        expect(sSql).not.toContain('V$');
    });

    test('a non-TIME base column is scanned wherever it lives', () => {
        const sSql = rangeSql('FACTORY_A.SYS.ATABLE', distanceColumns);
        expect(sSql).toContain('FROM FACTORY_A.SYS.ATABLE');
        expect(sSql).not.toContain('V$');
    });

    // A BASE DISTANCE column *is* in the stat view — under MIN_DISTANCE / MAX_DISTANCE, which the
    // view publishes in place of MIN_TIME / MAX_TIME. Its name is irrelevant: a table has exactly
    // one base column and the view describes that one, whatever it is called.
    test('a base distance column reads the statistics view under its distance columns', () => {
        const sSql = rangeSql('FACTORY_A.SYS.ATABLE', baseDistanceColumns);
        expect(sSql).toContain('FROM FACTORY_A.SYS.V$ATABLE_STAT');
        expect(sSql).toContain('min(MIN_DISTANCE) as min_tm');
        expect(sSql).toContain('max(MAX_DISTANCE) as max_tm');
        expect(sSql).not.toContain('MIN_TIME');
        expect(sSql).not.toContain('ORDER BY');
    });

    // The scanning form of the same question, which the fetch layer falls back to when a server too
    // old for those columns rejects the query. Two boundary reads, because a numeric base has no
    // aggregate form here — the same shape this path has always produced.
    test('forceSourceTable gives the scanning form of a base distance range', () => {
        const sSql = buildSeriesFullRangeSql(parseSqlIdentifierPath('FACTORY_A.SYS.ATABLE'), 'TAG_01', baseDistanceColumns, { forceSourceTable: true }).join('\n');
        expect(sSql).toContain('FROM FACTORY_A.SYS.ATABLE');
        expect(sSql).not.toContain('V$');
        expect(sSql).toContain('ORDER BY');
    });

    // A mounted backup has no statistics view at all, distance base or not.
    test('a mounted base distance table is still scanned', () => {
        const sSql = rangeSql('MOUNT_DDD.SYS.ATABLE', baseDistanceColumns);
        expect(sSql).toContain('FROM MOUNT_DDD.SYS.ATABLE');
        expect(sSql).not.toContain('V$');
    });

    // The time path keeps the aggregate it always needed: the view answers one row per warehouse on
    // a cluster, so a bare `min_time, max_time` would describe whichever came back first.
    test('the time path aggregates its stat columns', () => {
        const sSql = rangeSql('MACHBASEDB.SYS.TEST');
        expect(sSql).toContain('min(MIN_TIME) as min_tm');
        expect(sSql).toContain('max(MAX_TIME) as max_tm');
    });

    test('a bare legacy name still gets the admin owner', () => {
        expect(rangeSql('TEST')).toContain('FROM SYS.V$TEST_STAT');
    });

    test('a name already pointing at the view is not decorated twice', () => {
        expect(rangeSql('MACHBASEDB.SYS.V$TEST_STAT')).toContain('FROM MACHBASEDB.SYS.V$TEST_STAT');
    });

    describe('with no catalogue at all — a pre-v8.7 server, or a failed probe', () => {
        beforeEach(() => resetCurrentDatabase());

        test('the session database still reads its statistics view', () => {
            expect(rangeSql('MACHBASEDB.SYS.TEST')).toContain('FROM MACHBASEDB.SYS.V$TEST_STAT');
        });

        test('a mounted backup is scanned, as it was before the catalogue existed', () => {
            // The regression this guards: with no catalogue to ask, treating every table as
            // un-mounted sent a mounted one to `V$<TABLE>_STAT`, which does not exist there —
            // measured, MOUNT_DDD.SYS.V$ATABLE_STAT answers ERR-2025. Pre-v8.7 servers mount
            // backups and have no V$DATABASES at all, so this is their permanent state.
            const sSql = rangeSql('MOUNTDB.SYS.ATABLE');
            expect(sSql).toContain('FROM MOUNTDB.SYS.ATABLE');
            expect(sSql).not.toContain('V$');
        });
    });
});
