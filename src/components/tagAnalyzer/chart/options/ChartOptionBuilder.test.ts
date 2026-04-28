import type { PanelChartInfo } from '../ChartInfoTypes';
import { PANEL_CHART_HEIGHT } from './OptionBuildHelpers/ChartOptionConstants';
import { getChartLayoutMetrics } from './OptionBuildHelpers/PanelChartSectionOptionBuilder';
import { buildChartOption } from './ChartOptionBuilder';
import {
    extractBrushRange,
    extractDataZoomEventRange,
    extractDataZoomOptionRange,
} from '../chartInternal/ChartDataZoomUtils';
import { createPanelChartLayoutOptionFixture } from '../../TestData/PanelEChartTestData';
import {
    createTagAnalyzerChartSeriesDataFixture,
    createTagAnalyzerPanelAxesFixture,
    createTagAnalyzerPanelDisplayFixture,
    createTagAnalyzerPanelInfoFixture,
    createTagAnalyzerTimeRangeFixture,
} from '../../TestData/PanelTestData';
import type { EChartsOption } from 'echarts';
import type { ChartSeriesData } from '../../utils/series/PanelSeriesTypes';

const createTimeRange = (startTime: number, endTime: number) =>
    createTagAnalyzerTimeRangeFixture({ startTime, endTime });

const DEFAULT_RANGE = createTimeRange(100, 200);

function createChartSeries(
    overrides: Partial<ChartSeriesData> = {},
): ChartSeriesData {
    return createTagAnalyzerChartSeriesDataFixture({
        data: [
            [100, 11],
            [200, 15],
        ],
        ...overrides,
    });
}

function buildPanelOption({
    chartData = [createChartSeries()],
    seriesDefinitions = [],
    navigatorRange = DEFAULT_RANGE,
    axes = createTagAnalyzerPanelAxesFixture(),
    display = createTagAnalyzerPanelDisplayFixture(),
    isRaw = false,
    useNormalize = false,
    visibleSeries = { 'temp(avg)': true },
    navigatorSeriesData,
    hoveredLegendSeries,
    highlights = [],
}: {
    chartData?: ChartSeriesData[];
    seriesDefinitions?: ReturnType<typeof createTagAnalyzerPanelInfoFixture>['data']['tag_set'];
    navigatorRange?: ReturnType<typeof createTagAnalyzerTimeRangeFixture>;
    axes?: ReturnType<typeof createTagAnalyzerPanelAxesFixture>;
    display?: ReturnType<typeof createTagAnalyzerPanelDisplayFixture>;
    isRaw?: boolean;
    useNormalize?: boolean;
    visibleSeries?: Record<string, boolean>;
    navigatorSeriesData?: ChartSeriesData[];
    hoveredLegendSeries?: string;
    highlights?: ReturnType<typeof createTagAnalyzerPanelInfoFixture>['highlights'];
} = {}): EChartsOption {
    const chartInfo: PanelChartInfo = {
        mainSeriesData: chartData,
        seriesDefinitions: seriesDefinitions,
        navigatorRange: navigatorRange,
        axes: axes,
        display: display,
        isRaw: isRaw,
        useNormalize: useNormalize,
        visibleSeries: visibleSeries,
        navigatorSeriesData: navigatorSeriesData ?? chartData,
        hoveredLegendSeries: hoveredLegendSeries,
        highlights: highlights,
    };

    return buildChartOption(chartInfo);
}

function getLayoutOption(showLegend: boolean) {
    const option = createPanelChartLayoutOptionFixture(showLegend);
    const mainGrid = (option.grid as Array<{ top: number; height: number }>)[0];
    const slider = (option.dataZoom as Array<{ bottom: number; height: number }>)[1];

    return {
        option,
        mainGrid,
        sliderTop: PANEL_CHART_HEIGHT - slider.bottom - slider.height,
    };
}

function getSeries(option: EChartsOption) {
    return option.series as Array<Record<string, unknown>>;
}

function findSeriesById(option: EChartsOption, id: string) {
    return getSeries(option).find((series) => series.id === id);
}

function getYAxisRange(option: EChartsOption) {
    return option.yAxis as Array<{ min?: number; max?: number }>;
}

