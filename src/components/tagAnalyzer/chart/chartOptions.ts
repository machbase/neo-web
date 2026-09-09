import type {
    YAXisComponentOption,
    XAXisComponentOption,
    LineSeriesOption,
    SeriesOption,
    BrushComponentOption,
    DataZoomComponentOption,
    EChartsOption,
    LegendComponentOption,
    TooltipComponentOption,
    DefaultLabelFormatterCallbackParams,
    TooltipComponentFormatterCallbackParams as TopLevelFormatterParams,
} from 'echarts';
import type { AxisRange, RangeState } from '../range/rangeModel';
import { roundNumericAxisBounds } from '../range/intervalResolver';
import { formatAxisPointer, formatAxisTick } from '../format/axisFormat';
import { formatCompactNumber } from '../format/numericFormat';
import { getPanelSeriesDisplayColor } from '../seriesModel';
import type { PanelInfo, PanelYAxis, ValueRange } from '../panel/panelModel';
import type { PanelHighlight } from '../markup/markupModel';
import { buildChartMarkupSeries } from '../markup/chartMarkupOptions';
import type { ChartRow, ChartSeriesData, ChartSeriesVisibilityMap } from './chartData';
import {
    PANEL_CHART_LAYOUTS,
    PANEL_GRID_BOTTOM,
    PANEL_GRID_SIDE,
    PANEL_NAVIGATOR_GRID_SIDE,
    PANEL_SLIDER_HEIGHT,
    PANEL_NAVIGATOR_DATA_X_AXIS_INDEX,
    PANEL_NAVIGATOR_Y_AXIS_INDEX,
} from './chartLayout';

export function resolveRuntimePanelChartConfig(
    panelInfo: PanelInfo,
) {
    return {
        query: panelInfo.query,
        mode: panelInfo.mode,
        highlights: panelInfo.highlights,
        annotations: panelInfo.annotations,
        axes: {
            x: { ...panelInfo.axes.x },
            leftY: resolvePanelYAxisForRuntime(panelInfo.axes.leftY),
            rightY: resolvePanelYAxisForRuntime(panelInfo.axes.rightY),
            rightYEnabled: panelInfo.axes.rightY.enabled,
        },
        display: {
            showLegend: panelInfo.display.showLegend,
            showPoint: panelInfo.display.showPoint,
            connectNulls: panelInfo.display.connectNulls,
            useZoom: panelInfo.display.useZoom,
            pointRadius: panelInfo.display.pointRadius ?? 0,
            fill: panelInfo.display.fill ?? 0,
            stroke: panelInfo.display.stroke ?? 0,
        },
    };
}

export type RuntimePanelChartConfig = ReturnType<typeof resolveRuntimePanelChartConfig>;

type RuntimePanelAxes = RuntimePanelChartConfig['axes'];

type RuntimePanelDisplay = RuntimePanelChartConfig['display'];

export type PanelChartRuntime = {
    config: RuntimePanelChartConfig;
    data: {
        chartData: ChartSeriesData[];
        navigatorChartData: ChartSeriesData[];
    };
    ranges: RangeState;
    interaction: {
        visibleSeries: ChartSeriesVisibilityMap;
        hoveredLegendSeries?: string;
        draftHighlight?: PanelHighlight;
        isWheelZoomEnabled: boolean;
    };
    rendering: {
        isNumericXAxis: boolean;
        animateMainDataUpdate: boolean;
        animateNavigatorDataUpdate: boolean;
    };
};

function resolvePanelYAxisForRuntime(axis: PanelYAxis) {
    return {
        zeroBase: axis.zeroBase,
        showTickline: axis.showTickline,
        valueRange: { ...axis.valueRange },
        rawValueRange: { ...axis.rawValueRange },
        upperControlLimit: {
            enabled: axis.upperControlLimit.enabled,
            value: axis.upperControlLimit.value ?? 0,
        },
        lowerControlLimit: {
            enabled: axis.lowerControlLimit.enabled,
            value: axis.lowerControlLimit.value ?? 0,
        },
    };
}

