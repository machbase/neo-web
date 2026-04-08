import {
    fetchPanelDatasets,
    analyzePanelDataLimit,
    buildChartSeriesItem,
    getSeriesName,
    mapRowsToChartData,
    normalizeChartWidth,
    resolveNavigatorChartState,
    resolvePanelChartState,
    resolvePanelFetchInterval,
} from './PanelFetchUtils';
import { fetchCalculationData, fetchRawData } from '@/api/repository/machiot';
import { isRollup } from '@/utils';

jest.mock('@/api/repository/machiot', () => ({
    fetchCalculationData: jest.fn(),
    fetchRawData: jest.fn(),
}));

jest.mock('@/utils', () => ({
    isRollup: jest.fn(),
}));

const fetchCalculationDataMock = jest.mocked(fetchCalculationData);
const fetchRawDataMock = jest.mocked(fetchRawData);
const isRollupMock = jest.mocked(isRollup);

const createTagItem = (overrides: Record<string, unknown> = {}) =>
    ({
        table: 'TABLE_A',
        tagName: 'temp_sensor',
        calculationMode: 'AVG',
        alias: '',
        color: '#ff0000',
        use_y2: 'N',
        onRollup: false,
        colName: {
            value: 'value_col',
        },
        ...overrides,
    }) as any;

const baseAxes = {
    pixels_per_tick: 100,
    pixels_per_tick_raw: 100,
    use_sampling: true,
    sampling_value: 9,
} as any;

const basePanelTime = {
    range_bgn: 100,
    range_end: 200,
    default_range: { min: 100, max: 200 },
} as any;

const basePanelData = {
    interval_type: 'sec',
} as any;

