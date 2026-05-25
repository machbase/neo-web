import type {
    LineSeriesOption,
    ScatterSeriesOption,
    SeriesOption,
    YAXisComponentOption,
} from 'echarts';
import type {
    PanelAnnotation,
    PanelAxes,
    PanelDisplay,
    PanelHighlight,
} from '../../../domain/PanelDomain';
import {
    getPanelSeriesDisplayColor,
    type PanelSeriesDefinition,
} from '../../../domain/SeriesDomain';
import type { TimeRangeMs } from '../../../domain/time/TimeTypes';
import type { ChartRow, ChartSeriesData } from '../../../domain/ChartDomain';
import {
    ANNOTATION_GUIDE_SERIES_ID_PREFIX,
    ANNOTATION_GUIDE_LINE_OPACITY,
    ANNOTATION_GUIDE_LINE_WIDTH,
    ANNOTATION_LABEL_SERIES_ID_PREFIX,
    ANNOTATION_LABEL_BORDER_WIDTH,
    ANNOTATION_LABEL_FONT_SIZE,
    ANNOTATION_LABEL_TEXT_COLOR,
    DEFAULT_NOT_SHOW,
    HIGHLIGHT_LABEL_SERIES_STATIC_OPTION,
    HIGHLIGHT_OVERLAY_MARK_AREA_STATIC_OPTION,
    HIGHLIGHT_OVERLAY_SERIES_STATIC_OPTION,
    HIGHLIGHT_OUTLINE_WIDTH,
    MAIN_PANEL_SERIES_ID_PREFIX,
    NAVIGATOR_ANNOTATION_LINE_SERIES_ID,
    NAVIGATOR_HIGHLIGHT_OVERLAY_SERIES_ID,
    PANEL_HOVER_SYMBOL_SIZE,
    PANEL_LEGEND_FADE_AREA_OPACITY,
    PANEL_LEGEND_FADE_ITEM_OPACITY,
    PANEL_LEGEND_FADE_LINE_OPACITY,
    PANEL_LEGEND_FADE_MARK_LINE_OPACITY,
    PANEL_NAVIGATOR_ACTIVE_OPACITY,
    PANEL_NAVIGATOR_FADE_OPACITY,
} from './ChartOptionConstants';
import {
    buildRenderableSeriesAnnotations,
    type RenderableSeriesAnnotation,
} from '../PanelSeriesAnnotationLayout';

type BuildBasePanelLineSeriesOptionParams = {
    id: string;
    name: string;
    data: ChartRow[];
    xAxisIndex: number;
    yAxisIndex: number;
    itemStyle: NonNullable<LineSeriesOption['itemStyle']>;
    lineStyle: NonNullable<LineSeriesOption['lineStyle']>;
    extra?: Omit<
        LineSeriesOption,
        | 'animation'
        | 'data'
        | 'id'
        | 'itemStyle'
        | 'legendHoverLink'
        | 'lineStyle'
        | 'name'
        | 'sampling'
        | 'type'
        | 'xAxisIndex'
        | 'yAxisIndex'
    >;
};

type NavigatorSeriesHoverState = {
    isHoveredSeries: boolean;
    opacity: number;
};

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

type HighlightAreaData = Array<[HighlightAreaPoint, HighlightAreaPoint]>;

type ThresholdMarkLineData = Array<{ yAxis: number }>;

type HighlightLabelData = Array<{
    name: string;
    value: [number, number];
    highlightIndex: number;
    label: {
        color: string;
    };
}>;

type AnnotationGuideLineData = Array<{
    value: [number, number];
    symbol: 'circle' | 'none';
    symbolSize?: number;
    itemStyle?: {
        color: string;
        borderColor?: string;
        borderWidth?: number;
    };
    label: {
        show: false;
    };
}>;

type HighlightOverlayTarget = 'main' | 'navigator';

type TriggerableScatterLabelOption = NonNullable<ScatterSeriesOption['label']> & {
    triggerEvent: true;
};

type NavigatorAnnotationLineData = Array<{
    xAxis: number;
    lineStyle: {
        color: string;
        type: 'solid';
    };
}>;

function buildBasePanelLineSeriesOption({
    id,
    name,
    data,
    xAxisIndex,
    yAxisIndex,
    itemStyle,
    lineStyle,
    extra,
}: BuildBasePanelLineSeriesOptionParams): SeriesOption {
    return {
        id: id,
        name: name,
        type: 'line',
        legendHoverLink: false,
        xAxisIndex: xAxisIndex,
        yAxisIndex: yAxisIndex,
        data: data,
        animation: false,
        sampling: data.length > 1000 ? 'lttb' : undefined,
        lineStyle: lineStyle,
        itemStyle: itemStyle,
        ...extra,
    };
}

