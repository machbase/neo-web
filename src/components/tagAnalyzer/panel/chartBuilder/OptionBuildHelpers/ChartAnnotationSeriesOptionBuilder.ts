import type {
    ScatterSeriesOption,
    SeriesOption,
    YAXisComponentOption,
} from 'echarts';
import type {
    PanelAnnotation,
} from '../../../domain/PanelDomain';
import type {
    PanelSeriesDefinition,
} from '../../../domain/SeriesDomain';
import type { TimeRangeMs } from '../../../domain/time/TimeTypes';
import type { ChartSeriesData } from '../../../domain/ChartDomain';
import {
    ANNOTATION_GUIDE_LINE_OPACITY,
    ANNOTATION_GUIDE_LINE_WIDTH,
    ANNOTATION_GUIDE_SERIES_ID_PREFIX,
    ANNOTATION_LABEL_BORDER_WIDTH,
    ANNOTATION_LABEL_FONT_SIZE,
    ANNOTATION_LABEL_SERIES_ID_PREFIX,
    ANNOTATION_LABEL_TEXT_COLOR,
    DEFAULT_NOT_SHOW,
    NAVIGATOR_ANNOTATION_LINE_SERIES_ID,
} from './ChartOptionConstants';
import {
    buildRenderableSeriesAnnotations,
    type RenderableSeriesAnnotation,
} from '../PanelSeriesAnnotationLayout';

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
    ];
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

    return [...annotationsBySeries.values()].flatMap(
        (seriesAnnotations, seriesPosition) =>
            createAnnotationSeriesGroup(
                seriesAnnotations,
                seriesPosition,
            ),
    );
}
