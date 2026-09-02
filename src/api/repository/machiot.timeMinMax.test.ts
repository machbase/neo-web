import request from '@/api/core';
import { fetchTimeMinMax } from './machiot';
import { resetCurrentDatabase, setCurrentDatabase, setDatabases } from '@/utils/currentDatabaseState';

jest.mock('@/api/core', () => jest.fn());

const mockedRequest = request as unknown as jest.Mock;

const sentQuery = () => decodeURIComponent(String(mockedRequest.mock.calls[0][0].url));

/**
 * A tag panel's time extent comes from `V$<TABLE>_STAT`, and the view exists once per database.
 *
 * Reducing the block's table to its bare name and re-attaching only the owner therefore named
 * the *session's* copy: a panel on FACTORY_A read `SYS.V$ATABLE_STAT`, which is MACHBASEDB's
 * and empty. `fetchTimeMinMax` treats an empty answer as "no extent" and falls back to a
 * `now - 1h` window, while the data query stayed correctly qualified — so the panel asked the
 * right table for the wrong hour and drew a blank chart with no error at all.
 *
 * Measured against a two-database server: `SYS.V$ATABLE_STAT` → 0 rows,
 * `FACTORY_A.SYS.V$ATABLE_STAT` → [1787903205532689458, 1787904411306247833].
 */
describe('fetchTimeMinMax keeps the database the block name carries', () => {
    const tagBlock = {
        type: 'tag',
        table: 'FACTORY_A.SYS.ATABLE',
        userName: 'SYS',
        tag: 'TAG_01',
        name: 'NAME',
        time: 'TIME',
    };

    beforeEach(() => {
        resetCurrentDatabase();
        setDatabases([
            { id: '1', name: 'MACHBASEDB', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: true },
            { id: '2', name: 'FACTORY_A', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: false },
        ]);
        setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValue({ status: 200, data: { data: { rows: [[1, 2]] } } });
    });

    afterEach(() => resetCurrentDatabase());

    test('the statistics view is read in the block table’s own database', async () => {
        await fetchTimeMinMax(tagBlock);

        expect(sentQuery()).toContain('from FACTORY_A.SYS.V$ATABLE_STAT');
        expect(sentQuery()).not.toContain('from SYS.V$ATABLE_STAT');
    });

    test('a block that already names the statistics view is not decorated twice', async () => {
        await fetchTimeMinMax({ ...tagBlock, table: 'FACTORY_A.SYS.V$ATABLE_STAT' });

        expect(sentQuery()).toContain('from FACTORY_A.SYS.V$ATABLE_STAT');
        expect(sentQuery()).not.toContain('V$V$');
    });

    test('a non-TIME base column scans the source table, still fully qualified', async () => {
        // The stat view holds no ODOMETER_M, so this branch reads the table itself — and the
        // stat-view decoration has to come off the last segment alone.
        await fetchTimeMinMax({ ...tagBlock, table: 'FACTORY_A.SYS.V$ATABLE_STAT', time: 'ODOMETER_M' });

        expect(sentQuery()).toContain('from FACTORY_A.SYS.ATABLE');
        expect(sentQuery()).toContain('min(ODOMETER_M)');
    });

    test('a table in the current database is unaffected', async () => {
        await fetchTimeMinMax({ ...tagBlock, table: 'MACHBASEDB.SYS.ATABLE' });

        expect(sentQuery()).toContain('from MACHBASEDB.SYS.V$ATABLE_STAT');
    });

    test('a bare legacy name still gets its owner, as before', async () => {
        await fetchTimeMinMax({ ...tagBlock, table: 'ATABLE' });

        expect(sentQuery()).toContain('from SYS.V$ATABLE_STAT');
    });

    // The view answers one row per tag, and one row per warehouse per tag on a cluster, so the
    // extent is the aggregate over whatever comes back rather than the first row of it.
    test('the statistics read is aggregated', async () => {
        await fetchTimeMinMax(tagBlock);

        expect(sentQuery()).toContain('min(MIN_TIME) as mn, max(MAX_TIME) as mx');
    });
});

/**
 * A BASE DISTANCE table's statistics view publishes MIN_DISTANCE / MAX_DISTANCE where a time table
 * has MIN_TIME / MAX_TIME — the two sets are mutually exclusive, and asking for the wrong one is
 * `MACHCLI-ERR-2056, Column name (...) not found`, not a wrong answer.
 *
 * Measured on MACHBASEDB.SYS.DISTANCE_SENSOR (ODOMETER_M DOUBLE BASE DISTANCE, 10 tags × 100,000
 * rows): the view answers 0 .. 999990 in 216µs where scanning the column takes 106ms.
 */
