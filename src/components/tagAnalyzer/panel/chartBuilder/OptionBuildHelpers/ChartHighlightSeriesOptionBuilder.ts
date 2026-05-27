import type {
    SeriesOption,
    YAXisComponentOption,
} from 'echarts';
import type { PanelHighlight } from '../../../domain/PanelDomain';
import {
    HIGHLIGHT_LABEL_SERIES_STATIC_OPTION,
    HIGHLIGHT_OVERLAY_MARK_AREA_STATIC_OPTION,
    HIGHLIGHT_OVERLAY_SERIES_STATIC_OPTION,
    HIGHLIGHT_OUTLINE_WIDTH,
    NAVIGATOR_HIGHLIGHT_OVERLAY_SERIES_ID,
} from './ChartOptionConstants';

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

function isRenderableHighlight(highlight: PanelHighlight): boolean {
    return (
        Number.isFinite(highlight.timeRange.startTime) &&
        Number.isFinite(highlight.timeRange.endTime) &&
        highlight.timeRange.endTime > highlight.timeRange.startTime
    );
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
                        color: createHighlightOverlayColor(highlight.fillColor),
                        borderColor: createHighlightOutlineColor(highlight.fillColor),
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
        .filter(isRenderableHighlight)
        .map((highlight, highlightIndex) => ({
            name: highlight.text || 'unnamed',
            value: [
                (highlight.timeRange.startTime + highlight.timeRange.endTime) / 2,
                labelY,
            ],
            highlightIndex: highlightIndex,
            label: {
                color: highlight.textColor,
            },
        }));
}

function createHighlightOverlayColor(fillColor: string): string {
    return createColorWithAlpha(fillColor, 0.16);
}

function createHighlightOutlineColor(fillColor: string): string {
    return createColorWithAlpha(fillColor, 0.82);
}

function createColorWithAlpha(color: string, alpha: number): string {
    const sHexMatch = /^#([0-9a-fA-F]{6})$/.exec(color);

    if (!sHexMatch) {
        return color;
    }

    const sRgbHex = sHexMatch[1];
    const sRed = Number.parseInt(sRgbHex.slice(0, 2), 16);
    const sGreen = Number.parseInt(sRgbHex.slice(2, 4), 16);
    const sBlue = Number.parseInt(sRgbHex.slice(4, 6), 16);

    return `rgba(${sRed}, ${sGreen}, ${sBlue}, ${alpha})`;
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
                      xAxisIndex: 1,
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
