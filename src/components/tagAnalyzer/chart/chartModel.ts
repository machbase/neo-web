import { type YAXisComponentOption, type XAXisComponentOption, type LineSeriesOption, type SeriesOption, type MarkAreaComponentOption, type ScatterSeriesOption, type CustomSeriesOption, type CustomSeriesRenderItemAPI, type CustomSeriesRenderItemParams, type CustomSeriesRenderItemReturn, type BrushComponentOption, type DataZoomComponentOption, type EChartsOption, type LegendComponentOption, type TooltipComponentOption, type TooltipComponentFormatterCallbackParams as TopLevelFormatterParams } from 'echarts';
import {
    roundNumericAxisBounds,
    type AxisRange,
    type PanelRangeState,
} from '../range/rangeModel';
import {
    getRangeCenter,
    getRangeWidth,
    isSameRange,
    isValidRange,
} from '../range/rangeArithmetic';
import { formatNumericAxisLabel } from '../range/format/numericRangeFormat';
import { formatAxisValue, formatAxisPointerLabel } from '../range/format/rangeFormat';
import { type RuntimePanelAxes, type RuntimePanelDisplay, type PanelChartRuntime, type EChartBrushPayload, type EChartDataZoomEventPayload, type PanelChartAxisPointerPayload, type PanelChartClickPayload, type PanelChartHighlightPayload, type PanelChartInstance, type PanelChartLegendChangePayload } from './chartRuntime';
import { type ChartRow, type ChartSeriesData, type ChartSeriesVisibilityMap, getChartSeriesEChartsName } from './chartData';
import { getPanelSeriesDisplayColor, DEFAULT_SERIES_ANNOTATION_TEXT_COLOR } from '../seriesModel';
import { DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR, type PanelHighlight, type ValueRange } from '../panel/panelModel';
import { buildRenderableSeriesAnnotations, type AnnotationRenderContext, type RenderableSeriesAnnotation, type PanelChartClientPosition, getChartLayoutMetrics, PANEL_GRID_BOTTOM, PANEL_GRID_SIDE, PANEL_NAVIGATOR_GRID_SIDE, PANEL_SLIDER_HEIGHT, convertPanelChartPixelToTimestamp, getPanelChartAxisPointerTimestamp, getPanelChartEventCoordinates, getPanelChartRecordValue, parsePanelChartTimestamp, extractBrushRange, extractDataZoomEventRange, selectDataZoomItem } from './chartGeometry';
import { type MutableRefObject } from 'react';
import { PanelOverlayMode } from '../panel/panelInteraction';

export type PanelChartHandlers = {
    rangeActions: {
        applyMainZoomRange: (range: AxisRange) => void;
        applyMainNavigatorSelectionRange: (range: AxisRange) => void;
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
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;
const SAFE_TOOLTIP_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const PANEL_NAVIGATOR_SLIDER_X_AXIS_INDEX = 1;
const PANEL_NAVIGATOR_DATA_X_AXIS_INDEX = 2;
export const PANEL_SLIDER_DATA_ZOOM_ID = 'panel-slider-data-zoom';
const HIGHLIGHT_LABEL_SERIES_ID = 'highlight-labels';
export const MAIN_PANEL_SERIES_ID_PREFIX = 'main-series-';
export const PANEL_NAVIGATOR_SERIES_ID_PREFIX = 'navigator-series-';
const ANNOTATION_LABEL_SERIES_ID_PREFIX = 'annotation-label-series-';

const DEFAULT_NOT_SHOW = { show: false } as const;

function parseHexColor(color: string) {
    const sRgbHex = HEX_COLOR_PATTERN.exec(color)?.[1];

    return sRgbHex
        ? {
              r: Number.parseInt(sRgbHex.slice(0, 2), 16),
              g: Number.parseInt(sRgbHex.slice(2, 4), 16),
              b: Number.parseInt(sRgbHex.slice(4, 6), 16),
          }
        : undefined;
}

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
        formatter: (value: number) => formatNumericAxisLabel(value),
    } satisfies YAXisComponentOption['axisLabel'],
};

