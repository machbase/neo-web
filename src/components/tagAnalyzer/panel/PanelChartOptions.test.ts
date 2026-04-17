import {
    buildOverlapChartOption,
    buildPanelChartOption,
    PANEL_CHART_HEIGHT,
    extractBrushRange,
    extractDataZoomRange,
    getPanelChartLayoutMetrics,
} from './PanelChartOptions';
import { createPanelChartLayoutOptionFixture } from '../TestData/PanelEChartTestData';
import {
    createTagAnalyzerChartSeriesItemFixture,
    createTagAnalyzerPanelAxesFixture,
    createTagAnalyzerPanelDisplayFixture,
    createTagAnalyzerTimeRangeFixture,
} from '../TestData/PanelTestData';

describe('PanelChartOptions', () => {
    describe('buildPanelChartOption', () => {
        it('keeps the main plot grid above the slider lane when the legend is visible', () => {
            // Confirms the main plot panel keeps real vertical separation from the bottom slider lane.
            const sOption = createPanelChartLayoutOptionFixture(true);
            const sMainGrid = (sOption.grid as Array<{ top: number; height: number }>)[0];
            const sDataZoom = sOption.dataZoom as Array<{ bottom: number; height: number }>;
            const sSlider = sDataZoom[1];
            const sSliderTop = PANEL_CHART_HEIGHT - sSlider.bottom - sSlider.height;

            expect(sMainGrid.top + sMainGrid.height).toBeLessThan(sSliderTop);
        });

        it('keeps the main plot grid above the slider lane without a legend too', () => {
            // Confirms the same spacing rule holds when the legend row is hidden.
            const sOption = createPanelChartLayoutOptionFixture(false);
            const sMainGrid = (sOption.grid as Array<{ top: number; height: number }>)[0];
            const sDataZoom = sOption.dataZoom as Array<{ bottom: number; height: number }>;
            const sSlider = sDataZoom[1];
            const sSliderTop = PANEL_CHART_HEIGHT - sSlider.bottom - sSlider.height;

            expect(sMainGrid.top + sMainGrid.height).toBeLessThan(sSliderTop);
        });

        it('leaves the live zoom window out of the option so PanelChart can sync it imperatively', () => {
            // Confirms the current panel range is no longer baked into structural option state.
            const sOption = createPanelChartLayoutOptionFixture(true);
            const sDataZoom = sOption.dataZoom as Array<Record<string, unknown>>;

            expect(sDataZoom[0]).not.toHaveProperty('startValue');
            expect(sDataZoom[0]).not.toHaveProperty('endValue');
            expect(sDataZoom[1]).not.toHaveProperty('startValue');
            expect(sDataZoom[1]).not.toHaveProperty('endValue');
        });

        it('reserves a dedicated toolbar lane between the main plot and slider', () => {
            // Confirms the footer controls can sit between the plot and slider without overlap.
            const sLayout = getPanelChartLayoutMetrics(true);

            expect(sLayout.mainGridTop + sLayout.mainGridHeight).toBeLessThan(sLayout.toolbarTop);
            expect(sLayout.toolbarTop).toBeLessThan(sLayout.sliderTop);
        });

        it('mirrors the main series into a dedicated navigator lane under the slider', () => {
            // Confirms the slider now sits over real mirrored series instead of the default data shadow alone.
            const sOption = createPanelChartLayoutOptionFixture(true);
            const sDataZoom = sOption.dataZoom as Array<{
                showDataShadow: boolean | undefined;
                xAxisIndex: number[] | undefined;
                realtime: boolean | undefined;
            }>;

            expect(Array.isArray(sOption.grid)).toBe(true);
            expect(sOption.grid as unknown[]).toHaveLength(2);
            expect(Array.isArray(sOption.xAxis)).toBe(true);
            expect(sOption.xAxis as unknown[]).toHaveLength(2);
            expect(Array.isArray(sOption.series)).toBe(true);
            expect(
                (sOption.series as Array<{ id: string | undefined }>).some((aSeries) =>
                    aSeries.id?.startsWith('navigator-series-'),
                ),
            ).toBe(true);
            expect(sDataZoom[1].showDataShadow).toBe(false);
            expect(sDataZoom[1].realtime).toBe(false);
            expect(sDataZoom[1].xAxisIndex).toEqual([0]);
            expect(sDataZoom[0].xAxisIndex).toEqual([0]);
        });

        it('keeps tooltip rows focused on main series when navigator mirrors are present', () => {
            // Confirms navigator-series rows do not duplicate tooltip content from the main plot.
            const sOption = createPanelChartLayoutOptionFixture(true);
            const sTooltip = sOption.tooltip as unknown as {
                formatter: (aParams: Array<Record<string, unknown>>) => string;
            };
            const sFormatter = sTooltip.formatter;
            const sTooltipHtml = sFormatter([
                {
                    seriesId: 'navigator-series-0',
                    seriesName: 'temp(avg) navigator',
                    value: [0, 11],
                    color: '#888888',
                },
                {
                    seriesId: 'main-series-0',
                    seriesName: 'temp(avg)',
                    value: [0, 22],
                    color: '#ffffff',
                },
            ]);

            expect(sTooltipHtml).toContain('temp(avg)');
            expect(sTooltipHtml).toContain('22');
            expect(sTooltipHtml).toContain('temp(avg) : 22');
            expect(sTooltipHtml).not.toContain('temp(avg) navigator');
            expect(sTooltipHtml).not.toContain('11');
        });

        it('keeps hover markers out of the navigator lane', () => {
            // Confirms the lower overview stays visual-only while hover feedback belongs to the main plot.
            const sOption = createPanelChartLayoutOptionFixture(true);
            const sXAxis = sOption.xAxis as Array<{
                axisPointer: { show: boolean | undefined } | undefined;
            }>;
            const sSeries = sOption.series as Array<{
                id: string | undefined;
                tooltip: { show: boolean | undefined } | undefined;
            }>;

            expect(sOption.axisPointer).toBeUndefined();
            expect(sXAxis[1].axisPointer?.show).toBe(false);
            expect(
                sSeries
                    .filter((aSeries) => aSeries.id?.startsWith('navigator-series-'))
                    .every((aSeries) => aSeries.tooltip?.show === false),
            ).toBe(true);
        });

        it('turns off built-in legend hover linking for Tag Analyzer series', () => {
            // Confirms Tag Analyzer owns legend hover styling instead of relying on ECharts highlight actions.
            const sOption = createPanelChartLayoutOptionFixture(true);
            const sSeries = sOption.series as Array<{
                id: string | undefined;
                legendHoverLink: boolean | undefined;
            }>;

            expect(sSeries.length).toBeGreaterThan(0);
            expect(sSeries.every((aSeries) => aSeries.legendHoverLink === false)).toBe(true);
        });

        it('does not isolate a hovered main series from the rest of the chart', () => {
            // Confirms direct line hover stays axis-driven instead of forcing ECharts series-focus mode.
            const sOption = createPanelChartLayoutOptionFixture(true);
            const sSeries = sOption.series as Array<{
                id: string | undefined;
                emphasis: { focus: string | undefined } | undefined;
            }>;
            const sMainSeries = sSeries.filter((aSeries) => aSeries.id?.startsWith('main-series-'));

            expect(sMainSeries.length).toBeGreaterThan(0);
            expect(sMainSeries.every((aSeries) => aSeries.emphasis?.focus === undefined)).toBe(true);
        });

        it('fades non-hovered series while a legend item is hovered', () => {
            // Confirms legend hover can isolate one series visually without permanently hiding the others.
            const sOption = buildPanelChartOption(
                [
                    createTagAnalyzerChartSeriesItemFixture({
                        name: 'temp(avg)',
                        color: '#ffffff',
                        data: [
                            [100, 11],
                            [200, 15],
                        ],
                    }),
                    createTagAnalyzerChartSeriesItemFixture({
                        name: 'pressure(avg)',
                        color: '#44aad5',
                        data: [
                            [100, 7],
                            [200, 9],
                        ],
                    }),
                ],
                createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
                createTagAnalyzerPanelAxesFixture(),
                createTagAnalyzerPanelDisplayFixture({
                    fill: 0.2,
                }),
                false,
                false,
                { 'temp(avg)': true, 'pressure(avg)': true },
                undefined,
                'temp(avg)',
            );
            const sSeries = sOption.series as Array<{
                id: string | undefined;
                name: string | undefined;
                lineStyle:
                    | {
                          opacity: number | undefined;
                          width: number | undefined;
                      }
                    | undefined;
                areaStyle:
                    | {
                          opacity: number | undefined;
                      }
                    | undefined;
            }>;
            const sHoveredMainSeries = sSeries.find((aSeries) => aSeries.id === 'main-series-0');
            const sDimmedMainSeries = sSeries.find((aSeries) => aSeries.id === 'main-series-1');
            const sHoveredNavigatorSeries = sSeries.find(
                (aSeries) => aSeries.id === 'navigator-series-0',
            );
            const sDimmedNavigatorSeries = sSeries.find(
                (aSeries) => aSeries.id === 'navigator-series-1',
            );

            expect(sHoveredMainSeries?.lineStyle?.opacity).toBe(1);
            expect(sHoveredMainSeries?.lineStyle?.width).toBeGreaterThan(
                sDimmedMainSeries?.lineStyle?.width ?? 0,
            );
            expect(sDimmedMainSeries?.lineStyle?.opacity).toBeLessThan(0.2);
            expect(sDimmedMainSeries?.areaStyle?.opacity).toBeLessThan(0.1);
            expect(sHoveredNavigatorSeries?.lineStyle?.opacity).toBeGreaterThan(
                sDimmedNavigatorSeries?.lineStyle?.opacity ?? 0,
            );
        });

        it('keeps a visible hover marker on the main chart even when regular points are hidden', () => {
            // Confirms tooltip hover still has a non-zero circle marker after navigator hover feedback was removed.
            const sOption = buildPanelChartOption(
                [
                    createTagAnalyzerChartSeriesItemFixture({
                        data: [
                            [100, 11],
                            [200, 15],
                        ],
                    }),
                ],
                createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
                createTagAnalyzerPanelAxesFixture(),
                createTagAnalyzerPanelDisplayFixture({
                    show_point: false,
                    point_radius: 0,
                }),
                false,
                false,
                { 'temp(avg)': true },
            );
            const sSeries = sOption.series as Array<{
                id: string | undefined;
                showSymbol: boolean | undefined;
                symbolSize: number | undefined;
            }>;
            const sMainSeries = sSeries.find((aSeries) => aSeries.id?.startsWith('main-series-'));

            expect(sMainSeries?.showSymbol).toBe(false);
            expect(sMainSeries?.symbolSize).toBeGreaterThan(0);
        });

        it('rounds the auto y-axis max up to a cleaner ceiling', () => {
            // Confirms auto-sized y-axes leave headroom instead of stopping at the raw data max.
            const sOption = buildPanelChartOption(
                [
                    createTagAnalyzerChartSeriesItemFixture({
                        data: [
                            [100, 11],
                            [200, 15],
                        ],
                    }),
                ],
                createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
                createTagAnalyzerPanelAxesFixture({ zero_base: true }),
                createTagAnalyzerPanelDisplayFixture(),
                false,
                false,
                { 'temp(avg)': true },
            );
            const sYAxis = sOption.yAxis as Array<{ max: number | undefined }>;

            expect(sYAxis[0].max).toBe(20);
        });

        it('keeps a custom y-axis max unchanged', () => {
            // Confirms explicit panel limits still win over the auto round-up behavior.
            const sOption = buildPanelChartOption(
                [
                    createTagAnalyzerChartSeriesItemFixture({
                        data: [
                            [100, 11],
                            [200, 15],
                        ],
                    }),
                ],
                createTagAnalyzerTimeRangeFixture({ startTime: 100, endTime: 200 }),
                createTagAnalyzerPanelAxesFixture({
                    primaryRange: { min: 0, max: 18 },
                }),
                createTagAnalyzerPanelDisplayFixture(),
                false,
                false,
                { 'temp(avg)': true },
            );
            const sYAxis = sOption.yAxis as Array<{ max: number | undefined }>;

            expect(sYAxis[0].max).toBe(18);
        });
    });

    describe('buildOverlapChartOption', () => {
        it('rounds overlap chart max up to the same clean ceiling', () => {
            // Confirms the overlap modal shares the same rounded auto max behavior.
            const sOption = buildOverlapChartOption(
                [
                    createTagAnalyzerChartSeriesItemFixture({
                        data: [
                            [0, 10],
                            [1_000, 15],
                        ],
                    }),
                ],
                [0],
                true,
            );
            const sYAxis = sOption.yAxis as { max: number | undefined };

            expect(sYAxis.max).toBe(20);
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

                        start: undefined,
                        end: undefined,
                        batch: undefined,
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

                        startValue: undefined,
                        endValue: undefined,
                        batch: undefined,
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
                    {
                        startValue: undefined,
                        endValue: undefined,
                        start: undefined,
                        end: undefined,
                        batch: undefined,
                    },
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

                            range: undefined,
                        },
                    ],

                    batch: undefined,
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

                                    coordRange: undefined,
                                },
                            ],
                        },
                    ],

                    areas: undefined,
                }),
            ).toEqual({
                startTime: 50,
                endTime: 76,
            });
        });

        it('returns undefined when the brush payload has no usable range', () => {
            // Confirms empty brush payloads are ignored instead of producing a fake range.
            expect(extractBrushRange({ areas: [], batch: undefined })).toBeUndefined();
        });
    });
});
