import {
    analyzePanelDataLimit,
    buildChartSeriesItem,
    fetchPanelDatasets,
    fetchSeriesRows,
    isFetchableTimeRange,
    loadNavigatorChartState,
    loadPanelChartState,
    mapRowsToChartData,
    resolvePanelFetchTimeRange,
    resolvePanelFetchInterval,
} from './TagAnalyzerFetchUtils';
import { fetchCalculationData, fetchRawData } from '@/api/repository/machiot';
import { isRollup } from '@/utils';
import {
    createTagAnalyzerFetchSeriesConfigFixture as createTagItem,
    createTagAnalyzerPanelAxesFixture,
    createTagAnalyzerPanelDataFixture,
    createTagAnalyzerPanelTimeFixture,
    createTagAnalyzerSeriesConfigFixture,
} from '../TestData/PanelTestData';
import type {
    PanelAxes,
    PanelData,
    PanelTime,
    SeriesConfig,
} from './ModelTypes';
import { createEmptyInputTimeBounds } from './TagAnalyzerTimeRangeConfig';
import { normalizeLegacyTimeRangeBoundary } from './legacy/LegacyUtils';

jest.mock('@/api/repository/machiot', () => ({
    fetchCalculationData: jest.fn(),
    fetchRawData: jest.fn(),
}));

jest.mock('@/utils', () => ({
    isRollup: jest.fn(),
}));

const fetchCalculationDataMock = fetchCalculationData as jest.Mock;
const fetchRawDataMock = fetchRawData as jest.Mock;
const isRollupMock = jest.mocked(isRollup);

const baseAxes: PanelAxes = createTagAnalyzerPanelAxesFixture(undefined);

const basePanelTime: PanelTime = createTagAnalyzerPanelTimeFixture({
    range_bgn: 100,
    range_end: 200,
    default_range: { min: 100, max: 200 },
});

const basePanelData: PanelData = createTagAnalyzerPanelDataFixture({
    tag_set: [],
    count: -1,
    raw_keeper: false,
    interval_type: 'sec',
});

const basePanelInfo = {
    data: basePanelData,
    time: basePanelTime,
    axes: baseAxes,
};
const emptyBoardTime = createEmptyInputTimeBounds();

