import type { PanelAxes, PanelHighlight } from '../../utils/panelModelTypes';
import type { ChartSeriesItem } from '../../utils/series/seriesTypes';
import type { TimeRangeMs } from '../../utils/time/timeTypes';
import { buildChartYAxisOption } from './ChartAxisOptionBuilder';
import type { PanelSeriesOptions } from './ChartOptionTypes';

export const HIGHLIGHT_LABEL_SERIES_ID = 'highlight-labels';

/**
 * Builds a dedicated non-legend overlay series for saved highlight ranges.
 * Intent: Render highlight shading without changing y-axis calculations or series legend state.
 * @param aHighlights The saved highlight ranges for the panel.
 * @param aNavigatorRange The navigator range that bounds the chart.
 * @returns The optional highlight overlay series.
 */
export function buildHighlightOverlaySeries(
    aHighlights: PanelHighlight[],
    aNavigatorRange: TimeRangeMs | undefined,
): PanelSeriesOptions {
    const sHighlightAreas: Array<
        [
            {
                name: string;
                xAxis: number;
            },
            {
                xAxis: number;
            },
        ]
    > = (aHighlights ?? [])
        .filter(
            (aHighlight) =>
                Number.isFinite(aHighlight.timeRange.startTime) &&
                Number.isFinite(aHighlight.timeRange.endTime) &&
                aHighlight.timeRange.endTime > aHighlight.timeRange.startTime,
        )
        .map((aHighlight) => [
            {
                name: aHighlight.text || 'unnamed',
                xAxis: aHighlight.timeRange.startTime,
            },
            {
                xAxis: aHighlight.timeRange.endTime,
            },
        ]);

    if (sHighlightAreas.length === 0 || !aNavigatorRange) {
        return [];
    }

    return [
        {
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
            lineStyle: {
                width: 0,
                opacity: 0,
            },
            itemStyle: {
                opacity: 0,
            },
            tooltip: {
                show: false,
            },
            z: 1,
            emphasis: {
                disabled: true,
            },
            markArea: {
                silent: true,
                itemStyle: {
                    color: 'rgba(253, 181, 50, 0.16)',
                },
                label: {
                    show: false,
                    color: '#fdb532',
                    fontSize: 10,
                },
                data: sHighlightAreas,
            },
        },
    ];
}

/**
 * Builds a dedicated clickable label series for saved highlights.
 * Intent: Limit rename interactions to the rendered label area instead of the whole highlighted band.
 * @param aHighlights The saved highlight ranges for the panel.
 * @param aChartData The visible chart datasets used to resolve the current y-axis range.
 * @param aAxes The panel axis settings used to resolve the main y-axis range.
 * @param aIsRaw Whether the chart is currently showing raw data.
 * @param aUseNormalize Whether right-axis normalization is active.
 * @returns The optional clickable highlight label series.
 */
export function buildHighlightLabelSeries(
    aHighlights: PanelHighlight[],
    aChartData: ChartSeriesItem[],
    aAxes: PanelAxes,
    aIsRaw: boolean,
    aUseNormalize: boolean,
): PanelSeriesOptions {
    const sPrimaryYAxis = buildChartYAxisOption(aAxes, aChartData, aIsRaw, aUseNormalize)[0];
    const sAxisMin = Number(sPrimaryYAxis.min);
    const sAxisMax = Number(sPrimaryYAxis.max);

    if (!Number.isFinite(sAxisMin) || !Number.isFinite(sAxisMax)) {
        return [];
    }

    const sAxisHeight = sAxisMax - sAxisMin;
    const sLabelY =
        sAxisMax -
        (sAxisHeight > 0 ? sAxisHeight * 0.04 : Math.max(Math.abs(sAxisMax) * 0.04, 1));
    const sLabelData = (aHighlights ?? [])
        .filter(
            (aHighlight) =>
                Number.isFinite(aHighlight.timeRange.startTime) &&
                Number.isFinite(aHighlight.timeRange.endTime) &&
                aHighlight.timeRange.endTime > aHighlight.timeRange.startTime,
        )
        .map((aHighlight, aIndex) => ({
            name: aHighlight.text || 'unnamed',
            value: [
                (aHighlight.timeRange.startTime + aHighlight.timeRange.endTime) / 2,
                sLabelY,
            ],
            highlightIndex: aIndex,
        }));

    if (sLabelData.length === 0) {
        return [];
    }

    return [
        {
            id: HIGHLIGHT_LABEL_SERIES_ID,
            type: 'scatter',
            xAxisIndex: 0,
            yAxisIndex: 0,
            data: sLabelData,
            symbol: 'roundRect',
            symbolSize: [120, 18],
            animation: false,
            legendHoverLink: false,
            itemStyle: {
                color: 'rgba(0, 0, 0, 0)',
                borderColor: 'rgba(0, 0, 0, 0)',
            },
            label: {
                show: true,
                position: 'inside',
                color: '#fdb532',
                fontSize: 10,
                formatter: '{b}',
                padding: [2, 4],
            },
            emphasis: {
                scale: false,
            },
            tooltip: {
                show: false,
            },
            z: 3,
        },
    ];
}