export const PANEL_SLIDER_DATA_ZOOM_ID = 'panel-slider-data-zoom';

export const MAIN_PANEL_SERIES_ID_PREFIX = 'main-series-';

export const PANEL_NAVIGATOR_SERIES_ID_PREFIX = 'navigator-series-';

export function escapeTooltipHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function getTooltipColorStyle(value: unknown): string {
    return typeof value === 'string' && SAFE_TOOLTIP_COLOR_PATTERN.test(value)
        ? `color:${value};`
        : '';
}

export const chartAxis = {
    style: {
        line: { lineStyle: { color: '#323333' } } satisfies NonNullable<XAXisComponentOption['axisLine']>,
        splitLine: { color: '#323333', width: 1 } satisfies NonNullable<NonNullable<XAXisComponentOption['splitLine']>['lineStyle']>,
        xLabel: { color: '#f8f8f8', fontSize: 10 } satisfies XAXisComponentOption['axisLabel'],
        yLabel: {
            color: '#afb5bc',
            fontSize: 10,
            formatter: (value: number) => formatCompactNumber(value),
        } satisfies YAXisComponentOption['axisLabel'],
    },
    resolveValueRange: resolveChartValueRange,
};

export function buildLineSeriesOption({
    data,
    animation = true,
    ...option
}: LineSeriesOption & { data: ChartRow[] }): SeriesOption {
    return {
        type: 'line',
        legendHoverLink: false,
        data,
        animation,
        animationDuration: 280,
        animationDurationUpdate: 180,
        animationEasing: 'cubicOut',
        animationEasingUpdate: 'cubicOut',
        sampling: data.length > 1000 ? 'lttb' : undefined,
        ...option,
    };
}

export function buildInsideDataZoomOption(
    xAxisIndex: number,
    visibleRange: AxisRange | undefined,
    zoomOnMouseWheel: boolean,
    disabled = false,
): DataZoomComponentOption {
    return {
        type: 'inside',
        xAxisIndex: [xAxisIndex],
        filterMode: 'none',
        ...(visibleRange && visibleRange.start < visibleRange.end
            ? {
                  startValue: visibleRange.start,
                  endValue: visibleRange.end,
              }
            : {}),
        moveOnMouseMove: false,
        moveOnMouseWheel: false,
        zoomOnMouseWheel,
        preventDefaultMouseMove: true,
        disabled,
    };
}

export function buildChartSeriesOption(
    chartRuntime: PanelChartRuntime,
    yAxisOption?: YAXisComponentOption[],
): SeriesOption[] {
    const { config, data, interaction, ranges, rendering } = chartRuntime;
    const resolvedYAxisOption =
        yAxisOption ?? buildChartYAxisOption(chartRuntime);
    const sRenderableHighlights = interaction.draftHighlight
        ? [...config.highlights, interaction.draftHighlight]
        : config.highlights;
    const sAnnotationContext = {
        annotations: config.annotations,
        seriesDefinitions: config.query.tagSet,
        chartData: data.chartData,
        yAxisOptions: resolvedYAxisOption,
        visibleSeries: interaction.visibleSeries,
    };
    const sMarkupSeries = buildChartMarkupSeries({
        highlights: sRenderableHighlights,
        annotationContext: sAnnotationContext,
        mainRange: ranges.mainRange,
        navigatorRange: ranges.navigatorRange,
    });

    return [
        ...sMarkupSeries.main,
        ...buildMainSeriesOption(
            data.chartData,
            config.display,
            config.axes,
            interaction.hoveredLegendSeries,
            rendering.animateMainDataUpdate,
        ),
        ...buildNavigatorSeriesOption(
            data.navigatorChartData,
            interaction.hoveredLegendSeries,
        ),
        ...sMarkupSeries.navigator,
    ];
}

