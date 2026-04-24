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
} from '../ChartOptionConstants';
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

/**
 * Builds the leader-line series used to connect annotation labels back to their source points.
 * Intent: Keep annotation guide lines separate from the main line-series builder.
 * @param aSeriesList The saved series configs that own annotation arrays.
 * @param aChartData The rendered chart series used to resolve anchor points.
 * @param aYAxisOptions The resolved y-axis bounds used to place label rows.
 * @param aNavigatorRange The full chart time range used to estimate label overlap in time units.
 * @returns The ECharts line series used to render annotation guide lines.
 */
export function buildSeriesAnnotationGuideLineSeries(
    aSeriesList: PanelSeriesConfig[],
    aChartData: ChartSeriesItem[],
    aYAxisOptions: YAXisComponentOption[],
    aNavigatorRange: TimeRangeMs,
    aVisibleSeries: Record<string, boolean> = {},
): SeriesOption[] {
    const sRenderableAnnotations = buildRenderableSeriesAnnotations(
        aSeriesList,
        aChartData,
        aYAxisOptions,
        aNavigatorRange,
        aVisibleSeries,
    );

    return groupRenderableAnnotationsBySeriesIndex(sRenderableAnnotations).map(
        (aSeriesAnnotations, aSeriesPosition) =>
            createAnnotationGuideLineSeries(
                aSeriesAnnotations[0].seriesIndex,
                aSeriesAnnotations[0].yAxisIndex,
                aSeriesAnnotations[0].color,
                aSeriesAnnotations,
                aSeriesPosition,
            ),
    );
}

/**
 * Builds the clickable label series used to show saved series annotations.
 * Intent: Keep annotation labels separate from highlight labels and the main chart series.
 * @param aSeriesList The saved series configs that own annotation arrays.
 * @param aChartData The rendered chart series used to resolve anchor points.
 * @param aYAxisOptions The resolved y-axis bounds used to place label rows.
 * @param aNavigatorRange The full chart time range used to estimate label overlap in time units.
 * @returns The ECharts scatter series used to render annotation labels.
 */
export function buildSeriesAnnotationLabelSeries(
    aSeriesList: PanelSeriesConfig[],
    aChartData: ChartSeriesItem[],
    aYAxisOptions: YAXisComponentOption[],
    aNavigatorRange: TimeRangeMs,
    aVisibleSeries: Record<string, boolean> = {},
): SeriesOption[] {
    const sRenderableAnnotations = buildRenderableSeriesAnnotations(
        aSeriesList,
        aChartData,
        aYAxisOptions,
        aNavigatorRange,
        aVisibleSeries,
    );

    return groupRenderableAnnotationsBySeriesIndex(sRenderableAnnotations).map(
        (aSeriesAnnotations) =>
            createAnnotationLabelSeries(
                aSeriesAnnotations[0].seriesIndex,
                aSeriesAnnotations[0].yAxisIndex,
                aSeriesAnnotations[0].color,
                aSeriesAnnotations,
            ),
    );
}

function buildRenderableSeriesAnnotations(
    aSeriesList: PanelSeriesConfig[],
    aChartData: ChartSeriesItem[],
    aYAxisOptions: YAXisComponentOption[],
    aNavigatorRange: TimeRangeMs,
    aVisibleSeries: Record<string, boolean>,
): RenderableSeriesAnnotation[] {
    const sAnnotationAnchors = buildRenderableAnnotationAnchors(
        aSeriesList,
        aChartData,
        aNavigatorRange,
        aVisibleSeries,
    );

    if (sAnnotationAnchors.length === 0) {
        return [];
    }

    return assignAnnotationLabelRows(sAnnotationAnchors, aYAxisOptions);
}

