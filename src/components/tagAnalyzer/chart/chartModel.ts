import { type YAXisComponentOption, type XAXisComponentOption, type LineSeriesOption, type SeriesOption, type BrushComponentOption, type DataZoomComponentOption, type EChartsOption, type LegendComponentOption, type TooltipComponentOption, type TooltipComponentFormatterCallbackParams as TopLevelFormatterParams } from 'echarts';
import type { AxisRange, RangeState } from '../range/rangeModel';
import { roundNumericAxisBounds } from '../range/intervalResolver';
import { isSameRange } from '../range/rangeArithmetic';
import { formatAxisPointer, formatAxisTick } from '../format/axisFormat';
import { formatCompactNumber } from '../format/numericFormat';
import { asRecord } from '../objectGuards';
import { PanelOverlayMode, type RuntimePanelAxes, type RuntimePanelDisplay, type PanelChartRuntime, type EChartBrushPayload, type EChartDataZoomEventPayload, type PanelChartAxisPointerPayload, type PanelChartClickPayload, type PanelChartHighlightPayload, type PanelChartInstance, type PanelChartLegendChangePayload } from './chartRuntime';
import { type ChartRow, type ChartSeriesData, type ChartSeriesVisibilityMap, getChartSeriesEChartsName } from './chartData';
import { getPanelSeriesDisplayColor } from '../seriesModel';
import { type ValueRange } from '../panel/panelModel';
import {
    buildChartMarkupSeries,
    isAnnotationLabelSeries,
    isHighlightLabelSeries,
} from '../markup/chartMarkupOptions';
import { type PanelChartClientPosition, getChartLayoutMetrics, PANEL_GRID_BOTTOM, PANEL_GRID_SIDE, PANEL_NAVIGATOR_GRID_SIDE, PANEL_SLIDER_HEIGHT, PANEL_NAVIGATOR_DATA_X_AXIS_INDEX, PANEL_NAVIGATOR_Y_AXIS_INDEX, convertPanelChartPixelToTimestamp, getPanelChartAxisPointerTimestamp, getPanelChartEventCoordinates, parsePanelChartTimestamp, extractBrushRange, extractDataZoomOptionRange, isSameDataZoomSelection, resolveDataZoomEventItem, selectDataZoomItem } from './chartGeometry';
import { type MutableRefObject } from 'react';

export type PanelChartHandlers = {
    rangeActions: {
        setMainRange: (range: AxisRange) => void;
        shiftMainRangeLeft: () => void;
        shiftMainRangeRight: () => void;
    };
    markupHandlers: {
        onOpenCreateAnnotation: (
            position: PanelChartClientPosition,
            seriesIndex: number | undefined,
            timestamp: number,
        ) => void;
        onActivateHighlightEditor: (
            position: PanelChartClientPosition,
            highlightIndex: number,
        ) => void;
        onActivateAnnotationEditor: (
            position: PanelChartClientPosition,
            annotationIndex: number,
        ) => void;
    };
    onHoveredMainSeriesChange: (seriesName: string | undefined) => void;
    onSelection: (selectionRange: AxisRange) => void;
};

// Chart option constants
const SAFE_TOOLTIP_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const PANEL_NAVIGATOR_SLIDER_X_AXIS_INDEX = 1;
export const PANEL_SLIDER_DATA_ZOOM_ID = 'panel-slider-data-zoom';
export const MAIN_PANEL_SERIES_ID_PREFIX = 'main-series-';
export const PANEL_NAVIGATOR_SERIES_ID_PREFIX = 'navigator-series-';

const DEFAULT_NOT_SHOW = { show: false } as const;

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

// Axes
type YAxisValueMap = {
    left: number[];
    right: number[];
};

