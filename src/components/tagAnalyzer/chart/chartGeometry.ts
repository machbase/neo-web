import { type PanelChartAxisPointerPayload, type PanelChartInstance, type EChartBrushPayload, type EChartDataZoomEventItem, type EChartDataZoomEventPayload, type EChartDataZoomOptionStateItem } from './chartRuntime';
import {
    getRangeWidth,
    getRangeCenter,
} from '../range/rangeArithmetic';
import { type AxisRange } from '../range/rangeModel';
import { type YAXisComponentOption } from 'echarts';
import { type PanelAnnotation } from '../model';
import { getPanelSeriesDisplayColor, type PanelSeriesDefinition } from '../seriesModel';
import { type ChartRow, type ChartSeriesData, getChartSeriesEChartsName } from './chartData';

// Layout
export const PANEL_CHART_HEIGHT = 350;
export const PANEL_GRID_BOTTOM = 20;
export const PANEL_GRID_SIDE = 35;
export const PANEL_NAVIGATOR_GRID_SIDE = 28;
export const PANEL_SLIDER_HEIGHT = 36;

const PANEL_MAIN_TOP = 16;
const PANEL_MAIN_TOP_WITH_LEGEND = 40;
const PANEL_TOOLBAR_HEIGHT = 28;
const PANEL_TOOLBAR_GAP = 22;
const PANEL_MAIN_MIN_HEIGHT = 100;

type PanelChartLayoutMetrics = {
    mainGridTop: number;
    mainGridHeight: number;
    toolbarTop: number;
    sliderTop: number;
    sliderHeight: number;
};

export function getChartLayoutMetrics(showLegend: boolean): PanelChartLayoutMetrics {
    const sMainGridTop = showLegend ? PANEL_MAIN_TOP_WITH_LEGEND : PANEL_MAIN_TOP;
    const sSliderTop = PANEL_CHART_HEIGHT - PANEL_GRID_BOTTOM - PANEL_SLIDER_HEIGHT;
    const sToolbarTop = sSliderTop - PANEL_TOOLBAR_GAP - PANEL_TOOLBAR_HEIGHT;

    return {
        mainGridTop: sMainGridTop,
        mainGridHeight: Math.max(
            sToolbarTop - PANEL_TOOLBAR_GAP - sMainGridTop,
            PANEL_MAIN_MIN_HEIGHT,
        ),
        toolbarTop: sToolbarTop,
        sliderTop: sSliderTop,
        sliderHeight: PANEL_SLIDER_HEIGHT,
    };
}

// Pointer events
type PanelChartClientPosition = {
    x: number;
    y: number;
};

function getFiniteNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
}

export function getPanelChartRecordValue(source: unknown, key: string): unknown {
    return source && typeof source === 'object' && !Array.isArray(source)
        ? (source as Record<string, unknown>)[key]
        : undefined;
}

export function parsePanelChartTimestamp(
    value: unknown,
    isNumericXAxis = false,
): number | undefined {
    if (Array.isArray(value)) {
        return parsePanelChartTimestamp(value[0], isNumericXAxis);
    }

    const timestamp =
        value instanceof Date
            ? value.getTime()
            : typeof value === 'number' || typeof value === 'string'
              ? Number(value)
              : Number.NaN;

    return Number.isFinite(timestamp)
        ? isNumericXAxis
            ? timestamp
            : Math.floor(timestamp)
        : undefined;
}

export function getPanelChartAxisPointerTimestamp(
    payload: PanelChartAxisPointerPayload,
    isNumericXAxis = false,
): number | undefined {
    const sXAxisInfo = payload.axesInfo?.find(
        (axisInfo) => axisInfo.axisDim === 'x' && axisInfo.axisIndex === 0,
    );

    return parsePanelChartTimestamp(sXAxisInfo?.value, isNumericXAxis);
}

