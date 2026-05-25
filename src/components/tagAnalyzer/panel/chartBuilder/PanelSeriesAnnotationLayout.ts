import type { YAXisComponentOption } from 'echarts';
import {
    findNearestChartRow,
    getAnnotationAnchorTime,
} from './ChartSeriesAnnotationUtils';
import {
    type ChartSeriesData,
} from '../../domain/ChartDomain';
import {
    getPanelSeriesDisplayColor,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';
import type { PanelAnnotation } from '../../domain/PanelDomain';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';

const ANNOTATION_LABEL_HEIGHT = 22;
const ANNOTATION_LABEL_MIN_WIDTH = 64;
const ANNOTATION_LABEL_MAX_WIDTH = 220;
const ANNOTATION_LABEL_HORIZONTAL_PADDING = 18;
const ANNOTATION_LABEL_WIDTH_PER_CHARACTER = 7;
const ANNOTATION_ROW_TOP_PADDING_RATIO = 0.08;
const ANNOTATION_ROW_HEIGHT_RATIO = 0.1;
const ANNOTATION_TIME_GAP_BASE_RATIO = 0.08;
const ANNOTATION_TIME_GAP_PER_CHARACTER_RATIO = 0.004;
const ANNOTATION_TIME_GAP_MAX_RATIO = 0.22;

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
    estimatedTimeWidth: number;
    symbolSize: [number, number];
};

export function buildRenderableSeriesAnnotations(
    annotations: PanelAnnotation[],
    seriesDefinitions: PanelSeriesDefinition[],
    chartData: ChartSeriesData[],
    yAxisOptions: YAXisComponentOption[],
    visibleRange: TimeRangeMs,
    visibleSeries: Record<string, boolean> = {},
): RenderableSeriesAnnotation[] {
    return assignAnnotationLabelRows(
        buildAnnotationAnchors(
            annotations,
            seriesDefinitions,
            chartData,
            yAxisOptions,
            visibleRange,
            visibleSeries,
        ),
        yAxisOptions,
    );
}

function buildAnnotationAnchors(
    annotations: PanelAnnotation[],
    seriesDefinitions: PanelSeriesDefinition[],
    chartData: ChartSeriesData[],
    yAxisOptions: YAXisComponentOption[],
    visibleRange: TimeRangeMs,
    visibleSeries: Record<string, boolean>,
): RenderableSeriesAnnotation[] {
    const visibleSpan = Math.max(
        visibleRange.endTime - visibleRange.startTime,
        1,
    );

    return annotations.flatMap((annotation, annotationIndex) => {
        const seriesIndex = seriesDefinitions.findIndex(
            (seriesInfo) => seriesInfo.key === annotation.seriesKey,
        );
        const seriesInfo = seriesDefinitions[seriesIndex];

        if (seriesIndex < 0 || !seriesInfo) {
            throw new Error(`Unknown annotation series: ${annotation.seriesKey}.`);
        }

        const chartSeries = chartData[seriesIndex];

        if (chartSeries && visibleSeries[chartSeries.name] === false) {
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
        const labelTimeWidthRatio = Math.min(
            ANNOTATION_TIME_GAP_MAX_RATIO,
            ANNOTATION_TIME_GAP_BASE_RATIO +
                annotationText.length * ANNOTATION_TIME_GAP_PER_CHARACTER_RATIO,
        );

        return [
            {
                seriesIndex: seriesIndex,
                annotationIndex: annotationIndex,
                yAxisIndex: yAxisIndex,
                color: seriesColor,
                fillColor: annotation.fillColor,
                textColor: annotation.textColor,
                text: annotationText,
                clip: annotation.clip,
                anchorTime: annotationAnchorTime,
                anchorValue: anchorValue,
                labelY: anchorValue,
                estimatedTimeWidth: Math.max(visibleSpan * labelTimeWidthRatio, 1),
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

    if (Number.isFinite(axisMinimum)) {
        return axisMinimum;
    }

    if (Number.isFinite(axisMaximum)) {
        return axisMaximum;
    }

    return 0;
}

function assignAnnotationLabelRows(
    annotations: RenderableSeriesAnnotation[],
    yAxisOptions: YAXisComponentOption[],
): RenderableSeriesAnnotation[] {
    const nextAnnotations = annotations.map((annotation) => ({ ...annotation }));
    const annotationsByAxis = new Map<number, RenderableSeriesAnnotation[]>();

    nextAnnotations.forEach((annotation) => {
        const axisAnnotations = annotationsByAxis.get(annotation.yAxisIndex) ?? [];

        axisAnnotations.push(annotation);
        annotationsByAxis.set(annotation.yAxisIndex, axisAnnotations);
    });

    annotationsByAxis.forEach((axisAnnotations, yAxisIndex) => {
        const axisMinimum = Number(yAxisOptions[yAxisIndex]?.min);
        const axisMaximum = Number(yAxisOptions[yAxisIndex]?.max);

        if (!Number.isFinite(axisMinimum) || !Number.isFinite(axisMaximum)) {
            return;
        }

        const axisRange = Math.max(axisMaximum - axisMinimum, 1);
        const topPadding = Math.max(axisRange * ANNOTATION_ROW_TOP_PADDING_RATIO, 1);
        const rowHeight = Math.max(axisRange * ANNOTATION_ROW_HEIGHT_RATIO, 1);
        const highestLabelY = axisMaximum - topPadding;
        const lowestLabelY = axisMinimum + topPadding;
        const rowEndTimes: number[] = [];

        axisAnnotations
            .sort(
                (leftAnnotation, rightAnnotation) =>
                    leftAnnotation.anchorTime - rightAnnotation.anchorTime,
            )
            .forEach((annotation) => {
                const halfTimeWidth = annotation.estimatedTimeWidth / 2;
                const reusableRowIndex = rowEndTimes.findIndex(
                    (rowEndTime) => annotation.anchorTime - halfTimeWidth > rowEndTime,
                );
                const rowIndex =
                    reusableRowIndex >= 0 ? reusableRowIndex : rowEndTimes.length;

                rowEndTimes[rowIndex] = annotation.anchorTime + halfTimeWidth;
                annotation.labelY = Math.max(
                    lowestLabelY,
                    highestLabelY - rowIndex * rowHeight,
                );
            });
    });

    return nextAnnotations;
}
