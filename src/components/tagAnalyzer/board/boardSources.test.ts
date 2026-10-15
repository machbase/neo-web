import { createTagAnalyzerBoardFromDatabaseSeries } from '../application/adapters';
import { seriesDataApi } from '../api/seriesDataApi';
import { formatAbsoluteTime } from '../format/timeFormat';

jest.mock('../api/seriesDataApi', () => ({ seriesDataApi: { fetchSeriesFullRange: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

it.each([false, true])('opens a database source through the existing adapter (numeric=%s)', async (numeric) => {
    const range = { start: -1074397, end: 2498231 };
    const sourceColumns = { name: 'NAME', time: 'TIME', value: 'VALUE', timeBaseTime: numeric };
    jest.mocked(seriesDataApi.fetchSeriesFullRange).mockResolvedValue(range);
    const board = await createTagAnalyzerBoardFromDatabaseSeries({ tag: 'TAG_A', table: 'MACHBASEDB.SYS.TAG', sourceColumns });
    const format = numeric ? String : formatAbsoluteTime;
    const input = { start: format(range.start), end: format(range.end) };
    expect(seriesDataApi.fetchSeriesFullRange).toHaveBeenCalledWith([
        { table: 'MACHBASEDB.SYS.TAG', sourceTagName: 'TAG_A', sourceColumns },
    ]);
    expect(board).toMatchObject({
        name: 'TAG ANALYZER', path: '', type: 'taz', savedCode: false, code: '',
        boardTimeRange: numeric ? { start: '', end: '' } : input,
        boardNumericRange: numeric ? input : { start: '', end: '' },
        panels: [{
            title: 'New chart', time: { rangeInput: input, useLastViewedRange: false },
            query: { tagSet: [{ sourceTagName: 'TAG_A', table: 'MACHBASEDB.SYS.TAG', sourceColumns }] },
        }],
    });
    expect(board.panels).toHaveLength(1);
});

it('propagates a source request failure without creating a board', async () => {
    jest.mocked(seriesDataApi.fetchSeriesFullRange).mockRejectedValue(new Error('Source unavailable'));
    await expect(createTagAnalyzerBoardFromDatabaseSeries({
        tag: 'TAG_A', table: 'TAG', sourceColumns: { name: 'NAME', time: 'TIME', value: 'VALUE' },
    })).rejects.toThrow('Source unavailable');
});
