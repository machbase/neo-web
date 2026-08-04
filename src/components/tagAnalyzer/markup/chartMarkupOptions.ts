import {
    type CustomSeriesOption,
    type CustomSeriesRenderItemAPI,
    type CustomSeriesRenderItemParams,
    type CustomSeriesRenderItemReturn,
    type LineSeriesOption,
    type MarkAreaComponentOption,
    type ScatterSeriesOption,
    type SeriesOption,
    type YAXisComponentOption,
} from 'echarts';

import type { AxisRange } from '../range/rangeModel';
import { getEnclosingRange, getRangeCenter } from '../range/rangeArithmetic';
import { PANEL_NAVIGATOR_DATA_X_AXIS_INDEX, PANEL_NAVIGATOR_Y_AXIS_INDEX } from '../chart/chartGeometry';
import {
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    type PanelHighlight,
} from './markupModel';
import {
    buildRenderableSeriesAnnotations,
    type AnnotationRenderContext,
    type RenderableSeriesAnnotation,
} from './annotationLayout';

type HighlightAreaPoint = {
    name?: string;
    xAxis: number;
    itemStyle?: {
        color: string;
        borderColor?: string;
        borderType?: 'solid';
        borderWidth?: number;
    };
};

type CartesianRenderCoordSys = {
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
};

type BuildChartMarkupSeriesParams = {
    highlights: PanelHighlight[];
    annotationContext: Omit<AnnotationRenderContext, 'visibleRange'>;
    mainRange: AxisRange;
    navigatorRange: AxisRange;
};

type ChartMarkupSeries = {
    main: SeriesOption[];
    navigator: SeriesOption[];
};

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;
const DEFAULT_NOT_SHOW = { show: false } as const;
const HIGHLIGHT_LABEL_SERIES_ID = 'highlight-labels';
const ANNOTATION_LABEL_SERIES_ID_PREFIX = 'annotation-label-series-';
const HIGHLIGHT_OUTLINE_WIDTH = 1;
const NAVIGATOR_HIGHLIGHT_OVERLAY_SERIES_ID = 'navigator-highlight-overlay';
const TRANSPARENT_COLOR = 'rgba(0, 0, 0, 0)';
const HIGHLIGHT_OVERLAY_SERIES_STATIC_OPTION: LineSeriesOption = {
    id: 'highlight-overlay',
    type: 'line',
    xAxisIndex: 0,
    yAxisIndex: 0,
    data: [],
    symbol: 'none',
    showSymbol: false,
    silent: true,
    animation: false,
    legendHoverLink: false,
    lineStyle: { width: 0, opacity: 0 },
    itemStyle: { opacity: 0 },
    tooltip: DEFAULT_NOT_SHOW,
    z: 1,
    emphasis: { disabled: true },
};

const HIGHLIGHT_OVERLAY_MARK_AREA_STATIC_OPTION: MarkAreaComponentOption = {
    silent: true,
    itemStyle: { color: 'rgba(253, 181, 50, 0.16)' },
    label: {
        ...DEFAULT_NOT_SHOW,
        color: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
        fontSize: 10,
    },
};

const HIGHLIGHT_LABEL_SERIES_STATIC_OPTION: ScatterSeriesOption = {
    id: HIGHLIGHT_LABEL_SERIES_ID,
    type: 'scatter',
    xAxisIndex: 0,
    yAxisIndex: 0,
    symbol: 'circle',
    symbolSize: 0,
    animation: false,
    legendHoverLink: false,
    itemStyle: {
        color: TRANSPARENT_COLOR,
        borderColor: TRANSPARENT_COLOR,
    },
    label: {
        show: true,
        position: 'inside',
        color: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
        fontSize: 10,
        fontWeight: 600,
        formatter: '{b}',
        padding: 0,
    },
    emphasis: { scale: false },
    tooltip: DEFAULT_NOT_SHOW,
    z: 3,
};

