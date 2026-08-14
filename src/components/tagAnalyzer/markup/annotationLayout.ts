import { type YAXisComponentOption } from 'echarts';

import { DEFAULT_SERIES_ANNOTATION_LABEL, type PanelAnnotation } from './markupModel';
import {
    getRangeCenter,
} from '../range/rangeArithmetic';
import type { AxisRange } from '../range/rangeModel';
import { getPanelSeriesDisplayColor, type PanelSeriesDefinition } from '../seriesModel';
import { type ChartRow, type ChartSeriesData, type ChartSeriesVisibilityMap, getChartSeriesEChartsName } from '../chart/chartData';

function getAnnotationAnchorTime(timeRange: AxisRange): number {
    return timeRange.end > timeRange.start
        ? getRangeCenter(timeRange)
        : timeRange.start;
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
    visibleSeries?: ChartSeriesVisibilityMap;
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
}: AnnotationRenderContext): RenderableSeriesAnnotation[] {
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
            !Number.isFinite(visibleRange.start) ||
            !Number.isFinite(visibleRange.end) ||
            annotationAnchorTime < visibleRange.start ||
            annotationAnchorTime > visibleRange.end
        ) {
            return [];
        }

        const anchorRow = findNearestChartRow(
            chartSeries?.data ?? [],
            annotationAnchorTime,
        );
        const annotationText = annotation.text.trim() || DEFAULT_SERIES_ANNOTATION_LABEL;
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
