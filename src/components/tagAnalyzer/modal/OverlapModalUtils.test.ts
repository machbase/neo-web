import {
    alignOverlapTime,
    buildOverlapLoadState,
    buildOverlapChartSeries,
    buildOverlapSeriesName,
    calculateOverlapSampleCount,
    mapOverlapRows,
    resolveOverlapTimeRange,
    shiftOverlapPanels,
} from './OverlapModalUtils';
import { createOverlapPanelInfoFixture } from '../TestData/PanelTestData';
import type { TagAnalyzerChartSeriesItem, TagAnalyzerTagItem } from '../panel/TagAnalyzerPanelModelTypes';

describe('OverlapModalUtils', () => {
    describe('alignOverlapTime', () => {
        it('aligns timestamps by the resolved interval', () => {
            expect(
                alignOverlapTime(12_345, {
                    IntervalType: 'sec',
                    IntervalValue: 5,
                }),
            ).toBe(10_000);
        });

        it('falls back to the original time when the interval is invalid', () => {
            expect(
                alignOverlapTime(12_345, {
                    IntervalType: 'unknown',
                    IntervalValue: 1,
                }),
            ).toBe(12_345);
        });
    });

    describe('calculateOverlapSampleCount', () => {
        it('disables count limiting when the panel already has a stored limit', () => {
            expect(calculateOverlapSampleCount(50, createOverlapPanelInfoFixture(), 300)).toBe(-1);
        });

        it('uses raw pixel density for raw overlap panels', () => {
            expect(calculateOverlapSampleCount(-1, createOverlapPanelInfoFixture({ isRaw: true }), 300)).toBe(30);
        });

        it('uses the chart width directly when pixels-per-tick is not configured', () => {
            expect(
                calculateOverlapSampleCount(
                    -1,
                    createOverlapPanelInfoFixture({
                        board: {
                            axes: {
                                pixels_per_tick: 0,
                                pixels_per_tick_raw: 0,
                            },
                        },
                    }),
                    123.2,
                ),
            ).toBe(124);
        });
    });

    describe('resolveOverlapTimeRange', () => {
        it('builds the panel-specific fetch window from the anchor duration', () => {
            expect(resolveOverlapTimeRange(createOverlapPanelInfoFixture(), 4_000)).toEqual({
                startTime: 1_000,
                endTime: 5_000,
            });
        });
    });

    describe('buildOverlapSeriesName', () => {
        it('prefers the alias when one exists', () => {
            // Confirms aliases win over the generated overlap-series label.
            expect(
                buildOverlapSeriesName(
                    {
                        alias: 'Friendly',
                        sourceTagName: 'TEMP',
                        calculationMode: 'AVG',
                    } as TagAnalyzerTagItem,
                    false,
                ),
            ).toBe('Friendly');
        });

        it('falls back to tag and mode text when alias is empty', () => {
            // Confirms overlap labels fall back to the source tag plus calculation mode.
            expect(
                buildOverlapSeriesName(
                    {
                        alias: '',
                        sourceTagName: 'TEMP',
                        calculationMode: 'AVG',
                    } as TagAnalyzerTagItem,
                    false,
                ),
            ).toBe('TEMP(avg)');
        });
    });

    describe('mapOverlapRows', () => {
        it('normalizes timestamps relative to the series start', () => {
            expect(
                mapOverlapRows(
                    [
                        [1_500, 10],
                        [1_700, 12],
                    ],
                    1_000,
                ),
            ).toEqual([
                [500, 10],
                [700, 12],
            ]);
        });

        it('returns an empty list when there are no rows', () => {
            expect(mapOverlapRows(undefined, 1_000)).toEqual([]);
        });
    });

    describe('buildOverlapChartSeries', () => {
        it('creates the overlap-series shape used by the chart', () => {
            // Confirms overlap fetch results are converted into the shared chart-series structure.
            expect(
                buildOverlapChartSeries(
                    {
                        alias: '',
                        sourceTagName: 'TEMP',
                        calculationMode: 'AVG',
                        use_y2: 'Y',
                    } as TagAnalyzerTagItem,
                    [
                        [1_500, 10],
                        [1_700, 12],
                    ],
                    1_000,
                    false,
                ),
            ).toEqual({
                name: 'TEMP(avg)',
                data: [
                    [500, 10],
                    [700, 12],
                ],
                yAxis: 1,
                marker: {
                    symbol: 'circle',
                    lineColor: null,
                    lineWidth: 1,
                },
            });
        });
    });

    describe('shiftOverlapPanels', () => {
        it('shifts only the targeted overlap panel start time', () => {
            // Confirms overlap time shifting is a pure transformation over the selected panels.
            const sPanels = [
                createOverlapPanelInfoFixture({
                    board: {
                        meta: {
                            index_key: 'panel-1',
                        },
                    },
                }),
                createOverlapPanelInfoFixture({
                    start: 2_000,
                    board: {
                        meta: {
                            index_key: 'panel-2',
                        },
                    },
                }),
            ];

            expect(shiftOverlapPanels(sPanels, 'panel-2', '+', 250)).toEqual([
                sPanels[0],
                {
                    ...sPanels[1],
                    start: 2_250,
                },
            ]);
        });
    });

    describe('buildOverlapLoadState', () => {
        it('collects ordered start times and chart series from overlap load results', () => {
            // Confirms the overlap loader preserves result order while skipping empty entries.
            expect(
                buildOverlapLoadState([
                    {
                        startTime: 100,
                        chartSeries: {
                            name: 'Series A',
                            data: [[0, 1]],
                            yAxis: 0,
                        } as TagAnalyzerChartSeriesItem,
                    },
                    {
                        startTime: undefined,
                        chartSeries: undefined,
                    },
                    {
                        startTime: 300,
                        chartSeries: {
                            name: 'Series B',
                            data: [[0, 2]],
                            yAxis: 1,
                        } as TagAnalyzerChartSeriesItem,
                    },
                ]),
            ).toEqual({
                startTimes: [100, 300],
                chartSeries: [
                    {
                        name: 'Series A',
                        data: [[0, 1]],
                        yAxis: 0,
                    },
                    {
                        name: 'Series B',
                        data: [[0, 2]],
                        yAxis: 1,
                    },
                ],
            });
        });
    });
});