export function getPanelChartEventCoordinates(
    payload: unknown,
    chartRect: DOMRect | undefined,
): {
    pixel: [number, number] | undefined;
    position: PanelChartClientPosition | undefined;
} {
    const sEvent = getPanelChartRecordValue(payload, 'event');
    const sNestedEvent = getPanelChartRecordValue(sEvent, 'event');
    const sClientX =
        getFiniteNumber(getPanelChartRecordValue(sEvent, 'clientX')) ??
        getFiniteNumber(getPanelChartRecordValue(sNestedEvent, 'clientX'));
    const sClientY =
        getFiniteNumber(getPanelChartRecordValue(sEvent, 'clientY')) ??
        getFiniteNumber(getPanelChartRecordValue(sNestedEvent, 'clientY'));
    const sClientPosition =
        sClientX !== undefined && sClientY !== undefined
        ? { x: sClientX, y: sClientY }
        : undefined;
    const sOffsetX =
        getFiniteNumber(getPanelChartRecordValue(payload, 'offsetX')) ??
        getFiniteNumber(getPanelChartRecordValue(payload, 'zrX')) ??
        getFiniteNumber(getPanelChartRecordValue(sEvent, 'offsetX')) ??
        getFiniteNumber(getPanelChartRecordValue(sEvent, 'zrX')) ??
        getFiniteNumber(getPanelChartRecordValue(sNestedEvent, 'offsetX'));
    const sOffsetY =
        getFiniteNumber(getPanelChartRecordValue(payload, 'offsetY')) ??
        getFiniteNumber(getPanelChartRecordValue(payload, 'zrY')) ??
        getFiniteNumber(getPanelChartRecordValue(sEvent, 'offsetY')) ??
        getFiniteNumber(getPanelChartRecordValue(sEvent, 'zrY')) ??
        getFiniteNumber(getPanelChartRecordValue(sNestedEvent, 'offsetY'));
    const sPixel: [number, number] | undefined =
        sOffsetX !== undefined && sOffsetY !== undefined
            ? [sOffsetX, sOffsetY]
            : sClientPosition && chartRect
              ? [
                    sClientPosition.x - chartRect.left,
                    sClientPosition.y - chartRect.top,
                ]
              : undefined;

    return {
        pixel: sPixel,
        position:
            sClientPosition ??
            (sPixel && chartRect
                ? {
                      x: chartRect.left + sPixel[0],
                      y: chartRect.top + sPixel[1],
                  }
                : undefined),
    };
}

export function convertPanelChartPixelToTimestamp(
    instance: PanelChartInstance,
    pixel: [number, number],
    isNumericXAxis = false,
): number | undefined {
    return (
        parsePanelChartTimestamp(
            instance.convertFromPixel?.({ xAxisIndex: 0 }, pixel),
            isNumericXAxis,
        ) ??
        parsePanelChartTimestamp(
            instance.convertFromPixel?.({ gridIndex: 0 }, pixel),
            isNumericXAxis,
        )
    );
}

// Range selections
export function extractDataZoomEventRange(
    params: EChartDataZoomEventPayload,
    currentRange: AxisRange,
    axisRange: AxisRange = currentRange,
    targetDataZoomId?: string,
    fallbackState?: EChartDataZoomOptionStateItem,
): AxisRange | undefined {
    const sZoomData =
        'batch' in params
            ? selectDataZoomItem(params.batch, targetDataZoomId)
            : params;
    const sRangeSource = sZoomData && hasExplicitDataZoomRange(sZoomData)
        ? sZoomData
        : { ...fallbackState, ...params };

    return extractDataZoomOptionRange(sRangeSource, currentRange, axisRange);
}

export function extractDataZoomOptionRange(
    params: EChartDataZoomOptionStateItem,
    currentRange: AxisRange,
    axisRange: AxisRange = currentRange,
): AxisRange | undefined {
    const sExplicitZoomRange = getExplicitDataZoomRange(params);
    if (sExplicitZoomRange) {
        return sExplicitZoomRange;
    }

    const sAxisSpan = getRangeWidth(axisRange);
    if (
        typeof params.start === 'number' &&
        typeof params.end === 'number' &&
        sAxisSpan > 0
    ) {
        return {
            startTime: axisRange.startTime + (sAxisSpan * params.start) / 100,
            endTime: axisRange.startTime + (sAxisSpan * params.end) / 100,
        };
    }

    return undefined;
}

export function extractBrushRange(
    params: EChartBrushPayload,
    isNumericXAxis = false,
): AxisRange | undefined {
    const sArea = params?.areas?.[0] ?? params?.batch?.[0]?.areas?.[0];
    const sRange = sArea?.coordRange ?? sArea?.range;

    if (!sRange || sRange.length < 2) {
        return undefined;
    }

    const sStart = Number(sRange[0]);
    const sEnd = Number(sRange[1]);

    if (!Number.isFinite(sStart) || !Number.isFinite(sEnd)) {
        throw new Error('Brush range contains a non-finite value.');
    }

    const sMin = Math.min(sStart, sEnd);
    const sMax = Math.max(sStart, sEnd);

    return {
        startTime: isNumericXAxis ? sMin : Math.floor(sMin),
        endTime: isNumericXAxis ? sMax : Math.ceil(sMax),
    };
}