export function buildChartOption(
    chartRuntime: PanelChartRuntime,
): EChartsOption & { series: SeriesOption[] } {
    const { config, ranges, rendering } = chartRuntime;
    const yAxisOption = buildChartYAxisOption(chartRuntime);

    return {
        ...PANEL_CHART_BASE_OPTION,
        animation:
            rendering.animateMainDataUpdate &&
            rendering.animateNavigatorDataUpdate,
        ...buildPanelChartFrameOptions(chartRuntime),
        xAxis: buildChartXAxisOption(
            ranges.mainRange,
            ranges.navigatorRange,
            config.display,
            config.axes,
            rendering.isNumericXAxis,
        ),
        yAxis: yAxisOption,
        series: buildChartSeriesOption(chartRuntime, yAxisOption),
    };
}

const SAFE_TOOLTIP_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const PANEL_NAVIGATOR_SLIDER_X_AXIS_INDEX = 1;

const DEFAULT_NOT_SHOW = { show: false } as const;

const PANEL_Y_AXIS_SPLIT_COUNT = 5;

const PANEL_MAIN_X_AXIS_ID = 'panel-main-x-axis';

const PANEL_NAVIGATOR_X_AXIS_ID = 'panel-navigator-x-axis';

const PANEL_NAVIGATOR_DATA_X_AXIS_ID = 'panel-navigator-data-x-axis';

const PANEL_LEFT_Y_AXIS_ID = 'panel-left-y-axis';

const PANEL_RIGHT_Y_AXIS_ID = 'panel-right-y-axis';

const PANEL_NAVIGATOR_Y_AXIS_ID = 'panel-navigator-y-axis';

const PANEL_MAIN_X_AXIS_INDEX = 0;

const CHART_AXIS_STYLE = chartAxis.style;

const HIDDEN_AXIS_PART = {
    axisLine: DEFAULT_NOT_SHOW,
    axisTick: DEFAULT_NOT_SHOW,
    axisLabel: DEFAULT_NOT_SHOW,
    splitLine: DEFAULT_NOT_SHOW,
    axisPointer: { show: false, label: DEFAULT_NOT_SHOW },
} as const;

function includeAxisValue(
    axisBounds: number[],
    value: number,
    zeroBase = false,
): void {
    const sMin = zeroBase ? Math.min(value, 0) : value;
    const sMax = zeroBase ? Math.max(value, 0) : value;
    axisBounds[0] = Math.min(axisBounds[0] ?? sMin, sMin);
    axisBounds[1] = Math.max(axisBounds[1] ?? sMax, sMax);
}

function updateAxisBounds(
    axisBounds: number[],
    seriesData: ChartRow[],
    zeroBase: boolean,
    visibleRange?: AxisRange,
): void {
    for (const [timestamp, value] of seriesData) {
        if (
            value === null ||
            (visibleRange &&
                !(
                    timestamp >= visibleRange.start &&
                    timestamp <= visibleRange.end
                ))
        ) {
            continue;
        }

        includeAxisValue(axisBounds, value, zeroBase);
    }
}

function resolveChartValueRange(
    chartData: readonly { data: ChartRow[] }[],
    includeZero: boolean,
): ValueRange {
    const bounds: number[] = [];
    chartData.forEach((series) =>
        updateAxisBounds(bounds, series.data, includeZero),
    );
    roundNumericAxisBounds(bounds, PANEL_Y_AXIS_SPLIT_COUNT);
    return { min: bounds[0], max: bounds[1] };
}