describe('fetchTimeMinMax reads a base distance block through the distance columns', () => {
    const distanceBlock = {
        type: 'tag',
        table: 'MACHBASEDB.SYS.DISTANCE_SENSOR',
        userName: 'SYS',
        tag: 'SENSOR_01',
        name: 'NAME',
        time: 'ODOMETER_M',
        // What `repairDashboardBlockForTableColumns` persists for a BASE DISTANCE column: the
        // BASETIME flag with a type that is not DATETIME. 20 is DOUBLE; LONG (12) and ULONG (112)
        // are the other two a base distance may be.
        timeBaseTime: true,
        timeType: 20,
    };

    const missingColumn = (aColumn: string) => ({ status: 500, data: { success: false, reason: `MACHCLI-ERR-2056, Column name (${aColumn}) not found.` } });
    // What the response interceptor hands back on success: the *body*, so `data` is the query
    // result itself and there is no `status` at all. A failure is the axios response instead —
    // `{ status, data: { success: false, reason } }` — which is what `missingColumn` builds.
    const rows = (aRows: unknown[][]) => ({ success: true, data: { columns: ['mn', 'mx'], rows: aRows } });
    const queryAt = (aIndex: number) => decodeURIComponent(String(mockedRequest.mock.calls[aIndex][0].url)).replace('/api/query?q=', '');

    beforeEach(() => {
        resetCurrentDatabase();
        setDatabases([{ id: '1', name: 'MACHBASEDB', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: true }]);
        setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValue(rows([[0, 999990]]));
    });

    afterEach(() => resetCurrentDatabase());

    test('reads MIN_DISTANCE / MAX_DISTANCE instead of scanning the column', async () => {
        const result = await fetchTimeMinMax(distanceBlock);

        expect(mockedRequest).toHaveBeenCalledTimes(1);
        expect(queryAt(0)).toBe("select min(MIN_DISTANCE) as mn, max(MAX_DISTANCE) as mx from MACHBASEDB.SYS.V$DISTANCE_SENSOR_STAT where name in ('SENSOR_01')");
        expect(result).toEqual([[0, 999990]]);
    });

    // Two things make the kind guess wrong and both answer ERR-2056: a Gauge / Pie panel stores the
    // *stat view* as its table, whose columns carry no BASETIME flag to read a kind off, and a
    // server older than the distance stat columns publishes the time names for a distance table.
    test('retries with the other column set when the view rejects the names', async () => {
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValueOnce(missingColumn('MIN_TIME')).mockResolvedValueOnce(rows([[0, 999990]]));

        // A Gauge panel on the distance table's stat view: no base kind to read, so it guesses time.
        const result = await fetchTimeMinMax({ ...distanceBlock, table: 'MACHBASEDB.SYS.V$DISTANCE_SENSOR_STAT', time: '', timeBaseTime: false, timeType: undefined });

        expect(mockedRequest).toHaveBeenCalledTimes(2);
        expect(queryAt(0)).toContain('min(MIN_TIME)');
        expect(queryAt(1)).toContain('min(MIN_DISTANCE)');
        expect(result).toEqual([[0, 999990]]);
    });

    // A server with no distance stat columns at all: the retry fails too, and the column answers.
    test('falls back to scanning the base column when both column sets are rejected', async () => {
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValueOnce(missingColumn('MIN_DISTANCE')).mockResolvedValueOnce(missingColumn('MIN_TIME')).mockResolvedValueOnce(rows([[0, 999990]]));

        const result = await fetchTimeMinMax(distanceBlock);

        expect(mockedRequest).toHaveBeenCalledTimes(3);
        expect(queryAt(2)).toBe("select min(ODOMETER_M), max(ODOMETER_M) from MACHBASEDB.SYS.DISTANCE_SENSOR where NAME in ('SENSOR_01')");
        expect(result).toEqual([[0, 999990]]);
    });

    // Only a missing column retries. Re-asking a missing *table* with the other names just asks the
    // same broken question twice, so that one goes straight to the column.
    test('a failure that is not about a column goes straight to the scan', async () => {
        mockedRequest.mockReset();
        mockedRequest
            .mockResolvedValueOnce({ status: 500, data: { success: false, reason: 'MACHCLI-ERR-2025, Table V$DISTANCE_SENSOR_STAT does not exist.' } })
            .mockResolvedValueOnce(rows([[0, 999990]]));

        await fetchTimeMinMax(distanceBlock);

        expect(mockedRequest).toHaveBeenCalledTimes(2);
        expect(queryAt(1)).toContain('min(ODOMETER_M)');
    });

    // An aggregate always answers a row, so a tag with no data arrives as [[null, null]] where the
    // unaggregated read used to answer no rows at all. Both have to mean "no extent" — `Number(null)`
    // is a perfectly finite 0, which would draw a panel spanning 1970.
    test('an empty aggregate is treated as no extent, not as zero', async () => {
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValue(rows([[null, null]]));

        const result = await fetchTimeMinMax(distanceBlock);

        expect(result?.[0]?.[0]).not.toBeNull();
        expect(Number(result?.[0]?.[0])).toBeGreaterThan(0);
    });
});
