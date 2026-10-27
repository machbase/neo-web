import { getTqlChart } from '@/api/repository/machiot';
import { PanelSeriesCalculationMode, type PanelSeriesDefinition } from '../seriesModel';
import { FFT_CHART_REQUEST_FAILED_MESSAGE, fftApi } from './fftApi';

jest.mock('@/api/repository/machiot', () => ({ getTqlChart: jest.fn() }));
jest.mock('./seriesSchemaValidation', () => ({
    validateSeriesSchema: jest.fn(async (_table: string, columns: unknown) => columns),
}));

const SERIES: PanelSeriesDefinition = {
    key: 'series-1', table: 'MACHBASEDB.SYS.TAG', sourceTagName: 'temp', alias: '',
    calculationMode: PanelSeriesCalculationMode.Average, useSecondaryAxis: false, id: undefined, useRollupTable: false,
    sourceColumns: { name: 'NAME', time: 'TIME', value: 'VALUE', timeBaseTime: false },
};

// Only the fields the FFT parser reads; the rest of the axios response does not matter here.
function tqlResponse(response: { status: number; headers: Record<string, string>; data: unknown }) {
    return response as unknown as Awaited<ReturnType<typeof getTqlChart>>;
}

function fetchFft() {
    return fftApi.fetchFftChartData(SERIES, { start: 0, end: 1_000 }, 0, 0);
}

describe('fftApi.fetchFftChartData', () => {
    it('keeps the server reason of a rejected FFT request (F-169)', async () => {
        jest.mocked(getTqlChart).mockResolvedValue(tqlResponse({
            status: 200,
            headers: { 'content-type': 'application/json' },
            data: { success: false, reason: 'MACHCLI-ERR-2025, Table TAG does not exist.' },
        }));
        await expect(fetchFft()).rejects.toThrow('MACHCLI-ERR-2025, Table TAG does not exist.');
    });

    it('falls back to the generic message when the server gives no reason', async () => {
        jest.mocked(getTqlChart).mockResolvedValue(tqlResponse({ status: 200, headers: {}, data: {} }));
        await expect(fetchFft()).rejects.toThrow(FFT_CHART_REQUEST_FAILED_MESSAGE);
    });

    it('returns the chart for an ECharts response', async () => {
        jest.mocked(getTqlChart).mockResolvedValue(tqlResponse({
            status: 200,
            headers: { 'x-chart-type': 'echarts' },
            data: { chartID: 'fft-chart' },
        }));
        await expect(fetchFft()).resolves.toMatchObject({ chartID: 'fft-chart' });
    });
});
