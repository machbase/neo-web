import type { SeriesOption, YAXisComponentOption } from 'echarts';
import type { PanelHighlight } from '../../../utils/panelModelTypes';
import {
    HIGHLIGHT_LABEL_SERIES_STATIC_OPTION,
    HIGHLIGHT_OVERLAY_MARK_AREA_STATIC_OPTION,
    HIGHLIGHT_OVERLAY_SERIES_STATIC_OPTION,
} from './ChartOptionConstants';

type HighlightAreaData = Array<[{ name: string; xAxis: number }, { xAxis: number }]>;

export function buildHighlightOverlaySeriesOption(highlights: PanelHighlight[]): SeriesOption[] {
    const sHighlightAreas = getHighlightAreaData(highlights);

    if (sHighlightAreas.length === 0) {
        return [];
    }

    return [
        {
            ...HIGHLIGHT_OVERLAY_SERIES_STATIC_OPTION,
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

function getHighlightAreaData(highlights: PanelHighlight[]): HighlightAreaData {
    return (highlights ?? [])
        .filter(isRenderableHighlight)
        .map((highlight) => [
            {
                name: highlight.text || 'unnamed',
                xAxis: highlight.timeRange.startTime,
            },
            {
                xAxis: highlight.timeRange.endTime,
            },
        ]);
}

function getHighlightLabelData(highlights: PanelHighlight[], labelY: number) {
    return (highlights ?? [])
        .filter(isRenderableHighlight)
        .map((highlight, highlightIndex) => ({
            name: highlight.text || 'unnamed',
            value: [
                (highlight.timeRange.startTime + highlight.timeRange.endTime) / 2,
                labelY,
            ],
            highlightIndex: highlightIndex,
        }));
}

function getHighlightLabelY(axisMin: number, axisMax: number): number {
    const sAxisHeight = axisMax - axisMin;

    return (
        axisMax -
        (sAxisHeight > 0 ? sAxisHeight * 0.04 : Math.max(Math.abs(axisMax) * 0.04, 1))
    );
}

function isRenderableHighlight(highlight: PanelHighlight): boolean {
    return (
        Number.isFinite(highlight.timeRange.startTime) &&
        Number.isFinite(highlight.timeRange.endTime) &&
        highlight.timeRange.endTime > highlight.timeRange.startTime
    );
}
