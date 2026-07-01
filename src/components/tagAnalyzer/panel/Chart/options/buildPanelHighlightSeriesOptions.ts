import type {
    LineSeriesOption,
    MarkAreaComponentOption,
    ScatterSeriesOption,
    SeriesOption,
    YAXisComponentOption,
} from 'echarts';
import {
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    type PanelHighlight,
} from '../../../domain/panel/PanelConfig';
import { parseHexColor } from './ColorUtils';
import {
    DEFAULT_NOT_SHOW,
    HIGHLIGHT_LABEL_SERIES_ID,
    HIGHLIGHT_OUTLINE_WIDTH,
    NAVIGATOR_HIGHLIGHT_OVERLAY_SERIES_ID,
    PANEL_NAVIGATOR_DATA_X_AXIS_INDEX,
} from './PanelChartOptionConstants';
import {
    getTimeRangeCenter,
    isValidTimeRange,
} from '../../../domain/time/TimeRangeUtils';

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

type HighlightAreaData = Array<[HighlightAreaPoint, HighlightAreaPoint]>;

type HighlightLabelData = Array<{
    name: string;
    value: [number, number];
    highlightIndex: number;
    label: {
        color: string;
    };
}>;

type HighlightOverlayTarget = 'main' | 'navigator';

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

function isRenderableHighlight(highlight: PanelHighlight): boolean {
    return isValidTimeRange(highlight.timeRange);
}

function getHighlightAreaData(
    highlights: PanelHighlight[],
    includeName: boolean,
): HighlightAreaData {
    return (highlights ?? [])
        .filter(isRenderableHighlight)
        .map(
            (highlight): [HighlightAreaPoint, HighlightAreaPoint] => [
                {
                    ...(includeName ? { name: highlight.text || 'unnamed' } : {}),
                    xAxis: highlight.timeRange.startTime,
                    itemStyle: {
                        color: createColorWithAlpha(highlight.fillColor, 0.16),
                        borderColor: createColorWithAlpha(highlight.fillColor, 0.82),
                        borderType: 'solid',
                        borderWidth: HIGHLIGHT_OUTLINE_WIDTH,
                    },
                },
                {
                    xAxis: highlight.timeRange.endTime,
                },
            ],
        );
}

function getHighlightLabelY(axisMin: number, axisMax: number): number {
    const sAxisHeight = axisMax - axisMin;

    return (
        axisMax -
        (sAxisHeight > 0 ? sAxisHeight * 0.04 : Math.max(Math.abs(axisMax) * 0.04, 1))
    );
}

function getHighlightLabelData(
    highlights: PanelHighlight[],
    labelY: number,
): HighlightLabelData {
    return (highlights ?? [])
        .flatMap((highlight, highlightIndex) =>
            isRenderableHighlight(highlight)
                ? [{
                      name: highlight.text || 'unnamed',
                      value: [
                          getTimeRangeCenter(highlight.timeRange),
                          labelY,
                      ] as [number, number],
                      highlightIndex,
                      label: {
                          color: highlight.textColor,
                      },
                  }]
                : [],
        );
}

function createColorWithAlpha(color: string, alpha: number): string {
    const sRgb = parseHexColor(color);

    if (!sRgb) {
        return color;
    }

    return `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, ${alpha})`;
}

export function buildHighlightOverlaySeries(
    highlights: PanelHighlight[],
    target: HighlightOverlayTarget,
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
                      yAxisIndex: 2,
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

export function buildHighlightLabelSeries(
    highlights: PanelHighlight[],
    primaryYAxis: YAXisComponentOption,
): SeriesOption[] {
    const sAxisMin = Number(primaryYAxis.min);
    const sAxisMax = Number(primaryYAxis.max);

    if (!Number.isFinite(sAxisMin) || !Number.isFinite(sAxisMax)) {
        return [];
    }

    const sLabelY = getHighlightLabelY(sAxisMin, sAxisMax);
    const sLabelData = getHighlightLabelData(highlights, sLabelY);

    if (sLabelData.length === 0) {
        return [];
    }

    return [
        {
            ...HIGHLIGHT_LABEL_SERIES_STATIC_OPTION,
            data: sLabelData,
        },
    ];
}
