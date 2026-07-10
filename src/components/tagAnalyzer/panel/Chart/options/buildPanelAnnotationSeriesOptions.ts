import type {
    CustomSeriesOption,
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemParams,
    CustomSeriesRenderItemReturn,
    SeriesOption,
    YAXisComponentOption,
} from 'echarts';
import type {
    PanelAnnotation,
} from '../../../domain/panel/PanelInfo';
import {
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    type PanelSeriesDefinition,
} from '../../../domain/SeriesDomain';
import { parseHexColor } from './ColorUtils';
import type { TimeRangeMs } from '../../../domain/time/TimeTypes';
import type { ChartSeriesData } from '../../../domain/ChartDomain';
import {
    ANNOTATION_LABEL_SERIES_ID_PREFIX,
    DEFAULT_NOT_SHOW,
    PANEL_NAVIGATOR_DATA_X_AXIS_INDEX,
} from './PanelChartOptionConstants';
import {
    buildRenderableSeriesAnnotations,
    type RenderableSeriesAnnotation,
} from '../layout/PanelChartAnnotationLayout';

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

type AnnotationLabelData = Array<{
    name: string;
    value: [number, number];
    annotationIndex: number;
}>;

type CartesianRenderCoordSys = {
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
};

const ANNOTATION_GUIDE_LINE_OPACITY = 0.9;
const ANNOTATION_GUIDE_LINE_WIDTH = 1.5;
const ANNOTATION_GUIDE_SERIES_ID_PREFIX = 'annotation-guide-series-';
const ANNOTATION_LABEL_BORDER_WIDTH = 1;
const ANNOTATION_LABEL_CORNER_RADIUS = 3;
const ANNOTATION_LABEL_FONT_SIZE = 11;
const ANNOTATION_LABEL_TEXT_COLOR = DEFAULT_SERIES_ANNOTATION_TEXT_COLOR;
const ANNOTATION_LABEL_TEXT_HORIZONTAL_PADDING = 14;
const NAVIGATOR_ANNOTATION_LINE_SERIES_ID = 'navigator-annotation-lines';

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

function buildAnnotationLabelData(
    annotations: RenderableSeriesAnnotation[],
): AnnotationLabelData {
    return annotations.map((annotation) => ({
        name: annotation.text,
        value: [annotation.anchorTime, annotation.labelY],
        annotationIndex: annotation.annotationIndex,
    }));
}

function buildAnnotationSeriesId(
    seriesIdPrefix: string,
    seriesIndex: number,
    clip: boolean,
): string {
    return `${seriesIdPrefix}${seriesIndex}${clip ? '-clipped' : ''}`;
}

function isCartesianRenderCoordSys(
    coordSys: CustomSeriesRenderItemParams['coordSys'],
): coordSys is CartesianRenderCoordSys {
    return (
        coordSys.type === 'cartesian2d' &&
        Number.isFinite((coordSys as CartesianRenderCoordSys).x) &&
        Number.isFinite((coordSys as CartesianRenderCoordSys).y) &&
        Number.isFinite((coordSys as CartesianRenderCoordSys).width) &&
        Number.isFinite((coordSys as CartesianRenderCoordSys).height)
    );
}

function clampNumber(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
}

