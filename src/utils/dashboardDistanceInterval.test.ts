import { DashboardQueryParser } from './DashboardQueryParser';
import { DefaultTagTableOption } from './eChartHelper';

/**
 * A distance (numeric base) panel buckets by a raw number in the base column's own unit. The bucket
 * expression has to survive a FLOAT/DOUBLE base column: `col / N * N` only groups anything because
 * *integer* division truncates, and an odometer stored as DOUBLE would come back ungrouped — the
 * interval set in the panel editor doing visibly nothing while the SQL still mentioned it.
 */
const distanceBlock = (aOverrides: any = {}) => ({
    ...JSON.parse(JSON.stringify(DefaultTagTableOption)),
    id: 'b1',
    userName: 'SYS',
    table: 'SYS.DISTANCE_SENSOR',
    type: 'tag',
    tag: 'SENSOR_06',
    name: 'NAME',
    time: 'ODOMETER_M',
    value: 'VALUE',
    aggregator: 'avg',
    timeBaseTime: true,
    // 20 = DOUBLE: a base column that is not an integer, which is where the old expression failed.
    timeType: 20,
    tableInfo: [
        ['NAME', 5, 0, 0, 0],
        ['ODOMETER_M', 20, 0, 0, 0x01000000],
        ['VALUE', 20, 0, 0, 0],
    ],
    ...aOverrides,
});

const timeBlock = () =>
    distanceBlock({
        time: 'TIME',
        timeBaseTime: false,
        timeType: 6,
        tableInfo: [
            ['NAME', 5, 0, 0, 0],
            ['TIME', 6, 0, 0, 0x01000000],
            ['VALUE', 20, 0, 0, 0],
        ],
    });

const buildSql = (aBlock: any, aInterval: any, aRange = { start: 400000, end: 600000 }) => {
    const [sQueries]: any = DashboardQueryParser('line', 'TIME_VALUE' as any, [aBlock], [], [], [{ useBlockList: [0] }], {
        interval: aInterval,
        start: aRange.start,
        end: aRange.end,
    } as any);
    return sQueries[0].sql as string;
};

describe('distance panels bucket by their axis interval', () => {
    test('a manual interval reaches the query as a real bucket', () => {
        const sSql = buildSql(distanceBlock(), { IntervalType: 'value', IntervalValue: '100000' });
        expect(sSql).toContain('FLOOR(ODOMETER_M / 100000) * 100000');
    });

    test('the bucket is floored, so a FLOAT/DOUBLE base column cannot slip through ungrouped', () => {
        const sSql = buildSql(distanceBlock(), { IntervalType: 'value', IntervalValue: 250 });
        // `ODOMETER_M / 250 * 250` is exactly ODOMETER_M on a floating point column — the shape that
        // made the interval look ignored.
        expect(sSql).not.toMatch(/ODOMETER_M \/ 250 \* 250/);
        expect(sSql).toContain('FLOOR(ODOMETER_M / 250) * 250');
    });

    test('no interval means no bucket at all — the rows as stored', () => {
        // What LineChart hands the parser for a distance panel with the Interval left on auto.
        const sSql = buildSql(distanceBlock(), { IntervalType: '', IntervalValue: '' });
        expect(sSql).not.toContain('FLOOR(');
        expect(sSql).toContain('ODOMETER_M as mTime');
    });

    test('the time axis keeps its nanosecond truncation expression', () => {
        const sSql = buildSql(timeBlock(), { IntervalType: 'sec', IntervalValue: 10 }, { start: 1, end: 2 });
        expect(sSql).not.toContain('FLOOR(');
    });
});