describe('PanelFetchUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        isRollupMock.mockReturnValue(false);
    });

    describe('normalizeChartWidth', () => {
        it('returns 1 when the chart width is missing or zero', () => {
            expect(normalizeChartWidth()).toBe(1);
            expect(normalizeChartWidth(0)).toBe(1);
        });

        it('keeps valid chart widths unchanged', () => {
            expect(normalizeChartWidth(480)).toBe(480);
        });
    });

    describe('mapRowsToChartData', () => {
        it('returns an empty array when there are no rows', () => {
            expect(mapRowsToChartData()).toEqual([]);
            expect(mapRowsToChartData([])).toEqual([]);
        });

        it('maps raw row tuples into chart data pairs', () => {
            expect(mapRowsToChartData([[1, 10, 'ignored'], [2, 20]])).toEqual([
                [1, 10],
                [2, 20],
            ]);
        });
    });

    describe('getSeriesName', () => {
        const tagItem = {
            tagName: 'temp_sensor',
            calculationMode: 'AVG',
            alias: '',
        } as any;

        it('prefers the alias when one exists', () => {
            expect(getSeriesName({ ...tagItem, alias: 'Temperature' } as any)).toBe('Temperature');
        });

        it('builds a calculation-based label when there is no alias', () => {
            expect(getSeriesName(tagItem)).toBe('temp_sensor(avg)');
        });

        it('uses the raw label when requested', () => {
            expect(getSeriesName(tagItem, true)).toBe('temp_sensor(raw)');
        });
    });

    describe('buildChartSeriesItem', () => {
        const tagItem = {
            tagName: 'temp_sensor',
            calculationMode: 'AVG',
            alias: '',
            color: '#ff0000',
            use_y2: 'Y',
        } as any;

        it('builds a chart series item with mapped rows and color', () => {
            expect(buildChartSeriesItem(tagItem, [[1, 10], [2, 20]])).toEqual({
                name: 'temp_sensor(avg)',
                data: [
                    [1, 10],
                    [2, 20],
                ],
                yAxis: 1,
                marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
                color: '#ff0000',
            });
        });

        it('omits the color field when requested', () => {
            expect(buildChartSeriesItem(tagItem, [[1, 10]], false, false)).toEqual({
                name: 'temp_sensor(avg)',
                data: [[1, 10]],
                yAxis: 1,
                marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
            });
        });
    });

    describe('analyzePanelDataLimit', () => {
        it('returns no limit when the fetch is not raw or the row count does not match', () => {
            expect(analyzePanelDataLimit(false, [[1, 10]], 1, 0)).toEqual({ hasDataLimit: false, limitEnd: 0 });
            expect(analyzePanelDataLimit(true, [[1, 10]], 2, 0)).toEqual({ hasDataLimit: false, limitEnd: 0 });
        });

        it('uses the second-to-last point when the limit end matches the current tail', () => {
            expect(analyzePanelDataLimit(true, [[1, 10], [2, 20], [3, 30]], 3, 3)).toEqual({
                hasDataLimit: true,
                limitEnd: 2,
            });
        });

        it('uses the last point when the tail moved since the previous limit', () => {
            expect(analyzePanelDataLimit(true, [[1, 10], [2, 20], [3, 30]], 3, 2)).toEqual({
                hasDataLimit: true,
                limitEnd: 3,
            });
        });

        it('falls back to the only available point when a limited raw fetch returns one row', () => {
            expect(analyzePanelDataLimit(true, [[3, 30]], 1, 0)).toEqual({
                hasDataLimit: true,
                limitEnd: 3,
            });
        });
    });

    describe('resolvePanelFetchInterval', () => {
        const axes = {
            pixels_per_tick: 100,
            pixels_per_tick_raw: 100,
        } as any;
        const timeRange = { startTime: 0, endTime: 60_000 };

        it('respects an explicit interval type from panel data', () => {
            expect(
                resolvePanelFetchInterval(
                    { interval_type: 'sec' } as any,
                    axes,
                    timeRange,
                    400,
                    false,
                ),
            ).toEqual({
                IntervalType: 'sec',
                IntervalValue: 0,
            });
        });

        it('falls back to calculated intervals when no explicit interval type exists', () => {
            expect(
                resolvePanelFetchInterval(
                    { interval_type: '' } as any,
                    axes,
                    timeRange,
                    400,
                    false,
                ),
            ).toEqual({
                IntervalType: 'sec',
                IntervalValue: 15,
            });
        });
    });

    describe('fetchPanelDatasets', () => {
        it('builds calculated datasets for each selected tag', async () => {
            fetchCalculationDataMock
                .mockResolvedValueOnce({
                    data: {
                        rows: [
                            [100, 1],
                            [200, 2],
                        ],
                    },
                })
                .mockResolvedValueOnce({
                    data: {
                        rows: [
                            [100, 10],
                            [200, 20],
                        ],
                    },
                });

            await expect(
                fetchPanelDatasets({
                    tagSet: [
                        createTagItem(),
                        createTagItem({
                            table: 'TABLE_B',
                            tagName: 'pressure_sensor',
                            calculationMode: 'SUM',
                            use_y2: 'Y',
                            color: '#00ff00',
                        }),
                    ],
                    panelData: basePanelData,
                    panelTime: basePanelTime,
                    panelAxes: baseAxes,
                    chartWidth: 400,
                    isRaw: false,
                    rollupTableList: ['ROLLUP_TABLE'],
                    useSampling: false,
                    includeColor: true,
                }),
            ).resolves.toEqual({
                datasets: [
                    {
                        name: 'temp_sensor(avg)',
                        data: [
                            [100, 1],
                            [200, 2],
                        ],
                        yAxis: 0,
                        marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
                        color: '#ff0000',
                    },
                    {
                        name: 'pressure_sensor(sum)',
                        data: [
                            [100, 10],
                            [200, 20],
                        ],
                        yAxis: 1,
                        marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
                        color: '#00ff00',
                    },
                ],
                interval: { IntervalType: 'sec', IntervalValue: 0 },
                count: 4,
                hasDataLimit: false,
                limitEnd: 0,
            });

            expect(fetchCalculationDataMock).toHaveBeenCalledTimes(2);
            expect(fetchCalculationDataMock.mock.calls[0][0]).toMatchObject({
                Table: expect.stringMatching(/\.TABLE_A$/),
                TagNames: 'temp_sensor',
                CalculationMode: 'avg',
                Count: 4,
                IntervalType: 'sec',
                IntervalValue: 0,
            });
            expect(fetchCalculationDataMock.mock.calls[1][0]).toMatchObject({
                Table: expect.stringMatching(/\.TABLE_B$/),
                TagNames: 'pressure_sensor',
                CalculationMode: 'sum',
                Count: 4,
            });
        });

        it('builds raw datasets with sampling and reports data limits when the raw fetch fills the sample count', async () => {
            fetchRawDataMock.mockResolvedValue({
                data: {
                    rows: [
                        [10, 1],
                        [20, 2],
                        [30, 3],
                    ],
                },
            });

            await expect(
                fetchPanelDatasets({
                    tagSet: [createTagItem()],
                    panelData: basePanelData,
                    panelTime: basePanelTime,
                    panelAxes: baseAxes,
                    chartWidth: 300,
                    isRaw: true,
                    rollupTableList: [],
                    useSampling: true,
                    includeColor: false,
                }),
            ).resolves.toEqual({
                datasets: [
                    {
                        name: 'temp_sensor(raw)',
                        data: [
                            [10, 1],
                            [20, 2],
                            [30, 3],
                        ],
                        yAxis: 0,
                        marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
                    },
                ],
                interval: { IntervalType: 'sec', IntervalValue: 0 },
                count: 3,
                hasDataLimit: true,
                limitEnd: 20,
            });

            expect(fetchRawDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    Table: expect.stringMatching(/\.TABLE_A$/),
                    TagNames: 'temp_sensor',
                    Count: 3,
                    UseSampling: true,
                    sampleValue: 9,
                }),
            );
        });
    });

    describe('resolveNavigatorChartState', () => {
        it('returns an empty dataset set when there are no tags to fetch', async () => {
            await expect(
                resolveNavigatorChartState({
                    tagSet: [],
                    panelData: basePanelData,
                    panelTime: basePanelTime,
                    panelAxes: baseAxes,
                    chartWidth: 400,
                    isRaw: false,
                    rollupTableList: [],
                }),
            ).resolves.toEqual({ datasets: [] });

            expect(fetchCalculationDataMock).not.toHaveBeenCalled();
            expect(fetchRawDataMock).not.toHaveBeenCalled();
        });

        it('reuses the fetch pipeline and returns navigator datasets without colors', async () => {
            fetchCalculationDataMock.mockResolvedValue({
                data: {
                    rows: [
                        [100, 1],
                        [200, 2],
                    ],
                },
            });

            await expect(
                resolveNavigatorChartState({
                    tagSet: [createTagItem()],
                    panelData: basePanelData,
                    panelTime: basePanelTime,
                    panelAxes: baseAxes,
                    chartWidth: 400,
                    isRaw: false,
                    rollupTableList: [],
                }),
            ).resolves.toEqual({
                datasets: [
                    {
                        name: 'temp_sensor(avg)',
                        data: [
                            [100, 1],
                            [200, 2],
                        ],
                        yAxis: 0,
                        marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
                    },
                ],
            });
        });
    });

    describe('resolvePanelChartState', () => {
        it('returns an empty chart state when there are no tags to fetch', async () => {
            await expect(
                resolvePanelChartState({
                    tagSet: [],
                    panelData: basePanelData,
                    panelTime: basePanelTime,
                    panelAxes: baseAxes,
                    chartWidth: 400,
                    isRaw: false,
                    rollupTableList: [],
                }),
            ).resolves.toEqual({
                chartData: { datasets: [] },
                rangeOption: { IntervalType: '', IntervalValue: 0 },
                overflowRange: null,
            });
        });

        it('returns chart data, interval info, and an overflow range when raw data hits the sample limit', async () => {
            fetchRawDataMock.mockResolvedValue({
                data: {
                    rows: [
                        [10, 1],
                        [20, 2],
                        [30, 3],
                    ],
                },
            });

            await expect(
                resolvePanelChartState({
                    tagSet: [createTagItem()],
                    panelData: basePanelData,
                    panelTime: basePanelTime,
                    panelAxes: baseAxes,
                    chartWidth: 300,
                    isRaw: true,
                    rollupTableList: [],
                }),
            ).resolves.toEqual({
                chartData: {
                    datasets: [
                        {
                            name: 'temp_sensor(raw)',
                            data: [
                                [10, 1],
                                [20, 2],
                                [30, 3],
                            ],
                            yAxis: 0,
                            marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
                            color: '#ff0000',
                        },
                    ],
                },
                rangeOption: { IntervalType: 'sec', IntervalValue: 0 },
                overflowRange: { startTime: 10, endTime: 20 },
            });
        });
    });
});
