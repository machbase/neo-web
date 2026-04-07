import {
    analyzePanelDataLimit,
    buildChartSeriesItem,
    getSeriesName,
    mapRowsToChartData,
    normalizeChartWidth,
    resolvePanelFetchInterval,
} from './PanelFetchUtils';

describe('PanelFetchUtils', () => {
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
});
