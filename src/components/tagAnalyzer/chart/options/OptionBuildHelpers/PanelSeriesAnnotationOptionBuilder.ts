import type {
    LineSeriesOption,
    ScatterSeriesOption,
    SeriesOption,
    YAXisComponentOption,
} from 'echarts';
import {
    findNearestChartRow,
    getAnnotationAnchorTime,
} from '../../ChartSeriesAnnotationUtils';
import {
    ANNOTATION_GUIDE_LINE_OPACITY,
    ANNOTATION_GUIDE_SERIES_ID_PREFIX,
    ANNOTATION_LABEL_BACKGROUND,
    ANNOTATION_LABEL_HEIGHT,
    ANNOTATION_LABEL_HORIZONTAL_PADDING,
    ANNOTATION_LABEL_MAX_WIDTH,
    ANNOTATION_LABEL_MIN_WIDTH,
    ANNOTATION_LABEL_SERIES_ID_PREFIX,
    ANNOTATION_LABEL_TEXT_COLOR,
    ANNOTATION_LABEL_WIDTH_PER_CHARACTER,
    ANNOTATION_ROW_HEIGHT_RATIO,
    ANNOTATION_ROW_TOP_PADDING_RATIO,
    ANNOTATION_TIME_GAP_BASE_RATIO,
    ANNOTATION_TIME_GAP_MAX_RATIO,
    ANNOTATION_TIME_GAP_PER_CHARACTER_RATIO,
    DEFAULT_NOT_SHOW,
} from './ChartOptionConstants';
import { getPanelSeriesDisplayColor } from '../../../utils/series/PanelSeriesColorResolver';
import type {
    ChartSeriesItem,
    PanelSeriesConfig,
} from '../../../utils/series/PanelSeriesTypes';
import type { TimeRangeMs } from '../../../utils/time/types/TimeTypes';