function buildRenderableAnnotationAnchors(
    aSeriesList: PanelSeriesConfig[],
    aChartData: ChartSeriesItem[],
    aNavigatorRange: TimeRangeMs,
    aVisibleSeries: Record<string, boolean>,
): RenderableSeriesAnnotation[] {
    const sNavigatorSpan = Math.max(
        aNavigatorRange.endTime - aNavigatorRange.startTime,
        1,
    );

    return aSeriesList.flatMap((aSeriesInfo, aSeriesIndex) => {
        const sChartSeries = aChartData[aSeriesIndex];

        if (
            !sChartSeries ||
            sChartSeries.data.length === 0 ||
            aVisibleSeries[sChartSeries.name] === false
        ) {
            return [];
        }

        const sSeriesColor = getPanelSeriesDisplayColor(aSeriesInfo, aSeriesIndex);

        return (aSeriesInfo.annotations ?? []).flatMap((aAnnotation, aAnnotationIndex) => {
            const sAnchorRow = findNearestChartRow(
                sChartSeries.data,
                getAnnotationAnchorTime(aAnnotation.timeRange),
            );

            if (!sAnchorRow) {
                return [];
            }

            const sAnnotationText = aAnnotation.text.trim();

            return [
                {
                    seriesIndex: aSeriesIndex,
                    annotationIndex: aAnnotationIndex,
                    yAxisIndex: sChartSeries.yAxis ?? 0,
                    color: sSeriesColor,
                    text: sAnnotationText || 'note',
                    anchorTime: sAnchorRow[0],
                    anchorValue: sAnchorRow[1],
                    labelY: sAnchorRow[1],
                    estimatedTimeWidth: estimateAnnotationTimeWidth(
                        sAnnotationText || 'note',
                        sNavigatorSpan,
                    ),
                    symbolSize: buildAnnotationLabelSymbolSize(sAnnotationText || 'note'),
                },
            ];
        });
    });
}

function assignAnnotationLabelRows(
    aAnnotations: RenderableSeriesAnnotation[],
    aYAxisOptions: YAXisComponentOption[],
): RenderableSeriesAnnotation[] {
    const sNextAnnotations = aAnnotations.map((aAnnotation) => ({ ...aAnnotation }));
    const sAnnotationsByAxis = new Map<number, RenderableSeriesAnnotation[]>();

    sNextAnnotations.forEach((aAnnotation) => {
        const sExistingAnnotations = sAnnotationsByAxis.get(aAnnotation.yAxisIndex) ?? [];

        sExistingAnnotations.push(aAnnotation);
        sAnnotationsByAxis.set(aAnnotation.yAxisIndex, sExistingAnnotations);
    });

    sAnnotationsByAxis.forEach((aAxisAnnotations, aYAxisIndex) => {
        const sAxisMinimum = Number(aYAxisOptions[aYAxisIndex]?.min);
        const sAxisMaximum = Number(aYAxisOptions[aYAxisIndex]?.max);

        if (!Number.isFinite(sAxisMinimum) || !Number.isFinite(sAxisMaximum)) {
            return;
        }

        const sAxisRange = Math.max(sAxisMaximum - sAxisMinimum, 1);
        const sTopPadding = Math.max(sAxisRange * ANNOTATION_ROW_TOP_PADDING_RATIO, 1);
        const sRowHeight = Math.max(sAxisRange * ANNOTATION_ROW_HEIGHT_RATIO, 1);
        const sHighestLabelY = sAxisMaximum - sTopPadding;
        const sLowestLabelY = sAxisMinimum + sTopPadding;
        const sRowEndTimes: number[] = [];

        aAxisAnnotations
            .sort(
                (aLeftAnnotation, aRightAnnotation) =>
                    aLeftAnnotation.anchorTime - aRightAnnotation.anchorTime,
            )
            .forEach((aAnnotation) => {
                const sHalfTimeWidth = aAnnotation.estimatedTimeWidth / 2;
                const sReusableRowIndex = sRowEndTimes.findIndex(
                    (aRowEndTime) => aAnnotation.anchorTime - sHalfTimeWidth > aRowEndTime,
                );
                const sRowIndex =
                    sReusableRowIndex >= 0 ? sReusableRowIndex : sRowEndTimes.length;

                sRowEndTimes[sRowIndex] = aAnnotation.anchorTime + sHalfTimeWidth;
                aAnnotation.labelY = Math.max(
                    sLowestLabelY,
                    sHighestLabelY - sRowIndex * sRowHeight,
                );
            });
    });

    return sNextAnnotations;
}