const ANNOTATION_GUIDE_LINE_OPACITY = 0.9;
const ANNOTATION_GUIDE_LINE_WIDTH = 1.5;
const ANNOTATION_GUIDE_SERIES_ID_PREFIX = 'annotation-guide-series-';
const ANNOTATION_LABEL_BORDER_WIDTH = 1;
const ANNOTATION_LABEL_CORNER_RADIUS = 3;
const ANNOTATION_LABEL_FONT_SIZE = 11;
const ANNOTATION_LABEL_TEXT_HORIZONTAL_PADDING = 14;
const NAVIGATOR_ANNOTATION_LINE_SERIES_ID = 'navigator-annotation-lines';

function parseHexColor(color: string) {
    const sRgbHex = HEX_COLOR_PATTERN.exec(color)?.[1];

    return sRgbHex
        ? {
              r: Number.parseInt(sRgbHex.slice(0, 2), 16),
              g: Number.parseInt(sRgbHex.slice(2, 4), 16),
              b: Number.parseInt(sRgbHex.slice(4, 6), 16),
          }
        : undefined;
}

function createColorWithAlpha(color: string, alpha: number): string {
    const sRgb = parseHexColor(color);

    return sRgb
        ? 'rgba(' + sRgb.r + ', ' + sRgb.g + ', ' + sRgb.b + ', ' + alpha + ')'
        : color;
}

function getHighlightAreaData(
    highlights: PanelHighlight[],
    includeName: boolean,
) {
    return highlights.map(
        (highlight): [HighlightAreaPoint, HighlightAreaPoint] => [
            {
                ...(includeName ? { name: highlight.text || 'unnamed' } : {}),
                xAxis: highlight.timeRange.start,
                itemStyle: {
                    color: createColorWithAlpha(highlight.fillColor, 0.16),
                    borderColor: createColorWithAlpha(highlight.fillColor, 0.82),
                    borderType: 'solid',
                    borderWidth: HIGHLIGHT_OUTLINE_WIDTH,
                },
            },
            { xAxis: highlight.timeRange.end },
        ],
    );
}

function getHighlightLabelData(
    highlights: PanelHighlight[],
    labelY: number,
) {
    return highlights.map((highlight, highlightIndex) => ({
        name: highlight.text || 'unnamed',
        value: [getRangeCenter(highlight.timeRange), labelY] as [number, number],
        highlightIndex,
        label: { color: highlight.textColor },
    }));
}

function buildHighlightOverlaySeries(
    highlights: PanelHighlight[],
    target: 'main' | 'navigator',
): SeriesOption[] {
    const sIsNavigatorTarget = target === 'navigator';
    const sHighlightAreas = getHighlightAreaData(highlights, !sIsNavigatorTarget);

    if (sHighlightAreas.length === 0) {
        return [];
    }

    return [
        {
            ...HIGHLIGHT_OVERLAY_SERIES_STATIC_OPTION,
            ...(sIsNavigatorTarget
                ? {
                      id: NAVIGATOR_HIGHLIGHT_OVERLAY_SERIES_ID,
                      xAxisIndex: PANEL_NAVIGATOR_DATA_X_AXIS_INDEX,
                      yAxisIndex: PANEL_NAVIGATOR_Y_AXIS_INDEX,
                      z: 0,
                  }
                : {}),
            markArea: {
                ...HIGHLIGHT_OVERLAY_MARK_AREA_STATIC_OPTION,
                data: sHighlightAreas,
            },
        },
    ];
}

function buildHighlightLabelSeries(
    highlights: PanelHighlight[],
    primaryYAxis: YAXisComponentOption | undefined,
): SeriesOption[] {
    const sAxisMin = Number(primaryYAxis?.min);
    const sAxisMax = Number(primaryYAxis?.max);

    if (!Number.isFinite(sAxisMin) || !Number.isFinite(sAxisMax)) {
        return [];
    }

    const sAxisHeight = sAxisMax - sAxisMin;
    const sLabelPadding = sAxisHeight > 0
        ? sAxisHeight * 0.04
        : Math.max(Math.abs(sAxisMax) * 0.04, 1);
    const sLabelData = getHighlightLabelData(
        highlights,
        sAxisMax - sLabelPadding,
    );

    return sLabelData.length > 0
        ? [{ ...HIGHLIGHT_LABEL_SERIES_STATIC_OPTION, data: sLabelData }]
        : [];
}

