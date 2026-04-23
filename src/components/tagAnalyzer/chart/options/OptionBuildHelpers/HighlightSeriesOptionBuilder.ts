import type { SeriesOption, YAXisComponentOption } from 'echarts';
import type { PanelHighlight } from '../../../utils/panelModelTypes';
import {
    HIGHLIGHT_LABEL_SERIES_STATIC_OPTION,
    HIGHLIGHT_OVERLAY_MARK_AREA_STATIC_OPTION,
    HIGHLIGHT_OVERLAY_SERIES_STATIC_OPTION,
} from '../ChartOptionConstants';

type HighlightAreaData = Array<[{ name: string; xAxis: number }, { xAxis: number }]>;

/**
 * Builds the invisible mark-area overlay series for saved highlight ranges.
 * Intent: Keep highlight overlay styling static while assigning only the dynamic mark-area data here.
 * @param aHighlights The saved highlight ranges to render as shaded regions.
 * @returns The ECharts series list for highlight range shading.
 */
export function buildHighlightOverlaySeriesOption(aHighlights: PanelHighlight[]): SeriesOption[] {
    const sHighlightAreas = getHighlightAreaData(aHighlights);

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

/**
 * Builds the clickable label series for saved highlight ranges.
 * Intent: Keep highlight label styling static while positioning labels against the resolved primary y-axis.
 * @param aHighlights The saved highlight ranges to label.
 * @param aPrimaryYAxis The resolved primary y-axis option used to place labels near the chart top.
 * @returns The ECharts series list for highlight labels.
 */
export function buildHighlightLabelSeries(
    aHighlights: PanelHighlight[],
    aPrimaryYAxis: YAXisComponentOption,
): SeriesOption[] {
    const sAxisMin = Number(aPrimaryYAxis.min);
    const sAxisMax = Number(aPrimaryYAxis.max);

    if (!Number.isFinite(sAxisMin) || !Number.isFinite(sAxisMax)) {
        return [];
    }

    const sLabelY = getHighlightLabelY(sAxisMin, sAxisMax);
    const sLabelData = getHighlightLabelData(aHighlights, sLabelY);

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

function getHighlightAreaData(aHighlights: PanelHighlight[]): HighlightAreaData {
    return (aHighlights ?? [])
        .filter(isRenderableHighlight)
        .map((aHighlight) => [
            {
                name: aHighlight.text || 'unnamed',
                xAxis: aHighlight.timeRange.startTime,
            },
            {
                xAxis: aHighlight.timeRange.endTime,
            },
        ]);
}

function getHighlightLabelData(aHighlights: PanelHighlight[], aLabelY: number) {
    return (aHighlights ?? [])
        .filter(isRenderableHighlight)
        .map((aHighlight, aHighlightIndex) => ({
            name: aHighlight.text || 'unnamed',
            value: [
                (aHighlight.timeRange.startTime + aHighlight.timeRange.endTime) / 2,
                aLabelY,
            ],
            highlightIndex: aHighlightIndex,
        }));
}

function getHighlightLabelY(aAxisMin: number, aAxisMax: number): number {
    const sAxisHeight = aAxisMax - aAxisMin;

    return (
        aAxisMax -
        (sAxisHeight > 0 ? sAxisHeight * 0.04 : Math.max(Math.abs(aAxisMax) * 0.04, 1))
    );
}

function isRenderableHighlight(aHighlight: PanelHighlight): boolean {
    return (
        Number.isFinite(aHighlight.timeRange.startTime) &&
        Number.isFinite(aHighlight.timeRange.endTime) &&
        aHighlight.timeRange.endTime > aHighlight.timeRange.startTime
    );
}