const PANEL_Y_AXIS_SPLIT_COUNT = 5;
const PANEL_MAIN_X_AXIS_ID = 'panel-main-x-axis';
const PANEL_NAVIGATOR_X_AXIS_ID = 'panel-navigator-x-axis';
const PANEL_NAVIGATOR_DATA_X_AXIS_ID = 'panel-navigator-data-x-axis';
const PANEL_LEFT_Y_AXIS_ID = 'panel-left-y-axis';
const PANEL_RIGHT_Y_AXIS_ID = 'panel-right-y-axis';
const PANEL_NAVIGATOR_Y_AXIS_ID = 'panel-navigator-y-axis';
const PANEL_MAIN_X_AXIS_INDEX = 0;
const CHART_AXIS_STYLE = {
    line: { lineStyle: { color: '#323333' } } satisfies NonNullable<XAXisComponentOption['axisLine']>,
    splitLine: { color: '#323333', width: 1 } satisfies NonNullable<NonNullable<XAXisComponentOption['splitLine']>['lineStyle']>,
    xLabel: { color: '#f8f8f8', fontSize: 10 } satisfies XAXisComponentOption['axisLabel'],
    yLabel: {
        color: '#afb5bc',
        fontSize: 10,
        formatter: (value: number) => formatCompactNumber(value),
    } satisfies YAXisComponentOption['axisLabel'],
};

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
    chartData: ChartSeriesData[],
    includeZero: boolean,
): ValueRange {
    const bounds: number[] = [];
    chartData.forEach((series) =>
        updateAxisBounds(bounds, series.data, includeZero),
    );
    roundNumericAxisBounds(bounds, PANEL_Y_AXIS_SPLIT_COUNT);
    return { min: bounds[0], max: bounds[1] };
}

export const chartAxis = {
    style: CHART_AXIS_STYLE,
    resolveValueRange: resolveChartValueRange,
};

function updateAxisBoundsWithThresholds(
    axisBounds: number[],
    axis: RuntimePanelAxes['leftY'],
): void {
    [
        axis.upperControlLimit,
        axis.lowerControlLimit,
    ].forEach((threshold) => {
        if (!threshold.enabled || !Number.isFinite(threshold.value)) {
            return;
        }

        includeAxisValue(axisBounds, threshold.value);
    });
}

