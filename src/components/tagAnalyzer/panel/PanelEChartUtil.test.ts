import { PANEL_CHART_HEIGHT, buildPanelChartOption, extractBrushRange, extractDataZoomRange } from './PanelEChartUtil';

const createChartLayoutOption = (aShowLegend: 'Y' | 'N') =>
    buildPanelChartOption({
        chartData: [
            {
                name: 'temp(avg)',
                data: [[100, 1]],
                yAxis: 0,
                color: '#ff0000',
            },
        ],
        navigatorData: {
            datasets: [
                {
                    name: 'temp(avg)',
                    data: [[100, 1]],
                    yAxis: 0,
                    marker: { symbol: 'circle', lineColor: null, lineWidth: 1 },
                    color: '#ff0000',
                },
            ],
        } as any,
        panelRange: { startTime: 100, endTime: 200 },
        navigatorRange: { startTime: 0, endTime: 1_000 },
        axes: {
            show_x_tickline: 'Y',
            pixels_per_tick_raw: 100,
            pixels_per_tick: 100,
            use_sampling: true,
            sampling_value: 9,
            zero_base: 'N',
            show_y_tickline: 'Y',
            custom_min: 0,
            custom_max: 0,
            custom_drilldown_min: 0,
            custom_drilldown_max: 0,
            use_ucl: 'N',
            ucl_value: 0,
            use_lcl: 'N',
            lcl_value: 0,
            use_right_y2: 'Y',
            zero_base2: 'N',
            show_y_tickline2: 'N',
            custom_min2: 0,
            custom_max2: 0,
            custom_drilldown_min2: 0,
            custom_drilldown_max2: 0,
            use_ucl2: 'N',
            ucl2_value: 0,
            use_lcl2: 'N',
            lcl2_value: 0,
        },
        display: {
            show_legend: aShowLegend,
            use_zoom: 'Y',
            chart_type: 'Line',
            show_point: 'Y',
            point_radius: 2,
            fill: 0,
            stroke: 2,
        } as any,
        isRaw: false,
        useNormalize: 'N',
        visibleSeries: { 'temp(avg)': true },
    });

describe('PanelEChartUtil', () => {
    describe('buildPanelChartOption', () => {
        it('keeps the main plot grid above the navigator grid when the legend is visible', () => {
            const sOption = createChartLayoutOption('Y');
            const sMainGrid = sOption.grid[0] as { top: number; height: number };
            const sNavigatorGrid = sOption.grid[1] as { bottom: number; height: number };
            const sNavigatorTop = PANEL_CHART_HEIGHT - sNavigatorGrid.bottom - sNavigatorGrid.height;

            expect(sMainGrid.top + sMainGrid.height).toBeLessThan(sNavigatorTop);
        });

        it('keeps the main plot grid above the navigator grid without a legend too', () => {
            const sOption = createChartLayoutOption('N');
            const sMainGrid = sOption.grid[0] as { top: number; height: number };
            const sNavigatorGrid = sOption.grid[1] as { bottom: number; height: number };
            const sNavigatorTop = PANEL_CHART_HEIGHT - sNavigatorGrid.bottom - sNavigatorGrid.height;

            expect(sMainGrid.top + sMainGrid.height).toBeLessThan(sNavigatorTop);
        });
    });

    describe('extractDataZoomRange', () => {
        it('prefers explicit axis values when they are present', () => {
            expect(
                extractDataZoomRange(
                    {
                        startValue: 1_000,
                        endValue: 2_000,
                    },
                    { startTime: 100, endTime: 200 },
                    { startTime: 0, endTime: 10_000 },
                ),
            ).toEqual({
                startTime: 1_000,
                endTime: 2_000,
            });
        });

        it('converts percentage payloads against the navigator axis range', () => {
            expect(
                extractDataZoomRange(
                    {
                        start: 25,
                        end: 75,
                    },
                    { startTime: 2_000, endTime: 3_000 },
                    { startTime: 0, endTime: 10_000 },
                ),
            ).toEqual({
                startTime: 2_500,
                endTime: 7_500,
            });
        });

        it('falls back to the current panel range when the payload is incomplete', () => {
            expect(
                extractDataZoomRange(
                    {},
                    { startTime: 2_000, endTime: 3_000 },
                    { startTime: 0, endTime: 10_000 },
                ),
            ).toEqual({
                startTime: 2_000,
                endTime: 3_000,
            });
        });
    });

    describe('extractBrushRange', () => {
        it('reads the first coordinate range from a direct areas payload', () => {
            expect(
                extractBrushRange({
                    areas: [
                        {
                            coordRange: [100.2, 199.8],
                        },
                    ],
                }),
            ).toEqual({
                startTime: 100,
                endTime: 200,
            });
        });

        it('reads the first coordinate range from a batched brush payload', () => {
            expect(
                extractBrushRange({
                    batch: [
                        {
                            areas: [
                                {
                                    range: [50.1, 75.1],
                                },
                            ],
                        },
                    ],
                }),
            ).toEqual({
                startTime: 50,
                endTime: 76,
            });
        });

        it('returns undefined when the brush payload has no usable range', () => {
            expect(extractBrushRange({ areas: [] })).toBeUndefined();
        });
    });
});