function getYAxisValues(
    chartData: ChartSeriesData[],
    axes: RuntimePanelAxes,
    visibleRange?: AxisRange,
): [number[], number[]] {
    const bounds: [number[], number[]] = [[], []];
    const axisConfigs = [axes.leftY, axes.rightY];

    chartData.forEach((series) => {
        if (!series.data.length) return;
        const sYAxisIndex = series.yAxis ?? 0;
        const sAxisValues = bounds[sYAxisIndex];

        if (!sAxisValues) throw new Error(`Unsupported Y-axis index: ${sYAxisIndex}.`);
        updateAxisBounds(
            sAxisValues,
            series.data,
            axisConfigs[sYAxisIndex].zeroBase,
            visibleRange,
        );
    });

    for (const [index, axis] of axisConfigs.entries()) {
        if (index === 0 || axes.rightYEnabled) {
            for (const threshold of [axis.upperControlLimit, axis.lowerControlLimit]) {
                if (threshold.enabled && Number.isFinite(threshold.value)) {
                    includeAxisValue(bounds[index], threshold.value);
                }
            }
        }
        roundNumericAxisBounds(bounds[index], PANEL_Y_AXIS_SPLIT_COUNT);
    }

    return bounds;
}

function resolveAxisRange(
    manualRange: ValueRange,
    defaultMin: number | undefined,
    defaultMax: number | undefined,
): ValueRange {
    return manualRange.min === undefined && manualRange.max === undefined
        ? { min: defaultMin, max: defaultMax }
        : { min: manualRange.min, max: manualRange.max };
}

function buildChartXAxisOption(
    mainRange: AxisRange,
    navigatorRange: AxisRange,
    display: RuntimePanelDisplay,
    axes: RuntimePanelAxes,
    isNumericXAxis: boolean,
): XAXisComponentOption[] {
    const sAxisType: XAXisComponentOption['type'] = isNumericXAxis ? 'value' : 'time';

    return [
        {
            id: PANEL_MAIN_X_AXIS_ID,
            type: sAxisType,
            gridIndex: PANEL_MAIN_X_AXIS_INDEX,
            min: mainRange.start,
            max: mainRange.end,
            axisLine: CHART_AXIS_STYLE.line,
            axisTick: CHART_AXIS_STYLE.line,
            axisLabel: {
                ...CHART_AXIS_STYLE.xLabel,
                formatter: (xAxisValue: number) =>
                    formatAxisTick(xAxisValue, mainRange, isNumericXAxis),
            },
            splitLine: {
                show: display.useZoom && axes.x.showTickline,
                lineStyle: CHART_AXIS_STYLE.splitLine,
            },
            axisPointer: { label: DEFAULT_NOT_SHOW },
        },
        ...[
            PANEL_NAVIGATOR_X_AXIS_ID,
            PANEL_NAVIGATOR_DATA_X_AXIS_ID,
        ].map((id) => ({
            id,
            type: sAxisType,
            gridIndex: PANEL_NAVIGATOR_SLIDER_X_AXIS_INDEX,
            min: navigatorRange.start,
            max: navigatorRange.end,
            ...HIDDEN_AXIS_PART,
        })),
    ];
}

function buildMainYAxisOption({
    id,
    axisRange,
    position,
    showAxisLabel,
    showTickLine,
}: {
    id: string;
    axisRange: ValueRange;
    position?: 'left' | 'right';
    showAxisLabel?: boolean;
    showTickLine: boolean;
}): YAXisComponentOption {
    return {
        id,
        type: 'value',
        gridIndex: 0,
        min: axisRange.min,
        max: axisRange.max,
        position,
        axisLine: CHART_AXIS_STYLE.line,
        axisLabel: showAxisLabel === undefined
            ? CHART_AXIS_STYLE.yLabel
            : { ...CHART_AXIS_STYLE.yLabel, show: showAxisLabel },
        splitLine: {
            show: showTickLine,
            lineStyle: CHART_AXIS_STYLE.splitLine,
        },
        minInterval: 0,
        scale: true,
    };
}

