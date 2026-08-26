import { fetchQuery, fetchTqlWithoutConsole } from '@/api/repository/database';
import {
    listTableColumns,
    listTableTags,
    queryTagBaseColumnBounds,
    queryTagBoundaryTime,
    queryTagChartData,
    queryTagData,
    queryTagDataTotal,
    queryTagJsonKeyData,
    reinterpretTagStatBaseValue,
} from './dataViewerApi';
import { isDataViewerJsonValueColumn, resolveDataViewerBaseColumn, resolveDataViewerBaseKind } from './dataViewerModel';

jest.mock('@/api/repository/database', () => ({
    fetchQuery: jest.fn(),
    fetchTqlWithoutConsole: jest.fn(),
}));

const mockedFetchQuery = fetchQuery as jest.MockedFunction<typeof fetchQuery>;
const mockedFetchTql = fetchTqlWithoutConsole as jest.MockedFunction<typeof fetchTqlWithoutConsole>;

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

    // The alias is carried in from the column spec rather than derived here, so this pins the whole
    // contract: what the SQL says, and what the row key the caller will read it under is.
    test('names extra columns under the row key the caller asked for', async () => {
        await queryTagData({
            dbName: 'MACHBASEDB',
            userName: 'SYS',
            tableName: 'TAG',
            names: ['sensor.a'],
            direction: 'latest',
            page: 1,
            extraColumns: [
                { name: 'VALUE2', key: 'ex0' },
                { name: 'STATUS', key: 'ex1' },
            ],
        });

        const sql = mockedFetchQuery.mock.calls[0][0];
        expect(sql).toContain('VALUE as value, VALUE2 as EX0, STATUS as EX1 from');
    });

    // The projection is the only thing that changes; a caller that names nothing extra must produce
    // the statement it always produced, down to the comma.
    test('projects the three fixed columns unchanged when nothing extra is named', async () => {
        await queryTagData({ dbName: 'MACHBASEDB', userName: 'SYS', tableName: 'TAG', names: ['sensor.a'], direction: 'latest', page: 1 });

        expect(mockedFetchQuery.mock.calls[0][0]).toContain('VALUE as value from');
    });

    // A name that is not a plain identifier cannot have come from M$SYS_COLUMNS, so it is a caller
    // bug — and one bad column must not cost the page every row it was going to show.
    test('drops an extra column whose name is not an identifier, keeping the rest', async () => {
        await queryTagData({
            dbName: 'MACHBASEDB',
            userName: 'SYS',
            tableName: 'TAG',
            names: ['sensor.a'],
            direction: 'latest',
            page: 1,
            extraColumns: [
                { name: 'VALUE2; drop table TAG', key: 'ex0' },
                { name: 'STATUS', key: 'ex1' },
            ],
        });

        const sql = mockedFetchQuery.mock.calls[0][0];
        expect(sql).toContain('STATUS as EX1');
        expect(sql).not.toContain('drop table');
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

        // The stat view does not merely answer about the wrong column on a distance-base table — it
        // answers with something that is not a quantity at all. Measured on the live server against
        // MACHBASEDB.SYS.DISTANCE_SENSOR (base column ODOMETER_M, DOUBLE, BASETIME; ODOMETER_M runs
        // 0 .. 999990):
        //     select max(MAX_TIME) from MACHBASEDB.SYS.V$DISTANCE_SENSOR_STAT
        //       -> 4696837060785340416
        //     select ODOMETER_M from MACHBASEDB.SYS.DISTANCE_SENSOR order by ODOMETER_M desc limit 1
        //       -> 999990
        // 4696837060785340416 is the IEEE-754 bit pattern of the double 999990 reinterpreted as an
        // integer: the view stores BASETIME's raw eight bytes and labels them a time. Read as a
        // boundary it puts the window roughly 148 billion years out — and because the query *succeeds*
        // there is nothing downstream that could notice. The `timeColumnExpr === 'TIME'` guard in
        // queryTagBoundaryTime is the only thing standing between this table and that number.
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

    // The distance range editor's slider bounds. Two paths: the tag stat view, whose MIN_TIME /
    // MAX_TIME hold the BASETIME column's raw eight bytes and therefore need reinterpreting back
    // into doubles, and an aggregate over the column itself. The measured pair these tests are built
    // on comes from MACHBASEDB.SYS.DISTANCE_SENSOR (ODOMETER_M, DOUBLE, BASETIME, 0 .. 999990):
    //   select min(MIN_TIME), max(MAX_TIME) from V$DISTANCE_SENSOR_STAT  ->  0, 4696837060785340416
    //   select min(ODOMETER_M), max(ODOMETER_M) from DISTANCE_SENSOR     ->  0, 999990
    // 4696837060785340416 is 0x412E846C00000000, the bit pattern of 999990. Read as a time it would
    // put the slider's upper bound 148 billion years out.
    describe('base column bounds', () => {
        const boundsRow = (mn: unknown, mx: unknown) => ({
            svrState: true,
            svrData: { columns: ['MN', 'MX'], rows: [[mn, mx]] },
            svrReason: '',
        });
        // The value the live server actually returns for this table's upper bound.
        const DISTANCE_MAX_BITS = 4696837060785340416;
        const DISTANCE_MAX = 999990;

        // The reinterpretation on its own, where each refusal can be pinned to its own reason rather
        // than to "the extent came out degenerate anyway".
        describe('reinterpretTagStatBaseValue', () => {
            test('turns the measured pattern back into the measured distance', () => {
                expect(reinterpretTagStatBaseValue(DISTANCE_MAX_BITS)).toBe(DISTANCE_MAX);
                expect(reinterpretTagStatBaseValue('4696837060785340416')).toBe(DISTANCE_MAX);
                expect(reinterpretTagStatBaseValue(4696837060785340416n)).toBe(DISTANCE_MAX);
                // The lower bound of the same table. 0 bits is the double 0, so the two agree there
                // by construction rather than by luck.
                expect(reinterpretTagStatBaseValue(0)).toBe(0);
            });

            test('refuses every pattern it cannot vouch for', () => {
                // Exponent field all ones: NaN and Infinity. Both arrive looking like ordinary
                // integers, and both would become a slider bound if they were let through.
                expect(reinterpretTagStatBaseValue(9221120237041090560)).toBeNull();
                expect(reinterpretTagStatBaseValue(9218868437227405312)).toBeNull();
                // Sign bit set. A negative distance would invert the ordering the aggregate relies
                // on, so `min(MIN_TIME)` would stop being the smallest reading.
                expect(reinterpretTagStatBaseValue(-DISTANCE_MAX_BITS)).toBeNull();
                expect(reinterpretTagStatBaseValue(9223372036854775808n)).toBeNull();
                expect(reinterpretTagStatBaseValue(-1)).toBeNull();
                // Not a bit pattern at all.
                expect(reinterpretTagStatBaseValue(1234.5)).toBeNull();
                expect(reinterpretTagStatBaseValue('not-a-number')).toBeNull();
                expect(reinterpretTagStatBaseValue(null)).toBeNull();
                expect(reinterpretTagStatBaseValue(undefined)).toBeNull();
                expect(reinterpretTagStatBaseValue({})).toBeNull();
            });
        });

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

        // The stat view is metadata: 265µs and no rows read, against 387µs of aggregate over a
        // million. It only opens on a distance base, and only because that is the case where the
        // bytes need reinterpreting at all.
        test('a distance base reads the stat view and reinterprets the pattern back into metres', async () => {
            mockedFetchQuery.mockResolvedValue(boundsRow(0, DISTANCE_MAX_BITS));

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
                "select min(MIN_TIME) as mn, max(MAX_TIME) as mx from MACHBASEDB.SYS.V$DISTANCE_SENSOR_STAT where NAME in ('SENSOR_01', 'SENSOR_02')"
            );
        });

        // Every one of these is a payload past Number.MAX_SAFE_INTEGER whose bit pattern cannot be
        // reinterpreted into a distance with any confidence. Falling through to the column is what
        // keeps a wrong bound — which has no outward sign, it is just a number — off the slider.
        test.each<[string, unknown]>([
            // 0x7FF8000000000000: exponent all ones, reinterprets to NaN.
            ['a NaN exponent field', 9221120237041090560],
            // 0x7FF0000000000000: Infinity.
            ['an Infinity exponent field', 9218868437227405312],
            // Sign bit set, so the aggregate's ordering no longer tracks the values.
            ['a signed pattern', -4696837060785340416],
            ['a non-integer', 1234.5],
            ['text that is not a pattern', 'not-a-number'],
            // The one shape the endpoint could plausibly start sending. MIN_TIME / MAX_TIME are
            // *labelled* datetime — `/web/api/query` answers `"types":["datetime","datetime"]` for
            // this very query, while serialising the raw integers — so a formatting or timezone
            // option applied to the response would turn the pattern into a rendered date. Measured
            // against the live server today: `[0, 4696837060785340416]`, digits. If that ever
            // becomes a date, the reinterpretation has nothing left to work with and the only
            // correct move is the column scan. Both the ISO and the Machbase-shaped rendering, and
            // 1970 because that is what these particular bytes render as when read as a time.
            ['a rendered date', '1970-01-01 09:00:00.000'],
            ['an ISO date', '1970-01-01T00:00:00.000Z'],
            ['a Date object', new Date(0)],
        ])('falls back to scanning the column when the stat view answers %s', async (_label, bad) => {
            // Once with the bad payload as the upper bound, once as the lower — a guard applied to
            // only one of the two would still hand the slider a bound nobody can see is wrong.
            for (const row of [boundsRow(0, bad), boundsRow(bad, DISTANCE_MAX_BITS)]) {
                mockedFetchQuery.mockReset();
                mockedFetchQuery.mockResolvedValueOnce(row).mockResolvedValueOnce(boundsRow(0, DISTANCE_MAX));

                const bounds = await queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01'], baseColumn: 'ODOMETER_M', baseKind: 'distance' });

                expect(bounds).toEqual({ min: 0, max: DISTANCE_MAX });
                expect(mockedFetchQuery).toHaveBeenCalledTimes(2);
                expect(String(mockedFetchQuery.mock.calls[0][0])).toContain('V$DISTANCE_SENSOR_STAT');
                expect(String(mockedFetchQuery.mock.calls[1][0])).toBe(
                    "select min(ODOMETER_M) as mn, max(ODOMETER_M) as mx from MACHBASEDB.SYS.DISTANCE_SENSOR where NAME = 'SENSOR_01'"
                );
            }
        });

        // A digit string never crossed a double, so there is no rounding question to answer. Note
        // that the literal here is deliberately not `String(DISTANCE_MAX_BITS)`: JS prints that
        // double as `4696837060785340000` — the shortest decimal that round-trips, not the exact
        // integer — and reinterpreting *those* digits answers 999989.9999999516. The number path
        // does not have that problem, because `BigInt(number)` takes the double's exact value.
        test('a stat payload delivered as digits is read exactly', async () => {
            mockedFetchQuery.mockResolvedValue(boundsRow('0', '4696837060785340416'));

            await expect(queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01'], baseColumn: 'ODOMETER_M', baseKind: 'distance' })).resolves.toEqual({
                min: 0,
                max: DISTANCE_MAX,
            });
            expect(mockedFetchQuery).toHaveBeenCalledTimes(1);
        });

        // The view keys its rows by NAME. A table tagged by any other column is one it has no row
        // for, so asking it would either error or answer about the wrong tags.
        test('a non-default tag column skips the stat view even on a distance base', async () => {
            mockedFetchQuery.mockResolvedValue(boundsRow(0, DISTANCE_MAX));

            await queryTagBaseColumnBounds({ ...table, names: ['SENSOR_01'], tagColumn: 'SENSOR_ID', baseColumn: 'ODOMETER_M', baseKind: 'distance' });

            expect(mockedFetchQuery).toHaveBeenCalledTimes(1);
            expect(String(mockedFetchQuery.mock.calls[0][0])).not.toContain('V$');
        });

        // The reinterpretation is only correct because the bytes are a double. On a time base they
        // are a real timestamp, and reading 1782000000000000000 as a bit pattern answers ~1e-300.
        test('a time base never reinterprets anything', async () => {
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

describe('queryTagJsonKeyData', () => {
    const params = { dbName: 'MACHBASEDB', userName: 'SYS', tableName: 'TAG', tagName: 'sensor.a' };

    beforeEach(() => {
        mockedFetchTql.mockReset();
        mockedFetchTql.mockResolvedValue({
            svrState: true,
            svrData: { columns: ['TIME', 'NAME', 'JV0', 'JV1'], rows: [] },
            svrReason: '',
        } as any);
    });

    // A json path cannot be an identifier, so every projection is aliased and mapped back by
    // position. Losing that ordering silently swaps one key's values for another's.
    test('projects one aliased json extraction per key, in the order they were asked for', async () => {
        await queryTagJsonKeyData({ ...params, paths: ['[a][b]', '[c]'] });

        const sql = mockedFetchTql.mock.calls[0][0];
        expect(sql).toContain("VALUE->'$[a][b]' as JV0");
        expect(sql).toContain("VALUE->'$[c]' as JV1");
    });

    // The alias is an implementation detail of the wire; a reader that saw it would render a `jv0`
    // column beside the key it stands for.
    test('returns one row per cycle with the aliases resolved to positions', async () => {
        mockedFetchTql.mockResolvedValue({
            svrState: true,
            svrData: {
                columns: ['TIME', 'NAME', 'JV0', 'JV1'],
                rows: [
                    ['2026-08-25 10:00:00.000', 'sensor.a', 1, 'x'],
                    ['2026-08-25 10:00:01.000', 'sensor.a', 2, null],
                ],
            },
            svrReason: '',
        } as any);

        const { rows } = await queryTagJsonKeyData({ ...params, paths: ['[a]', '[b]'] });

        expect(rows).toEqual([
            { base: '2026-08-25 10:00:00.000', values: [1, 'x'] },
            { base: '2026-08-25 10:00:01.000', values: [2, null] },
        ]);
    });

    // A key is free to contain a quote, and it reaches SQL inside a string literal.
    test('escapes a quote inside a key path', async () => {
        await queryTagJsonKeyData({ ...params, paths: ["['it''s']"] });

        expect(mockedFetchTql.mock.calls[0][0]).toContain("VALUE->'$[''it''''s'']' as JV0");
    });

    // A JSON document that is a bare value has no key to project out of it, so the column is taken
    // as it stands — projecting `->'$'` would ask the database for a path that is not there.
    test('takes the column itself when the path is empty', async () => {
        await queryTagJsonKeyData({ ...params, paths: [''] });

        const sql = mockedFetchTql.mock.calls[0][0];
        expect(sql).toContain('VALUE as JV0');
        expect(sql).not.toContain("VALUE->");
    });

    // A chart drawn from the oldest N cycles of a window is not a chart of that window — with a
    // limit here, widening the range on the page changed nothing on screen.
    test('reads the whole window, with no row limit', async () => {
        await queryTagJsonKeyData({ ...params, paths: ['[a]'], from: '2026-08-25 10:00:00.000', to: '2026-08-25 12:00:00.000' });

        const sql = mockedFetchTql.mock.calls[0][0];
        expect(sql).toContain('order by TIME asc');
        expect(sql).not.toContain('limit');
    });

    test('asks for nothing when no key was picked', async () => {
        await expect(queryTagJsonKeyData({ ...params, paths: [] })).resolves.toEqual({ rows: [] });
        expect(mockedFetchTql).not.toHaveBeenCalled();
    });

    test('reports the failure reason the server gave', async () => {
        mockedFetchTql.mockResolvedValue({ svrState: false, svrData: null, svrReason: 'Error in json load.' } as any);

        await expect(queryTagJsonKeyData({ ...params, paths: ['[a]'] })).rejects.toThrow('Error in json load.');
    });
});