const HIDDEN_AXIS_PART = {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
    splitLine: { show: false },
    axisPointer: {
        show: false,
        label: { show: false },
    },
} as const;

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
                    timestamp >= visibleRange.startTime &&
                    timestamp <= visibleRange.endTime
                ))
        ) {
            continue;
        }

        const sMin = zeroBase ? Math.min(value, 0) : value;
        const sMax = zeroBase ? Math.max(value, 0) : value;
        if (axisBounds[0] === undefined || axisBounds[0] > sMin) {
            axisBounds[0] = sMin;
        }
        if (axisBounds[1] === undefined || axisBounds[1] < sMax) {
            axisBounds[1] = sMax;
        }
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

        if (axisBounds[0] === undefined || axisBounds[0] > threshold.value) {
            axisBounds[0] = threshold.value;
        }
        if (axisBounds[1] === undefined || axisBounds[1] < threshold.value) {
            axisBounds[1] = threshold.value;
        }
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
    panelRange: AxisRange,
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
            min: panelRange.startTime,
            max: panelRange.endTime,
            axisLine: CHART_AXIS_STYLE.line,
            axisTick: CHART_AXIS_STYLE.line,
            axisLabel: {
                ...CHART_AXIS_STYLE.xLabel,
                formatter: (xAxisValue: number) =>
                    formatAxisValue(xAxisValue, panelRange, isNumericXAxis),
            },
            splitLine: {
                show: display.useZoom && axes.x.showTickline,
                lineStyle: CHART_AXIS_STYLE.splitLine,
            },
            axisPointer: {
                label: {
                    show: false,
                },
            },
        },
        ...[
            PANEL_NAVIGATOR_X_AXIS_ID,
            PANEL_NAVIGATOR_DATA_X_AXIS_ID,
        ].map((id) => ({
            id,
            type: sAxisType,
            gridIndex: PANEL_NAVIGATOR_SLIDER_X_AXIS_INDEX,
            min: navigatorRange.startTime,
            max: navigatorRange.endTime,
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
            yAxisIndex: 2,
            showSymbol: false,
            silent: true,
            tooltip: {
                show: false,
            },
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

// Highlights
type HighlightAreaPoint = {
    name?: string;
    xAxis: number;
    itemStyle?: {
        color: string;
        borderColor?: string;
        borderType?: 'solid';
        borderWidth?: number;
    };
};

const HIGHLIGHT_OUTLINE_WIDTH = 1;
const NAVIGATOR_HIGHLIGHT_OVERLAY_SERIES_ID = 'navigator-highlight-overlay';
const TRANSPARENT_COLOR = 'rgba(0, 0, 0, 0)';

const HIGHLIGHT_OVERLAY_SERIES_STATIC_OPTION: LineSeriesOption = {
    id: 'highlight-overlay',
    type: 'line',
    xAxisIndex: 0,
    yAxisIndex: 0,
    data: [],
    symbol: 'none',
    showSymbol: false,
    silent: true,
    animation: false,
    legendHoverLink: false,
    lineStyle: { width: 0, opacity: 0 },
    itemStyle: { opacity: 0 },
    tooltip: DEFAULT_NOT_SHOW,
    z: 1,
    emphasis: { disabled: true },
};

const HIGHLIGHT_OVERLAY_MARK_AREA_STATIC_OPTION: MarkAreaComponentOption = {
    silent: true,
    itemStyle: { color: 'rgba(253, 181, 50, 0.16)' },
    label: {
        ...DEFAULT_NOT_SHOW,
        color: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
        fontSize: 10,
    },
};

const HIGHLIGHT_LABEL_SERIES_STATIC_OPTION: ScatterSeriesOption = {
    id: HIGHLIGHT_LABEL_SERIES_ID,
    type: 'scatter',
    xAxisIndex: 0,
    yAxisIndex: 0,
    symbol: 'circle',
    symbolSize: 0,
    animation: false,
    legendHoverLink: false,
    itemStyle: {
        color: TRANSPARENT_COLOR,
        borderColor: TRANSPARENT_COLOR,
    },
    label: {
        show: true,
        position: 'inside',
        color: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
        fontSize: 10,
        fontWeight: 600,
        formatter: '{b}',
        padding: 0,
    },
    emphasis: { scale: false },
    tooltip: DEFAULT_NOT_SHOW,
    z: 3,
};

function isRenderableHighlight(highlight: PanelHighlight): boolean {
    return isValidRange(highlight.timeRange);
}

function getHighlightAreaData(
    highlights: PanelHighlight[],
    includeName: boolean,
) {
    return highlights
        .filter(isRenderableHighlight)
        .map(
            (highlight): [HighlightAreaPoint, HighlightAreaPoint] => [
                {
                    ...(includeName ? { name: highlight.text || 'unnamed' } : {}),
                    xAxis: highlight.timeRange.startTime,
                    itemStyle: {
                        color: createColorWithAlpha(highlight.fillColor, 0.16),
                        borderColor: createColorWithAlpha(highlight.fillColor, 0.82),
                        borderType: 'solid',
                        borderWidth: HIGHLIGHT_OUTLINE_WIDTH,
                    },
                },
                {
                    xAxis: highlight.timeRange.endTime,
                },
            ],
        );
}

function getHighlightLabelY(axisMin: number, axisMax: number): number {
    const sAxisHeight = axisMax - axisMin;

    return (
        axisMax -
        (sAxisHeight > 0 ? sAxisHeight * 0.04 : Math.max(Math.abs(axisMax) * 0.04, 1))
    );
}

function getHighlightLabelData(
    highlights: PanelHighlight[],
    labelY: number,
) {
    return highlights
        .flatMap((highlight, highlightIndex) =>
            isRenderableHighlight(highlight)
                ? [{
                      name: highlight.text || 'unnamed',
                      value: [
                          getRangeCenter(highlight.timeRange),
                          labelY,
                      ] as [number, number],
                      highlightIndex,
                      label: {
                          color: highlight.textColor,
                      },
                  }]
                : [],
        );
}

function createColorWithAlpha(color: string, alpha: number): string {
    const sRgb = parseHexColor(color);

    if (!sRgb) {
        return color;
    }

    return `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, ${alpha})`;
}

function buildHighlightOverlaySeries(
    highlights: PanelHighlight[],
    target: 'main' | 'navigator',
): SeriesOption[] {
    const sIsNavigatorTarget = target === 'navigator';
    const sHighlightAreas = getHighlightAreaData(highlights, !sIsNavigatorTarget);

    if (sHighlightAreas.length === 0) {
        return [];
    }

    return [
        {
            ...HIGHLIGHT_OVERLAY_SERIES_STATIC_OPTION,
            ...(sIsNavigatorTarget
                ? {
                      id: NAVIGATOR_HIGHLIGHT_OVERLAY_SERIES_ID,
                      xAxisIndex: PANEL_NAVIGATOR_DATA_X_AXIS_INDEX,
                      yAxisIndex: 2,
                      z: 0,
                  }
                : {}),
            markArea: {
                ...HIGHLIGHT_OVERLAY_MARK_AREA_STATIC_OPTION,
                data: sHighlightAreas,
            },
        },
    ];
}

function buildHighlightLabelSeries(
    highlights: PanelHighlight[],
    primaryYAxis: YAXisComponentOption,
): SeriesOption[] {
    const sAxisMin = Number(primaryYAxis.min);
    const sAxisMax = Number(primaryYAxis.max);

    if (!Number.isFinite(sAxisMin) || !Number.isFinite(sAxisMax)) {
        return [];
    }

    const sLabelY = getHighlightLabelY(sAxisMin, sAxisMax);
    const sLabelData = getHighlightLabelData(highlights, sLabelY);

    if (sLabelData.length === 0) {
        return [];
    }

    return [
        {
            ...HIGHLIGHT_LABEL_SERIES_STATIC_OPTION,
            data: sLabelData,
        },
    ];
}

// Annotations
type CartesianRenderCoordSys = {
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
};

const ANNOTATION_GUIDE_LINE_OPACITY = 0.9;
const ANNOTATION_GUIDE_LINE_WIDTH = 1.5;
const ANNOTATION_GUIDE_SERIES_ID_PREFIX = 'annotation-guide-series-';
const ANNOTATION_LABEL_BORDER_WIDTH = 1;
const ANNOTATION_LABEL_CORNER_RADIUS = 3;
const ANNOTATION_LABEL_FONT_SIZE = 11;
const ANNOTATION_LABEL_TEXT_COLOR = DEFAULT_SERIES_ANNOTATION_TEXT_COLOR;
const ANNOTATION_LABEL_TEXT_HORIZONTAL_PADDING = 14;
const NAVIGATOR_ANNOTATION_LINE_SERIES_ID = 'navigator-annotation-lines';

function buildAnnotationGuideLineData(
    annotations: RenderableSeriesAnnotation[],
) {
    return annotations.flatMap((annotation) => [
        {
            value: [annotation.anchorTime, annotation.anchorValue],
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: {
                color: annotation.fillColor,
                borderColor: createAnnotationBorderColor(annotation.fillColor),
                borderWidth: ANNOTATION_LABEL_BORDER_WIDTH,
            },
            label: { show: false },
        },
        {
            value: [annotation.anchorTime, annotation.labelY],
            symbol: 'none',
            label: { show: false },
        },
        {
            value: [Number.NaN, Number.NaN],
            symbol: 'none',
            label: { show: false },
        },
    ]);
}

function buildAnnotationLabelData(
    annotations: RenderableSeriesAnnotation[],
) {
    return annotations.map((annotation) => ({
        name: annotation.text,
        value: [annotation.anchorTime, annotation.labelY],
        annotationIndex: annotation.annotationIndex,
    }));
}

function buildAnnotationSeriesId(
    seriesIdPrefix: string,
    seriesIndex: number,
    clip: boolean,
): string {
    return `${seriesIdPrefix}${seriesIndex}${clip ? '-clipped' : ''}`;
}

function isCartesianRenderCoordSys(
    coordSys: CustomSeriesRenderItemParams['coordSys'],
): coordSys is CartesianRenderCoordSys {
    return (
        coordSys.type === 'cartesian2d' &&
        Number.isFinite((coordSys as CartesianRenderCoordSys).x) &&
        Number.isFinite((coordSys as CartesianRenderCoordSys).y) &&
        Number.isFinite((coordSys as CartesianRenderCoordSys).width) &&
        Number.isFinite((coordSys as CartesianRenderCoordSys).height)
    );
}

function clampNumber(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
}

function createAnnotationLabelRenderItem(
    annotations: RenderableSeriesAnnotation[],
): NonNullable<CustomSeriesOption['renderItem']> {
    return (
        params: CustomSeriesRenderItemParams,
        api: CustomSeriesRenderItemAPI,
    ): CustomSeriesRenderItemReturn => {
        const annotation = annotations[params.dataIndex];

        if (!annotation || !isCartesianRenderCoordSys(params.coordSys)) {
            return undefined;
        }

        const xValue = Number(api.value(0));
        const yValue = Number(api.value(1));
        const point = api.coord([xValue, yValue]);
        const centerX = Number(point[0]);
        const centerY = Number(point[1]);

        if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
            return undefined;
        }

        const labelWidth = Math.min(annotation.symbolSize[0], params.coordSys.width);
        const labelHeight = Math.min(annotation.symbolSize[1], params.coordSys.height);

        if (labelWidth <= 0 || labelHeight <= 0) {
            return undefined;
        }

        const labelX = clampNumber(
            centerX - labelWidth / 2,
            params.coordSys.x,
            params.coordSys.x + params.coordSys.width - labelWidth,
        );
        const labelY = clampNumber(
            centerY - labelHeight / 2,
            params.coordSys.y,
            params.coordSys.y + params.coordSys.height - labelHeight,
        );

        return {
            type: 'group',
            clipPath: {
                type: 'rect',
                shape: {
                    x: params.coordSys.x,
                    y: params.coordSys.y,
                    width: params.coordSys.width,
                    height: params.coordSys.height,
                },
            },
            children: [
                {
                    type: 'rect',
                    shape: {
                        x: labelX,
                        y: labelY,
                        width: labelWidth,
                        height: labelHeight,
                        r: ANNOTATION_LABEL_CORNER_RADIUS,
                    },
                    style: {
                        fill: annotation.fillColor,
                        stroke: createAnnotationBorderColor(annotation.fillColor),
                        lineWidth: ANNOTATION_LABEL_BORDER_WIDTH,
                    },
                },
                {
                    type: 'text',
                    style: {
                        x: labelX + labelWidth / 2,
                        y: labelY + labelHeight / 2,
                        text: annotation.text,
                        fill: annotation.textColor || ANNOTATION_LABEL_TEXT_COLOR,
                        font: api.font({
                            fontSize: ANNOTATION_LABEL_FONT_SIZE,
                            fontWeight: 600,
                        }),
                        align: 'center',
                        verticalAlign: 'middle',
                        width: Math.max(
                            labelWidth - ANNOTATION_LABEL_TEXT_HORIZONTAL_PADDING,
                            0,
                        ),
                        overflow: 'truncate',
                        lineHeight: 14,
                    },
                },
            ],
        };
    };
}

function createAnnotationSeriesGroup(
    annotations: RenderableSeriesAnnotation[],
    seriesPosition: number,
): SeriesOption[] {
    const seriesSample = annotations[0];
    if (!seriesSample) {
        throw new Error('Cannot create annotation series for an empty annotation group.');
    }

    const sSharedSeriesOption = {
        legendHoverLink: false,
        xAxisIndex: 0,
        yAxisIndex: seriesSample.yAxisIndex,
        clip: seriesSample.clip,
        animation: false,
        tooltip: DEFAULT_NOT_SHOW,
    };

    return [
        {
            id: buildAnnotationSeriesId(
                ANNOTATION_GUIDE_SERIES_ID_PREFIX,
                seriesSample.seriesIndex,
                seriesSample.clip,
            ),
            type: 'line',
            ...sSharedSeriesOption,
            silent: true,
            data: buildAnnotationGuideLineData(annotations),
            showSymbol: true,
            symbol: 'none',
            connectNulls: false,
            lineStyle: {
                color: seriesSample.color,
                width: ANNOTATION_GUIDE_LINE_WIDTH,
                opacity: ANNOTATION_GUIDE_LINE_OPACITY,
                type: 'solid',
            },
            z: 4 + seriesPosition,
            emphasis: {
                disabled: true,
            },
        },
        {
            id: buildAnnotationSeriesId(
                ANNOTATION_LABEL_SERIES_ID_PREFIX,
                seriesSample.seriesIndex,
                seriesSample.clip,
            ),
            type: 'custom',
            ...sSharedSeriesOption,
            coordinateSystem: 'cartesian2d',
            renderItem: createAnnotationLabelRenderItem(annotations),
            data: buildAnnotationLabelData(annotations),
            z: 8,
        },
    ];
}

function buildNavigatorAnnotationLineSeries(
    context: AnnotationRenderContext,
): SeriesOption[] {
    const sAnnotationLines = buildRenderableSeriesAnnotations(context).map((annotation) => ({
        xAxis: annotation.anchorTime,
        lineStyle: {
            color: annotation.fillColor,
            type: 'solid' as const,
        },
    }));

    if (sAnnotationLines.length === 0) {
        return [];
    }

    return [
        {
            id: NAVIGATOR_ANNOTATION_LINE_SERIES_ID,
            type: 'line',
            legendHoverLink: false,
            silent: true,
            xAxisIndex: PANEL_NAVIGATOR_DATA_X_AXIS_INDEX,
            yAxisIndex: 2,
            data: [],
            symbol: 'none',
            showSymbol: false,
            animation: false,
            tooltip: DEFAULT_NOT_SHOW,
            lineStyle: { width: 0, opacity: 0 },
            itemStyle: { opacity: 0 },
            markLine: {
                silent: true,
                symbol: 'none',
                label: DEFAULT_NOT_SHOW,
                lineStyle: { width: 2, opacity: 0.95, type: 'solid' },
                data: sAnnotationLines,
            },
            z: 5,
            emphasis: {
                disabled: true,
            },
        },
    ];
}

function createAnnotationBorderColor(fillColor: string): string {
    const sRgb = parseHexColor(fillColor);

    if (!sRgb) {
        return 'rgba(255, 255, 255, 0.55)';
    }

    const sBrightness = (sRgb.r * 299 + sRgb.g * 587 + sRgb.b * 114) / 1000;

    return sBrightness > 180
        ? 'rgba(22, 22, 22, 0.36)'
        : 'rgba(255, 255, 255, 0.62)';
}

function buildSeriesAnnotationSeries(
    context: AnnotationRenderContext,
): SeriesOption[] {
    const annotationsBySeries = new Map<string, RenderableSeriesAnnotation[]>();

    buildRenderableSeriesAnnotations(context).forEach((annotation) => {
        const sAnnotationGroupKey = `${annotation.seriesIndex}:${annotation.clip}`;
        const seriesAnnotations = annotationsBySeries.get(sAnnotationGroupKey) ?? [];

        seriesAnnotations.push(annotation);
        annotationsBySeries.set(sAnnotationGroupKey, seriesAnnotations);
    });

    return [...annotationsBySeries.values()].flatMap(
        (seriesAnnotations, seriesPosition) =>
            createAnnotationSeriesGroup(
                seriesAnnotations,
                seriesPosition,
            ),
    );
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
            ranges.panelRange,
            sSeriesDisplayNameByEChartsName,
        ),
        dataZoom: buildPanelChartDataZoomOption(
            config.display,
            ranges.panelRange,
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
        ...(visibleRange && visibleRange.startTime < visibleRange.endTime
            ? {
                  startValue: visibleRange.startTime,
                  endValue: visibleRange.endTime,
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
    panelRange: AxisRange,
    isWheelZoomEnabled: boolean,
): DataZoomComponentOption[] {
    const sPanelRangeDataZoom = panelRange.startTime < panelRange.endTime
        ? {
              startValue: panelRange.startTime,
              endValue: panelRange.endTime,
          }
        : {};

    return [
        {
            id: PANEL_INSIDE_DATA_ZOOM_ID,
            ...buildInsideDataZoomOption(
                PANEL_NAVIGATOR_SLIDER_X_AXIS_INDEX,
                panelRange,
                isWheelZoomEnabled,
                !display.useZoom,
            ),
        },
        {
            id: PANEL_SLIDER_DATA_ZOOM_ID,
            type: 'slider' as const,
            xAxisIndex: [PANEL_NAVIGATOR_SLIDER_X_AXIS_INDEX],
            filterMode: 'none' as const,
            ...sPanelRangeDataZoom,
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
    panelRange: AxisRange,
    seriesDisplayNameByEChartsName: SeriesDisplayNameMap,
): string {
    const sMainSeriesItems = getMainSeriesTooltipItems(tooltipFormatterParams);
    if (sMainSeriesItems.length === 0) {
        return '';
    }

    const sFirstValue = getTooltipPrimitiveArrayValue(sMainSeriesItems[0].value);
    const sTime = formatAxisPointerLabel(
        Number(sFirstValue?.[0] ?? sMainSeriesItems[0].axisValue),
        isNumericXAxis,
        panelRange,
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
    panelRange: AxisRange,
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
                panelRange,
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
            ranges.panelRange,
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

    return [
        ...buildHighlightOverlaySeries(sRenderableHighlights, 'main'),
        ...buildHighlightLabelSeries(sRenderableHighlights, resolvedYAxisOption[0]),
        ...buildSeriesAnnotationSeries({
            ...sAnnotationContext,
            visibleRange: ranges.panelRange,
        }),
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
        ...buildHighlightOverlaySeries(sRenderableHighlights, 'navigator'),
        ...buildNavigatorAnnotationLineSeries({
            ...sAnnotationContext,
            visibleRange: ranges.navigatorRange,
        }),
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
): EChartsOption {
    const { config, data, ranges, rendering } = chartRuntime;
    const yAxisOption = buildChartYAxisOption(
        config.axes,
        data.chartData,
        config.mode.isRaw,
        config.mode.useNormalize,
        ranges.panelRange,
    );

    return {
        ...PANEL_CHART_BASE_OPTION,
        animation:
            rendering.animateMainDataUpdate &&
            rendering.animateNavigatorDataUpdate,
        ...buildPanelChartFrameOptions(chartRuntime),
        xAxis: buildChartXAxisOption(
            ranges.panelRange,
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
    ranges: PanelRangeState;
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
    const { panelRange, navigatorRange } = ranges;
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
            const sRange = extractDataZoomEventRange(
                params,
                panelRange,
                navigatorRange,
                PANEL_SLIDER_DATA_ZOOM_ID,
                sDataZoomState,
            );

            if (
                !sRange ||
                isSameDataZoomRange(sRange, panelRange, isNumericXAxis)
            ) {
                return;
            }

            rangeActions.applyMainNavigatorSelectionRange(sRange);
        },
        brushEnd: (params) => {
            const sRange = extractBrushRange(params, isNumericXAxis);

            if (!sRange) {
                return;
            }

            chartInstanceRef.current?.dispatchAction({
                type: 'brush',
                areas: [],
            });

            if (sRange.endTime <= sRange.startTime) {
                return;
            }

            if (isSelectionMode) {
                onSelection(sRange);
                return;
            }

            if (
                !isDragZoomEnabled ||
                isSameRange(sRange, panelRange)
            ) {
                return;
            }

            rangeActions.applyMainZoomRange(sRange);
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
            const sIsAnnotationLabelClick =
                getSeriesIndexFromSeriesId(
                    params.seriesId,
                    ANNOTATION_LABEL_SERIES_ID_PREFIX,
                ) !== undefined;
            const sAnnotationIndex = parseNonNegativeInteger(
                getPanelChartRecordValue(params.data, 'annotationIndex'),
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

            const sIsHighlightLabelClick = params.seriesId === HIGHLIGHT_LABEL_SERIES_ID;
            const sHighlightIndex = parseNonNegativeInteger(
                getPanelChartRecordValue(params.data, 'highlightIndex'),
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

export function isSameDataZoomRange(
    left: AxisRange,
    right: AxisRange,
    isNumericXAxis: boolean,
): boolean {
    const sRangeWidth = Math.abs(getRangeWidth(right));
    const sTolerance = isNumericXAxis
        ? Math.max(sRangeWidth * 1e-9, Number.EPSILON)
        : Math.max(sRangeWidth * 1e-9, 1);

    return isSameRange(left, right, sTolerance);
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
            getPanelChartRecordValue(payload.data, 'value'),
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