function buildChartYAxisOption(
    chartRuntime: PanelChartRuntime,
): YAXisComponentOption[] {
    const { config, data, ranges } = chartRuntime;
    const { axes, mode } = config;
    const [leftBounds, rightBounds] = getYAxisValues(
        data.chartData,
        axes,
        ranges.mainRange,
    );
    const sLeftAxisRange = resolveAxisRange(
        mode.isRaw ? axes.leftY.rawValueRange : axes.leftY.valueRange,
        leftBounds[0],
        leftBounds[1],
    );
    const sRightAxisRange = resolveAxisRange(
        mode.isRaw
            ? axes.rightY.rawValueRange
            : axes.rightY.valueRange,
        mode.useNormalize ? 0 : rightBounds[0],
        mode.useNormalize ? 100 : rightBounds[1],
    );

    return [
        buildMainYAxisOption({
            id: PANEL_LEFT_Y_AXIS_ID,
            axisRange: sLeftAxisRange,
            showTickLine: axes.leftY.showTickline,
        }),
        buildMainYAxisOption({
            id: PANEL_RIGHT_Y_AXIS_ID,
            axisRange: sRightAxisRange,
            position: axes.rightYEnabled ? 'right' : 'left',
            showAxisLabel: axes.rightYEnabled,
            showTickLine: axes.rightY.showTickline,
        }),
        {
            id: PANEL_NAVIGATOR_Y_AXIS_ID,
            type: 'value',
            gridIndex: 1,
            boundaryGap: ['18%', '18%'],
            ...HIDDEN_AXIS_PART,
            scale: true,
        },
    ];
}

const PANEL_HOVER_SYMBOL_SIZE = 6;

const PANEL_LEGEND_FADE_LINE_OPACITY = 0.18;

const PANEL_LEGEND_FADE_ITEM_OPACITY = 0.22;

const PANEL_LEGEND_FADE_AREA_OPACITY = 0.05;

const PANEL_LEGEND_FADE_MARK_LINE_OPACITY = 0.18;

const PANEL_NAVIGATOR_ACTIVE_OPACITY = 0.85;

const PANEL_NAVIGATOR_FADE_OPACITY = 0.14;

function buildMainSeriesOption(
    chartData: ChartSeriesData[],
    display: RuntimePanelDisplay,
    axes: RuntimePanelAxes,
    hoveredLegendSeries?: string,
    animateDataUpdate = true,
): SeriesOption[] {
    return chartData.map((series, seriesIndex) => {
        const sBaseSymbolSize = display.pointRadius > 0 ? display.pointRadius * 2 : 0;
        const sSymbolSize = display.showPoint
            ? sBaseSymbolSize
            : Math.max(sBaseSymbolSize, PANEL_HOVER_SYMBOL_SIZE);
        const sEChartsName = series.echartsName;
        const sIsHoveredSeries = hoveredLegendSeries === sEChartsName;
        const sIsFaded = Boolean(hoveredLegendSeries) && !sIsHoveredSeries;
        const sSeriesOpacity = sIsFaded ? PANEL_LEGEND_FADE_LINE_OPACITY : 1;
        const sItemOpacity = sIsFaded ? PANEL_LEGEND_FADE_ITEM_OPACITY : 1;
        const sAreaOpacity = sIsFaded
            ? Math.min(display.fill, PANEL_LEGEND_FADE_AREA_OPACITY)
            : display.fill;
        const sSeriesStroke = sIsHoveredSeries ? display.stroke + 1 : display.stroke;
        const sMarkLineOpacity = sIsFaded
            ? PANEL_LEGEND_FADE_MARK_LINE_OPACITY
            : 1;
        const sSeriesColor = getPanelSeriesDisplayColor(series, seriesIndex);
        const sYAxisIndex = series.yAxis ?? 0;

        if (sYAxisIndex !== 0 && sYAxisIndex !== 1) {
            throw new Error(`Unsupported Y-axis index: ${sYAxisIndex}.`);
        }

        const axis = sYAxisIndex === 0 ? axes.leftY : axes.rightY;
        const sMarkLineData = [
            axis.upperControlLimit.enabled
                ? { yAxis: axis.upperControlLimit.value }
                : undefined,
            axis.lowerControlLimit.enabled
                ? { yAxis: axis.lowerControlLimit.value }
                : undefined,
        ].filter((item): item is { yAxis: number } => item !== undefined);

        return buildLineSeriesOption({
            id: `${MAIN_PANEL_SERIES_ID_PREFIX}${seriesIndex}`,
            name: sEChartsName,
            data: series.data,
            animation: animateDataUpdate,
            xAxisIndex: 0,
            yAxisIndex: sYAxisIndex,
            symbol: 'circle',
            showSymbol: display.showPoint,
            symbolSize: sSymbolSize,
            lineStyle: {
                width: sSeriesStroke,
                color: sSeriesColor,
                opacity: sSeriesOpacity,
            },
            itemStyle: {
                color: sSeriesColor,
                opacity: sItemOpacity,
            },
            areaStyle:
                display.fill > 0
                    ? { opacity: sAreaOpacity, color: sSeriesColor }
                    : undefined,
            connectNulls: display.connectNulls,
            triggerLineEvent: true,
            z: sIsHoveredSeries ? 4 : 2,
            markLine:
                sMarkLineData.length > 0
                    ? {
                          silent: true,
                          symbol: 'none',
                          lineStyle: {
                              width: 1,
                              opacity: sMarkLineOpacity,
                          },
                          label: { show: false },
                          data: sMarkLineData,
                      }
                    : undefined,
        });
    });
}