function buildThresholdMarkLineData(
    axis: PanelAxes['left_y_axis'],
): ThresholdMarkLineData {
    return [
        axis.upper_control_limit.enabled
            ? { yAxis: axis.upper_control_limit.value }
            : undefined,
        axis.lower_control_limit.enabled
            ? { yAxis: axis.lower_control_limit.value }
            : undefined,
    ].filter((item): item is { yAxis: number } => item !== undefined);
}

export function buildMainSeriesOption(
    chartData: ChartSeriesData[],
    display: PanelDisplay,
    axes: PanelAxes,
    hoveredLegendSeries?: string | undefined,
): SeriesOption[] {
    return chartData.map((series, seriesIndex) => {
        const sBaseSymbolSize = display.point_radius > 0 ? display.point_radius * 2 : 0;
        const sSymbolSize = display.show_point
            ? sBaseSymbolSize
            : Math.max(sBaseSymbolSize, PANEL_HOVER_SYMBOL_SIZE);
        const sIsLegendHoverActive = Boolean(hoveredLegendSeries);
        const sIsHoveredSeries = hoveredLegendSeries === series.name;
        const sSeriesOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_LINE_OPACITY;
        const sItemOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_ITEM_OPACITY;
        const sAreaOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries
                ? display.fill
                : Math.min(display.fill, PANEL_LEGEND_FADE_AREA_OPACITY);
        const sSeriesStroke = sIsHoveredSeries ? display.stroke + 1 : display.stroke;
        const sMarkLineOpacity =
            !sIsLegendHoverActive || sIsHoveredSeries ? 1 : PANEL_LEGEND_FADE_MARK_LINE_OPACITY;
        const sSeriesColor = getPanelSeriesDisplayColor(series, seriesIndex);
        const sMarkLineData = buildThresholdMarkLineData(
            series.yAxis === 0 ? axes.left_y_axis : axes.right_y_axis,
        );

        return buildBasePanelLineSeriesOption({
            id: `${MAIN_PANEL_SERIES_ID_PREFIX}${seriesIndex}`,
            name: series.name,
            data: series.data,
            xAxisIndex: 0,
            yAxisIndex: series.yAxis ?? 0,
            lineStyle: {
                width: sSeriesStroke,
                color: sSeriesColor,
                opacity: sSeriesOpacity,
            },
            itemStyle: {
                color: sSeriesColor,
                opacity: sItemOpacity,
            },
            extra: {
                symbol: 'circle',
                showSymbol: display.show_point,
                symbolSize: sSymbolSize,
                areaStyle:
                    display.fill > 0
                        ? { opacity: sAreaOpacity, color: sSeriesColor }
                        : undefined,
                connectNulls: display.connect_nulls,
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
            },
        });
    });
}

function getNavigatorSeriesHoverState(
    seriesName: string,
    hoveredLegendSeries?: string | undefined,
): NavigatorSeriesHoverState {
    const sIsLegendHoverActive = Boolean(hoveredLegendSeries);
    const sIsHoveredSeries = hoveredLegendSeries === seriesName;

    return {
        isHoveredSeries: sIsHoveredSeries,
        opacity:
            !sIsLegendHoverActive || sIsHoveredSeries
                ? PANEL_NAVIGATOR_ACTIVE_OPACITY
                : PANEL_NAVIGATOR_FADE_OPACITY,
    };
}

function buildNavigatorSeriesItem(
    series: ChartSeriesData,
    seriesIndex: number,
    seriesColor: string,
    hoverState: NavigatorSeriesHoverState,
): SeriesOption {
    return buildBasePanelLineSeriesOption({
        id: `navigator-series-${seriesIndex}`,
        name: series.name,
        data: series.data,
        xAxisIndex: 1,
        yAxisIndex: 2,
        lineStyle: {
            width: hoverState.isHoveredSeries ? 2 : 1,
            color: seriesColor,
            opacity: hoverState.opacity,
        },
        itemStyle: {
            color: seriesColor,
            opacity: hoverState.opacity,
        },
        extra: {
            showSymbol: false,
            silent: true,
            tooltip: {
                show: false,
            },
            z: hoverState.isHoveredSeries ? 3 : 1,
            emphasis: {
                disabled: true,
            },
        },
    });
}

