import {
    alignOverlapTime,
    buildOverlapChartSeries,
    buildOverlapSeriesName,
    calculateOverlapSampleCount,
    mapOverlapRows,
    resolveOverlapTimeRange,
} from './OverlapModalUtils';

describe('OverlapModalUtils', () => {
    const basePanelInfo = {
        start: 1_000,
        duration: 5_000,
        isRaw: false,
        board: {
            axes: {
                pixels_per_tick: 20,
                pixels_per_tick_raw: 10,
            },
        },
    } as any;

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
            expect(calculateOverlapSampleCount(50, basePanelInfo, 300)).toBe(-1);
        });

        it('uses raw pixel density for raw overlap panels', () => {
            expect(calculateOverlapSampleCount(-1, { ...basePanelInfo, isRaw: true }, 300)).toBe(30);
        });

        it('uses the chart width directly when pixels-per-tick is not configured', () => {
            expect(
                calculateOverlapSampleCount(
                    -1,
                    {
                        ...basePanelInfo,
                        board: {
                            axes: {
                                pixels_per_tick: 0,
                                pixels_per_tick_raw: 0,
                            },
                        },
                    },
                    123.2,
                ),
            ).toBe(124);
        });
    });

    describe('resolveOverlapTimeRange', () => {
        it('builds the panel-specific fetch window from the anchor duration', () => {
            expect(resolveOverlapTimeRange(basePanelInfo, 4_000)).toEqual({
                startTime: 1_000,
                endTime: 5_000,
            });
        });
    });

    describe('buildOverlapSeriesName', () => {
        it('prefers the alias when one exists', () => {
            expect(
                buildOverlapSeriesName(
                    {
                        alias: 'Friendly',
                        tagName: 'TEMP',
                        calculationMode: 'AVG',
                    } as any,
                    false,
                ),
            ).toBe('Friendly');
        });

        it('falls back to tag and mode text when alias is empty', () => {
            expect(
                buildOverlapSeriesName(
                    {
                        alias: '',
                        tagName: 'TEMP',
                        calculationMode: 'AVG',
                    } as any,
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
            expect(
                buildOverlapChartSeries({
                    tagItem: {
                        alias: '',
                        tagName: 'TEMP',
                        calculationMode: 'AVG',
                        use_y2: 'Y',
                    } as any,
                    rows: [
                        [1_500, 10],
                        [1_700, 12],
                    ],
                    seriesStartTime: 1_000,
                    isRaw: false,
                }),
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
});