function buildNavigatorSeriesOption(
    chartData: ChartSeriesData[],
    hoveredLegendSeries?: string,
): SeriesOption[] {
    return chartData.map((series, seriesIndex) => {
        const sEChartsName = series.echartsName;
        const sIsHoveredSeries = hoveredLegendSeries === sEChartsName;
        const sOpacity = hoveredLegendSeries && !sIsHoveredSeries
            ? PANEL_NAVIGATOR_FADE_OPACITY
            : PANEL_NAVIGATOR_ACTIVE_OPACITY;
        const sSeriesColor = getPanelSeriesDisplayColor(series, seriesIndex);

        return buildLineSeriesOption({
            id: `${PANEL_NAVIGATOR_SERIES_ID_PREFIX}${seriesIndex}`,
            name: sEChartsName,
            data: series.data,
            animation: false,
            xAxisIndex: PANEL_NAVIGATOR_DATA_X_AXIS_INDEX,
            yAxisIndex: PANEL_NAVIGATOR_Y_AXIS_INDEX,
            showSymbol: false,
            silent: true,
            tooltip: DEFAULT_NOT_SHOW,
            lineStyle: {
                width: sIsHoveredSeries ? 2 : 1,
                color: sSeriesColor,
                opacity: sOpacity,
            },
            itemStyle: {
                color: sSeriesColor,
                opacity: sOpacity,
            },
            z: sIsHoveredSeries ? 3 : 1,
            emphasis: {
                disabled: true,
            },
        });
    });
}

const PANEL_INSIDE_DATA_ZOOM_ID = 'panel-inside-data-zoom';

const PANEL_LEGEND_TOP = 6;

const PANEL_MAIN_GRID_ID = 'panel-main-grid';

const PANEL_NAVIGATOR_GRID_ID = 'panel-navigator-grid';

const LEGEND_TEXT_STYLE = { color: '#e7e8ea', fontSize: 10 } satisfies LegendComponentOption['textStyle'];

type SeriesDisplayNameMap = Map<string, string>;

const TOOLTIP_BASE: TooltipComponentOption = {
    trigger: 'axis' as const,
    confine: true,
    backgroundColor: '#1f1d1d',
    borderColor: '#292929',
    borderWidth: 1,
    textStyle: { color: '#afb5bc', fontSize: 10 },
};

