import type {
    LineSeriesOption,
    ScatterSeriesOption,
    SeriesOption,
    YAXisComponentOption,
} from 'echarts';
import type { PanelAxes, PanelDisplay, PanelHighlight } from '../../../utils/panelModelTypes';
import { getPanelSeriesDisplayColor } from '../../../utils/series/PanelSeriesColorResolver';
import type {
    ChartRow,
    ChartSeriesData,
    PanelSeriesDefinition,
} from '../../../utils/series/PanelSeriesTypes';
import type { TimeRangeMs } from '../../../utils/time/types/TimeTypes';
import {
    ANNOTATION_GUIDE_LINE_OPACITY,
    ANNOTATION_GUIDE_SERIES_ID_PREFIX,
    ANNOTATION_LABEL_BACKGROUND,
    ANNOTATION_LABEL_SERIES_ID_PREFIX,
    ANNOTATION_LABEL_TEXT_COLOR,
    DEFAULT_NOT_SHOW,
    HIGHLIGHT_LABEL_SERIES_STATIC_OPTION,
    HIGHLIGHT_OVERLAY_MARK_AREA_STATIC_OPTION,
    HIGHLIGHT_OVERLAY_SERIES_STATIC_OPTION,
    MAIN_PANEL_SERIES_ID_PREFIX,
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
} from '../../chartInternal/PanelSeriesAnnotationLayout';