function buildAnnotationGuideLineData(
    annotations: RenderableSeriesAnnotation[],
) {
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
            label: DEFAULT_NOT_SHOW,
        },
        {
            value: [annotation.anchorTime, annotation.labelY],
            symbol: 'none',
            label: DEFAULT_NOT_SHOW,
        },
        {
            value: [Number.NaN, Number.NaN],
            symbol: 'none',
            label: DEFAULT_NOT_SHOW,
        },
    ]);
}

function buildAnnotationLabelData(
    annotations: RenderableSeriesAnnotation[],
) {
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
    return seriesIdPrefix + seriesIndex + (clip ? '-clipped' : '');
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

        const point = api.coord([Number(api.value(0)), Number(api.value(1))]);
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
                        fill: annotation.textColor || DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
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
            emphasis: { disabled: true },
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

function buildNavigatorAnnotationLineSeries(
    annotations: RenderableSeriesAnnotation[],
): SeriesOption[] {
    const sAnnotationLines = annotations.map((annotation) => ({
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
            yAxisIndex: PANEL_NAVIGATOR_Y_AXIS_INDEX,
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
            emphasis: { disabled: true },
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

function buildSeriesAnnotationSeries(
    annotations: RenderableSeriesAnnotation[],
): SeriesOption[] {
    const annotationsBySeries = new Map<string, RenderableSeriesAnnotation[]>();

    annotations.forEach((annotation) => {
        const sAnnotationGroupKey = annotation.seriesIndex + ':' + annotation.clip;
        const seriesAnnotations = annotationsBySeries.get(sAnnotationGroupKey) ?? [];

        seriesAnnotations.push(annotation);
        annotationsBySeries.set(sAnnotationGroupKey, seriesAnnotations);
    });

    return [...annotationsBySeries.values()].flatMap(
        (seriesAnnotations, seriesPosition) =>
            createAnnotationSeriesGroup(seriesAnnotations, seriesPosition),
    );
}

export function buildChartMarkupSeries({
    highlights,
    annotationContext,
    mainRange,
    navigatorRange,
}: BuildChartMarkupSeriesParams): ChartMarkupSeries {
    const sAnnotations = buildRenderableSeriesAnnotations({
        ...annotationContext,
        visibleRange: getEnclosingRange(mainRange, navigatorRange),
    });
    const annotationsInRange = (range: AxisRange) =>
        sAnnotations.filter(
            ({ anchorTime }) => anchorTime >= range.start && anchorTime <= range.end,
        );

    return {
        main: [
            ...buildHighlightOverlaySeries(highlights, 'main'),
            ...buildHighlightLabelSeries(
                highlights,
                annotationContext.yAxisOptions[0],
            ),
            ...buildSeriesAnnotationSeries(annotationsInRange(mainRange)),
        ],
        navigator: [
            ...buildHighlightOverlaySeries(highlights, 'navigator'),
            ...buildNavigatorAnnotationLineSeries(annotationsInRange(navigatorRange)),
        ],
    };
}

export function isAnnotationLabelSeries(seriesId: string | undefined): boolean {
    return Boolean(
        seriesId?.startsWith(ANNOTATION_LABEL_SERIES_ID_PREFIX) &&
        /^\d+/.test(seriesId.slice(ANNOTATION_LABEL_SERIES_ID_PREFIX.length)),
    );
}

export function isHighlightLabelSeries(seriesId: string | undefined): boolean {
    return seriesId === HIGHLIGHT_LABEL_SERIES_ID;
}