const PANEL_CHART_BRUSH_OPTION: BrushComponentOption = {
    toolbox: [],
    xAxisIndex: 0,
    brushMode: 'single' as const,
    throttleType: 'debounce' as const,
    throttleDelay: 150,
    brushStyle: {
        color: 'rgba(68, 170, 213, 0.28)',
        borderColor: 'rgba(68, 170, 213, 0.85)',
        borderWidth: 2,
    },
};

function buildPanelChartFrameOptions(
    chartRuntime: PanelChartRuntime,
) {
    const { config, data, interaction, ranges, rendering } = chartRuntime;
    const { mainRange } = ranges;
    const { isNumericXAxis } = rendering;
    const sLayout = PANEL_CHART_LAYOUTS[
        config.display.showLegend ? 'withLegend' : 'withoutLegend'
    ];
    const sSeriesDisplayNameByEChartsName = new Map(
        data.chartData.map((series) => [
            series.echartsName,
            series.name,
        ]),
    );

    return {
        grid: [
            {
                id: PANEL_MAIN_GRID_ID,
                left: PANEL_GRID_SIDE,
                right: PANEL_GRID_SIDE,
                top: sLayout.mainGridTop,
                height: sLayout.mainGridHeight,
                containLabel: true,
            },
            {
                id: PANEL_NAVIGATOR_GRID_ID,
                left: PANEL_NAVIGATOR_GRID_SIDE,
                right: PANEL_NAVIGATOR_GRID_SIDE,
                bottom: PANEL_GRID_BOTTOM,
                height: PANEL_SLIDER_HEIGHT,
            },
        ],
        legend: {
            show: config.display.showLegend,
            left: 10,
            top: PANEL_LEGEND_TOP,
            itemGap: 15,
            textStyle: LEGEND_TEXT_STYLE,
            formatter: (seriesName: string) =>
                sSeriesDisplayNameByEChartsName.get(seriesName) ?? seriesName,
            selected: Object.fromEntries(
                data.chartData.map((series) => {
                    const sEChartsName = series.echartsName;

                    return [
                        sEChartsName,
                        interaction.visibleSeries[sEChartsName] !== false,
                    ];
                }),
            ),
        },
        tooltip: {
            ...TOOLTIP_BASE,
            axisPointer: {
                type: 'cross',
                lineStyle: {
                    color: 'red',
                    width: 0.5,
                },
            },
            formatter: (tooltipFormatterParams) => formatChartTooltip(
                tooltipFormatterParams,
                isNumericXAxis,
                mainRange,
                sSeriesDisplayNameByEChartsName,
            ),
        } satisfies TooltipComponentOption,
        dataZoom: buildPanelChartDataZoomOption(
            config.display,
            mainRange,
            interaction.isWheelZoomEnabled,
        ),
        brush: PANEL_CHART_BRUSH_OPTION,
        toolbox: { ...DEFAULT_NOT_SHOW },
        title: { ...DEFAULT_NOT_SHOW },
    };
}

function buildPanelChartDataZoomOption(
    display: RuntimePanelDisplay,
    mainRange: AxisRange,
    isWheelZoomEnabled: boolean,
): DataZoomComponentOption[] {
    const sMainRangeDataZoom = mainRange.start < mainRange.end
        ? {
              startValue: mainRange.start,
              endValue: mainRange.end,
          }
        : {};

    return [
        {
            id: PANEL_INSIDE_DATA_ZOOM_ID,
            ...buildInsideDataZoomOption(
                PANEL_NAVIGATOR_SLIDER_X_AXIS_INDEX,
                mainRange,
                isWheelZoomEnabled,
                !display.useZoom,
            ),
        },
        {
            id: PANEL_SLIDER_DATA_ZOOM_ID,
            type: 'slider' as const,
            xAxisIndex: [PANEL_NAVIGATOR_SLIDER_X_AXIS_INDEX],
            filterMode: 'none' as const,
            ...sMainRangeDataZoom,
            realtime: false,
            left: PANEL_NAVIGATOR_GRID_SIDE,
            right: PANEL_NAVIGATOR_GRID_SIDE,
            bottom: PANEL_GRID_BOTTOM,
            height: PANEL_SLIDER_HEIGHT,
            showDetail: false,
            brushSelect: false,
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderColor: '#7a828c',
            fillerColor: 'rgba(104, 119, 138, 0.28)',
            showDataShadow: false,
            dataBackground: {
                lineStyle: {
                    color: '#c0c7d0',
                    opacity: 0.8,
                },
                areaStyle: {
                    color: '#a8b0ba',
                    opacity: 0.28,
                },
            },
            selectedDataBackground: {
                lineStyle: {
                    color: '#a8b3c1',
                    opacity: 0.62,
                },
                areaStyle: {
                    color: '#7f8da0',
                    opacity: 0.18,
                },
            },
            handleSize: 24,
            handleStyle: {
                color: 'rgba(245, 247, 250, 0.78)',
                borderColor: '#8a939e',
            },
            moveHandleStyle: {
                color: 'rgba(245, 247, 250, 0.32)',
                opacity: 0.75,
            },
        },
    ];
}

