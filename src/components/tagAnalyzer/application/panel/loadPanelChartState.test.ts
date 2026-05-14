import {
    buildChartSeriesData,
    mapRowsToChartData,
} from '../../chart/ChartSeriesMapper';
import {
    fetchCalculatedSeriesRows,
    fetchPanelSeriesRows,
    fetchRawSeriesRows,
    isFetchableTimeRange,
    resolvePanelFetchInterval,
    resolvePanelFetchTimeRange,
} from './PanelChartDatasetFetcher';
import { chartSeriesDataApi } from '../../fetch/ChartSeriesDataFetcher';
import {
    loadPanelChartState,
} from './loadPanelChartState';
import { isRollup } from '@/utils';
import {
    createTagAnalyzerFetchSeriesConfigFixture as createTagItem,
    createTagAnalyzerPanelAxesFixture,
    createTagAnalyzerPanelDataFixture,
    createTagAnalyzerPanelTimeFixture,
    createTagAnalyzerSeriesConfigFixture,
} from '../../TestData/PanelTestData';
import { parseTimeRangeConfigFromBoundaryValues } from '../../domain/time/TimeBoundaryParser';
import type { PanelAxes, PanelData, PanelTime } from '../../domain/PanelModel';
import type { PanelSeriesDefinition } from '../../domain/SeriesModel';
import { SortOrderEnum } from '../../fetch/FetchContracts';

jest.mock('@/utils', () => ({
    ...jest.requireActual('@/utils'),
    isRollup: jest.fn(),
}));

const fetchCalculationDataMock = jest.spyOn(chartSeriesDataApi, 'fetchCalculationData');
const fetchRawDataMock = jest.spyOn(chartSeriesDataApi, 'fetchRawData');
const isRollupMock = jest.mocked(isRollup);

const baseAxes: PanelAxes = createTagAnalyzerPanelAxesFixture(undefined);

const basePanelTime: PanelTime = createTagAnalyzerPanelTimeFixture({
    range_bgn: 100,
    range_end: 200,
});

const basePanelData: PanelData = createTagAnalyzerPanelDataFixture({
    tag_set: [],
    count: -1,
    interval_type: 'second',
});

const basePanelInfo = {
    data: basePanelData,
    time: basePanelTime,
    axes: baseAxes,
};
const emptyBoardTime = undefined;

