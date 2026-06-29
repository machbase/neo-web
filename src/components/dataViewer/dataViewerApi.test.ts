import { fetchQuery } from '@/api/repository/database';
import { queryTagChartData, queryTagData, queryTagDataTotal } from './dataViewerApi';

jest.mock('@/api/repository/database', () => ({
    fetchQuery: jest.fn(),
}));

const mockedFetchQuery = fetchQuery as jest.MockedFunction<typeof fetchQuery>;

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
        expect(sql).toContain("TIME >= TO_TIMESTAMP('2026-06-25 05:09:58.534')");
        expect(sql).toContain("TIME <= TO_TIMESTAMP('2026-06-25 05:19:58.534')");
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
        expect(rawSql).toContain("TIME >= TO_TIMESTAMP('2026-06-25 05:09:58.534')");
        expect(rawSql).not.toContain('2026-06-25T05:09:58.534Z');
        expect(totalSql).toContain("TIME <= TO_TIMESTAMP('2026-06-25 05:19:58.534')");
        expect(totalSql).not.toContain('2026-06-25T05:19:58.534Z');
    });
});
