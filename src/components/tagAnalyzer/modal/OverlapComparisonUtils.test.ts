import {
    alignOverlapTime,
    buildOverlapLoadState,
    mapOverlapRows,
    resolveOverlapTimeRange,
    shiftOverlapPanels,
} from './OverlapComparisonUtils';
import { createOverlapPanelInfoFixture } from '../TestData/PanelTestData';
import type { ChartSeriesItem } from '../utils/series/seriesTypes';

describe('OverlapComparisonUtils', () => {
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

    describe('resolveOverlapTimeRange', () => {
        it('builds the panel-specific fetch window from the anchor duration', () => {
            expect(
                resolveOverlapTimeRange(createOverlapPanelInfoFixture(undefined), 4_000),
            ).toEqual({
                startTime: 1_000,
                endTime: 5_000,
            });
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

    describe('shiftOverlapPanels', () => {
        it('shifts only the targeted overlap panel start time', () => {
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
            expect(
                buildOverlapLoadState([
                    {
                        startTime: 100,
                        chartSeries: {
                            name: 'Series A',
                            data: [[0, 1]],
                            yAxis: 0,

                            marker: undefined,
                            color: undefined,
                        } as ChartSeriesItem,
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

                            marker: undefined,
                            color: undefined,
                        } as ChartSeriesItem,
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
