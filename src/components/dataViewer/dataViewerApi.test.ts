import { fetchQuery } from '@/api/repository/database';
import {
    listTableColumns,
    listTableTags,
    queryTagBaseColumnBounds,
    queryTagBoundaryTime,
    queryTagChartData,
    queryTagData,
    queryTagDataTotal,
} from './dataViewerApi';
import { isDataViewerJsonValueColumn, resolveDataViewerBaseColumn, resolveDataViewerBaseKind } from './dataViewerModel';

jest.mock('@/api/repository/database', () => ({
    fetchQuery: jest.fn(),
}));

const mockedFetchQuery = fetchQuery as jest.MockedFunction<typeof fetchQuery>;

const machbaseTime = (value: string) => {
    const date = new Date(value);
    const pad = (part: number, size = 2) => String(part).padStart(size, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

describe('data viewer API query builders', () => {
    beforeEach(() => {
        mockedFetchQuery.mockReset();
        mockedFetchQuery.mockResolvedValue({
            svrState: true,
            svrData: {
                columns: ['TIME', 'NAME', 'VALUE'],
                rows: [],
            },
            svrReason: '',
        });
    });

    test('queryTagChartData formats ISO time ranges for Machbase TO_TIMESTAMP', async () => {
        await queryTagChartData({
            dbName: 'MACHBASEDB',
            userName: 'SYS',
            tableName: 'TAG',
            names: ['sensor.a', 'sensor.b'],
            from: '2026-06-25T05:09:58.534Z',
            to: '2026-06-25T05:19:58.534Z',
        });

        const sql = mockedFetchQuery.mock.calls[0][0];
        expect(sql).toContain(`TIME >= TO_TIMESTAMP('${machbaseTime('2026-06-25T05:09:58.534Z')}')`);
        expect(sql).toContain(`TIME <= TO_TIMESTAMP('${machbaseTime('2026-06-25T05:19:58.534Z')}')`);
        expect(sql).not.toContain('2026-06-25T05:09:58.534Z');
    });

    test('raw data and total queries use the same Machbase timestamp format', async () => {
        await queryTagData({
            dbName: 'MACHBASEDB',
            userName: 'SYS',
            tableName: 'TAG',
            names: ['sensor.a'],
            direction: 'latest',
            from: '2026-06-25T05:09:58.534Z',
            to: '2026-06-25T05:19:58.534Z',
            page: 1,
        });
        await queryTagDataTotal({
            dbName: 'MACHBASEDB',
            userName: 'SYS',
            tableName: 'TAG',
            names: ['sensor.a'],
            from: '2026-06-25T05:09:58.534Z',
            to: '2026-06-25T05:19:58.534Z',
        });

        const [rawSql, totalSql] = mockedFetchQuery.mock.calls.map((call) => call[0]);
        expect(rawSql).toContain(`TIME >= TO_TIMESTAMP('${machbaseTime('2026-06-25T05:09:58.534Z')}')`);
        expect(rawSql).not.toContain('2026-06-25T05:09:58.534Z');
        expect(totalSql).toContain(`TIME <= TO_TIMESTAMP('${machbaseTime('2026-06-25T05:19:58.534Z')}')`);
        expect(totalSql).not.toContain('2026-06-25T05:19:58.534Z');
    });

    test('raw latest next cursor keeps display order and applies cursor offset', async () => {
        await queryTagData({
            dbName: 'MACHBASEDB',
            userName: 'SYS',
            tableName: 'TAG',
            names: ['sensor.a', 'sensor.b'],
            direction: 'latest',
            page: 3,
            pageSize: 3000,
            cursorSide: 'next',
            cursorTime: '2026-06-25T05:09:58.534Z',
            cursorName: 'sensor.b',
            cursorOffset: 3000,
        });

        const sql = mockedFetchQuery.mock.calls[0][0];
        expect(sql).toContain(`(TIME < TO_TIMESTAMP('${machbaseTime('2026-06-25T05:09:58.534Z')}') or (TIME = TO_TIMESTAMP('${machbaseTime('2026-06-25T05:09:58.534Z')}') and NAME > 'sensor.b'))`);
        expect(sql).toContain('order by TIME desc, NAME asc');
        expect(sql).toContain('limit 3000, 3000');
    });

    test('raw bounded range refresh queries selected tags in the current page range', async () => {
        mockedFetchQuery.mockResolvedValueOnce({
            svrState: true,
            svrData: {
                columns: ['TIME', 'NAME', 'VALUE'],
                rows: [
                    ['2026-06-25 05:10:01.000', 'sensor.b', 3],
                    ['2026-06-25 05:10:00.000', 'sensor.a', 1],
                ],
            },
            svrReason: '',
        });

        const result = await queryTagData({
            dbName: 'MACHBASEDB',
            userName: 'SYS',
            tableName: 'TAG',
            names: ['sensor.a', 'sensor.b', 'sensor.c'],
            direction: 'latest',
            from: '2026-06-25T05:09:56.100Z',
            to: '2026-06-25T05:10:01.001Z',
            page: 4,
            pageSize: 3000,
            boundedRange: true,
        });

        const sql = mockedFetchQuery.mock.calls[0][0];
        expect(mockedFetchQuery).toHaveBeenCalledTimes(1);
        expect(sql).toContain("NAME in ('sensor.a', 'sensor.b', 'sensor.c')");
        expect(sql).toContain(`TIME >= TO_TIMESTAMP('${machbaseTime('2026-06-25T05:09:56.100Z')}')`);
        expect(sql).toContain(`TIME <= TO_TIMESTAMP('${machbaseTime('2026-06-25T05:10:01.001Z')}')`);
        expect(sql).not.toContain('limit');
        expect(sql).not.toContain('limit 9000, 3000');
        expect(result.rows.map((row) => row.name)).toEqual(['sensor.b', 'sensor.a']);
    });

    test('raw latest prev cursor queries reverse order then restores display order', async () => {
        mockedFetchQuery.mockResolvedValueOnce({
            svrState: true,
            svrData: {
                columns: ['TIME', 'NAME', 'VALUE'],
                rows: [
                    ['2026-06-25 05:10:00.000', 'sensor.a', 1],
                    ['2026-06-25 05:09:59.000', 'sensor.b', 2],
                ],
            },
            svrReason: '',
        });

        const result = await queryTagData({
            dbName: 'MACHBASEDB',
            userName: 'SYS',
            tableName: 'TAG',
            names: ['sensor.a', 'sensor.b'],
            direction: 'latest',
            page: 1,
            pageSize: 2,
            cursorSide: 'prev',
            cursorTime: '2026-06-25T05:09:58.534Z',
            cursorName: 'sensor.b',
            cursorOffset: 0,
        });

        const sql = mockedFetchQuery.mock.calls[0][0];
        expect(sql).toContain(`(TIME > TO_TIMESTAMP('${machbaseTime('2026-06-25T05:09:58.534Z')}') or (TIME = TO_TIMESTAMP('${machbaseTime('2026-06-25T05:09:58.534Z')}') and NAME < 'sensor.b'))`);
        expect(sql).toContain('order by TIME asc, NAME desc');
        expect(result.rows.map((row) => row.name)).toEqual(['sensor.b', 'sensor.a']);
    });

    test('raw oldest cursor uses opposite time comparisons', async () => {
        await queryTagData({
            dbName: 'MACHBASEDB',
            userName: 'SYS',
            tableName: 'TAG',
            names: ['sensor.a'],
            direction: 'oldest',
            page: 2,
            pageSize: 1000,
            cursorSide: 'next',
            cursorTime: '2026-06-25T05:09:58.534Z',
            cursorName: 'sensor.a',
            cursorOffset: 0,
        });
        await queryTagData({
            dbName: 'MACHBASEDB',
            userName: 'SYS',
            tableName: 'TAG',
            names: ['sensor.a'],
            direction: 'oldest',
            page: 1,
            pageSize: 1000,
            cursorSide: 'prev',
            cursorTime: '2026-06-25T05:09:58.534Z',
            cursorName: 'sensor.a',
            cursorOffset: 0,
        });

        const [nextSql, prevSql] = mockedFetchQuery.mock.calls.map((call) => call[0]);
        expect(nextSql).toContain(`(TIME > TO_TIMESTAMP('${machbaseTime('2026-06-25T05:09:58.534Z')}') or (TIME = TO_TIMESTAMP('${machbaseTime('2026-06-25T05:09:58.534Z')}') and NAME > 'sensor.a'))`);
        expect(nextSql).toContain('order by TIME asc, NAME asc');
        expect(prevSql).toContain(`(TIME < TO_TIMESTAMP('${machbaseTime('2026-06-25T05:09:58.534Z')}') or (TIME = TO_TIMESTAMP('${machbaseTime('2026-06-25T05:09:58.534Z')}') and NAME < 'sensor.a'))`);
        expect(prevSql).toContain('order by TIME desc, NAME desc');
    });
});

describe('data viewer API time bounds', () => {
    const table = {
        dbName: 'MACHBASEDB',
        userName: 'SYS',
        tableName: 'TAG',
    };

    beforeEach(() => {
        mockedFetchQuery.mockReset();
        mockedFetchQuery.mockResolvedValue({
            svrState: true,
            svrData: {
                columns: ['TIME', 'NAME', 'VALUE'],
                rows: [],
            },
            svrReason: '',
        });
    });

    // The Machbase SCAN_FORWARD / SCAN_BACKWARD hints only steer scan DIRECTION, never the distance
    // walked. Measured on a 63M-row tag: 17.1s unhinted / 6.1s hinted with no time filter, but ~4ms
    // once both bounds exist. Now that every query carries a resolved window, the hint can only ever
    // be noise — so no builder is allowed to emit one.
    test('no query builder emits a SCAN_ hint', async () => {
        await queryTagData({ ...table, names: ['sensor.a'], direction: 'latest', page: 1 });
        await queryTagData({ ...table, names: ['sensor.a'], direction: 'oldest', page: 1 });
        await queryTagData({
            ...table,
            names: ['sensor.a'],
            direction: 'latest',
            page: 1,
            cursorSide: 'prev',
            cursorTime: '2026-06-25T05:09:58.534Z',
            cursorName: 'sensor.a',
        });
        await queryTagData({ ...table, names: ['sensor.a', 'sensor.b'], direction: 'latest', page: 1 });
        await queryTagDataTotal({ ...table, names: ['sensor.a'] });
        await queryTagBoundaryTime({ ...table, names: ['sensor.a'], direction: 'latest' });
        await queryTagBoundaryTime({ ...table, names: ['sensor.a'], direction: 'oldest' });
        await queryTagChartData({ ...table, names: ['sensor.a'] });
        await listTableTags(table);

        expect(mockedFetchQuery.mock.calls.length).toBeGreaterThan(0);
        mockedFetchQuery.mock.calls.forEach((call) => {
            expect(String(call[0])).not.toContain('SCAN_');
        });
    });

    // The page always hands down a resolved window, so both edges have to survive into the WHERE
    // clause — a one-sided predicate is what turns a 4ms read back into a full-table walk.
    test('a resolved window emits both a lower and an upper TIME bound', async () => {
        await queryTagData({
            ...table,
            names: ['sensor.a'],
            direction: 'latest',
            from: '2026-06-25 04:10:01.001',
            to: '2026-06-25 05:10:01.001',
            page: 1,
        });
        await queryTagDataTotal({
            ...table,
            names: ['sensor.a'],
            from: '2026-06-25 04:10:01.001',
            to: '2026-06-25 05:10:01.001',
        });
        await queryTagChartData({
            ...table,
            names: ['sensor.a'],
            from: '2026-06-25 04:10:01.001',
            to: '2026-06-25 05:10:01.001',
        });

        mockedFetchQuery.mock.calls.forEach((call) => {
            const sql = String(call[0]);
            expect(sql).toContain("TIME >= TO_TIMESTAMP('2026-06-25 04:10:01.001')");
            expect(sql).toContain("TIME <= TO_TIMESTAMP('2026-06-25 05:10:01.001')");
        });
    });

    test('unresolved range tokens never reach TO_TIMESTAMP', async () => {
        // The old guard compared against the exact strings 'last' / 'now', so a relative token like
        // 'last-1h' slipped past it and produced TO_TIMESTAMP('last-1h') — SQL the server cannot
        // parse. Resolution happens in the page; the builder's job is to emit no bound at all.
        await queryTagData({ ...table, names: ['sensor.a'], direction: 'latest', from: 'last-1h', to: 'now-15m', page: 1 });

        const sql = mockedFetchQuery.mock.calls[0][0];
        expect(sql).not.toContain('TO_TIMESTAMP');
        expect(sql).not.toContain('last-1h');
        expect(sql).not.toContain('now-15m');
    });

    // queryTagBoundaryTime is the one query that structurally cannot carry a time predicate — it is
    // what discovers the boundary the window is built from. Scanning for it measured 4.53s on a
    // 63M-row tag; the tag stat view answers with the identical value in 1.29ms.
    describe('time range boundary', () => {
        const statRow = (time: number) => ({
            svrState: true,
            svrData: { columns: ['TIME'], rows: [[time]] },
            svrReason: '',
        });

        test('reads the boundary from the tag stat view instead of scanning', async () => {
            mockedFetchQuery.mockReset();
            mockedFetchQuery.mockResolvedValue(statRow(1785374536739000000));

            const latest = await queryTagBoundaryTime({ ...table, names: ['sensor.a', 'sensor.b'], direction: 'latest' });

            expect(mockedFetchQuery).toHaveBeenCalledTimes(1);
            const sql = mockedFetchQuery.mock.calls[0][0];
            expect(sql).toContain('MACHBASEDB.SYS.V$TAG_STAT');
            expect(sql).toContain('max(MAX_TIME)');
            expect(sql).toContain("NAME in ('sensor.a', 'sensor.b')");
            // No ORDER BY scan of the data table.
            expect(sql).not.toContain('order by');
            expect(latest).toBe(1785374536739000000);
        });

        test('uses min(MIN_TIME) for the oldest edge', async () => {
            mockedFetchQuery.mockReset();
            mockedFetchQuery.mockResolvedValue(statRow(1656601200000000000));

            await queryTagBoundaryTime({ ...table, names: ['sensor.a'], direction: 'oldest' });

            expect(mockedFetchQuery.mock.calls[0][0]).toContain('min(MIN_TIME)');
        });

        test('falls back to scanning when the stat view query fails', async () => {
            mockedFetchQuery.mockReset();
            mockedFetchQuery.mockResolvedValueOnce({ svrState: false, svrData: undefined, svrReason: 'no such table' });
            mockedFetchQuery.mockResolvedValueOnce(statRow(17));

            const result = await queryTagBoundaryTime({ ...table, names: ['sensor.a'], direction: 'latest' });

            expect(mockedFetchQuery).toHaveBeenCalledTimes(2);
            expect(mockedFetchQuery.mock.calls[1][0]).toContain('order by TIME desc limit 1');
            expect(result).toBe(17);
        });

        test('skips the stat view for a non-default time column', async () => {
            mockedFetchQuery.mockReset();
            mockedFetchQuery.mockResolvedValue(statRow(99));

            await queryTagBoundaryTime({ ...table, names: ['sensor.a'], direction: 'latest', timeColumn: 'EVENT_TIME' });

            // MIN_TIME / MAX_TIME describe BASETIME, so for any other column the view would answer
            // successfully with the wrong boundary — and a success cannot trigger the fallback.
            expect(mockedFetchQuery).toHaveBeenCalledTimes(1);
            const sql = mockedFetchQuery.mock.calls[0][0];
            expect(sql).not.toContain('_STAT');
            expect(sql).toContain('order by EVENT_TIME desc limit 1');
        });

        test('falls back when the stat view has no row for the tag', async () => {
            mockedFetchQuery.mockReset();
            mockedFetchQuery.mockResolvedValueOnce({ svrState: true, svrData: { columns: ['TIME'], rows: [] }, svrReason: '' });
            mockedFetchQuery.mockResolvedValueOnce(statRow(42));

            const result = await queryTagBoundaryTime({ ...table, names: ['sensor.a'], direction: 'latest' });

            expect(mockedFetchQuery).toHaveBeenCalledTimes(2);
            expect(mockedFetchQuery.mock.calls[1][0]).toContain('order by TIME desc limit 1');
            expect(result).toBe(42);
        });

        // A distance-base table has no MIN_TIME / MAX_TIME to ask about: its stat view publishes
        // MIN_DISTANCE / MAX_DISTANCE instead, and the time names answer `MACHCLI-ERR-2056, Column
        // name (MAX_TIME) not found` (measured against MACHBASEDB.SYS.V$DISTANCE_SENSOR_STAT). Even
        // a view that did answer would be answering about metres, and this function's result feeds
        // `toDataViewerDate`. The `timeColumnExpr === 'TIME'` guard keeps the question from being
        // asked at all; the column below is what returns 999990.
        test('never asks the stat view about a non-TIME base column', async () => {
            mockedFetchQuery.mockReset();
            mockedFetchQuery.mockResolvedValue(statRow(999990));

            const latest = await queryTagBoundaryTime({
                dbName: 'MACHBASEDB',
                userName: 'SYS',
                tableName: 'DISTANCE_SENSOR',
                names: ['SENSOR_01'],
                direction: 'latest',
                timeColumn: 'ODOMETER_M',
            });

            expect(mockedFetchQuery).toHaveBeenCalledTimes(1);
            const sql = mockedFetchQuery.mock.calls[0][0];
            expect(sql).not.toContain('V$DISTANCE_SENSOR_STAT');
            expect(sql).not.toContain('MAX_TIME');
            expect(sql).not.toContain('_STAT');
            // The fallback reads the real column, which is what returns 999990 rather than its bits.
            expect(sql).toContain('order by ODOMETER_M desc limit 1');
            expect(latest).toBe(999990);
        });
    });
});

// A distance base column is a DOUBLE holding an odometer reading, not a DATETIME. Every bound and
// every cursor anchor against it has to be a numeric literal: TO_TIMESTAMP compares an epoch to a
// distance and matches nothing — silently, since it is valid SQL. Shapes taken from the live
// MACHBASEDB.SYS.DISTANCE_SENSOR (base column ODOMETER_M, 10 tags x 100,000 rows, 0 .. 999990).
describe('data viewer API distance base', () => {
    const table = { dbName: 'MACHBASEDB', userName: 'SYS', tableName: 'DISTANCE_SENSOR' };
    const distance = { tagColumn: 'NAME', timeColumn: 'ODOMETER_M', baseKind: 'distance' as const };

    beforeEach(() => {
        mockedFetchQuery.mockReset();
        mockedFetchQuery.mockResolvedValue({
            svrState: true,
            svrData: { columns: ['ODOMETER_M', 'NAME', 'VALUE'], rows: [] },
            svrReason: '',
        });
    });

    test('bounds the window with numeric comparisons and no TO_TIMESTAMP', async () => {
        await queryTagData({ ...table, ...distance, names: ['SENSOR_01'], direction: 'latest', from: '0', to: '1000', page: 1 });
        await queryTagDataTotal({ ...table, ...distance, names: ['SENSOR_01'], from: '0', to: '1000' });
        await queryTagChartData({ ...table, ...distance, names: ['SENSOR_01'], from: '0', to: '1000' });

        expect(mockedFetchQuery.mock.calls.length).toBe(3);
        mockedFetchQuery.mock.calls.forEach((call) => {
            const sql = String(call[0]);
            expect(sql).not.toContain('TO_TIMESTAMP');
            expect(sql).toContain('ODOMETER_M >= 0');
            expect(sql).toContain('ODOMETER_M <= 1000');
            expect(sql).toContain("NAME = 'SENSOR_01'");
        });
    });

    // The base column is *aliased* `time` on both axes, and the grid renaming its header to
    // `Distance` deliberately did not touch that. Three readers key off this alias — the row key the
    // cells and widths address, the keyset cursor's `cursorTime`, and the chart's x extractor — so
    // renaming the projection would break all three while the header went on looking correct.
    test('projects the base column as `as time`, the same alias a time base uses', async () => {
        await queryTagData({ ...table, ...distance, names: ['SENSOR_01'], direction: 'latest', from: 0, to: 1000, page: 1 });
        await queryTagChartData({ ...table, ...distance, names: ['SENSOR_01'], from: 0, to: 1000 });

        expect(mockedFetchQuery.mock.calls.length).toBe(2);
        mockedFetchQuery.mock.calls.forEach((call) => {
            const sql = String(call[0]);
            expect(sql).toContain('select ODOMETER_M as time, NAME as name, VALUE as value');
            expect(sql).not.toContain('as distance');
        });
    });

    test('the default 0 ~ 1000 window keeps its lower bound of zero', async () => {
        // `if (from)` on a numeric edge drops 0 as though it were unset, which silently widens the
        // read to everything below 1000. The bound has to survive as a real predicate.
        await queryTagData({ ...table, ...distance, names: ['SENSOR_01'], direction: 'latest', from: 0, to: 1000, page: 1 });

        expect(String(mockedFetchQuery.mock.calls[0][0])).toContain('ODOMETER_M >= 0');
    });

    // Injection defence. `parseDataViewerDistanceValue` rejects anything that is not a plain decimal
    // literal, and a rejected edge is *dropped*, never passed through as text — so there is no
    // string in the WHERE clause for a quote to break out of.
    test('an edge that is not a number never reaches the SQL', async () => {
        await queryTagData({
            ...table,
            ...distance,
            names: ['SENSOR_01'],
            direction: 'latest',
            from: "0 or 1=1--",
            to: "1000'); drop table DISTANCE_SENSOR;--",
            page: 1,
        });
        await queryTagData({ ...table, ...distance, names: ['SENSOR_01'], direction: 'latest', from: 'last-1h', to: 'last', page: 1 });
        await queryTagData({ ...table, ...distance, names: ['SENSOR_01'], direction: 'latest', from: 'Infinity', to: '0x3e8', page: 1 });

        mockedFetchQuery.mock.calls.forEach((call) => {
            const sql = String(call[0]);
            expect(sql).not.toContain('drop table');
            expect(sql).not.toContain('1=1');
            expect(sql).not.toContain('last-1h');
            expect(sql).not.toContain('Infinity');
            expect(sql).not.toContain('0x3e8');
            // Nothing but the tag predicate survives, and no TO_TIMESTAMP was reached for.
            expect(sql).not.toContain('TO_TIMESTAMP');
            expect(sql).toContain("where NAME = 'SENSOR_01' order by");
        });
    });

    // The keyset is a (base, name) pair on both axes — strictly past the anchor on the base column,
    // or level with it and past the anchor on the tag name. Only the literal changes.
    test('the cursor keeps (base, name) keyset semantics with numeric anchors', async () => {
        await queryTagData({
            ...table,
            ...distance,
            names: ['SENSOR_01', 'SENSOR_02'],
            direction: 'latest',
            page: 3,
            pageSize: 1000,
            cursorSide: 'next',
            cursorTime: 4990,
            cursorName: 'SENSOR_02',
            cursorOffset: 1000,
        });
        await queryTagData({
            ...table,
            ...distance,
            names: ['SENSOR_01', 'SENSOR_02'],
            direction: 'latest',
            page: 1,
            pageSize: 1000,
            cursorSide: 'prev',
            cursorTime: '4990',
            cursorName: 'SENSOR_02',
            cursorOffset: 0,
        });
        await queryTagData({
            ...table,
            ...distance,
            names: ['SENSOR_01'],
            direction: 'oldest',
            page: 2,
            pageSize: 1000,
            cursorSide: 'next',
            cursorTime: 0,
            cursorName: 'SENSOR_01',
            cursorOffset: 0,
        });

        const [latestNext, latestPrev, oldestNext] = mockedFetchQuery.mock.calls.map((call) => String(call[0]));
        expect(latestNext).toContain("(ODOMETER_M < 4990 or (ODOMETER_M = 4990 and NAME > 'SENSOR_02'))");
        expect(latestNext).toContain('order by ODOMETER_M desc, NAME asc');
        expect(latestNext).toContain('limit 1000, 1000');
        expect(latestPrev).toContain("(ODOMETER_M > 4990 or (ODOMETER_M = 4990 and NAME < 'SENSOR_02'))");
        expect(latestPrev).toContain('order by ODOMETER_M asc, NAME desc');
        // A cursor anchored at odometer 0 is an ordinary anchor, not a missing one.
        expect(oldestNext).toContain("(ODOMETER_M > 0 or (ODOMETER_M = 0 and NAME > 'SENSOR_01'))");
        expect(oldestNext).toContain('order by ODOMETER_M asc, NAME asc');
        [latestNext, latestPrev, oldestNext].forEach((sql) => expect(sql).not.toContain('TO_TIMESTAMP'));
    });

    test('an unusable cursor anchor drops the keyset and pages by offset instead', async () => {
        await queryTagData({
            ...table,
            ...distance,
            names: ['SENSOR_01'],
            direction: 'latest',
            page: 2,
            pageSize: 1000,
            cursorSide: 'next',
            cursorTime: '2026-06-25T05:09:58.534Z',
            cursorName: 'SENSOR_01',
            cursorOffset: 0,
        });

        const sql = String(mockedFetchQuery.mock.calls[0][0]);
        // Same rows, reached the slow way — never a TO_TIMESTAMP against a DOUBLE column.
        expect(sql).not.toContain('TO_TIMESTAMP');
        expect(sql).not.toContain('2026-06-25');
        expect(sql).toContain("where NAME = 'SENSOR_01' order by ODOMETER_M desc, NAME asc limit 1000, 1000");
    });

    // The axis is opt-in: omitting `baseKind`, or passing 'time', has to leave the time pipeline
    // exactly as it was. This is the regression half of the distance branch.
    test('a time base is unaffected — TO_TIMESTAMP on both the bounds and the cursor', async () => {
        await queryTagData({
            dbName: 'MACHBASEDB',
            userName: 'SYS',
            tableName: 'TAG',
            names: ['sensor.a'],
            direction: 'latest',
            from: '2026-06-25 04:10:01.001',
            to: '2026-06-25 05:10:01.001',
            page: 1,
            cursorSide: 'next',
            cursorTime: '2026-06-25 05:00:00.000',
            cursorName: 'sensor.a',
            cursorOffset: 0,
        });

        const sql = String(mockedFetchQuery.mock.calls[0][0]);
        expect(sql).toContain("TIME >= TO_TIMESTAMP('2026-06-25 04:10:01.001')");
        expect(sql).toContain("TIME <= TO_TIMESTAMP('2026-06-25 05:10:01.001')");
        expect(sql).toContain("(TIME < TO_TIMESTAMP('2026-06-25 05:00:00.000') or (TIME = TO_TIMESTAMP('2026-06-25 05:00:00.000') and NAME > 'sensor.a'))");
    });

    // The distance range editor's slider bounds. Two paths: the tag stat view, whose MIN_DISTANCE /
    // MAX_DISTANCE hold the base column's extent in its own unit, and an aggregate over the column
    // itself. Both were measured against MACHBASEDB.SYS.DISTANCE_SENSOR (ODOMETER_M, DOUBLE, BASE
    // DISTANCE, 0 .. 999990) and agree exactly:
    //   select min(MIN_DISTANCE), max(MAX_DISTANCE) from V$DISTANCE_SENSOR_STAT  ->  0, 999990
    //   select min(ODOMETER_M), max(ODOMETER_M) from DISTANCE_SENSOR             ->  0, 999990
    // What separates them is cost — 259µs against 333ms for the same two tags.
    describe('base column bounds', () => {
        const boundsRow = (mn: unknown, mx: unknown) => ({
            svrState: true,
            svrData: { columns: ['MN', 'MX'], rows: [[mn, mx]] },
            svrReason: '',
        });
        const failedQuery = { svrState: false, svrData: undefined, svrReason: 'MACHCLI-ERR-2056, Column name (MIN_DISTANCE) not found.' };
        const DISTANCE_MAX = 999990;

        test('aggregates the real base column and never touches the stat view', async () => {
            mockedFetchQuery.mockResolvedValue(boundsRow(0, 999990));

            const bounds = await queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01', 'SENSOR_02'], tagColumn: 'NAME', baseColumn: 'ODOMETER_M' });

            expect(bounds).toEqual({ min: 0, max: 999990 });
            expect(mockedFetchQuery).toHaveBeenCalledTimes(1);
            const sql = String(mockedFetchQuery.mock.calls[0][0]);
            expect(sql).toBe("select min(ODOMETER_M) as mn, max(ODOMETER_M) as mx from MACHBASEDB.SYS.DISTANCE_SENSOR where NAME in ('SENSOR_01', 'SENSOR_02')");
            expect(sql).not.toContain('V$');
            expect(sql).not.toContain('MIN_TIME');
            expect(sql).not.toContain('MAX_TIME');
        });

        // The stat view is metadata: no rows read at all. It only opens on a distance base, because
        // MIN_DISTANCE / MAX_DISTANCE are the columns a distance table's view has — a time table's
        // has MIN_TIME / MAX_TIME and answers ERR-2056 for these names.
        test('a distance base reads the extent straight off the stat view', async () => {
            mockedFetchQuery.mockResolvedValue(boundsRow(0, DISTANCE_MAX));

            const bounds = await queryTagBaseColumnBounds({
                ...table,
                names: ['SENSOR_01', 'SENSOR_02'],
                tagColumn: 'NAME',
                baseColumn: 'ODOMETER_M',
                baseKind: 'distance',
            });

            // The same answer the column scan gives — that agreement is the whole point.
            expect(bounds).toEqual({ min: 0, max: DISTANCE_MAX });
            // And the table itself was never read.
            expect(mockedFetchQuery).toHaveBeenCalledTimes(1);
            expect(String(mockedFetchQuery.mock.calls[0][0])).toBe(
                "select min(MIN_DISTANCE) as mn, max(MAX_DISTANCE) as mx from MACHBASEDB.SYS.V$DISTANCE_SENSOR_STAT where NAME in ('SENSOR_01', 'SENSOR_02')"
            );
        });

        // The aggregate is not decoration: the view answers a row per tag, and a row per warehouse
        // per tag on a cluster, so a bare `MIN_DISTANCE, MAX_DISTANCE` would describe whichever row
        // came back first.
        test('the stat query aggregates rather than reading one row', async () => {
            mockedFetchQuery.mockResolvedValue(boundsRow(0, DISTANCE_MAX));

            await queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01', 'SENSOR_02'], baseColumn: 'ODOMETER_M', baseKind: 'distance' });

            const sql = String(mockedFetchQuery.mock.calls[0][0]);
            expect(sql).toContain('min(MIN_DISTANCE)');
            expect(sql).toContain('max(MAX_DISTANCE)');
        });

        // The whole of the compatibility story with a server too old to publish the distance stat
        // columns: it answers ERR-2056, and the column scan answers the same extent.
        test('falls back to scanning the column when the stat view rejects the query', async () => {
            mockedFetchQuery.mockReset();
            mockedFetchQuery.mockResolvedValueOnce(failedQuery).mockResolvedValueOnce(boundsRow(0, DISTANCE_MAX));

            const bounds = await queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01'], baseColumn: 'ODOMETER_M', baseKind: 'distance' });

            expect(bounds).toEqual({ min: 0, max: DISTANCE_MAX });
            expect(mockedFetchQuery).toHaveBeenCalledTimes(2);
            expect(String(mockedFetchQuery.mock.calls[0][0])).toContain('V$DISTANCE_SENSOR_STAT');
            expect(String(mockedFetchQuery.mock.calls[1][0])).toBe(
                "select min(ODOMETER_M) as mn, max(ODOMETER_M) as mx from MACHBASEDB.SYS.DISTANCE_SENSOR where NAME = 'SENSOR_01'"
            );
        });

        // A LONG or ULONG base is as legal as a DOUBLE one, and its stat columns come back as
        // int64 / uint64 rather than double. There is nothing to convert — the number is already in
        // the column's own unit.
        test('reads an integer base distance as the number it is', async () => {
            mockedFetchQuery.mockResolvedValue(boundsRow(0, 4200000));

            await expect(queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01'], baseColumn: 'ODO', baseKind: 'distance' })).resolves.toEqual({
                min: 0,
                max: 4200000,
            });
        });

        // The view keys its rows by NAME. A table tagged by any other column is one it has no row
        // for, so asking it would either error or answer about the wrong tags.
        test('a non-default tag column skips the stat view even on a distance base', async () => {
            mockedFetchQuery.mockResolvedValue(boundsRow(0, DISTANCE_MAX));

            await queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01'], tagColumn: 'SENSOR_ID', baseColumn: 'ODOMETER_M', baseKind: 'distance' });

            expect(mockedFetchQuery).toHaveBeenCalledTimes(1);
            expect(String(mockedFetchQuery.mock.calls[0][0])).not.toContain('V$');
        });

        // A time base has no MIN_DISTANCE to read, so the view is never asked: the column answers,
        // and the nanosecond timestamps come back untouched.
        test('a time base never reads the stat view', async () => {
            mockedFetchQuery.mockResolvedValue(boundsRow(1782000000000000000, 1782000000000001000));

            const bounds = await queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01'], baseColumn: 'TIME', baseKind: 'time' });

            expect(mockedFetchQuery).toHaveBeenCalledTimes(1);
            expect(String(mockedFetchQuery.mock.calls[0][0])).not.toContain('V$');
            expect(bounds).toEqual({ min: 1782000000000000000, max: 1782000000000001000 });
        });

        test('a single tag uses equality, and the base column name is validated as an identifier', async () => {
            mockedFetchQuery.mockResolvedValue(boundsRow('0', '999990'));

            await queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01'], baseColumn: 'ODOMETER_M; drop table DISTANCE_SENSOR--' });

            const sql = String(mockedFetchQuery.mock.calls[0][0]);
            expect(sql).toContain("where NAME = 'SENSOR_01'");
            expect(sql).not.toContain('drop table');
            // A rejected identifier falls back to the default base column rather than being emitted.
            expect(sql).toContain('select min(TIME) as mn, max(TIME) as mx');
        });

        // Every one of these is "no extent", not an error: the editor drops the slider and keeps
        // free numeric entry, so a bounds read that goes wrong never costs the user the dialog.
        test('answers null rather than throwing on anything it cannot use', async () => {
            mockedFetchQuery.mockResolvedValue({ svrState: false, svrData: undefined, svrReason: 'boom' });
            await expect(queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01'], baseColumn: 'ODOMETER_M' })).resolves.toBeNull();

            mockedFetchQuery.mockRejectedValue(new Error('network down'));
            await expect(queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01'], baseColumn: 'ODOMETER_M' })).resolves.toBeNull();

            mockedFetchQuery.mockResolvedValue(boundsRow(null, null));
            await expect(queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01'], baseColumn: 'ODOMETER_M' })).resolves.toBeNull();

            // A single-valued column has no span to slide along.
            mockedFetchQuery.mockResolvedValue(boundsRow(42, 42));
            await expect(queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01'], baseColumn: 'ODOMETER_M' })).resolves.toBeNull();
        });

        test('an empty tag list is answered without a query — `NAME in ()` is a syntax error', async () => {
            mockedFetchQuery.mockResolvedValue(boundsRow(0, 999990));

            await expect(queryTagBaseColumnBounds({ ...table, names: [], baseColumn: 'ODOMETER_M' })).resolves.toBeNull();
            expect(mockedFetchQuery).not.toHaveBeenCalled();
        });
    });
});

describe('listTableColumns', () => {
    const table = { dbName: 'MACHBASEDB', userName: 'SYS', tableName: 'TAG' };
    const DATETIME_TYPE = 6;
    const DOUBLE_TYPE = 20;
    const VARCHAR_TYPE = 5;
    const JSON_TYPE = 61;
    const BASETIME_FLAG = 0x01000000;

    const columnRows = (rows: unknown[][]) => ({ svrState: true, svrData: { columns: ['NM', 'TP', 'FLAG'], rows }, svrReason: '' });

    beforeEach(() => {
        mockedFetchQuery.mockReset();
    });

    test('projects NAME, TYPE, FLAG in that order and scopes the read to the table', async () => {
        mockedFetchQuery.mockResolvedValue(columnRows([]));

        await listTableColumns(table);

        const sql = mockedFetchQuery.mock.calls[0][0];
        // The projection order *is* the contract with DATA_VIEWER_COLUMN_FLAG_INDEX. Reordering it
        // moves the flag out from under the reader without changing a single type.
        expect(sql).toContain('SELECT MC.NAME AS NM, MC.TYPE AS TP, MC.FLAG AS FLAG');
        expect(sql).toContain("AND MU.NAME = UPPER('SYS')");
        expect(sql).toContain("AND MT.NAME = 'TAG'");
        expect(sql).toContain("AND MC.NAME <> '_RID'");
        expect(sql).toContain('ORDER BY MC.ID');
    });

    test('reads the local database as DATABASE_ID -1 and a mounted one by its mount name', async () => {
        mockedFetchQuery.mockResolvedValue(columnRows([]));

        await listTableColumns(table);
        expect(mockedFetchQuery.mock.calls[0][0]).toContain('AND MC.DATABASE_ID = -1');

        await listTableColumns({ ...table, dbName: 'MNTDB' });
        expect(mockedFetchQuery.mock.calls[1][0]).toContain("AND MC.DATABASE_ID = (select BACKUP_TBSID from V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = 'MNTDB')");
    });

    // The integration that the two halves of the flag contract actually meet. Unit tests on either
    // side can both pass while the index they agree on is wrong; this runs a real server response
    // through the real reader.
    test('its rows land on the flag index the base-axis reader uses', async () => {
        mockedFetchQuery.mockResolvedValue(
            columnRows([
                ['NAME', VARCHAR_TYPE, 0],
                ['ODOMETER_M', DOUBLE_TYPE, BASETIME_FLAG],
                ['VALUE', DOUBLE_TYPE, 0],
                ['RECORDED_AT', DATETIME_TYPE, 0],
            ]),
        );

        const columns = await listTableColumns(table);
        expect(columns).toEqual([
            ['NAME', VARCHAR_TYPE, 0],
            ['ODOMETER_M', DOUBLE_TYPE, BASETIME_FLAG],
            ['VALUE', DOUBLE_TYPE, 0],
            ['RECORDED_AT', DATETIME_TYPE, 0],
        ]);

        const baseColumn = resolveDataViewerBaseColumn(columns, 'TIME');
        expect(baseColumn).toBe('ODOMETER_M');
        expect(resolveDataViewerBaseKind(columns, baseColumn)).toBe('distance');
    });

    // The other half of the same integration, for the type index rather than the flag index. The
    // two positions are adjacent and both numeric, so a reader that swaps them stays silent: unit
    // tests on either side keep passing while the page reads a BASETIME flag as a column type. This
    // runs a real server response through the real reader, so the swap has to surface here.
    test('its rows land on the type index the JSON value reader uses', async () => {
        mockedFetchQuery.mockResolvedValue(
            columnRows([
                ['NAME', VARCHAR_TYPE, 0],
                ['TIME', DATETIME_TYPE, BASETIME_FLAG],
                ['VALUE', JSON_TYPE, 0],
            ]),
        );

        const columns = await listTableColumns(table);
        // Type at index 1, flag at index 2 — the positions the reader depends on.
        expect(columns[2]).toEqual(['VALUE', JSON_TYPE, 0]);
        expect(columns[1][1]).toBe(DATETIME_TYPE);
        expect(columns[1][2]).toBe(BASETIME_FLAG);

        expect(isDataViewerJsonValueColumn(columns, 'VALUE')).toBe(true);
        // Reading the flag position instead would find BASETIME on TIME and 0 on VALUE, so the
        // non-JSON table below has to come back false through the same path.
        expect(isDataViewerJsonValueColumn(columns, 'TIME')).toBe(false);
        expect(isDataViewerJsonValueColumn(columns, 'NAME')).toBe(false);
    });

    test('a DOUBLE value table is not refused by the JSON reader', async () => {
        mockedFetchQuery.mockResolvedValue(
            columnRows([
                ['NAME', VARCHAR_TYPE, 0],
                ['TIME', DATETIME_TYPE, BASETIME_FLAG],
                ['VALUE', DOUBLE_TYPE, 0],
            ]),
        );

        await expect(listTableColumns(table).then((columns) => isDataViewerJsonValueColumn(columns, 'VALUE'))).resolves.toBe(false);
    });

    test('a DATETIME BASETIME table round-trips as a time base', async () => {
        mockedFetchQuery.mockResolvedValue(
            columnRows([
                ['NAME', VARCHAR_TYPE, 0],
                ['TIME', DATETIME_TYPE, BASETIME_FLAG],
                ['VALUE', DOUBLE_TYPE, 0],
            ]),
        );

        const columns = await listTableColumns(table);
        expect(resolveDataViewerBaseKind(columns, resolveDataViewerBaseColumn(columns, 'TIME'))).toBe('time');
    });

    // Metadata is advisory: the caller uses it to label an axis, so a failure has to degrade to
    // "unknown" rather than propagate and take the grid down with it.
    test('returns an empty list instead of throwing on any failure', async () => {
        mockedFetchQuery.mockResolvedValueOnce({ svrState: false, svrData: undefined, svrReason: 'no such table' });
        await expect(listTableColumns(table)).resolves.toEqual([]);

        mockedFetchQuery.mockRejectedValueOnce(new Error('network down'));
        await expect(listTableColumns(table)).resolves.toEqual([]);

        mockedFetchQuery.mockResolvedValueOnce({ svrState: true, svrData: {}, svrReason: '' });
        await expect(listTableColumns(table)).resolves.toEqual([]);
    });

    test('drops malformed rows rather than emitting nameless columns', async () => {
        mockedFetchQuery.mockResolvedValue(columnRows([['', DATETIME_TYPE, BASETIME_FLAG], null as any, ['TIME', DATETIME_TYPE, BASETIME_FLAG]]));

        await expect(listTableColumns(table)).resolves.toEqual([['TIME', DATETIME_TYPE, BASETIME_FLAG]]);
    });
});
