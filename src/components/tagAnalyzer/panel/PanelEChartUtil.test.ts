import { PANEL_CHART_HEIGHT, buildPanelChartOption, extractBrushRange, extractDataZoomRange, getPanelChartLayoutMetrics } from './PanelEChartUtil';
import type { TagAnalyzerChartData, TagAnalyzerPanelAxes, TagAnalyzerPanelDisplay } from './TagAnalyzerPanelModelTypes';

/**
 * Builds a small chart option so layout assertions only exercise panel spacing logic.
 * @param aShowLegend Whether the legend row is enabled in the test layout.
 * @returns The chart option used by the layout-focused assertions.
 */
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
        } as TagAnalyzerChartData,
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
        } as TagAnalyzerPanelAxes,
        display: {
            show_legend: aShowLegend,
            use_zoom: 'Y',
            chart_type: 'Line',
            show_point: 'Y',
            point_radius: 2,
            fill: 0,
            stroke: 2,
        } as TagAnalyzerPanelDisplay,
        isRaw: false,
        useNormalize: 'N',
        visibleSeries: { 'temp(avg)': true },
    });

describe('PanelEChartUtil', () => {
    describe('buildPanelChartOption', () => {
        it('keeps the main plot grid above the navigator grid when the legend is visible', () => {
            // Confirms the main plot panel keeps real vertical separation from the navigator.
            const sOption = createChartLayoutOption('Y');
            const sMainGrid = sOption.grid[0] as { top: number; height: number };
            const sNavigatorGrid = sOption.grid[1] as { bottom: number; height: number };
            const sNavigatorTop = PANEL_CHART_HEIGHT - sNavigatorGrid.bottom - sNavigatorGrid.height;

            expect(sMainGrid.top + sMainGrid.height).toBeLessThan(sNavigatorTop);
        });

        it('keeps the main plot grid above the navigator grid without a legend too', () => {
            // Confirms the same spacing rule holds when the legend row is hidden.
            const sOption = createChartLayoutOption('N');
            const sMainGrid = sOption.grid[0] as { top: number; height: number };
            const sNavigatorGrid = sOption.grid[1] as { bottom: number; height: number };
            const sNavigatorTop = PANEL_CHART_HEIGHT - sNavigatorGrid.bottom - sNavigatorGrid.height;

            expect(sMainGrid.top + sMainGrid.height).toBeLessThan(sNavigatorTop);
        });

        it('leaves the live zoom window out of the option so PanelChart can sync it imperatively', () => {
            // Confirms the current panel range is no longer baked into structural option state.
            const sOption = createChartLayoutOption('Y');

            expect(sOption.dataZoom[0]).not.toHaveProperty('startValue');
            expect(sOption.dataZoom[0]).not.toHaveProperty('endValue');
            expect(sOption.dataZoom[1]).not.toHaveProperty('startValue');
            expect(sOption.dataZoom[1]).not.toHaveProperty('endValue');
        });

        it('reserves a dedicated toolbar lane between the main plot and navigator', () => {
            // Confirms the footer controls can sit between the two chart regions without overlap.
            const sLayout = getPanelChartLayoutMetrics('Y');

            expect(sLayout.mainGridTop + sLayout.mainGridHeight).toBeLessThan(sLayout.toolbarTop);
            expect(sLayout.toolbarTop).toBeLessThan(sLayout.navigatorTop);
        });
    });

    describe('extractDataZoomRange', () => {
        it('prefers explicit axis values when they are present', () => {
            // Confirms absolute slider values win over any derived percentage math.
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
            // Confirms percent-based zoom payloads are converted into concrete timestamps.
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
            // Confirms incomplete zoom payloads do not invent a new range.
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
            // Confirms direct brush events expose a usable coordRange window.
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
            // Confirms batched brush events use the same first-range extraction rule.
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
            // Confirms empty brush payloads are ignored instead of producing a fake range.
            expect(extractBrushRange({ areas: [] })).toBeUndefined();
        });
    });
});