type RenderableSeriesAnnotation = {
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

export type PanelAnnotationSeries = {
    guideLineSeries: SeriesOption[];
    labelSeries: SeriesOption[];
};

export function buildSeriesAnnotationSeries(
    seriesList: PanelSeriesConfig[],
    chartData: ChartSeriesItem[],
    yAxisOptions: YAXisComponentOption[],
    navigatorRange: TimeRangeMs,
    visibleSeries: Record<string, boolean> = {},
): PanelAnnotationSeries {
    const sAnnotationsBySeries = new Map<number, RenderableSeriesAnnotation[]>();
    const sGuideLineSeries: SeriesOption[] = [];
    const sLabelSeries: SeriesOption[] = [];

    assignAnnotationLabelRows(
        buildRenderableAnnotationAnchors(
            seriesList,
            chartData,
            navigatorRange,
            visibleSeries,
        ),
        yAxisOptions,
    ).forEach((annotation) => {
        const sSeriesAnnotations = sAnnotationsBySeries.get(annotation.seriesIndex) ?? [];

        sSeriesAnnotations.push(annotation);
        sAnnotationsBySeries.set(annotation.seriesIndex, sSeriesAnnotations);
    });

    [...sAnnotationsBySeries.values()].forEach((seriesAnnotations, seriesPosition) => {
        const sSeriesSample = seriesAnnotations[0];

        sGuideLineSeries.push(
            createAnnotationGuideLineSeries(
                sSeriesSample.seriesIndex,
                sSeriesSample.yAxisIndex,
                sSeriesSample.color,
                seriesAnnotations,
                seriesPosition,
            ),
        );
        sLabelSeries.push(
            createAnnotationLabelSeries(
                sSeriesSample.seriesIndex,
                sSeriesSample.yAxisIndex,
                sSeriesSample.color,
                seriesAnnotations,
            ),
        );
    });

    return {
        guideLineSeries: sGuideLineSeries,
        labelSeries: sLabelSeries,
    };
}

function buildRenderableAnnotationAnchors(
    seriesList: PanelSeriesConfig[],
    chartData: ChartSeriesItem[],
    navigatorRange: TimeRangeMs,
    visibleSeries: Record<string, boolean>,
): RenderableSeriesAnnotation[] {
    const sNavigatorSpan = Math.max(
        navigatorRange.endTime - navigatorRange.startTime,
        1,
    );

    return seriesList.flatMap((seriesInfo, seriesIndex) => {
        const sChartSeries = chartData[seriesIndex];

        if (!sChartSeries?.data.length || visibleSeries[sChartSeries.name] === false) {
            return [];
        }

        const sSeriesColor = getPanelSeriesDisplayColor(seriesInfo, seriesIndex);

        return (seriesInfo.annotations ?? []).flatMap((annotation, annotationIndex) => {
            const sAnchorRow = findNearestChartRow(
                sChartSeries.data,
                getAnnotationAnchorTime(annotation.timeRange),
            );

            if (!sAnchorRow) {
                return [];
            }

            const sAnnotationText = annotation.text.trim() || 'note';

            return [
                {
                    seriesIndex: seriesIndex,
                    annotationIndex: annotationIndex,
                    yAxisIndex: sChartSeries.yAxis ?? 0,
                    color: sSeriesColor,
                    text: sAnnotationText,
                    anchorTime: sAnchorRow[0],
                    anchorValue: sAnchorRow[1],
                    labelY: sAnchorRow[1],
                    estimatedTimeWidth: estimateAnnotationTimeWidth(
                        sAnnotationText,
                        sNavigatorSpan,
                    ),
                    symbolSize: buildAnnotationLabelSymbolSize(sAnnotationText),
                },
            ];
        });
    });
}

function assignAnnotationLabelRows(
    annotations: RenderableSeriesAnnotation[],
    yAxisOptions: YAXisComponentOption[],
): RenderableSeriesAnnotation[] {
    const sNextAnnotations = annotations.map((annotation) => ({ ...annotation }));
    const sAnnotationsByAxis = new Map<number, RenderableSeriesAnnotation[]>();

    sNextAnnotations.forEach((annotation) => {
        const sExistingAnnotations = sAnnotationsByAxis.get(annotation.yAxisIndex) ?? [];

        sExistingAnnotations.push(annotation);
        sAnnotationsByAxis.set(annotation.yAxisIndex, sExistingAnnotations);
    });

    sAnnotationsByAxis.forEach((axisAnnotations, yAxisIndex) => {
        const sAxisMinimum = Number(yAxisOptions[yAxisIndex]?.min);
        const sAxisMaximum = Number(yAxisOptions[yAxisIndex]?.max);

        if (!Number.isFinite(sAxisMinimum) || !Number.isFinite(sAxisMaximum)) {
            return;
        }

        const sAxisRange = Math.max(sAxisMaximum - sAxisMinimum, 1);
        const sTopPadding = Math.max(sAxisRange * ANNOTATION_ROW_TOP_PADDING_RATIO, 1);
        const sRowHeight = Math.max(sAxisRange * ANNOTATION_ROW_HEIGHT_RATIO, 1);
        const sHighestLabelY = sAxisMaximum - sTopPadding;
        const sLowestLabelY = sAxisMinimum + sTopPadding;
        const sRowEndTimes: number[] = [];

        axisAnnotations
            .sort(
                (leftAnnotation, rightAnnotation) =>
                    leftAnnotation.anchorTime - rightAnnotation.anchorTime,
            )
            .forEach((annotation) => {
                const sHalfTimeWidth = annotation.estimatedTimeWidth / 2;
                const sReusableRowIndex = sRowEndTimes.findIndex(
                    (rowEndTime) => annotation.anchorTime - sHalfTimeWidth > rowEndTime,
                );
                const sRowIndex =
                    sReusableRowIndex >= 0 ? sReusableRowIndex : sRowEndTimes.length;

                sRowEndTimes[sRowIndex] = annotation.anchorTime + sHalfTimeWidth;
                annotation.labelY = Math.max(
                    sLowestLabelY,
                    sHighestLabelY - sRowIndex * sRowHeight,
                );
            });
    });

    return sNextAnnotations;
}

function createAnnotationGuideLineSeries(
    seriesIndex: number,
    yAxisIndex: number,
    seriesColor: string,
    annotations: RenderableSeriesAnnotation[],
    seriesPosition: number,
): LineSeriesOption {
    return {
        id: `${ANNOTATION_GUIDE_SERIES_ID_PREFIX}${seriesIndex}`,
        type: 'line',
        legendHoverLink: false,
        silent: true,
        xAxisIndex: 0,
        yAxisIndex: yAxisIndex,
        data: buildAnnotationGuideLineData(annotations, seriesColor),
        showSymbol: true,
        symbol: 'none',
        connectNulls: false,
        clip: false,
        animation: false,
        tooltip: DEFAULT_NOT_SHOW,
        lineStyle: {
            color: seriesColor,
            width: 1,
            opacity: ANNOTATION_GUIDE_LINE_OPACITY,
        },
        z: 4 + seriesPosition,
        emphasis: {
            disabled: true,
        },
    };
}

function createAnnotationLabelSeries(
    seriesIndex: number,
    yAxisIndex: number,
    seriesColor: string,
    annotations: RenderableSeriesAnnotation[],
): ScatterSeriesOption {
    return {
        id: `${ANNOTATION_LABEL_SERIES_ID_PREFIX}${seriesIndex}`,
        type: 'scatter',
        legendHoverLink: false,
        xAxisIndex: 0,
        yAxisIndex: yAxisIndex,
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
            borderColor: seriesColor,
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
    };
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
    const sWidthRatio = Math.min(
        ANNOTATION_TIME_GAP_MAX_RATIO,
        ANNOTATION_TIME_GAP_BASE_RATIO + text.length * ANNOTATION_TIME_GAP_PER_CHARACTER_RATIO,
    );

    return Math.max(navigatorSpan * sWidthRatio, 1);
}
