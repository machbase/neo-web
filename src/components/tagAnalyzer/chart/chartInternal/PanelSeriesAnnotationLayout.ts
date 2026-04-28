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
} from '../options/OptionBuildHelpers/ChartOptionConstants';
import { getPanelSeriesDisplayColor } from '../../utils/series/PanelSeriesColorResolver';
import type {
    ChartSeriesData,
    PanelSeriesDefinition,
} from '../../utils/series/PanelSeriesTypes';
import type { TimeRangeMs } from '../../utils/time/types/TimeTypes';

export type RenderableSeriesAnnotation = {
    seriesIndex: number;
    annotationIndex: number;
    yAxisIndex: number;
    color: string;
    text: string;
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
            navigatorRange,
            visibleSeries,
        ),
        yAxisOptions,
    );
}

function buildAnnotationAnchors(
    seriesDefinitions: PanelSeriesDefinition[],
    chartData: ChartSeriesData[],
    navigatorRange: TimeRangeMs,
    visibleSeries: Record<string, boolean>,
): RenderableSeriesAnnotation[] {
    const navigatorSpan = Math.max(
        navigatorRange.endTime - navigatorRange.startTime,
        1,
    );

    return seriesDefinitions.flatMap((seriesInfo, seriesIndex) => {
        const chartSeries = chartData[seriesIndex];

        if (!chartSeries?.data.length || visibleSeries[chartSeries.name] === false) {
            return [];
        }

        const seriesColor = getPanelSeriesDisplayColor(seriesInfo, seriesIndex);

        return (seriesInfo.annotations ?? []).flatMap((annotation, annotationIndex) => {
            const anchorRow = findNearestChartRow(
                chartSeries.data,
                getAnnotationAnchorTime(annotation.timeRange),
            );

            if (!anchorRow) {
                return [];
            }

            const annotationText = annotation.text.trim() || 'note';

            return [
                {
                    seriesIndex: seriesIndex,
                    annotationIndex: annotationIndex,
                    yAxisIndex: chartSeries.yAxis ?? 0,
                    color: seriesColor,
                    text: annotationText,
                    anchorTime: anchorRow[0],
                    anchorValue: anchorRow[1],
                    labelY: anchorRow[1],
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
