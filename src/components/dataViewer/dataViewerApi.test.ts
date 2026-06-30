import { fetchQuery } from '@/api/repository/database';
import { queryTagChartData, queryTagData, queryTagDataTotal } from './dataViewerApi';

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
        expect(sql).toContain('limit 0, 3000');
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
