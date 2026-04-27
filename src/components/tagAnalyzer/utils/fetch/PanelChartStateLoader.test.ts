import {
    buildChartSeriesItem,
    mapRowsToChartData,
} from './parsing/ChartSeriesMapper';
import {
    fetchCalculatedSeriesRows,
    fetchRawSeriesRows,
} from './ChartSeriesRowsLoader';
import { tagAnalyzerDataApi } from './TagAnalyzerDataRepository';
import {
    loadNavigatorChartState,
    loadPanelChartState,
} from './PanelChartStateLoader';
import {
    fetchPanelDatasets,
} from './PanelChartDatasetFetcher';
import {
    isFetchableTimeRange,
    resolvePanelFetchInterval,
    resolvePanelFetchTimeRange,
} from './PanelChartFetchPolicy';
import {
    analyzePanelDataLimit,
} from './PanelChartOverflowPolicy';
import { isRollup } from '@/utils';
import {
    createTagAnalyzerFetchSeriesConfigFixture as createTagItem,
    createTagAnalyzerPanelAxesFixture,
    createTagAnalyzerPanelDataFixture,
    createTagAnalyzerPanelTimeFixture,
    createTagAnalyzerSeriesConfigFixture,
} from '../../TestData/PanelTestData';
import { normalizeLegacyTimeRangeBoundary } from '../legacy/LegacyTimeAdapter';
import type { PanelAxes, PanelData, PanelTime } from '../panelModelTypes';
import type { PanelSeriesConfig } from '../series/PanelSeriesTypes';

jest.mock('@/utils', () => ({
    ...jest.requireActual('@/utils'),
    isRollup: jest.fn(),
}));

const fetchCalculationDataMock = jest.spyOn(tagAnalyzerDataApi, 'fetchCalculationData');
const fetchRawDataMock = jest.spyOn(tagAnalyzerDataApi, 'fetchRawData');
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
    interval_type: 'sec',
});

const basePanelInfo = {
    data: basePanelData,
    time: basePanelTime,
    axes: baseAxes,
};
const emptyBoardTime = { kind: 'empty' as const };

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

    describe('buildChartSeriesItem', () => {
        const tagItem = {
            ...createTagAnalyzerSeriesConfigFixture({
                calculationMode: 'AVG',
                useSecondaryAxis: true,
            }),
        } as PanelSeriesConfig;

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
            left_y_axis: {
                zero_base: false,
                show_tickline: true,
                value_range: { min: 0, max: 0 },
                raw_data_value_range: { min: 0, max: 0 },
                upper_control_limit: { enabled: false, value: 0 },
                lower_control_limit: { enabled: false, value: 0 },
            },
            right_y_axis: {
                enabled: false,
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
                    { ...basePanelData, interval_type: 'sec' },
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
                fetchPanelDatasets(
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
                    true,
                    undefined,
                ),
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
                interval: { IntervalType: 'sec', IntervalValue: 1 },
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
                IntervalValue: 1,
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

            const sFetchPromise = fetchPanelDatasets(
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
                false,
                undefined,
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
                fetchPanelDatasets(
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
                    false,
                    undefined,
                ),
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
                interval: { IntervalType: 'sec', IntervalValue: 1 },
                count: 3,
                hasDataLimit: true,
                limitEnd: 20,
            });

            expect(fetchRawDataMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    Table: expect.stringMatching(/\.TABLE_A$/),
                    TagNames: 'temp_sensor',
                    Count: 3,
                    sampling: { kind: 'enabled', value: 9 },
                }),
            );
        });

        it('skips repository fetches when the resolved range is still unresolved', async () => {
            await expect(
                fetchPanelDatasets(
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
                    true,
                    undefined,
                ),
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
                    { IntervalType: 'sec', IntervalValue: 5 },
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
                    { IntervalType: 'sec', IntervalValue: 5 },
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
                    { IntervalType: 'sec', IntervalValue: 5 },
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
                    { IntervalType: 'sec', IntervalValue: 5 },
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

    describe('loadNavigatorChartState', () => {
        it('returns an empty dataset set when there are no tags to fetch', async () => {
            // Confirms navigator fetches short-circuit cleanly when the panel has no tags.
            await expect(
                loadNavigatorChartState(
                    basePanelInfo.data,
                    basePanelInfo.time,
                    basePanelInfo.axes,
                    emptyBoardTime,
                    400,
                    false,
                    undefined,
                    [],
                ),
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
                loadNavigatorChartState(
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
                    400,
                    false,
                    undefined,
                    [],
                ),
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
                loadPanelChartState(
                    basePanelInfo.data,
                    basePanelInfo.time,
                    basePanelInfo.axes,
                    emptyBoardTime,
                    400,
                    false,
                    undefined,
                    [],
                ),
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
                rangeOption: { IntervalType: 'sec', IntervalValue: 1 },
                overflowRange: { startTime: 10, endTime: 20 },
            });
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
                overflowRange: undefined,
            });

            expect(fetchCalculationDataMock).not.toHaveBeenCalled();
            expect(fetchRawDataMock).not.toHaveBeenCalled();
        });
    });
});