export function buildNavigatorSeriesOption(
    chartData: ChartSeriesData[],
    hoveredLegendSeries?: string | undefined,
): SeriesOption[] {
    return chartData.map((series, seriesIndex) => {
        const sHoverState = getNavigatorSeriesHoverState(series.name, hoveredLegendSeries);
        const sSeriesColor = getPanelSeriesDisplayColor(series, seriesIndex);

        return buildNavigatorSeriesItem(series, seriesIndex, sSeriesColor, sHoverState);
    });
}

function isRenderableHighlight(highlight: PanelHighlight): boolean {
    return (
        Number.isFinite(highlight.timeRange.startTime) &&
        Number.isFinite(highlight.timeRange.endTime) &&
        highlight.timeRange.endTime > highlight.timeRange.startTime
    );
}

function getHighlightAreaData(
    highlights: PanelHighlight[],
    includeName: boolean,
): HighlightAreaData {
    return (highlights ?? [])
        .filter(isRenderableHighlight)
        .map(
            (highlight): [HighlightAreaPoint, HighlightAreaPoint] => [
                {
                    ...(includeName ? { name: highlight.text || 'unnamed' } : {}),
                    xAxis: highlight.timeRange.startTime,
                    itemStyle: {
                        color: createHighlightOverlayColor(highlight.fillColor),
                        borderColor: createHighlightOutlineColor(highlight.fillColor),
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
): HighlightLabelData {
    return (highlights ?? [])
        .filter(isRenderableHighlight)
        .map((highlight, highlightIndex) => ({
            name: highlight.text || 'unnamed',
            value: [
                (highlight.timeRange.startTime + highlight.timeRange.endTime) / 2,
                labelY,
            ],
            highlightIndex: highlightIndex,
            label: {
                color: highlight.textColor,
            },
        }));
}

function createHighlightOverlayColor(fillColor: string): string {
    return createColorWithAlpha(fillColor, 0.16);
}

function createHighlightOutlineColor(fillColor: string): string {
    return createColorWithAlpha(fillColor, 0.82);
}

function createColorWithAlpha(color: string, alpha: number): string {
    const sHexMatch = /^#([0-9a-fA-F]{6})$/.exec(color);

    if (!sHexMatch) {
        return color;
    }

    const sRgbHex = sHexMatch[1];
    const sRed = Number.parseInt(sRgbHex.slice(0, 2), 16);
    const sGreen = Number.parseInt(sRgbHex.slice(2, 4), 16);
    const sBlue = Number.parseInt(sRgbHex.slice(4, 6), 16);

    return `rgba(${sRed}, ${sGreen}, ${sBlue}, ${alpha})`;
}

export function buildHighlightOverlaySeries(
    highlights: PanelHighlight[],
    target: HighlightOverlayTarget,
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
                      xAxisIndex: 1,
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

export function buildHighlightLabelSeries(
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

function buildAnnotationGuideLineData(
    annotations: RenderableSeriesAnnotation[],
): AnnotationGuideLineData {
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

function buildAnnotationSeriesId(
    seriesIdPrefix: string,
    seriesIndex: number,
    clip: boolean,
): string {
    return `${seriesIdPrefix}${seriesIndex}${clip ? '-clipped' : ''}`;
}

function createAnnotationSeriesGroup(
    annotations: RenderableSeriesAnnotation[],
    seriesPosition: number,
): {
    guideLineSeries: LineSeriesOption;
    labelSeries: ScatterSeriesOption;
} {
    const seriesSample = annotations[0];
    const sSharedSeriesOption = {
        legendHoverLink: false,
        xAxisIndex: 0,
        yAxisIndex: seriesSample.yAxisIndex,
        clip: seriesSample.clip,
        animation: false,
        tooltip: DEFAULT_NOT_SHOW,
    };

    return {
        guideLineSeries: {
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
        labelSeries: {
            id: buildAnnotationSeriesId(
                ANNOTATION_LABEL_SERIES_ID_PREFIX,
                seriesSample.seriesIndex,
                seriesSample.clip,
            ),
            type: 'scatter',
            ...sSharedSeriesOption,
            data: annotations.map((annotation) => ({
                name: annotation.text,
                value: [annotation.anchorTime, annotation.labelY],
                annotationIndex: annotation.annotationIndex,
                symbolSize: annotation.symbolSize,
                itemStyle: {
                    color: annotation.fillColor,
                    borderColor: createAnnotationBorderColor(annotation.fillColor),
                    borderWidth: ANNOTATION_LABEL_BORDER_WIDTH,
                },
                label: {
                    color: annotation.textColor,
                },
            })),
            symbol: 'rect',
            symbolKeepAspect: false,
            label: {
                show: true,
                position: 'inside',
                formatter: '{b}',
                color: ANNOTATION_LABEL_TEXT_COLOR,
                fontSize: ANNOTATION_LABEL_FONT_SIZE,
                fontWeight: 600,
                lineHeight: 14,
                padding: [2, 7],
                triggerEvent: true,
            } as TriggerableScatterLabelOption,
            z: 8,
            emphasis: {
                scale: false,
            },
        },
    };
}

function buildNavigatorAnnotationLineData(
    annotations: RenderableSeriesAnnotation[],
): NavigatorAnnotationLineData {
    return annotations.map((annotation) => ({
        xAxis: annotation.anchorTime,
        lineStyle: {
            color: annotation.fillColor,
            type: 'solid',
        },
    }));
}

export function buildNavigatorAnnotationLineSeries(
    annotations: PanelAnnotation[],
    seriesDefinitions: PanelSeriesDefinition[],
    chartData: ChartSeriesData[],
    yAxisOptions: YAXisComponentOption[],
    navigatorRange: TimeRangeMs,
    visibleSeries: Record<string, boolean> = {},
): SeriesOption[] {
    const sAnnotationLines = buildNavigatorAnnotationLineData(
        buildRenderableSeriesAnnotations(
            annotations,
            seriesDefinitions,
            chartData,
            yAxisOptions,
            navigatorRange,
            visibleSeries,
        ),
    );

    if (sAnnotationLines.length === 0) {
        return [];
    }

    return [buildNavigatorMarkLineSeries(sAnnotationLines)];
}

function buildNavigatorMarkLineSeries(markLineData: NavigatorAnnotationLineData): SeriesOption {
    return {
        id: NAVIGATOR_ANNOTATION_LINE_SERIES_ID,
        type: 'line',
        legendHoverLink: false,
        silent: true,
        xAxisIndex: 1,
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
            data: markLineData,
        },
        z: 5,
        emphasis: {
            disabled: true,
        },
    };
}

function createAnnotationBorderColor(fillColor: string): string {
    const sHexMatch = /^#([0-9a-fA-F]{6})$/.exec(fillColor);

    if (!sHexMatch) {
        return 'rgba(255, 255, 255, 0.55)';
    }

    const sRgbHex = sHexMatch[1];
    const sRed = Number.parseInt(sRgbHex.slice(0, 2), 16);
    const sGreen = Number.parseInt(sRgbHex.slice(2, 4), 16);
    const sBlue = Number.parseInt(sRgbHex.slice(4, 6), 16);
    const sBrightness = (sRed * 299 + sGreen * 587 + sBlue * 114) / 1000;

    return sBrightness > 180
        ? 'rgba(22, 22, 22, 0.36)'
        : 'rgba(255, 255, 255, 0.62)';
}

export function buildSeriesAnnotationSeries(
    annotations: PanelAnnotation[],
    seriesDefinitions: PanelSeriesDefinition[],
    chartData: ChartSeriesData[],
    yAxisOptions: YAXisComponentOption[],
    visibleRange: TimeRangeMs,
    visibleSeries: Record<string, boolean> = {},
): SeriesOption[] {
    const annotationsBySeries = new Map<string, RenderableSeriesAnnotation[]>();

    buildRenderableSeriesAnnotations(
        annotations,
        seriesDefinitions,
        chartData,
        yAxisOptions,
        visibleRange,
        visibleSeries,
    ).forEach((annotation) => {
        const sAnnotationGroupKey = `${annotation.seriesIndex}:${annotation.clip}`;
        const seriesAnnotations = annotationsBySeries.get(sAnnotationGroupKey) ?? [];

        seriesAnnotations.push(annotation);
        annotationsBySeries.set(sAnnotationGroupKey, seriesAnnotations);
    });

    const annotationSeriesGroups = [...annotationsBySeries.values()].map(
        (seriesAnnotations, seriesPosition) =>
            createAnnotationSeriesGroup(
                seriesAnnotations,
                seriesPosition,
            ),
    );

    return [
        ...annotationSeriesGroups.map((seriesGroup) => seriesGroup.guideLineSeries),
        ...annotationSeriesGroups.map((seriesGroup) => seriesGroup.labelSeries),
    ];
}