type BuildBasePanelLineSeriesOptionParams = {
    id: string;
    name: string;
    data: ChartRow[];
    xAxisIndex: number;
    yAxisIndex: number;
    itemStyle: NonNullable<SeriesOption['itemStyle']>;
    lineStyle: NonNullable<SeriesOption['lineStyle']>;
    extra?: Omit<
        SeriesOption,
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

type ThresholdLineOption = {
    silent: true;
    symbol: 'none';
    lineStyle: {
        color: string;
        width: number;
    };
    label: {
        show: false;
    };
    data: Array<{
        yAxis: number;
    }>;
};

type NavigatorSeriesHoverState = {
    isHoveredSeries: boolean;
    opacity: number;
};

type HighlightAreaData = Array<[{ name: string; xAxis: number }, { xAxis: number }]>;

export type PanelAnnotationSeries = {
    guideLineSeries: SeriesOption[];
    labelSeries: SeriesOption[];
};

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

function buildThresholdLineOption(
    thresholdColor: string,
    thresholdValue: number,
): ThresholdLineOption {
    return {
        silent: true,
        symbol: 'none',
        lineStyle: {
            color: thresholdColor,
            width: 1,
        },
        label: {
            show: false,
        },
        data: [{ yAxis: thresholdValue }],
    };
}

export function buildMainSeriesOption(
    chartData: ChartSeriesData[],
    display: PanelDisplay,
    axes: PanelAxes,
    hoveredLegendSeries?: string | undefined,
): SeriesOption[] {
    const sLeftThreshold = axes.left_y_axis.upper_control_limit.enabled
        ? buildThresholdLineOption('#ec7676', axes.left_y_axis.upper_control_limit.value)
        : undefined;
    const sLeftLowerThreshold = axes.left_y_axis.lower_control_limit.enabled
        ? buildThresholdLineOption('orange', axes.left_y_axis.lower_control_limit.value)
        : undefined;
    const sRightThreshold = axes.right_y_axis.upper_control_limit.enabled
        ? buildThresholdLineOption('#ec7676', axes.right_y_axis.upper_control_limit.value)
        : undefined;
    const sRightLowerThreshold = axes.right_y_axis.lower_control_limit.enabled
        ? buildThresholdLineOption('orange', axes.right_y_axis.lower_control_limit.value)
        : undefined;

    return chartData.map((series, seriesIndex) => {
        const sMarkLineData = [];
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

        if (series.yAxis === 0) {
            if (sLeftThreshold?.data?.[0]) sMarkLineData.push(sLeftThreshold.data[0]);
            if (sLeftLowerThreshold?.data?.[0]) sMarkLineData.push(sLeftLowerThreshold.data[0]);
        } else {
            if (sRightThreshold?.data?.[0]) sMarkLineData.push(sRightThreshold.data[0]);
            if (sRightLowerThreshold?.data?.[0]) sMarkLineData.push(sRightLowerThreshold.data[0]);
        }

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
                connectNulls: false,
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

function getHighlightAreaData(highlights: PanelHighlight[]): HighlightAreaData {
    return (highlights ?? [])
        .filter(isRenderableHighlight)
        .map((highlight) => [
            {
                name: highlight.text || 'unnamed',
                xAxis: highlight.timeRange.startTime,
            },
            {
                xAxis: highlight.timeRange.endTime,
            },
        ]);
}

function getHighlightLabelY(axisMin: number, axisMax: number): number {
    const sAxisHeight = axisMax - axisMin;

    return (
        axisMax -
        (sAxisHeight > 0 ? sAxisHeight * 0.04 : Math.max(Math.abs(axisMax) * 0.04, 1))
    );
}

function getHighlightLabelData(highlights: PanelHighlight[], labelY: number) {
    return (highlights ?? [])
        .filter(isRenderableHighlight)
        .map((highlight, highlightIndex) => ({
            name: highlight.text || 'unnamed',
            value: [
                (highlight.timeRange.startTime + highlight.timeRange.endTime) / 2,
                labelY,
            ],
            highlightIndex: highlightIndex,
        }));
}

export function buildHighlightOverlaySeriesOption(highlights: PanelHighlight[]): SeriesOption[] {
    const sHighlightAreas = getHighlightAreaData(highlights);

    if (sHighlightAreas.length === 0) {
        return [];
    }

    return [
        {
            ...HIGHLIGHT_OVERLAY_SERIES_STATIC_OPTION,
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
    seriesColor: string,
) {
    return annotations.flatMap((annotation) => [
        {
            value: [annotation.anchorTime, annotation.anchorValue],
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: {
                color: seriesColor,
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

function createAnnotationSeriesGroup(
    annotations: RenderableSeriesAnnotation[],
    seriesPosition: number,
): {
    guideLineSeries: LineSeriesOption;
    labelSeries: ScatterSeriesOption;
} {
    const seriesSample = annotations[0];

    return {
        guideLineSeries: {
            id: `${ANNOTATION_GUIDE_SERIES_ID_PREFIX}${seriesSample.seriesIndex}`,
            type: 'line',
            legendHoverLink: false,
            silent: true,
            xAxisIndex: 0,
            yAxisIndex: seriesSample.yAxisIndex,
            data: buildAnnotationGuideLineData(annotations, seriesSample.color),
            showSymbol: true,
            symbol: 'none',
            connectNulls: false,
            clip: false,
            animation: false,
            tooltip: DEFAULT_NOT_SHOW,
            lineStyle: {
                color: seriesSample.color,
                width: 1,
                opacity: ANNOTATION_GUIDE_LINE_OPACITY,
            },
            z: 4 + seriesPosition,
            emphasis: {
                disabled: true,
            },
        },
        labelSeries: {
            id: `${ANNOTATION_LABEL_SERIES_ID_PREFIX}${seriesSample.seriesIndex}`,
            type: 'scatter',
            legendHoverLink: false,
            xAxisIndex: 0,
            yAxisIndex: seriesSample.yAxisIndex,
            data: annotations.map((annotation) => ({
                name: annotation.text,
                value: [annotation.anchorTime, annotation.labelY],
                annotationIndex: annotation.annotationIndex,
                seriesIndex: annotation.seriesIndex,
                symbolSize: annotation.symbolSize,
            })),
            symbol: 'roundRect',
            symbolKeepAspect: false,
            clip: false,
            itemStyle: {
                color: ANNOTATION_LABEL_BACKGROUND,
                borderColor: seriesSample.color,
                borderWidth: 1,
            },
            label: {
                show: true,
                position: 'inside',
                formatter: '{b}',
                color: ANNOTATION_LABEL_TEXT_COLOR,
                fontSize: 10,
                padding: [2, 6],
            },
            animation: false,
            tooltip: DEFAULT_NOT_SHOW,
            z: 8,
            emphasis: {
                scale: false,
            },
        },
    };
}

export function buildSeriesAnnotationSeries(
    seriesDefinitions: PanelSeriesDefinition[],
    chartData: ChartSeriesData[],
    yAxisOptions: YAXisComponentOption[],
    navigatorRange: TimeRangeMs,
    visibleSeries: Record<string, boolean> = {},
): PanelAnnotationSeries {
    const annotationsBySeries = new Map<number, RenderableSeriesAnnotation[]>();

    buildRenderableSeriesAnnotations(
        seriesDefinitions,
        chartData,
        yAxisOptions,
        navigatorRange,
        visibleSeries,
    ).forEach((annotation) => {
        const seriesAnnotations = annotationsBySeries.get(annotation.seriesIndex) ?? [];

        seriesAnnotations.push(annotation);
        annotationsBySeries.set(annotation.seriesIndex, seriesAnnotations);
    });

    return [...annotationsBySeries.values()].reduce<PanelAnnotationSeries>(
        (seriesGroups, seriesAnnotations, seriesPosition) => {
            const seriesGroup = createAnnotationSeriesGroup(
                seriesAnnotations,
                seriesPosition,
            );

            seriesGroups.guideLineSeries.push(seriesGroup.guideLineSeries);
            seriesGroups.labelSeries.push(seriesGroup.labelSeries);

            return seriesGroups;
        },
        { guideLineSeries: [], labelSeries: [] },
    );
}