describe('TagAnalyzerFetchUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        isRollupMock.mockReturnValue(false);
    });

    describe('mapRowsToChartData', () => {
        it('returns an empty array when there are no rows', () => {
            // Confirms empty fetch results stay empty instead of creating placeholder points.
            expect(mapRowsToChartData(undefined)).toEqual([]);
            expect(mapRowsToChartData([])).toEqual([]);
        });

        it('maps raw row tuples into chart data pairs', () => {
            // Confirms repository rows keep only the time/value pair used by the chart.
            expect(
                mapRowsToChartData([
                    [1, 10, 'ignored'],
                    [2, 20],
                ]),
            ).toEqual([
                [1, 10],
                [2, 20],
            ]);
        });
    });

    describe('buildChartSeriesItem', () => {
        const tagItem = {
            ...createTagAnalyzerSeriesConfigFixture({
                calculationMode: 'AVG',
                use_y2: true,

                colName: undefined,
            }),
        } as SeriesConfig;

        it('builds a chart series item with mapped rows and color', () => {
            // Confirms fetched rows are wrapped in the shape the panel renderer expects.
            expect(
                buildChartSeriesItem(
                    tagItem,
                    [
                        [1, 10],
                        [2, 20],
                    ],
                    undefined,
                    undefined,
                ),
            ).toEqual({
                name: 'temp_sensor(avg)',
                data: [
                    [1, 10],
                    [2, 20],
                ],
                yAxis: 1,
                marker: { symbol: 'circle', lineColor: undefined, lineWidth: 1 },
                color: '#ff0000',
            });
        });

        it('omits the color field when requested', () => {
            // Confirms navigator datasets can reuse the same builder without color metadata.
            expect(buildChartSeriesItem(tagItem, [[1, 10]], false, false)).toEqual({
                name: 'temp_sensor(avg)',
                data: [[1, 10]],
                yAxis: 1,
                marker: { symbol: 'circle', lineColor: undefined, lineWidth: 1 },
            });
        });
    });

    describe('analyzePanelDataLimit', () => {
        it('returns no limit when the fetch is not raw or the row count does not match', () => {
            // Confirms only full raw fetches are treated as overflow candidates.
            expect(analyzePanelDataLimit(false, [[1, 10]], 1, 0)).toEqual({
                hasDataLimit: false,
                limitEnd: 0,
            });
            expect(analyzePanelDataLimit(true, [[1, 10]], 2, 0)).toEqual({
                hasDataLimit: false,
                limitEnd: 0,
            });
        });

        it('uses the second-to-last point when the limit end matches the current tail', () => {
            // Confirms repeated tail timestamps step back one point to avoid a stuck overflow edge.
            expect(
                analyzePanelDataLimit(
                    true,
                    [
                        [1, 10],
                        [2, 20],
                        [3, 30],
                    ],
                    3,
                    3,
                ),
            ).toEqual({
                hasDataLimit: true,
                limitEnd: 2,
            });
        });

        it('uses the last point when the tail moved since the previous limit', () => {
            // Confirms a new tail timestamp becomes the latest overflow boundary.
            expect(
                analyzePanelDataLimit(
                    true,
                    [
                        [1, 10],
                        [2, 20],
                        [3, 30],
                    ],
                    3,
                    2,
                ),
            ).toEqual({
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
        } as PanelAxes;
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
                    undefined,
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
                    undefined,
                ),
            ).toEqual({
                IntervalType: 'sec',
                IntervalValue: 15,
            });
        });
    });

    describe('resolvePanelFetchTimeRange', () => {
        it('falls back to the panel default range when board time is unresolved last-relative time', () => {
            const sPanelTime = createTagAnalyzerPanelTimeFixture({
                range_bgn: '',
                range_end: '',
                default_range: { min: 100, max: 200 },
            });
            const sBoardTime = {
                kind: 'resolved' as const,
                value: normalizeLegacyTimeRangeBoundary('last-2h', 'last-1h'),
            };

            expect(resolvePanelFetchTimeRange(sPanelTime, sBoardTime, undefined)).toEqual({
                startTime: 100,
                endTime: 200,
            });
        });
    });

    describe('isFetchableTimeRange', () => {
        it('rejects unresolved or zero-width ranges', () => {
            expect(isFetchableTimeRange(undefined)).toBe(false);
            expect(isFetchableTimeRange({ startTime: 0, endTime: 0 })).toBe(false);
            expect(isFetchableTimeRange({ startTime: 0, endTime: 100 })).toBe(false);
            expect(isFetchableTimeRange({ startTime: 200, endTime: 200 })).toBe(false);
            expect(isFetchableTimeRange({ startTime: 300, endTime: 200 })).toBe(false);
        });

        it('accepts concrete forward-moving ranges', () => {
            expect(isFetchableTimeRange({ startTime: 100, endTime: 200 })).toBe(true);
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
                        createTagItem(undefined),
                        createTagAnalyzerSeriesConfigFixture({
                            table: 'TABLE_B',
                            sourceTagName: 'pressure_sensor',
                            calculationMode: 'SUM',
                            use_y2: true,
                            color: '#00ff00',
                            onRollup: false,
                            colName: {
                                value: 'value_col',

                                name: undefined,
                                time: undefined,
                            },

                            name: undefined,
                            time: undefined,
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

                    boardTime: emptyBoardTime,
                    timeRange: undefined,
                    isNavigator: undefined,
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
                marker: { symbol: 'circle', lineColor: undefined, lineWidth: 1 },
                        color: '#ff0000',
                    },
                    {
                        name: 'pressure_sensor(sum)',
                        data: [
                            [100, 10],
                            [200, 20],
                        ],
                        yAxis: 1,
                marker: { symbol: 'circle', lineColor: undefined, lineWidth: 1 },
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

        it('starts each series fetch before awaiting earlier series responses', async () => {
            // Confirms multi-series loads no longer serialize every repository request end-to-end.
            let sResolveFirstFetch:
                | ((aValue: { data: { rows: number[][] } }) => void)
                | undefined;
            let sResolveSecondFetch:
                | ((aValue: { data: { rows: number[][] } }) => void)
                | undefined;
            const sFirstFetch = new Promise<{ data: { rows: number[][] } }>((aResolve) => {
                sResolveFirstFetch = aResolve;
            });
            const sSecondFetch = new Promise<{ data: { rows: number[][] } }>((aResolve) => {
                sResolveSecondFetch = aResolve;
            });

            fetchCalculationDataMock
                .mockImplementationOnce(() => sFirstFetch)
                .mockImplementationOnce(() => sSecondFetch);

            const sFetchPromise = fetchPanelDatasets({
                seriesConfigSet: [
                    createTagItem(undefined),
                    createTagAnalyzerSeriesConfigFixture({
                        table: 'TABLE_B',
                        sourceTagName: 'pressure_sensor',
                        calculationMode: 'SUM',
                        use_y2: true,
                        color: '#00ff00',
                        onRollup: false,
                        colName: {
                            value: 'value_col',
                            name: undefined,
                            time: undefined,
                        },
                        name: undefined,
                        time: undefined,
                    }),
                ],
                panelData: basePanelData,
                panelTime: basePanelTime,
                panelAxes: baseAxes,
                chartWidth: 400,
                isRaw: false,
                rollupTableList: ['ROLLUP_TABLE'],
                useSampling: false,
                includeColor: false,
                boardTime: emptyBoardTime,
                timeRange: undefined,
                isNavigator: undefined,
            });

            await Promise.resolve();

            expect(fetchCalculationDataMock).toHaveBeenCalledTimes(2);

            sResolveFirstFetch?.({
                data: {
                    rows: [[100, 1]],
                },
            });
            sResolveSecondFetch?.({
                data: {
                    rows: [[100, 10]],
                },
            });

            await expect(sFetchPromise).resolves.toEqual(
                expect.objectContaining({
                    datasets: [
                        expect.objectContaining({
                            name: 'temp_sensor(avg)',
                            data: [[100, 1]],
                        }),
                        expect.objectContaining({
                            name: 'pressure_sensor(sum)',
                            data: [[100, 10]],
                        }),
                    ],
                }),
            );
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
                    seriesConfigSet: [
                        createTagAnalyzerSeriesConfigFixture({
                            calculationMode: 'AVG',
                            onRollup: false,
                            colName: {
                                value: 'value_col',

                                name: undefined,
                                time: undefined,
                            },

                            name: undefined,
                            time: undefined,
                        }),
                    ],
                    panelData: basePanelData,
                    panelTime: basePanelTime,
                    panelAxes: baseAxes,
                    chartWidth: 300,
                    isRaw: true,
                    rollupTableList: [],
                    useSampling: true,
                    includeColor: false,

                    boardTime: emptyBoardTime,
                    timeRange: undefined,
                    isNavigator: undefined,
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
                marker: { symbol: 'circle', lineColor: undefined, lineWidth: 1 },
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

        it('skips repository fetches when the resolved range is still unresolved', async () => {
            await expect(
                fetchPanelDatasets({
                    seriesConfigSet: [createTagItem(undefined)],
                    panelData: {
                        ...basePanelData,
                        tag_set: [createTagItem(undefined)],
                    },
                    panelTime: createTagAnalyzerPanelTimeFixture({
                        range_bgn: 0,
                        range_end: 0,
                        default_range: { min: 0, max: 0 },
                    }),
                    panelAxes: baseAxes,
                    chartWidth: 400,
                    isRaw: false,
                    rollupTableList: [],
                    useSampling: false,
                    includeColor: true,
                    boardTime: emptyBoardTime,
                    timeRange: undefined,
                    isNavigator: undefined,
                }),
            ).resolves.toEqual({
                datasets: [],
                interval: { IntervalType: '', IntervalValue: 0 },
                count: 0,
                hasDataLimit: false,
                limitEnd: 0,
            });

            expect(fetchCalculationDataMock).not.toHaveBeenCalled();
            expect(fetchRawDataMock).not.toHaveBeenCalled();
        });
    });

    describe('fetchSeriesRows', () => {
        it('routes calculated overlap-style requests through the calculation endpoint', async () => {
            // Confirms shared single-series fetches reuse the calculated panel request rules.
            fetchCalculationDataMock.mockResolvedValue({ data: { rows: [[100, 1]] } });

            await expect(
                fetchSeriesRows(
                    createTagAnalyzerSeriesConfigFixture({
                        calculationMode: 'AVG',
                        onRollup: false,
                        colName: {
                            value: 'value_col',

                            name: undefined,
                            time: undefined,
                        },

                        name: undefined,
                        time: undefined,
                    }),
                    { startTime: 100, endTime: 200 },
                    { IntervalType: 'sec', IntervalValue: 5 },
                    10,
                    false,
                    ['ROLLUP_TABLE'],
                    undefined,
                    undefined,
                ),
            ).resolves.toEqual({ data: { rows: [[100, 1]] } });

            expect(fetchCalculationDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    TagNames: 'temp_sensor',
                    Start: 100,
                    End: 200,
                    Count: 10,
                }),
            );
        });

        it('routes raw single-series requests through the raw endpoint', async () => {
            // Confirms shared single-series raw fetches reuse the raw panel request rules.
            fetchRawDataMock.mockResolvedValue({ data: { rows: [[100, 1]] } });

            await expect(
                fetchSeriesRows(
                    createTagAnalyzerSeriesConfigFixture({
                        calculationMode: 'AVG',
                        onRollup: false,
                        colName: {
                            value: 'value_col',

                            name: undefined,
                            time: undefined,
                        },

                        name: undefined,
                        time: undefined,
                    }),
                    { startTime: 100, endTime: 200 },
                    { IntervalType: 'sec', IntervalValue: 5 },
                    10,
                    true,
                    [],
                    undefined,
                    undefined,
                ),
            ).resolves.toEqual({ data: { rows: [[100, 1]] } });

            expect(fetchRawDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    TagNames: 'temp_sensor',
                    Start: 100,
                    End: 200,
                    Count: 10,
                }),
            );
        });

        it('returns an empty response when the caller passes an unresolved range', async () => {
            await expect(
                fetchSeriesRows(
                    createTagAnalyzerSeriesConfigFixture({
                        calculationMode: 'AVG',
                        onRollup: false,
                        colName: {
                            value: 'value_col',

                            name: undefined,
                            time: undefined,
                        },

                        name: undefined,
                        time: undefined,
                    }),
                    { startTime: 0, endTime: 0 },
                    { IntervalType: 'sec', IntervalValue: 5 },
                    10,
                    false,
                    ['ROLLUP_TABLE'],
                    undefined,
                    undefined,
                ),
            ).resolves.toEqual({
                data: {
                    column: [],
                    rows: [],
                },
            });

            expect(fetchCalculationDataMock).not.toHaveBeenCalled();
            expect(fetchRawDataMock).not.toHaveBeenCalled();
        });
    });

    describe('loadNavigatorChartState', () => {
        it('returns an empty dataset set when there are no tags to fetch', async () => {
            // Confirms navigator fetches short-circuit cleanly when the panel has no tags.
            await expect(
                loadNavigatorChartState({
                    panelData: basePanelInfo.data,
                    panelTime: basePanelInfo.time,
                    panelAxes: basePanelInfo.axes,
                    chartWidth: 400,
                    isRaw: false,
                    rollupTableList: [],

                    boardTime: emptyBoardTime,
                    timeRange: undefined,
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
                loadNavigatorChartState({
                    panelData: {
                        ...basePanelData,
                        tag_set: [
                            createTagAnalyzerSeriesConfigFixture({
                                calculationMode: 'AVG',
                                onRollup: false,
                                colName: {
                                    value: 'value_col',

                                    name: undefined,
                                    time: undefined,
                                },

                                name: undefined,
                                time: undefined,
                            }),
                        ],
                    },
                    panelTime: basePanelInfo.time,
                    panelAxes: basePanelInfo.axes,
                    chartWidth: 400,
                    isRaw: false,
                    rollupTableList: [],

                    boardTime: emptyBoardTime,
                    timeRange: undefined,
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
                marker: { symbol: 'circle', lineColor: undefined, lineWidth: 1 },
                    },
                ],
            });
        });
    });

    describe('loadPanelChartState', () => {
        it('returns an empty chart state when there are no tags to fetch', async () => {
            // Confirms the main chart returns a stable empty state instead of partial fetch metadata.
            await expect(
                loadPanelChartState({
                    panelData: basePanelInfo.data,
                    panelTime: basePanelInfo.time,
                    panelAxes: basePanelInfo.axes,
                    chartWidth: 400,
                    isRaw: false,
                    rollupTableList: [],

                    boardTime: emptyBoardTime,
                    timeRange: undefined,
                }),
            ).resolves.toEqual({
                chartData: { datasets: [] },
                rangeOption: { IntervalType: '', IntervalValue: 0 },
                overflowRange: undefined,
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
                loadPanelChartState({
                    panelData: {
                        ...basePanelData,
                        tag_set: [
                            createTagAnalyzerSeriesConfigFixture({
                                calculationMode: 'AVG',
                                onRollup: false,
                                colName: {
                                    value: 'value_col',

                                    name: undefined,
                                    time: undefined,
                                },

                                name: undefined,
                                time: undefined,
                            }),
                        ],
                    },
                    panelTime: basePanelInfo.time,
                    panelAxes: basePanelInfo.axes,
                    chartWidth: 300,
                    isRaw: true,
                    rollupTableList: [],

                    boardTime: emptyBoardTime,
                    timeRange: undefined,
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
                marker: { symbol: 'circle', lineColor: undefined, lineWidth: 1 },
                            color: '#ff0000',
                        },
                    ],
                },
                rangeOption: { IntervalType: 'sec', IntervalValue: 0 },
                overflowRange: { startTime: 10, endTime: 20 },
            });
        });

        it('returns an empty chart state when the requested range is unresolved', async () => {
            await expect(
                loadPanelChartState({
                    panelData: {
                        ...basePanelData,
                        tag_set: [createTagItem(undefined)],
                    },
                    panelTime: createTagAnalyzerPanelTimeFixture({
                        range_bgn: 0,
                        range_end: 0,
                        default_range: { min: 0, max: 0 },
                    }),
                    panelAxes: baseAxes,
                    chartWidth: 300,
                    isRaw: false,
                    rollupTableList: [],
                    boardTime: emptyBoardTime,
                    timeRange: undefined,
                }),
            ).resolves.toEqual({
                chartData: { datasets: [] },
                rangeOption: { IntervalType: '', IntervalValue: 0 },
                overflowRange: undefined,
            });

            expect(fetchCalculationDataMock).not.toHaveBeenCalled();
            expect(fetchRawDataMock).not.toHaveBeenCalled();
        });
    });
});