function createAnnotationLabelRenderItem(
    annotations: RenderableSeriesAnnotation[],
): NonNullable<CustomSeriesOption['renderItem']> {
    return (
        params: CustomSeriesRenderItemParams,
        api: CustomSeriesRenderItemAPI,
    ): CustomSeriesRenderItemReturn => {
        const annotation = annotations[params.dataIndex];

        if (!annotation || !isCartesianRenderCoordSys(params.coordSys)) {
            return undefined;
        }

        const xValue = Number(api.value(0));
        const yValue = Number(api.value(1));
        const point = api.coord([xValue, yValue]);
        const centerX = Number(point[0]);
        const centerY = Number(point[1]);

        if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
            return undefined;
        }

        const labelWidth = Math.min(annotation.symbolSize[0], params.coordSys.width);
        const labelHeight = Math.min(annotation.symbolSize[1], params.coordSys.height);

        if (labelWidth <= 0 || labelHeight <= 0) {
            return undefined;
        }

        const labelX = clampNumber(
            centerX - labelWidth / 2,
            params.coordSys.x,
            params.coordSys.x + params.coordSys.width - labelWidth,
        );
        const labelY = clampNumber(
            centerY - labelHeight / 2,
            params.coordSys.y,
            params.coordSys.y + params.coordSys.height - labelHeight,
        );

        return {
            type: 'group',
            clipPath: {
                type: 'rect',
                shape: {
                    x: params.coordSys.x,
                    y: params.coordSys.y,
                    width: params.coordSys.width,
                    height: params.coordSys.height,
                },
            },
            children: [
                {
                    type: 'rect',
                    shape: {
                        x: labelX,
                        y: labelY,
                        width: labelWidth,
                        height: labelHeight,
                        r: ANNOTATION_LABEL_CORNER_RADIUS,
                    },
                    style: {
                        fill: annotation.fillColor,
                        stroke: createAnnotationBorderColor(annotation.fillColor),
                        lineWidth: ANNOTATION_LABEL_BORDER_WIDTH,
                    },
                },
                {
                    type: 'text',
                    style: {
                        x: labelX + labelWidth / 2,
                        y: labelY + labelHeight / 2,
                        text: annotation.text,
                        fill: annotation.textColor || ANNOTATION_LABEL_TEXT_COLOR,
                        font: api.font({
                            fontSize: ANNOTATION_LABEL_FONT_SIZE,
                            fontWeight: 600,
                        }),
                        align: 'center',
                        verticalAlign: 'middle',
                        width: Math.max(
                            labelWidth - ANNOTATION_LABEL_TEXT_HORIZONTAL_PADDING,
                            0,
                        ),
                        overflow: 'truncate',
                        lineHeight: 14,
                    },
                },
            ],
        };
    };
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
            type: 'custom',
            ...sSharedSeriesOption,
            coordinateSystem: 'cartesian2d',
            renderItem: createAnnotationLabelRenderItem(annotations),
            data: buildAnnotationLabelData(annotations),
            z: 8,
        },
    ];
}

export function buildNavigatorAnnotationLineSeries(
    annotations: PanelAnnotation[],
    seriesDefinitions: PanelSeriesDefinition[],
    chartData: ChartSeriesData[],
    yAxisOptions: YAXisComponentOption[],
    navigatorRange: TimeRangeMs,
    visibleSeries: Record<string, boolean> = {},
): SeriesOption[] {
    const sAnnotationLines = buildRenderableSeriesAnnotations(
        annotations,
        seriesDefinitions,
        chartData,
        yAxisOptions,
        navigatorRange,
        visibleSeries,
    ).map((annotation) => ({
        xAxis: annotation.anchorTime,
        lineStyle: {
            color: annotation.fillColor,
            type: 'solid' as const,
        },
    }));

    if (sAnnotationLines.length === 0) {
        return [];
    }

    return [
        {
            id: NAVIGATOR_ANNOTATION_LINE_SERIES_ID,
            type: 'line',
            legendHoverLink: false,
            silent: true,
            xAxisIndex: PANEL_NAVIGATOR_DATA_X_AXIS_INDEX,
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
                data: sAnnotationLines,
            },
            z: 5,
            emphasis: {
                disabled: true,
            },
        },
    ];
}

function createAnnotationBorderColor(fillColor: string): string {
    const sRgb = parseHexColor(fillColor);

    if (!sRgb) {
        return 'rgba(255, 255, 255, 0.55)';
    }

    const sBrightness = (sRgb.r * 299 + sRgb.g * 587 + sRgb.b * 114) / 1000;

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
