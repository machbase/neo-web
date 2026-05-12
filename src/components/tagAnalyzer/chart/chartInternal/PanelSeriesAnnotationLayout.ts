import type { YAXisComponentOption } from 'echarts';
import {
    findNearestChartRow,
    getAnnotationAnchorTime,
} from './ChartSeriesAnnotationUtils';
import {
    ANNOTATION_LABEL_HEIGHT,
    ANNOTATION_LABEL_HORIZONTAL_PADDING,
    ANNOTATION_LABEL_MAX_WIDTH,
    ANNOTATION_LABEL_MIN_WIDTH,
    ANNOTATION_LABEL_WIDTH_PER_CHARACTER,
    ANNOTATION_ROW_HEIGHT_RATIO,
    ANNOTATION_ROW_TOP_PADDING_RATIO,
    ANNOTATION_TIME_GAP_BASE_RATIO,
    ANNOTATION_TIME_GAP_MAX_RATIO,
    ANNOTATION_TIME_GAP_PER_CHARACTER_RATIO,
} from '../../domain/ChartConstants';
import { getPanelSeriesDisplayColor } from '../../series/PanelSeriesUtils';
import type { ChartSeriesData } from '../ChartTypes';
import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    type PanelSeriesDefinition,
} from '../../domain/SeriesModel';
import type { TimeRangeMs } from '../../time/TimeTypes';

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
    seriesDefinitions: PanelSeriesDefinition[],
    chartData: ChartSeriesData[],
    yAxisOptions: YAXisComponentOption[],
    navigatorRange: TimeRangeMs,
    visibleSeries: Record<string, boolean> = {},
): RenderableSeriesAnnotation[] {
    return assignAnnotationLabelRows(
        buildAnnotationAnchors(
            seriesDefinitions,
            chartData,
            yAxisOptions,
            navigatorRange,
            visibleSeries,
        ),
        yAxisOptions,
    );
}

function buildAnnotationAnchors(
    seriesDefinitions: PanelSeriesDefinition[],
    chartData: ChartSeriesData[],
    yAxisOptions: YAXisComponentOption[],
    navigatorRange: TimeRangeMs,
    visibleSeries: Record<string, boolean>,
): RenderableSeriesAnnotation[] {
    const navigatorSpan = Math.max(
        navigatorRange.endTime - navigatorRange.startTime,
        1,
    );

    return seriesDefinitions.flatMap((seriesInfo, seriesIndex) => {
        const chartSeries = chartData[seriesIndex];

        if (chartSeries && visibleSeries[chartSeries.name] === false) {
            return [];
        }

        const seriesColor = getPanelSeriesDisplayColor(seriesInfo, seriesIndex);
        const yAxisIndex = chartSeries?.yAxis ?? (seriesInfo.useSecondaryAxis ? 1 : 0);
        const fallbackAnchorValue = getFallbackAnnotationAnchorValue(
            yAxisOptions[yAxisIndex],
        );

        return (seriesInfo.annotations ?? []).flatMap((annotation, annotationIndex) => {
            const annotationAnchorTime = getAnnotationAnchorTime(annotation.timeRange);

            if (!Number.isFinite(annotationAnchorTime)) {
                return [];
            }

            const anchorRow = findNearestChartRow(
                chartSeries?.data ?? [],
                annotationAnchorTime,
            );
            const annotationText = annotation.text.trim() || 'note';
            const anchorTime = anchorRow?.[0] ?? annotationAnchorTime;
            const anchorValue = anchorRow?.[1] ?? fallbackAnchorValue;

            return [
                {
                    seriesIndex: seriesIndex,
                    annotationIndex: annotationIndex,
                    yAxisIndex: yAxisIndex,
                    color: seriesColor,
                    fillColor: annotation.fillColor ?? DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
                    textColor: annotation.textColor ?? DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
                    text: annotationText,
                    clip: annotation.clip === true,
                    anchorTime: anchorTime,
                    anchorValue: anchorValue,
                    labelY: anchorValue,
                    estimatedTimeWidth: estimateAnnotationTimeWidth(
                        annotationText,
                        navigatorSpan,
                    ),
                    symbolSize: buildAnnotationLabelSymbolSize(annotationText),
                },
            ];
        });
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

function buildAnnotationLabelSymbolSize(text: string): [number, number] {
    return [
        Math.max(
            ANNOTATION_LABEL_MIN_WIDTH,
            Math.min(
                ANNOTATION_LABEL_MAX_WIDTH,
                ANNOTATION_LABEL_HORIZONTAL_PADDING +
                    text.length * ANNOTATION_LABEL_WIDTH_PER_CHARACTER,
            ),
        ),
        ANNOTATION_LABEL_HEIGHT,
    ];
}

function estimateAnnotationTimeWidth(
    text: string,
    navigatorSpan: number,
): number {
    const widthRatio = Math.min(
        ANNOTATION_TIME_GAP_MAX_RATIO,
        ANNOTATION_TIME_GAP_BASE_RATIO + text.length * ANNOTATION_TIME_GAP_PER_CHARACTER_RATIO,
    );

    return Math.max(navigatorSpan * widthRatio, 1);
}