function formatTooltipRow(
    tooltipParam: PanelChartTooltipPayload,
    seriesDisplayNameByEChartsName: SeriesDisplayNameMap,
): string {
    const sColorStyle = getTooltipColorStyle(tooltipParam.color);
    const sValue = Array.isArray(tooltipParam.value) ? tooltipParam.value : undefined;
    const sSeriesName =
        seriesDisplayNameByEChartsName.get(tooltipParam.seriesName ?? '') ??
        tooltipParam.seriesName ??
        '';

    return `<div style="${sColorStyle}margin:0;padding:0;white-space:nowrap">${escapeTooltipHtml(sSeriesName)} : ${escapeTooltipHtml(sValue?.[1] ?? '')}</div>`;
}

function getMainSeriesTooltipItems(
    tooltipFormatterParams: TopLevelFormatterParams,
): PanelChartTooltipPayload[] {
    const sTooltipParams =
        Array.isArray(tooltipFormatterParams)
            ? tooltipFormatterParams
            : [tooltipFormatterParams];
    const sTooltipItems = sTooltipParams.filter((tooltipParam) =>
        tooltipParam.seriesId?.startsWith(MAIN_PANEL_SERIES_ID_PREFIX),
    );

    return [...new Map(sTooltipItems.map((item) => [item.seriesId, item])).values()];
}

function formatChartTooltip(
    tooltipFormatterParams: TopLevelFormatterParams,
    isNumericXAxis: boolean,
    mainRange: AxisRange,
    seriesDisplayNameByEChartsName: SeriesDisplayNameMap,
): string {
    const sMainSeriesItems = getMainSeriesTooltipItems(tooltipFormatterParams);
    if (sMainSeriesItems.length === 0) {
        return '';
    }

    const firstItem = sMainSeriesItems[0];
    const sFirstValue = Array.isArray(firstItem.value) ? firstItem.value : undefined;
    const sTime = formatAxisPointer(
        Number(sFirstValue?.[0] ?? firstItem.axisValue),
        isNumericXAxis,
        mainRange,
    );

    return `<div>
            <div style="min-width:0;padding-left:10px;font-size:10px;color:#afb5bc">${escapeTooltipHtml(sTime)}</div>
            <div style="padding:6px 0 0 10px">
            ${sMainSeriesItems
                .map((item) =>
                    formatTooltipRow(item, seriesDisplayNameByEChartsName),
                )
                .join('')}
            </div>
        </div>`;
}

const PANEL_CHART_BASE_OPTION: EChartsOption = {
    animation: true,
    animationDuration: 280,
    animationDurationUpdate: 180,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicOut',
    backgroundColor: '#252525',
    textStyle: { fontFamily: 'Open Sans, Helvetica, Arial, sans-serif' },
};

type PanelChartTooltipPayload = DefaultLabelFormatterCallbackParams & {
    axisValue?: number | string;
};