export function selectDataZoomItem<
    T extends { id?: string; dataZoomId?: string },
>(
    zoomData: T[] | undefined,
    targetDataZoomId?: string,
): T | undefined {
    if (targetDataZoomId === undefined) {
        return zoomData?.[0];
    }

    return zoomData?.find(
        (item) =>
            item.id === targetDataZoomId ||
            item.dataZoomId === targetDataZoomId,
    ) ?? zoomData?.[0];
}

function hasExplicitDataZoomRange(
    dataZoomState: EChartDataZoomEventItem,
): boolean {
    return (
        (dataZoomState.startValue !== undefined && dataZoomState.endValue !== undefined) ||
        (dataZoomState.start !== undefined && dataZoomState.end !== undefined)
    );
}

function getExplicitDataZoomRange(
    zoomData: EChartDataZoomOptionStateItem,
): AxisRange | undefined {
    const sStartValue = zoomData.startValue;
    const sEndValue = zoomData.endValue;

    if (sStartValue === undefined || sEndValue === undefined) {
        return undefined;
    }

    const sStartTime = Number(sStartValue);
    const sEndTime = Number(sEndValue);

    if (!Number.isFinite(sStartTime) || !Number.isFinite(sEndTime)) {
        throw new Error('Data zoom range contains a non-finite value.');
    }

    return {
        startTime: sStartTime,
        endTime: sEndTime,
    };
}

// Annotation layout
function getAnnotationAnchorTime(timeRange: AxisRange): number {
    return timeRange.endTime > timeRange.startTime
        ? getRangeCenter(timeRange)
        : timeRange.startTime;
}

function findNearestChartRow(
    chartRows: ChartRow[],
    targetTime: number,
): ChartRow | undefined {
    if (!Number.isFinite(targetTime)) {
        throw new Error('Cannot find annotation anchor row for a non-finite time.');
    }

    if (chartRows.length === 0) {
        return undefined;
    }

    let sLowIndex = 0;
    let sHighIndex = chartRows.length - 1;

    while (sLowIndex <= sHighIndex) {
        const sMiddleIndex = Math.floor((sLowIndex + sHighIndex) / 2);
        const sMiddleTime = chartRows[sMiddleIndex]?.[0];

        if (sMiddleTime === targetTime) {
            return chartRows[sMiddleIndex];
        }

        if ((sMiddleTime ?? 0) < targetTime) {
            sLowIndex = sMiddleIndex + 1;
            continue;
        }

        sHighIndex = sMiddleIndex - 1;
    }

    const sNextRow = chartRows[Math.min(sLowIndex, chartRows.length - 1)];
    const sPreviousRow = chartRows[Math.max(sLowIndex - 1, 0)];
    const sNextDistance = Math.abs((sNextRow?.[0] ?? Number.POSITIVE_INFINITY) - targetTime);
    const sPreviousDistance = Math.abs(
        (sPreviousRow?.[0] ?? Number.POSITIVE_INFINITY) - targetTime,
    );

    return sPreviousDistance <= sNextDistance ? sPreviousRow : sNextRow;
}

const ANNOTATION_LABEL_HEIGHT = 22;
const ANNOTATION_LABEL_MIN_WIDTH = 64;
const ANNOTATION_LABEL_MAX_WIDTH = 220;
const ANNOTATION_LABEL_HORIZONTAL_PADDING = 18;
const ANNOTATION_LABEL_WIDTH_PER_CHARACTER = 7;
const ANNOTATION_LABEL_AXIS_PADDING_RATIO = 0.08;

export type RenderableSeriesAnnotation = {
    seriesIndex: number;
    annotationIndex: number;
    yAxisIndex: number;
    color: string;
    fillColor: string;
    textColor: string;
    text: string;
    clip: boolean;
    anchorTime: number;
    anchorValue: number;
    labelY: number;
    symbolSize: [number, number];
};

export type AnnotationRenderContext = {
    annotations: PanelAnnotation[];
    seriesDefinitions: PanelSeriesDefinition[];
    chartData: ChartSeriesData[];
    yAxisOptions: YAXisComponentOption[];
    visibleRange: AxisRange;
    visibleSeries?: Record<string, boolean>;
};

