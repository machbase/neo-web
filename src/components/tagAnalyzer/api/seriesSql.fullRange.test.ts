import { buildSeriesFullRangeSql } from './seriesSql';
import { parseSqlIdentifierPath, validatePanelSeriesSourceColumns } from '../seriesModel';
import { resetCurrentDatabase, setCurrentDatabase, setDatabases } from '@/utils/currentDatabaseState';

const timeColumns = validatePanelSeriesSourceColumns({ name: 'NAME', time: 'TIME', value: 'VALUE' });
const distanceColumns = validatePanelSeriesSourceColumns({ name: 'NAME', time: 'ODOMETER_M', value: 'VALUE' });

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
            { id: '4611686018427387913', name: 'MOUNT_DDD', kind: 'MOUNTED', accessMode: 'READ_ONLY', isDefault: false },
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