describe('FetchUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetchCalculationDataMock.mockReset();
        fetchRawDataMock.mockReset();
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

    describe('buildChartSeriesData', () => {
        const tagItem = {
            ...createTagAnalyzerSeriesConfigFixture({
                calculationMode: 'AVG',
                useSecondaryAxis: true,
            }),
        } as PanelSeriesDefinition;

        it('builds a chart series item with mapped rows and color', () => {
            // Confirms fetched rows are wrapped in the shape the panel renderer expects.
            expect(
                buildChartSeriesData(
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
            expect(buildChartSeriesData(tagItem, [[1, 10]], false, false)).toEqual({
                name: 'temp_sensor(avg)',
                data: [[1, 10]],
                yAxis: 1,
                marker: { symbol: 'circle', lineColor: undefined, lineWidth: 1 },
            });
        });
    });

    describe('resolvePanelFetchInterval', () => {
        const axes: PanelAxes = {
            x_axis: {
                show_tickline: true,
                raw_data_pixels_per_tick: 100,
                calculated_data_pixels_per_tick: 100,
            },
            sampling: {
                enabled: true,
                sample_count: 9,
            },
            main_chart_sampling: {
                enabled: false,
                sample_count: 9,
            },
            left_y_axis: {
                zero_base: false,
                show_tickline: true,
                value_range: { min: 0, max: 0 },
                raw_data_value_range: { min: 0, max: 0 },
                upper_control_limit: { enabled: false, value: 0 },
                lower_control_limit: { enabled: false, value: 0 },
            },
            right_y_axis_enabled: false,
            right_y_axis: {
                zero_base: false,
                show_tickline: false,
                value_range: { min: 0, max: 0 },
                raw_data_value_range: { min: 0, max: 0 },
                upper_control_limit: { enabled: false, value: 0 },
                lower_control_limit: { enabled: false, value: 0 },
            },
        };
        const timeRange = { startTime: 0, endTime: 60_000 };

        it('respects an explicit interval type from panel data', () => {
            // Confirms stored panel intervals keep their unit while using a concrete non-zero size.
            expect(
                resolvePanelFetchInterval(
                    { ...basePanelData, interval_type: 'second' },
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

    describe('resolvePanelFetchTimeRange', () => {
        it('uses the legacy default range after it is converted into an absolute panel range', () => {
            const sPanelTime = createTagAnalyzerPanelTimeFixture({
                range_bgn: '',
                range_end: '',
                default_range: { min: 100, max: 200 },
            });
            const sBoardTime = parseTimeRangeConfigFromBoundaryValues('last-2h', 'last-1h');

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

    describe('fetchPanelSeriesRows', () => {
        it('fetches calculated rows for each selected tag', async () => {
            // Confirms calculated fetches preserve per-tag responses for downstream chart processing.
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
                fetchPanelSeriesRows(
                    [
                        createTagItem(undefined),
                        createTagAnalyzerSeriesConfigFixture({
                            table: 'TABLE_B',
                            sourceTagName: 'pressure_sensor',
                            calculationMode: 'SUM',
                            useSecondaryAxis: true,
                            color: '#00ff00',
                            useRollupTable: false,
                            sourceColumns: {
                                value: 'value_col',

                                name: undefined,
                                time: undefined,
                            },

                            name: undefined,
                            time: undefined,
                        }),
                    ],
                    basePanelData,
                    basePanelTime,
                    baseAxes,
                    emptyBoardTime,
                    400,
                    false,
                    undefined,
                    ['ROLLUP_TABLE'],
                    false,
                ),
            ).resolves.toEqual({
                seriesFetchResults: [
                    expect.objectContaining({
                        seriesConfig: expect.objectContaining({
                            sourceTagName: 'temp_sensor',
                        }),
                        fetchResult: {
                            data: {
                                rows: [
                                    [100, 1],
                                    [200, 2],
                                ],
                            },
                        },
                    }),
                    expect.objectContaining({
                        seriesConfig: expect.objectContaining({
                            sourceTagName: 'pressure_sensor',
                        }),
                        fetchResult: {
                            data: {
                                rows: [
                                    [100, 10],
                                    [200, 20],
                                ],
                            },
                        },
                    }),
                ],
                interval: { IntervalType: 'sec', IntervalValue: 1 },
                count: 4,
                isRaw: false,
            });

            expect(fetchCalculationDataMock).toHaveBeenCalledTimes(2);
            expect(fetchCalculationDataMock.mock.calls[0][0]).toMatchObject({
                Table: expect.stringMatching(/\.TABLE_A$/),
                TagNames: 'temp_sensor',
                CalculationMode: 'avg',
                Count: 4,
                IntervalType: 'sec',
                IntervalValue: 1,
            });
            expect(fetchCalculationDataMock.mock.calls[1][0]).toMatchObject({
                Table: expect.stringMatching(/\.TABLE_B$/),
                TagNames: 'pressure_sensor',
                CalculationMode: 'sum',
                Count: 4,
            });
        });

        it('marks calculated main chart data when it reaches the fetch limit', async () => {
            fetchCalculationDataMock.mockResolvedValue({
                data: {
                    rows: [
                        [100, 1],
                        [200, 2],
                        [300, 3],
                        [400, 4],
                    ],
                },
            });

            await expect(
                loadPanelChartState(
                    {
                        ...basePanelData,
                        tag_set: [createTagItem(undefined)],
                    },
                    basePanelTime,
                    baseAxes,
                    emptyBoardTime,
                    400,
                    false,
                    undefined,
                    [],
                    'main',
                ),
            ).resolves.toEqual(
                expect.objectContaining({
                    isLimitReached: true,
                }),
            );
        });

        it('marks raw main chart data when it reaches the query limit', async () => {
            fetchRawDataMock.mockResolvedValue({
                data: {
                    rows: [
                        [100, 1],
                        [200, 2],
                        [300, 3],
                        [400, 4],
                    ],
                },
            });

            await expect(
                loadPanelChartState(
                    {
                        ...basePanelData,
                        tag_set: [createTagItem(undefined)],
                    },
                    basePanelTime,
                    baseAxes,
                    emptyBoardTime,
                    400,
                    true,
                    undefined,
                    [],
                    'main',
                ),
            ).resolves.toEqual(
                expect.objectContaining({
                    isLimitReached: true,
                    limitedDataRange: {
                        startTime: 100,
                        endTime: 400,
                    },
                }),
            );

            expect(fetchRawDataMock).toHaveBeenCalledTimes(1);
            expect(fetchRawDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    Count: 4,
                    sampling: { kind: 'disabled' },
                }),
            );
        });

        it('marks a limit hit even when the limited rows do not form a zoomable range', async () => {
            fetchRawDataMock.mockResolvedValue({
                data: {
                    rows: [[100, 1]],
                },
            });

            const sResult = await loadPanelChartState(
                {
                    ...basePanelData,
                    count: 1,
                    tag_set: [createTagItem(undefined)],
                },
                basePanelTime,
                baseAxes,
                emptyBoardTime,
                400,
                true,
                undefined,
                [],
                'main',
            );

            expect(sResult).toEqual(
                expect.objectContaining({
                    isLimitReached: true,
                }),
            );
            expect(sResult).toEqual(
                expect.not.objectContaining({
                    limitedDataRange: expect.anything(),
                }),
            );
        });

        it('does not mark the limit for navigator-only fetches', async () => {
            fetchCalculationDataMock.mockResolvedValue({
                data: {
                    rows: [
                        [100, 1],
                        [200, 2],
                        [300, 3],
                        [400, 4],
                    ],
                },
            });

            await expect(
                loadPanelChartState(
                    {
                        ...basePanelData,
                        tag_set: [createTagItem(undefined)],
                    },
                    basePanelTime,
                    baseAxes,
                    emptyBoardTime,
                    400,
                    false,
                    undefined,
                    [],
                    'navigator',
                ),
            ).resolves.toEqual(
                expect.not.objectContaining({
                    isLimitReached: true,
                }),
            );
        });

        it('starts each series fetch before awaiting earlier series responses', async () => {
            // Confirms multi-series loads no longer serialize every repository request end-to-end.
            let sResolveFirstFetch:
                | ((value: { data: { rows: number[][] } }) => void)
                | undefined;
            let sResolveSecondFetch:
                | ((value: { data: { rows: number[][] } }) => void)
                | undefined;
            const sFirstFetch = new Promise<{ data: { rows: number[][] } }>((resolve) => {
                sResolveFirstFetch = resolve;
            });
            const sSecondFetch = new Promise<{ data: { rows: number[][] } }>((resolve) => {
                sResolveSecondFetch = resolve;
            });

            fetchCalculationDataMock
                .mockImplementationOnce(() => sFirstFetch)
                .mockImplementationOnce(() => sSecondFetch);

            const sFetchPromise = fetchPanelSeriesRows(
                [
                    createTagItem(undefined),
                    createTagAnalyzerSeriesConfigFixture({
                        table: 'TABLE_B',
                        sourceTagName: 'pressure_sensor',
                        calculationMode: 'SUM',
                        useSecondaryAxis: true,
                        color: '#00ff00',
                        useRollupTable: false,
                        sourceColumns: {
                            value: 'value_col',
                            name: undefined,
                            time: undefined,
                        },
                        name: undefined,
                        time: undefined,
                    }),
                ],
                basePanelData,
                basePanelTime,
                baseAxes,
                emptyBoardTime,
                400,
                false,
                undefined,
                ['ROLLUP_TABLE'],
                false,
            );

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
                    seriesFetchResults: [
                        expect.objectContaining({
                            fetchResult: {
                                data: {
                                    rows: [[100, 1]],
                                },
                            },
                        }),
                        expect.objectContaining({
                            fetchResult: {
                                data: {
                                    rows: [[100, 10]],
                                },
                            },
                        }),
                    ],
                }),
            );
        });

        it('fetches main raw rows with a query limit when main-chart sampling is disabled', async () => {
            // Confirms unsampled main raw data still sends the width-based row limit.
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
                fetchPanelSeriesRows(
                    [
                        createTagAnalyzerSeriesConfigFixture({
                            calculationMode: 'AVG',
                            useRollupTable: false,
                            sourceColumns: {
                                value: 'value_col',

                                name: undefined,
                                time: undefined,
                            },

                            name: undefined,
                            time: undefined,
                        }),
                    ],
                    basePanelData,
                    basePanelTime,
                    baseAxes,
                    emptyBoardTime,
                    400,
                    true,
                    undefined,
                    [],
                    true,
                ),
            ).resolves.toEqual({
                seriesFetchResults: [
                    expect.objectContaining({
                        fetchResult: {
                            data: {
                                rows: [
                                    [10, 1],
                                    [20, 2],
                                    [30, 3],
                                ],
                            },
                        },
                    }),
                ],
                interval: { IntervalType: 'sec', IntervalValue: 1 },
                count: 4,
                isRaw: true,
            });

            expect(fetchRawDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    Table: expect.stringMatching(/\.TABLE_A$/),
                    TagNames: 'temp_sensor',
                    Count: 4,
                    SortOrder: SortOrderEnum.Ascending,
                    sampling: { kind: 'disabled' },
                }),
            );
        });

        it('fetches main raw rows with main-chart sampling when enabled', async () => {
            // Confirms main chart sampling uses its own editor value, not the navigator sampling value.
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
                fetchPanelSeriesRows(
                    [
                        createTagAnalyzerSeriesConfigFixture({
                            calculationMode: 'AVG',
                            useRollupTable: false,
                            sourceColumns: {
                                value: 'value_col',
                                name: undefined,
                                time: undefined,
                            },
                            name: undefined,
                            time: undefined,
                        }),
                    ],
                    basePanelData,
                    basePanelTime,
                    {
                        ...baseAxes,
                        main_chart_sampling: {
                            enabled: true,
                            sample_count: 7,
                        },
                    },
                    emptyBoardTime,
                    300,
                    true,
                    undefined,
                    [],
                    true,
                ),
            ).resolves.toEqual(
                expect.objectContaining({
                    seriesFetchResults: [
                        expect.objectContaining({
                            fetchResult: {
                                data: {
                                    rows: [
                                        [10, 1],
                                        [20, 2],
                                        [30, 3],
                                    ],
                                },
                            },
                        }),
                    ],
                    count: 3,
                    isRaw: true,
                }),
            );

            expect(fetchRawDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    Count: 3,
                    sampling: { kind: 'enabled', value: 7 },
                }),
            );
        });

        it('fetches navigator raw rows with sample-count sampling', async () => {
            // Confirms navigation sampling is isolated to navigator raw data.
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
                fetchPanelSeriesRows(
                    [
                        createTagAnalyzerSeriesConfigFixture({
                            calculationMode: 'AVG',
                            useRollupTable: false,
                            sourceColumns: {
                                value: 'value_col',
                                name: undefined,
                                time: undefined,
                            },
                            name: undefined,
                            time: undefined,
                        }),
                    ],
                    basePanelData,
                    basePanelTime,
                    baseAxes,
                    emptyBoardTime,
                    300,
                    true,
                    undefined,
                    [],
                    true,
                    'navigator',
                ),
            ).resolves.toEqual({
                seriesFetchResults: [
                    expect.objectContaining({
                        fetchResult: {
                            data: {
                                rows: [
                                    [10, 1],
                                    [20, 2],
                                    [30, 3],
                                ],
                            },
                        },
                    }),
                ],
                interval: { IntervalType: 'sec', IntervalValue: 1 },
                count: 3,
                isRaw: true,
            });

            expect(fetchRawDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    Count: 3,
                    sampling: { kind: 'enabled', value: 9 },
                }),
            );
        });

        it('skips repository fetches when the resolved range is still unresolved', async () => {
            await expect(
                fetchPanelSeriesRows(
                    [createTagItem(undefined)],
                    {
                        ...basePanelData,
                        tag_set: [createTagItem(undefined)],
                    },
                    createTagAnalyzerPanelTimeFixture({
                        range_bgn: 0,
                        range_end: 0,
                        default_range: { min: 0, max: 0 },
                    }),
                    baseAxes,
                    emptyBoardTime,
                    400,
                    false,
                    undefined,
                    [],
                    false,
                ),
            ).resolves.toEqual({
                seriesFetchResults: [],
                interval: { IntervalType: '', IntervalValue: 0 },
                count: 0,
                isRaw: false,
            });

            expect(fetchCalculationDataMock).not.toHaveBeenCalled();
            expect(fetchRawDataMock).not.toHaveBeenCalled();
        });
    });

    describe('fetchCalculatedSeriesRows', () => {
        it('routes calculated overlap-style requests through the calculation endpoint', async () => {
            // Confirms shared single-series calculated fetches reuse the calculated panel request rules.
            fetchCalculationDataMock.mockResolvedValue({ data: { rows: [[100, 1]] } });

            await expect(
                fetchCalculatedSeriesRows(
                    createTagAnalyzerSeriesConfigFixture({
                        calculationMode: 'AVG',
                        useRollupTable: false,
                        sourceColumns: {
                            value: 'value_col',

                            name: undefined,
                            time: undefined,
                        },

                        name: undefined,
                        time: undefined,
                    }),
                    { startTime: 100, endTime: 200 },
                { IntervalType: 'second', IntervalValue: 5 },
                    10,
                    ['ROLLUP_TABLE'],
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

        it('returns an empty response when the calculated range is unresolved', async () => {
            await expect(
                fetchCalculatedSeriesRows(
                    createTagAnalyzerSeriesConfigFixture({
                        calculationMode: 'AVG',
                        useRollupTable: false,
                        sourceColumns: {
                            value: 'value_col',

                            name: undefined,
                            time: undefined,
                        },

                        name: undefined,
                        time: undefined,
                    }),
                    { startTime: 0, endTime: 0 },
                { IntervalType: 'second', IntervalValue: 5 },
                    10,
                    ['ROLLUP_TABLE'],
                ),
            ).resolves.toEqual({
                data: {
                    column: [],
                    rows: [],
                },
            });

            expect(fetchCalculationDataMock).not.toHaveBeenCalled();
        });
    });

    describe('fetchRawSeriesRows', () => {
        it('routes raw single-series requests through the raw endpoint', async () => {
            // Confirms shared single-series raw fetches reuse the raw panel request rules.
            fetchRawDataMock.mockResolvedValue({ data: { rows: [[100, 1]] } });

            await expect(
                fetchRawSeriesRows(
                    createTagAnalyzerSeriesConfigFixture({
                        calculationMode: 'AVG',
                        useRollupTable: false,
                        sourceColumns: {
                            value: 'value_col',

                            name: undefined,
                            time: undefined,
                        },

                        name: undefined,
                        time: undefined,
                    }),
                    { startTime: 100, endTime: 200 },
                { IntervalType: 'second', IntervalValue: 5 },
                    10,
                    { kind: 'disabled' },
                ),
            ).resolves.toEqual({ data: { rows: [[100, 1]] } });

            expect(fetchRawDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    TagNames: 'temp_sensor',
                    Start: 100,
                    End: 200,
                    Count: 10,
                    SortOrder: SortOrderEnum.Ascending,
                    sampling: { kind: 'disabled' },
                }),
            );
        });

        it('returns an empty response when the raw range is unresolved', async () => {
            await expect(
                fetchRawSeriesRows(
                    createTagAnalyzerSeriesConfigFixture({
                        calculationMode: 'AVG',
                        useRollupTable: false,
                        sourceColumns: {
                            value: 'value_col',

                            name: undefined,
                            time: undefined,
                        },

                        name: undefined,
                        time: undefined,
                    }),
                    { startTime: 0, endTime: 0 },
                { IntervalType: 'second', IntervalValue: 5 },
                    10,
                    { kind: 'disabled' },
                ),
            ).resolves.toEqual({
                data: {
                    column: [],
                    rows: [],
                },
            });

            expect(fetchRawDataMock).not.toHaveBeenCalled();
        });
    });

    describe('loadPanelChartState', () => {
        it('returns an empty chart state when there are no tags to fetch', async () => {
            // Confirms the main chart returns a stable empty state instead of partial fetch metadata.
            await expect(
                loadPanelChartState(
                    basePanelInfo.data,
                    basePanelInfo.time,
                    {
                        ...basePanelInfo.axes,
                        sampling: {
                            ...basePanelInfo.axes.sampling,
                            enabled: false,
                        },
                    },
                    emptyBoardTime,
                    400,
                    false,
                    undefined,
                    [],
                ),
            ).resolves.toEqual({
                chartData: { datasets: [] },
                rangeOption: { IntervalType: '', IntervalValue: 0 },
            });
        });

        it('requests limited main raw data when main-chart sampling is disabled', async () => {
            // Confirms main raw mode sends the query row limit without database sampling.
            fetchRawDataMock.mockResolvedValue({
                data: {
                    rows: [
                        [10, 1],
                        [20, 2],
                    ],
                },
            });

            await expect(
                loadPanelChartState(
                    {
                        ...basePanelData,
                        tag_set: [
                            createTagAnalyzerSeriesConfigFixture({
                                calculationMode: 'AVG',
                                useRollupTable: false,
                                sourceColumns: {
                                    value: 'value_col',

                                    name: undefined,
                                    time: undefined,
                                },

                                name: undefined,
                                time: undefined,
                            }),
                        ],
                    },
                    basePanelInfo.time,
                    {
                        ...basePanelInfo.axes,
                        sampling: {
                            ...basePanelInfo.axes.sampling,
                            enabled: false,
                        },
                    },
                    emptyBoardTime,
                    300,
                    true,
                    undefined,
                    [],
                ),
            ).resolves.toEqual({
                chartData: {
                    datasets: [
                        {
                            name: 'temp_sensor(raw)',
                            data: [
                                [10, 1],
                                [20, 2],
                            ],
                            yAxis: 0,
                            marker: { symbol: 'circle', lineColor: undefined, lineWidth: 1 },
                            color: '#ff0000',
                        },
                    ],
                },
                rangeOption: { IntervalType: 'sec', IntervalValue: 1 },
            });
            expect(fetchRawDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    Count: 3,
                    sampling: { kind: 'disabled' },
                }),
            );
        });

        it('keeps navigation sampling separate from the limited main raw fetch', async () => {
            // Confirms navigator sampling does not enable main raw chart database sampling.
            fetchRawDataMock.mockResolvedValue({
                data: {
                    rows: [
                        [10, 1],
                        [20, 2],
                    ],
                },
            });

            await expect(
                loadPanelChartState(
                    {
                        ...basePanelData,
                        tag_set: [
                            createTagAnalyzerSeriesConfigFixture({
                                calculationMode: 'AVG',
                                useRollupTable: false,
                                sourceColumns: {
                                    value: 'value_col',
                                    name: undefined,
                                    time: undefined,
                                },
                                name: undefined,
                                time: undefined,
                            }),
                        ],
                    },
                    basePanelInfo.time,
                    basePanelInfo.axes,
                    emptyBoardTime,
                    300,
                    true,
                    undefined,
                    [],
                ),
            ).resolves.toEqual({
                chartData: {
                    datasets: [
                        expect.objectContaining({
                            name: 'temp_sensor(raw)',
                            data: [
                                [10, 1],
                                [20, 2],
                            ],
                        }),
                    ],
                },
                rangeOption: { IntervalType: 'sec', IntervalValue: 1 },
            });
            expect(fetchRawDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    Count: 3,
                    sampling: { kind: 'disabled' },
                }),
            );
        });

        it('uses editor sample_count when main chart raw sampling is enabled', async () => {
            // Confirms the main raw chart has its own database sampling control.
            fetchRawDataMock.mockResolvedValue({
                data: {
                    rows: [
                        [10, 1],
                        [20, 2],
                    ],
                },
            });

            await expect(
                loadPanelChartState(
                    {
                        ...basePanelData,
                        tag_set: [
                            createTagAnalyzerSeriesConfigFixture({
                                calculationMode: 'AVG',
                                useRollupTable: false,
                                sourceColumns: {
                                    value: 'value_col',
                                    name: undefined,
                                    time: undefined,
                                },
                                name: undefined,
                                time: undefined,
                            }),
                        ],
                    },
                    basePanelInfo.time,
                    {
                        ...basePanelInfo.axes,
                        main_chart_sampling: {
                            enabled: true,
                            sample_count: 7,
                        },
                    },
                    emptyBoardTime,
                    300,
                    true,
                    undefined,
                    [],
                ),
            ).resolves.toEqual({
                chartData: {
                    datasets: [
                        expect.objectContaining({
                            name: 'temp_sensor(raw)',
                        }),
                    ],
                },
                rangeOption: { IntervalType: 'sec', IntervalValue: 1 },
            });
            expect(fetchRawDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    Count: 3,
                    sampling: { kind: 'enabled', value: 7 },
                }),
            );
        });

        it('uses editor sample_count when navigator raw sampling is enabled', async () => {
            // Confirms navigator raw sampling sends the editor sample_count value to the repository.
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
                loadPanelChartState(
                    {
                        ...basePanelData,
                        tag_set: [
                            createTagAnalyzerSeriesConfigFixture({
                                calculationMode: 'AVG',
                                useRollupTable: false,
                                sourceColumns: {
                                    value: 'value_col',
                                    name: undefined,
                                    time: undefined,
                                },
                                name: undefined,
                                time: undefined,
                            }),
                        ],
                    },
                    basePanelInfo.time,
                    basePanelInfo.axes,
                    emptyBoardTime,
                    300,
                    true,
                    undefined,
                    [],
                    'navigator',
                ),
            ).resolves.toEqual({
                chartData: {
                    datasets: [
                        expect.objectContaining({
                            name: 'temp_sensor(raw)',
                            data: [
                                [10, 1],
                                [20, 2],
                                [30, 3],
                            ],
                        }),
                    ],
                },
                rangeOption: { IntervalType: 'sec', IntervalValue: 1 },
            });
            expect(fetchRawDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    Count: 3,
                    sampling: { kind: 'enabled', value: 9 },
                }),
            );
        });

        it('falls navigator raw data back to calculated data when navigation sampling is disabled', async () => {
            // Confirms raw mode without navigation sampling leaves navigator on the calculated path.
            fetchCalculationDataMock.mockResolvedValue({
                data: {
                    rows: [
                        [10, 1],
                        [20, 2],
                    ],
                },
            });

            await expect(
                loadPanelChartState(
                    {
                        ...basePanelData,
                        tag_set: [
                            createTagAnalyzerSeriesConfigFixture({
                                calculationMode: 'AVG',
                                useRollupTable: false,
                                sourceColumns: {
                                    value: 'value_col',
                                    name: undefined,
                                    time: undefined,
                                },
                                name: undefined,
                                time: undefined,
                            }),
                        ],
                    },
                    basePanelInfo.time,
                    {
                        ...basePanelInfo.axes,
                        sampling: {
                            ...basePanelInfo.axes.sampling,
                            enabled: false,
                        },
                    },
                    emptyBoardTime,
                    300,
                    true,
                    undefined,
                    [],
                    'navigator',
                ),
            ).resolves.toEqual({
                chartData: {
                    datasets: [
                        expect.objectContaining({
                            name: 'temp_sensor(avg)',
                            data: [
                                [10, 1],
                                [20, 2],
                            ],
                        }),
                    ],
                },
                rangeOption: { IntervalType: 'sec', IntervalValue: 1 },
            });
            expect(fetchRawDataMock).not.toHaveBeenCalled();
            expect(fetchCalculationDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    Count: 3,
                }),
            );
        });

        it('returns an empty chart state when the requested range is unresolved', async () => {
            await expect(
                loadPanelChartState(
                    {
                        ...basePanelData,
                        tag_set: [createTagItem(undefined)],
                    },
                    createTagAnalyzerPanelTimeFixture({
                        range_bgn: 0,
                        range_end: 0,
                        default_range: { min: 0, max: 0 },
                    }),
                    baseAxes,
                    emptyBoardTime,
                    300,
                    false,
                    undefined,
                    [],
                ),
            ).resolves.toEqual({
                chartData: { datasets: [] },
                rangeOption: { IntervalType: '', IntervalValue: 0 },
            });

            expect(fetchCalculationDataMock).not.toHaveBeenCalled();
            expect(fetchRawDataMock).not.toHaveBeenCalled();
        });
    });
});