export function buildRenderableSeriesAnnotations(
    context: AnnotationRenderContext,
): RenderableSeriesAnnotation[] {
    return keepAnnotationLabelsInsideAxis(
        buildAnnotationAnchors(context),
        context.yAxisOptions,
    );
}

function buildAnnotationAnchors({
    annotations,
    seriesDefinitions,
    chartData,
    yAxisOptions,
    visibleRange,
    visibleSeries = {},
}: AnnotationRenderContext,
): RenderableSeriesAnnotation[] {
    return annotations.flatMap((annotation, annotationIndex) => {
        const seriesIndex = seriesDefinitions.findIndex(
            (seriesInfo) => seriesInfo.key === annotation.seriesKey,
        );
        const seriesInfo = seriesDefinitions[seriesIndex];

        if (seriesIndex < 0 || !seriesInfo) {
            throw new Error(`Unknown annotation series: ${annotation.seriesKey}.`);
        }

        const chartSeries = chartData[seriesIndex];

        if (
            chartSeries &&
            visibleSeries[getChartSeriesEChartsName(chartSeries)] === false
        ) {
            return [];
        }

        const seriesColor = getPanelSeriesDisplayColor(seriesInfo, seriesIndex);
        const yAxisIndex = chartSeries?.yAxis ?? (seriesInfo.useSecondaryAxis ? 1 : 0);
        const fallbackAnchorValue = getFallbackAnnotationAnchorValue(
            yAxisOptions[yAxisIndex],
        );

        const annotationAnchorTime = getAnnotationAnchorTime(annotation.timeRange);

        if (!Number.isFinite(annotationAnchorTime)) {
            throw new Error(
                `Annotation ${annotationIndex} has an invalid anchor time.`,
            );
        }

        if (
            !Number.isFinite(visibleRange.startTime) ||
            !Number.isFinite(visibleRange.endTime) ||
            annotationAnchorTime < visibleRange.startTime ||
            annotationAnchorTime > visibleRange.endTime
        ) {
            return [];
        }

        const anchorRow = findNearestChartRow(
            chartSeries?.data ?? [],
            annotationAnchorTime,
        );
        const annotationText = annotation.text.trim() || 'note';
        const anchorValue = anchorRow?.[1] ?? fallbackAnchorValue;
        const labelWidth = Math.max(
            ANNOTATION_LABEL_MIN_WIDTH,
            Math.min(
                ANNOTATION_LABEL_MAX_WIDTH,
                ANNOTATION_LABEL_HORIZONTAL_PADDING +
                    annotationText.length * ANNOTATION_LABEL_WIDTH_PER_CHARACTER,
            ),
        );

        return [
            {
                seriesIndex,
                annotationIndex,
                yAxisIndex,
                color: seriesColor,
                fillColor: annotation.fillColor,
                textColor: annotation.textColor,
                text: annotationText,
                clip: annotation.clip,
                anchorTime: annotationAnchorTime,
                anchorValue,
                labelY: anchorValue,
                symbolSize: [labelWidth, ANNOTATION_LABEL_HEIGHT],
            },
        ];
    });
}

function getFallbackAnnotationAnchorValue(
    yAxisOption: YAXisComponentOption | undefined,
): number {
    const axisMinimum = Number(yAxisOption?.min);
    const axisMaximum = Number(yAxisOption?.max);

    if (Number.isFinite(axisMinimum) && Number.isFinite(axisMaximum)) {
        return (axisMinimum + axisMaximum) / 2;
    }

    return Number.isFinite(axisMinimum)
        ? axisMinimum
        : Number.isFinite(axisMaximum)
          ? axisMaximum
          : 0;
}

function keepAnnotationLabelsInsideAxis(
    annotations: RenderableSeriesAnnotation[],
    yAxisOptions: YAXisComponentOption[],
): RenderableSeriesAnnotation[] {
    return annotations.map((annotation) => {
        const axisMinimum = Number(yAxisOptions[annotation.yAxisIndex]?.min);
        const axisMaximum = Number(yAxisOptions[annotation.yAxisIndex]?.max);

        if (!Number.isFinite(axisMinimum) || !Number.isFinite(axisMaximum)) {
            return annotation;
        }

        const axisRange = axisMaximum - axisMinimum;
        const padding = Math.min(
            axisRange * 0.45,
            Math.max(axisRange * ANNOTATION_LABEL_AXIS_PADDING_RATIO, 1),
        );
        return {
            ...annotation,
            labelY: Math.min(
                axisMaximum - padding,
                Math.max(axisMinimum + padding, annotation.anchorValue),
            ),
        };
    });
}