describe('Panel chart option utilities', () => {
    describe('buildChartOption', () => {
        it.each([true, false])(
            'keeps the main plot grid above the slider lane when showLegend=%s',
            (showLegend) => {
                const { mainGrid, sliderTop } = getLayoutOption(showLegend);

                expect(mainGrid.top + mainGrid.height).toBeLessThan(sliderTop);
            },
        );

        it('sets up navigator and toolbar lanes without persisting the live zoom window', () => {
            const option = createPanelChartLayoutOptionFixture(true);
            const dataZoom = option.dataZoom as Array<Record<string, unknown>>;
            const layout = getChartLayoutMetrics(true);

            expect(dataZoom[0]).not.toHaveProperty('startValue');
            expect(dataZoom[0]).not.toHaveProperty('endValue');
            expect(dataZoom[1]).not.toHaveProperty('startValue');
            expect(dataZoom[1]).not.toHaveProperty('endValue');
            expect(layout.mainGridTop + layout.mainGridHeight).toBeLessThan(layout.toolbarTop);
            expect(layout.toolbarTop).toBeLessThan(layout.sliderTop);
            expect(option.grid as unknown[]).toHaveLength(2);
            expect(option.xAxis as unknown[]).toHaveLength(2);
            expect(getSeries(option).some((series) => String(series.id).startsWith('navigator-series-'))).toBe(true);
            expect(dataZoom[1].showDataShadow).toBe(false);
            expect(dataZoom[1].realtime).toBe(false);
            expect(dataZoom[1].xAxisIndex).toEqual([0]);
            expect(dataZoom[0].xAxisIndex).toEqual([0]);
        });

        it('keeps tooltip rows focused on main series when navigator mirrors are present', () => {
            const tooltip = createPanelChartLayoutOptionFixture(true).tooltip as unknown as {
                formatter: (tooltipParams: Array<Record<string, unknown>>) => string;
            };
            const tooltipHtml = tooltip.formatter([
                { seriesId: 'navigator-series-0', seriesName: 'temp(avg) navigator', value: [0, 11], color: '#888888' },
                { seriesId: 'main-series-0', seriesName: 'temp(avg)', value: [0, 22], color: '#ffffff' },
            ]);

            expect(tooltipHtml).toContain('temp(avg) : 22');
            expect(tooltipHtml).not.toContain('temp(avg) navigator');
            expect(tooltipHtml).not.toContain('11');
        });

        it('keeps hover behavior local to the main plot and disables built-in legend focus', () => {
            const option = createPanelChartLayoutOptionFixture(true);
            const xAxis = option.xAxis as Array<{ axisPointer: { show: boolean | undefined } | undefined }>;
            const mainSeries = getSeries(option).filter((series) => String(series.id).startsWith('main-series-'));

            expect(option.axisPointer).toBeUndefined();
            expect(xAxis[1].axisPointer?.show).toBe(false);
            expect(getSeries(option).filter((series) => String(series.id).startsWith('navigator-series-')).every(
                (series) => (series.tooltip as { show?: boolean } | undefined)?.show === false,
            )).toBe(true);
            expect(getSeries(option).every((series) => series.legendHoverLink === false)).toBe(true);
            expect(mainSeries.length).toBeGreaterThan(0);
            expect(mainSeries.every(
                (series) => (series.emphasis as { focus?: string } | undefined)?.focus === undefined,
            )).toBe(true);
        });

        it('fades non-hovered series while a legend item is hovered', () => {
            const option = buildPanelOption({
                chartData: [
                    createChartSeries({ name: 'temp(avg)', color: '#ffffff' }),
                    createChartSeries({
                        name: 'pressure(avg)',
                        color: '#44aad5',
                        data: [
                            [100, 7],
                            [200, 9],
                        ],
                    }),
                ],
                display: createTagAnalyzerPanelDisplayFixture({ fill: 0.2 }),
                visibleSeries: { 'temp(avg)': true, 'pressure(avg)': true },
                hoveredLegendSeries: 'temp(avg)',
            });
            const hoveredMainSeries = findSeriesById(option, 'main-series-0') as { lineStyle?: { opacity?: number; width?: number } };
            const dimmedMainSeries = findSeriesById(option, 'main-series-1') as { lineStyle?: { opacity?: number; width?: number }; areaStyle?: { opacity?: number } };
            const hoveredNavigatorSeries = findSeriesById(option, 'navigator-series-0') as { lineStyle?: { opacity?: number } };
            const dimmedNavigatorSeries = findSeriesById(option, 'navigator-series-1') as { lineStyle?: { opacity?: number } };

            expect(hoveredMainSeries?.lineStyle?.opacity).toBe(1);
            expect(hoveredMainSeries?.lineStyle?.width).toBeGreaterThan(
                dimmedMainSeries?.lineStyle?.width ?? 0,
            );
            expect(dimmedMainSeries?.lineStyle?.opacity).toBeLessThan(0.2);
            expect(dimmedMainSeries?.areaStyle?.opacity).toBeLessThan(0.1);
            expect(hoveredNavigatorSeries?.lineStyle?.opacity).toBeGreaterThan(
                dimmedNavigatorSeries?.lineStyle?.opacity ?? 0,
            );
        });

        it('keeps a visible hover marker on the main chart even when regular points are hidden', () => {
            const mainSeries = findSeriesById(buildPanelOption({
                display: createTagAnalyzerPanelDisplayFixture({ show_point: false, point_radius: 0 }),
            }), 'main-series-0') as { showSymbol?: boolean; symbolSize?: number };

            expect(mainSeries?.showSymbol).toBe(false);
            expect(mainSeries?.symbolSize).toBeGreaterThan(0);
        });

        it.each([
            [
                'includes zero in the auto y-axis range when zero-base is enabled',
                {
                    axes: createTagAnalyzerPanelAxesFixture({ left_y_axis: { zero_base: true } }),
                },
                { min: 0, max: 20 },
            ],
            [
                'keeps a custom y-axis max unchanged',
                {
                    axes: createTagAnalyzerPanelAxesFixture({
                        left_y_axis: { value_range: { min: 0, max: 18 } },
                    }),
                },
                { max: 18 },
            ],
            [
                'keeps zero visible above negative-only data when zero-base is enabled',
                {
                    chartData: [createChartSeries({ data: [[100, -15], [200, -11]] })],
                    axes: createTagAnalyzerPanelAxesFixture({ left_y_axis: { zero_base: true } }),
                },
                { min: -15, max: 0 },
            ],
        ])('%s', (_name, options, expectedRange) => {
            expect(getYAxisRange(buildPanelOption(options))[0]).toEqual(expect.objectContaining(expectedRange));
        });

        it('renders saved highlights as a dedicated band overlay plus a clickable label series', () => {
            const panelInfo = createTagAnalyzerPanelInfoFixture({
                highlights: [{ text: 'unnamed', timeRange: { startTime: 120, endTime: 180 } }],
            });
            const option = buildPanelOption({ highlights: panelInfo.highlights });
            const highlightOverlay = findSeriesById(option, 'highlight-overlay') as {
                markArea?: { data: Array<Array<{ name?: string; xAxis: number }>> };
            };

            expect(highlightOverlay).toBeDefined();
            expect(findSeriesById(option, 'highlight-labels')).toBeDefined();
            expect(highlightOverlay?.markArea?.data).toEqual([
                [{ name: 'unnamed', xAxis: 120 }, { xAxis: 180 }],
            ]);
        });

        it('renders saved series annotations as leader lines plus clickable label boxes', () => {
            const panelInfo = createTagAnalyzerPanelInfoFixture(undefined);
            panelInfo.data.tag_set[0].annotations = [{ text: 'note', timeRange: { startTime: 150, endTime: 150 } }];
            const option = buildPanelOption({
                chartData: [createChartSeries({ data: [[100, 11], [150, 15], [200, 13]] })],
                seriesDefinitions: panelInfo.data.tag_set,
                highlights: panelInfo.highlights,
            });
            const guideSeries = findSeriesById(option, 'annotation-guide-series-0') as { name?: string; clip?: boolean };
            const labelSeries = findSeriesById(option, 'annotation-label-series-0') as { name?: string; symbol?: string; clip?: boolean; itemStyle?: { color?: string }; data?: Array<Record<string, unknown>> };

            expect(guideSeries).toBeDefined();
            expect(labelSeries).toBeDefined();
            expect(guideSeries?.name).toBeUndefined();
            expect(labelSeries?.name).toBeUndefined();
            expect(guideSeries?.clip).toBe(false);
            expect(labelSeries?.clip).toBe(false);
            expect(labelSeries?.symbol).toBe('roundRect');
            expect(labelSeries?.itemStyle?.color).toBe('rgba(26, 26, 26, 0.92)');
            expect(labelSeries?.data?.[0]).toEqual(
                expect.objectContaining({
                    annotationIndex: 0,
                    seriesIndex: 0,
                    name: 'note',
                    value: [150, expect.any(Number)],
                }),
            );
        });
    });

    describe('data zoom range extraction', () => {
        it.each([
            [
                'prefers explicit axis values when they are present',
                extractDataZoomOptionRange,
                { startValue: 1_000, endValue: 2_000 },
                { startTime: 1_000, endTime: 2_000 },
            ],
            [
                'converts percentage payloads against the navigator axis range',
                extractDataZoomEventRange,
                { start: 25, end: 75 },
                { startTime: 2_500, endTime: 7_500 },
            ],
            [
                'reads percentage payloads from batched data-zoom events',
                extractDataZoomEventRange,
                { batch: [{ start: 25, end: 75 }] },
                { startTime: 2_500, endTime: 7_500 },
            ],
            [
                'falls back to the current panel range when the payload is incomplete',
                extractDataZoomOptionRange,
                {},
                { startTime: 2_000, endTime: 3_000 },
            ],
        ])('%s', (_name, extractor, payload, expectedRange) => {
            expect(
                extractor(
                    payload as never,
                    { startTime: 2_000, endTime: 3_000 },
                    { startTime: 0, endTime: 10_000 },
                ),
            ).toEqual(expectedRange);
        });
    });

    describe('extractBrushRange', () => {
        it.each([
            [
                'reads the first coordinate range from a direct areas payload',
                {
                    areas: [{ coordRange: [100.2, 199.8], range: undefined }],
                    batch: undefined,
                },
                { startTime: 100, endTime: 200 },
            ],
            [
                'reads the first coordinate range from a batched brush payload',
                {
                    batch: [
                        {
                            areas: [{ range: [50.1, 75.1], coordRange: undefined }],
                        },
                    ],
                    areas: undefined,
                },
                { startTime: 50, endTime: 76 },
            ],
        ])('%s', (_name, payload, expectedRange) => {
            expect(extractBrushRange(payload as never)).toEqual(expectedRange);
        });

        it('returns undefined when the brush payload has no usable range', () => {
            expect(extractBrushRange({ areas: [], batch: undefined })).toBeUndefined();
        });
    });
});