function getYAxisValues(
    chartData: ChartSeriesData[],
    axes: RuntimePanelAxes,
    visibleRange?: AxisRange,
): YAxisValueMap {
    const sYAxis: YAxisValueMap = {
        left: [],
        right: [],
    };

    chartData.forEach((series) => {
        if (!series.data.length) return;
        const sYAxisIndex = series.yAxis ?? 0;
        const sAxisValues = sYAxisIndex === 0
            ? sYAxis.left
            : sYAxisIndex === 1
            ? sYAxis.right
            : undefined;

        if (!sAxisValues) throw new Error(`Unsupported Y-axis index: ${sYAxisIndex}.`);
        updateAxisBounds(
            sAxisValues,
            series.data,
            sYAxisIndex === 0
                ? axes.leftY.zeroBase
                : axes.rightY.zeroBase,
            visibleRange,
        );
    });

    updateAxisBoundsWithThresholds(sYAxis.left, axes.leftY);
    if (axes.rightYEnabled) {
        updateAxisBoundsWithThresholds(sYAxis.right, axes.rightY);
    }

    roundNumericAxisBounds(sYAxis.left, PANEL_Y_AXIS_SPLIT_COUNT);
    roundNumericAxisBounds(sYAxis.right, PANEL_Y_AXIS_SPLIT_COUNT);

    return sYAxis;
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
    axes: RuntimePanelAxes,
    chartData: ChartSeriesData[],
    isRaw: boolean,
    useNormalize: boolean,
    visibleRange?: AxisRange,
): YAXisComponentOption[] {
    const sYAxisValues = getYAxisValues(
        chartData,
        axes,
        visibleRange,
    );
    const sLeftAxisRange = resolveAxisRange(
        isRaw ? axes.leftY.rawValueRange : axes.leftY.valueRange,
        sYAxisValues.left[0],
        sYAxisValues.left[1],
    );
    const sRightAxisRange = resolveAxisRange(
        isRaw
            ? axes.rightY.rawValueRange
            : axes.rightY.valueRange,
        useNormalize ? 0 : sYAxisValues.right[0],
        useNormalize ? 100 : sYAxisValues.right[1],
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

// Data series
const PANEL_HOVER_SYMBOL_SIZE = 6;
const PANEL_LEGEND_FADE_LINE_OPACITY = 0.18;
const PANEL_LEGEND_FADE_ITEM_OPACITY = 0.22;
const PANEL_LEGEND_FADE_AREA_OPACITY = 0.05;
const PANEL_LEGEND_FADE_MARK_LINE_OPACITY = 0.18;
const PANEL_NAVIGATOR_ACTIVE_OPACITY = 0.85;
const PANEL_NAVIGATOR_FADE_OPACITY = 0.14;

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

function buildThresholdMarkLineData(
    axis: RuntimePanelAxes['leftY'],
) {
    return [
        axis.upperControlLimit.enabled
            ? { yAxis: axis.upperControlLimit.value }
            : undefined,
        axis.lowerControlLimit.enabled
            ? { yAxis: axis.lowerControlLimit.value }
            : undefined,
    ].filter((item): item is { yAxis: number } => item !== undefined);
}

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
        const sEChartsName = getChartSeriesEChartsName(series);
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

        const sMarkLineData = buildThresholdMarkLineData(
            sYAxisIndex === 0 ? axes.leftY : axes.rightY,
        );

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
    animateDataUpdate = true,
): SeriesOption[] {
    return chartData.map((series, seriesIndex) => {
        const sEChartsName = getChartSeriesEChartsName(series);
        const sIsHoveredSeries = hoveredLegendSeries === sEChartsName;
        const sOpacity = hoveredLegendSeries && !sIsHoveredSeries
            ? PANEL_NAVIGATOR_FADE_OPACITY
            : PANEL_NAVIGATOR_ACTIVE_OPACITY;
        const sSeriesColor = getPanelSeriesDisplayColor(series, seriesIndex);

        return buildLineSeriesOption({
            id: `${PANEL_NAVIGATOR_SERIES_ID_PREFIX}${seriesIndex}`,
            name: sEChartsName,
            data: series.data,
            animation: animateDataUpdate,
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

// Frame and tooltip
type TooltipArrayValue = Array<number | string | undefined>;

const PANEL_INSIDE_DATA_ZOOM_ID = 'panel-inside-data-zoom';
const PANEL_LEGEND_TOP = 6;
const PANEL_MAIN_GRID_ID = 'panel-main-grid';
const PANEL_NAVIGATOR_GRID_ID = 'panel-navigator-grid';

type PanelTooltipParam = Partial<{
    seriesId: string;
    seriesName: string;
    axisValue: number | string;
    value: unknown;
    color: unknown;
}>;

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
    const sLayout = getChartLayoutMetrics(config.display.showLegend);
    const sSeriesDisplayNameByEChartsName = new Map(
        data.chartData.map((series) => [
            getChartSeriesEChartsName(series),
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
                    const sEChartsName = getChartSeriesEChartsName(series);

                    return [
                        sEChartsName,
                        interaction.visibleSeries[sEChartsName] !== false,
                    ];
                }),
            ),
        },
        tooltip: buildChartTooltipOption(
            rendering.isNumericXAxis,
            ranges.mainRange,
            sSeriesDisplayNameByEChartsName,
        ),
        dataZoom: buildPanelChartDataZoomOption(
            config.display,
            ranges.mainRange,
            interaction.isWheelZoomEnabled,
        ),
        brush: PANEL_CHART_BRUSH_OPTION,
        toolbox: { ...DEFAULT_NOT_SHOW },
        title: { ...DEFAULT_NOT_SHOW },
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

function getTooltipPrimitiveArrayValue(
    callbackValue: unknown,
): TooltipArrayValue | undefined {
    return Array.isArray(callbackValue)
        ? callbackValue as TooltipArrayValue
        : undefined;
}

function formatTooltipRow(
    tooltipParam: PanelTooltipParam,
    seriesDisplayNameByEChartsName: SeriesDisplayNameMap,
): string {
    const sColorStyle = getTooltipColorStyle(tooltipParam.color);
    const sValue = getTooltipPrimitiveArrayValue(tooltipParam.value);
    const sSeriesName =
        seriesDisplayNameByEChartsName.get(tooltipParam.seriesName ?? '') ??
        tooltipParam.seriesName ??
        '';

    return `<div style="${sColorStyle}margin:0;padding:0;white-space:nowrap">${escapeTooltipHtml(sSeriesName)} : ${escapeTooltipHtml(sValue?.[1] ?? '')}</div>`;
}

function getMainSeriesTooltipItems(
    tooltipFormatterParams: TopLevelFormatterParams,
): PanelTooltipParam[] {
    const sTooltipParams = (
        Array.isArray(tooltipFormatterParams)
            ? tooltipFormatterParams
            : [tooltipFormatterParams]
    ) as PanelTooltipParam[];
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

    const sFirstValue = getTooltipPrimitiveArrayValue(sMainSeriesItems[0].value);
    const sTime = formatAxisPointer(
        Number(sFirstValue?.[0] ?? sMainSeriesItems[0].axisValue),
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

function buildChartTooltipOption(
    isNumericXAxis: boolean,
    mainRange: AxisRange,
    seriesDisplayNameByEChartsName: SeriesDisplayNameMap,
): TooltipComponentOption {
    return {
        ...TOOLTIP_BASE,
        axisPointer: {
            type: 'cross' as const,
            lineStyle: {
                color: 'red',
                width: 0.5,
            },
        },
        formatter: (tooltipFormatterParams) =>
            formatChartTooltip(
                tooltipFormatterParams,
                isNumericXAxis,
                mainRange,
                seriesDisplayNameByEChartsName,
            ),
    };
}

// Combined series
export function buildChartSeriesOption(
    chartRuntime: PanelChartRuntime,
    yAxisOption?: YAXisComponentOption[],
): SeriesOption[] {
    const { config, data, interaction, ranges, rendering } = chartRuntime;
    const resolvedYAxisOption =
        yAxisOption ??
        buildChartYAxisOption(
            config.axes,
            data.chartData,
            config.mode.isRaw,
            config.mode.useNormalize,
            ranges.mainRange,
        );
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
            false,
        ),
        ...sMarkupSeries.navigator,
    ];
}

// Full option
const PANEL_CHART_BASE_OPTION: EChartsOption = {
    animation: true,
    animationDuration: 280,
    animationDurationUpdate: 180,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicOut',
    backgroundColor: '#252525',
    textStyle: { fontFamily: 'Open Sans, Helvetica, Arial, sans-serif' },
};

export function buildChartOption(
    chartRuntime: PanelChartRuntime,
): EChartsOption & { series: SeriesOption[] } {
    const { config, data, ranges, rendering } = chartRuntime;
    const yAxisOption = buildChartYAxisOption(
        config.axes,
        data.chartData,
        config.mode.isRaw,
        config.mode.useNormalize,
        ranges.mainRange,
    );

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

// Events
type ChartEvents = {
    datazoom: (params: EChartDataZoomEventPayload) => void;
    brushEnd: (params: EChartBrushPayload) => void;
    mouseover: (params: PanelChartClickPayload) => void;
    mouseout: (params: PanelChartClickPayload) => void;
    legendselectchanged: (params: PanelChartLegendChangePayload) => void;
    highlight: (params: PanelChartHighlightPayload) => void;
    downplay: (params: PanelChartHighlightPayload) => void;
    updateAxisPointer: (params: PanelChartAxisPointerPayload) => void;
    globalout: () => void;
    click: (params: PanelChartClickPayload) => void;
};

type BuildChartEventParams = PanelChartHandlers & {
    ranges: RangeState;
    interactionMode: {
        overlayMode: PanelOverlayMode;
        isSelectionMode: boolean;
        isDragZoomEnabled: boolean;
        isNumericXAxis: boolean;
    };
    chartRefs: {
        chartAreaRef: MutableRefObject<HTMLDivElement | null>;
        chartInstanceRef: MutableRefObject<PanelChartInstance | undefined>;
        latestHoverTimestampRef: MutableRefObject<number | undefined>;
        latestChartClickRef: MutableRefObject<number>;
    };
    legendState: {
        applyLegendHoverState: (
            hoveredLegendSeries: string | undefined,
            force?: boolean,
        ) => void;
        setVisibleSeries: (visibleSeries: ChartSeriesVisibilityMap) => void;
        visibleSeriesRef: MutableRefObject<ChartSeriesVisibilityMap>;
    };
};

export function buildChartEvent({
    ranges,
    interactionMode,
    chartRefs,
    rangeActions,
    markupHandlers,
    onHoveredMainSeriesChange,
    onSelection,
    legendState,
}: BuildChartEventParams): ChartEvents {
    const { mainRange, navigatorRange } = ranges;
    const {
        overlayMode,
        isSelectionMode,
        isDragZoomEnabled,
        isNumericXAxis,
    } = interactionMode;
    const {
        chartAreaRef,
        chartInstanceRef,
        latestHoverTimestampRef,
        latestChartClickRef,
    } = chartRefs;
    const { applyLegendHoverState, setVisibleSeries, visibleSeriesRef } =
        legendState;

    return {
        datazoom: (params) => {
            const sInstance = chartInstanceRef.current;
            const sDataZoomState = selectDataZoomItem(
                sInstance?.getOption?.()?.dataZoom,
                PANEL_SLIDER_DATA_ZOOM_ID,
            );
            const sDataZoomSelection = resolveDataZoomEventItem(
                params,
                PANEL_SLIDER_DATA_ZOOM_ID,
                sDataZoomState,
            );
            const sRange = extractDataZoomOptionRange(
                sDataZoomSelection,
                navigatorRange,
            );

            if (
                !sRange ||
                isSameDataZoomSelection(
                    sDataZoomSelection,
                    mainRange,
                    navigatorRange,
                )
            ) {
                return;
            }

            rangeActions.setMainRange(sRange);
        },
        brushEnd: (params) => {
            const sRange = extractBrushRange(params, isNumericXAxis);

            if (!sRange) {
                return;
            }

            // ECharts processes its raw mouseup after brushEnd. Keep the active
            // target's model/view alive until that event dispatch completes.
            requestAnimationFrame(() => {
                chartInstanceRef.current?.dispatchAction({
                    type: 'brush',
                    areas: [],
                });

                if (sRange.end <= sRange.start) {
                    return;
                }

                if (isSelectionMode) {
                    onSelection(sRange);
                    return;
                }

                if (
                    !isDragZoomEnabled ||
                    isSameRange(sRange, mainRange)
                ) {
                    return;
                }

                rangeActions.setMainRange(sRange);
            });
        },
        legendselectchanged: (params) => {
            visibleSeriesRef.current = params.selected ?? {};
            setVisibleSeries(params.selected ?? {});
        },
        mouseover: (params) => {
            const sMainSeriesName = getMainSeriesName(params);

            if (sMainSeriesName !== undefined) {
                onHoveredMainSeriesChange(sMainSeriesName);
            }
        },
        mouseout: (params) => {
            if (getMainSeriesName(params) !== undefined) {
                onHoveredMainSeriesChange(undefined);
            }
        },
        highlight: (params) => {
            if (isLegendHoverPayload(params)) {
                applyLegendHoverState(
                    params.seriesName ?? params.name ?? undefined,
                );
            }
        },
        downplay: (params) => {
            if (isLegendHoverPayload(params)) {
                applyLegendHoverState(undefined);
            }
        },
        updateAxisPointer: (params) => {
            latestHoverTimestampRef.current =
                getPanelChartAxisPointerTimestamp(params, isNumericXAxis);
        },
        globalout: () => {
            latestHoverTimestampRef.current = undefined;
            onHoveredMainSeriesChange(undefined);
        },
        click: (params) => {
            const sChartInstance = chartInstanceRef.current;
            const sChartRect = chartAreaRef.current?.getBoundingClientRect();
            const { pixel: sPixel, position: sPosition } =
                getPanelChartEventCoordinates(params, sChartRect);

            if (!sPosition) {
                return;
            }

            const sClickedSeriesIndex = getSeriesIndexFromSeriesId(
                params.seriesId,
                MAIN_PANEL_SERIES_ID_PREFIX,
            );
            const sIsAnnotationLabelClick = isAnnotationLabelSeries(
                params.seriesId,
            );
            const sAnnotationIndex = parseNonNegativeInteger(
                asRecord(params.data)?.annotationIndex,
            ) ?? (sIsAnnotationLabelClick ? parseNonNegativeInteger(params.dataIndex) : undefined);

            if (sIsAnnotationLabelClick && sAnnotationIndex !== undefined) {
                latestChartClickRef.current += 1;
                markupHandlers.onActivateAnnotationEditor(
                    sPosition,
                    sAnnotationIndex,
                );
                return;
            }

            if (overlayMode === PanelOverlayMode.ANNOTATION) {
                if (
                    !isMainGridClick(
                        sPixel,
                        sChartInstance,
                    )
                ) {
                    return;
                }

                const sTimestamp = getChartClickTimestamp(
                    params,
                    sPixel,
                    sChartInstance,
                    latestHoverTimestampRef.current,
                    isNumericXAxis,
                );

                if (sTimestamp === undefined) {
                    return;
                }

                latestChartClickRef.current += 1;
                markupHandlers.onOpenCreateAnnotation(
                    sPosition,
                    sClickedSeriesIndex,
                    sTimestamp,
                );
                return;
            }

            const sIsHighlightLabelClick = isHighlightLabelSeries(
                params.seriesId,
            );
            const sHighlightIndex = parseNonNegativeInteger(
                asRecord(params.data)?.highlightIndex,
            ) ?? (sIsHighlightLabelClick ? parseNonNegativeInteger(params.dataIndex) : undefined);

            if (
                overlayMode === PanelOverlayMode.HIGHLIGHT ||
                !sIsHighlightLabelClick ||
                sHighlightIndex === undefined
            ) {
                return;
            }

            latestChartClickRef.current += 1;
            markupHandlers.onActivateHighlightEditor(sPosition, sHighlightIndex);
        },
    };
}

function isLegendHoverPayload(
    payload: PanelChartHighlightPayload | undefined,
): payload is PanelChartHighlightPayload & { excludeSeriesId: string[] } {
    return Array.isArray(payload?.excludeSeriesId);
}

function getMainSeriesName(payload: PanelChartClickPayload): string | undefined {
    if (
        getSeriesIndexFromSeriesId(
            payload.seriesId,
            MAIN_PANEL_SERIES_ID_PREFIX,
        ) === undefined
    ) {
        return undefined;
    }

    const sSeriesName = payload.seriesName?.trim();

    return sSeriesName ? sSeriesName : undefined;
}

function parseNonNegativeInteger(value: unknown): number | undefined {
    const sValue = Number(value);

    return Number.isInteger(sValue) && sValue >= 0 ? sValue : undefined;
}

function getSeriesIndexFromSeriesId(
    seriesId: string | undefined,
    seriesIdPrefix: string,
): number | undefined {
    if (!seriesId?.startsWith(seriesIdPrefix)) {
        return undefined;
    }

    return parseNonNegativeInteger(
        /^(\d+)/.exec(seriesId.slice(seriesIdPrefix.length))?.[1],
    );
}

function isMainGridClick(
    pixel: [number, number] | undefined,
    chartInstance: PanelChartInstance | undefined,
): boolean {
    return Boolean(
        pixel &&
        chartInstance?.containPixel?.({ gridIndex: 0 }, pixel),
    );
}

function getChartClickTimestamp(
    payload: PanelChartClickPayload,
    pixel: [number, number] | undefined,
    chartInstance: PanelChartInstance | undefined,
    latestHoverTimestamp: number | undefined,
    isNumericXAxis: boolean,
): number | undefined {
    const sDirectTimestamp =
        parsePanelChartTimestamp(payload.value, isNumericXAxis) ??
        parsePanelChartTimestamp(payload.data, isNumericXAxis) ??
        parsePanelChartTimestamp(
            asRecord(payload.data)?.value,
            isNumericXAxis,
        ) ??
        parsePanelChartTimestamp(payload.axisValue, isNumericXAxis) ??
        latestHoverTimestamp;

    if (sDirectTimestamp !== undefined) {
        return sDirectTimestamp;
    }

    if (!pixel || !chartInstance?.convertFromPixel) {
        return undefined;
    }

    if (chartInstance.containPixel && !chartInstance.containPixel({ gridIndex: 0 }, pixel)) {
        return undefined;
    }

    return convertPanelChartPixelToTimestamp(
        chartInstance,
        pixel,
        isNumericXAxis,
    );
}