function groupRenderableAnnotationsBySeriesIndex(
    aAnnotations: RenderableSeriesAnnotation[],
): RenderableSeriesAnnotation[][] {
    const sAnnotationsBySeries = new Map<number, RenderableSeriesAnnotation[]>();

    aAnnotations.forEach((aAnnotation) => {
        const sExistingAnnotations = sAnnotationsBySeries.get(aAnnotation.seriesIndex) ?? [];

        sExistingAnnotations.push(aAnnotation);
        sAnnotationsBySeries.set(aAnnotation.seriesIndex, sExistingAnnotations);
    });

    return [...sAnnotationsBySeries.values()];
}

function createAnnotationGuideLineSeries(
    aSeriesIndex: number,
    aYAxisIndex: number,
    aSeriesColor: string,
    aAnnotations: RenderableSeriesAnnotation[],
    aSeriesPosition: number,
): LineSeriesOption {
    return {
        id: `${ANNOTATION_GUIDE_SERIES_ID_PREFIX}${aSeriesIndex}`,
        type: 'line',
        legendHoverLink: false,
        silent: true,
        xAxisIndex: 0,
        yAxisIndex: aYAxisIndex,
        data: buildAnnotationGuideLineData(aAnnotations, aSeriesColor),
        showSymbol: true,
        symbol: 'none',
        connectNulls: false,
        clip: false,
        animation: false,
        tooltip: DEFAULT_NOT_SHOW,
        lineStyle: {
            color: aSeriesColor,
            width: 1,
            opacity: ANNOTATION_GUIDE_LINE_OPACITY,
        },
        z: 4 + aSeriesPosition,
        emphasis: {
            disabled: true,
        },
    };
}

function createAnnotationLabelSeries(
    aSeriesIndex: number,
    aYAxisIndex: number,
    aSeriesColor: string,
    aAnnotations: RenderableSeriesAnnotation[],
): ScatterSeriesOption {
    return {
        id: `${ANNOTATION_LABEL_SERIES_ID_PREFIX}${aSeriesIndex}`,
        type: 'scatter',
        legendHoverLink: false,
        xAxisIndex: 0,
        yAxisIndex: aYAxisIndex,
        data: aAnnotations.map((aAnnotation) => ({
            name: aAnnotation.text,
            value: [aAnnotation.anchorTime, aAnnotation.labelY],
            annotationIndex: aAnnotation.annotationIndex,
            seriesIndex: aAnnotation.seriesIndex,
            symbolSize: aAnnotation.symbolSize,
        })),
        symbol: 'roundRect',
        symbolKeepAspect: false,
        clip: false,
        itemStyle: {
            color: ANNOTATION_LABEL_BACKGROUND,
            borderColor: aSeriesColor,
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
    aAnnotations: RenderableSeriesAnnotation[],
    aSeriesColor: string,
) {
    return aAnnotations.flatMap((aAnnotation) => [
        {
            value: [aAnnotation.anchorTime, aAnnotation.anchorValue],
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: {
                color: aSeriesColor,
            },
            label: { show: false },
        },
        {
            value: [aAnnotation.anchorTime, aAnnotation.labelY],
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

function buildAnnotationLabelSymbolSize(aText: string): [number, number] {
    return [
        Math.max(
            ANNOTATION_LABEL_MIN_WIDTH,
            Math.min(
                ANNOTATION_LABEL_MAX_WIDTH,
                ANNOTATION_LABEL_HORIZONTAL_PADDING +
                    aText.length * ANNOTATION_LABEL_WIDTH_PER_CHARACTER,
            ),
        ),
        ANNOTATION_LABEL_HEIGHT,
    ];
}

function estimateAnnotationTimeWidth(
    aText: string,
    aNavigatorSpan: number,
): number {
    const sWidthRatio = Math.min(
        ANNOTATION_TIME_GAP_MAX_RATIO,
        ANNOTATION_TIME_GAP_BASE_RATIO + aText.length * ANNOTATION_TIME_GAP_PER_CHARACTER_RATIO,
    );

    return Math.max(aNavigatorSpan * sWidthRatio, 1);
}
