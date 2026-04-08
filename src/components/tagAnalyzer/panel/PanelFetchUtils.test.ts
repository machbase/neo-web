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
import {
    createTagAnalyzerFetchSeriesConfigFixture as createTagItem,
    createTagAnalyzerPanelAxesFixture,
    createTagAnalyzerPanelDataFixture,
    createTagAnalyzerPanelTimeFixture,
    createTagAnalyzerSeriesConfigFixture,
} from '../TestData/PanelTestData';
import type { TagAnalyzerPanelAxes, TagAnalyzerPanelData, TagAnalyzerPanelTime, TagAnalyzerTagItem } from './TagAnalyzerPanelModelTypes';

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

const baseAxes: TagAnalyzerPanelAxes = createTagAnalyzerPanelAxesFixture();

const basePanelTime: TagAnalyzerPanelTime = createTagAnalyzerPanelTimeFixture({
    range_bgn: 100,
    range_end: 200,
    default_range: { min: 100, max: 200 },
});

const basePanelData: TagAnalyzerPanelData = createTagAnalyzerPanelDataFixture({
    tag_set: [],
    count: undefined,
    raw_keeper: undefined,
    interval_type: 'sec',
});

describe('PanelFetchUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        isRollupMock.mockReturnValue(false);
    });

    describe('normalizeChartWidth', () => {
        it('returns 1 when the chart width is missing or zero', () => {
            // Confirms width math never divides by zero when layout has not settled.
            expect(normalizeChartWidth()).toBe(1);
            expect(normalizeChartWidth(0)).toBe(1);
        });

        it('keeps valid chart widths unchanged', () => {
            // Confirms already valid chart widths pass through untouched.
            expect(normalizeChartWidth(480)).toBe(480);
        });
    });

    describe('mapRowsToChartData', () => {
        it('returns an empty array when there are no rows', () => {
            // Confirms empty fetch results stay empty instead of creating placeholder points.
            expect(mapRowsToChartData()).toEqual([]);
            expect(mapRowsToChartData([])).toEqual([]);
        });

        it('maps raw row tuples into chart data pairs', () => {
            // Confirms repository rows keep only the time/value pair used by the chart.
            expect(mapRowsToChartData([[1, 10, 'ignored'], [2, 20]])).toEqual([
                [1, 10],
                [2, 20],
            ]);
        });
    });

    describe('getSeriesName', () => {
        const tagItem = {
            ...createTagAnalyzerSeriesConfigFixture({
                calculationMode: 'AVG',
            }),
        } as TagAnalyzerTagItem;

        it('prefers the alias when one exists', () => {
            // Confirms aliases override the generated tag/calculation label.
            expect(getSeriesName({ ...tagItem, alias: 'Temperature' })).toBe('Temperature');
        });

        it('builds a calculation-based label when there is no alias', () => {
            // Confirms the helper falls back to tag name plus calculation mode.
            expect(getSeriesName(tagItem)).toBe('temp_sensor(avg)');
        });

        it('uses the raw label when requested', () => {
            // Confirms raw fetches keep a distinct label from calculated series.
            expect(getSeriesName(tagItem, true)).toBe('temp_sensor(raw)');
        });
    });

    describe('buildChartSeriesItem', () => {
        const tagItem = {
            ...createTagAnalyzerSeriesConfigFixture({
                calculationMode: 'AVG',
                use_y2: 'Y',
            }),
        } as TagAnalyzerTagItem;

        it('builds a chart series item with mapped rows and color', () => {
            // Confirms fetched rows are wrapped in the shape the panel renderer expects.
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
            // Confirms navigator datasets can reuse the same builder without color metadata.
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
            // Confirms only full raw fetches are treated as overflow candidates.
            expect(analyzePanelDataLimit(false, [[1, 10]], 1, 0)).toEqual({ hasDataLimit: false, limitEnd: 0 });
            expect(analyzePanelDataLimit(true, [[1, 10]], 2, 0)).toEqual({ hasDataLimit: false, limitEnd: 0 });
        });

        it('uses the second-to-last point when the limit end matches the current tail', () => {
            // Confirms repeated tail timestamps step back one point to avoid a stuck overflow edge.
            expect(analyzePanelDataLimit(true, [[1, 10], [2, 20], [3, 30]], 3, 3)).toEqual({
                hasDataLimit: true,
                limitEnd: 2,
            });
        });

        it('uses the last point when the tail moved since the previous limit', () => {
            // Confirms a new tail timestamp becomes the latest overflow boundary.
            expect(analyzePanelDataLimit(true, [[1, 10], [2, 20], [3, 30]], 3, 2)).toEqual({
                hasDataLimit: true,
                limitEnd: 3,
            });
        });

        it('falls back to the only available point when a limited raw fetch returns one row', () => {
            // Confirms single-row raw limits still produce a concrete overflow end.
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
            } as TagAnalyzerPanelAxes;
            const timeRange = { startTime: 0, endTime: 60_000 };

        it('respects an explicit interval type from panel data', () => {
            // Confirms stored panel intervals override width-based interval calculation.
            expect(
                resolvePanelFetchInterval(
                    { ...basePanelData, interval_type: 'sec' },
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
            // Confirms width-based interval calculation still works when no interval is saved.
            expect(
                resolvePanelFetchInterval(
                    { ...basePanelData, interval_type: '' },
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
            // Confirms calculated fetches preserve per-tag metadata and series placement.
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
                    seriesConfigSet: [
                        createTagItem(),
                        createTagAnalyzerSeriesConfigFixture({
                            table: 'TABLE_B',
                            sourceTagName: 'pressure_sensor',
                            calculationMode: 'SUM',
                            use_y2: 'Y',
                            color: '#00ff00',
                            onRollup: false,
                            colName: {
                                value: 'value_col',
                            },
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
            // Confirms sampled raw fetches surface both chart data and overflow information.
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
                    seriesConfigSet: [createTagAnalyzerSeriesConfigFixture({
                        calculationMode: 'AVG',
                        onRollup: false,
                        colName: {
                            value: 'value_col',
                        },
                    })],
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
            // Confirms navigator fetches short-circuit cleanly when the panel has no tags.
            await expect(
                resolveNavigatorChartState({
                    seriesConfigSet: [],
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
            // Confirms the navigator reuses the same fetch path but drops color-only presentation data.
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
                    seriesConfigSet: [createTagAnalyzerSeriesConfigFixture({
                        calculationMode: 'AVG',
                        onRollup: false,
                        colName: {
                            value: 'value_col',
                        },
                    })],
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
            // Confirms the main chart returns a stable empty state instead of partial fetch metadata.
            await expect(
                resolvePanelChartState({
                    seriesConfigSet: [],
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
            // Confirms raw overflow is returned as both chart data and a clamped visible range.
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
                    seriesConfigSet: [createTagAnalyzerSeriesConfigFixture({
                        calculationMode: 'AVG',
                        onRollup: false,
                        colName: {
                            value: 'value_col',
                        },
                    })],
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
