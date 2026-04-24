import type { ChartRow } from '../utils/series/PanelSeriesTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';

/**
 * Resolves the anchor timestamp that should represent one saved annotation.
 * Intent: Keep point-annotation reads stable even if older saved annotations use a non-zero time span.
 * @param aTimeRange The saved annotation time range.
 * @returns The timestamp that should anchor the annotation to the series.
 */
export function getAnnotationAnchorTime(aTimeRange: TimeRangeMs): number {
    if (aTimeRange.endTime > aTimeRange.startTime) {
        return (aTimeRange.startTime + aTimeRange.endTime) / 2;
    }

    return aTimeRange.startTime;
}

/**
 * Finds the chart row whose timestamp is closest to the requested time.
 * Intent: Re-anchor saved annotations and chart clicks to the nearest real series sample.
 * @param aChartRows The sorted chart rows for one rendered series.
 * @param aTargetTime The clicked or saved annotation timestamp.
 * @returns The nearest chart row, or undefined when the series has no rows.
 */
export function findNearestChartRow(
    aChartRows: ChartRow[],
    aTargetTime: number,
): ChartRow | undefined {
    if (aChartRows.length === 0 || !Number.isFinite(aTargetTime)) {
        return undefined;
    }

    let sLowIndex = 0;
    let sHighIndex = aChartRows.length - 1;

    while (sLowIndex <= sHighIndex) {
        const sMiddleIndex = Math.floor((sLowIndex + sHighIndex) / 2);
        const sMiddleTime = aChartRows[sMiddleIndex]?.[0];

        if (sMiddleTime === aTargetTime) {
            return aChartRows[sMiddleIndex];
        }

        if ((sMiddleTime ?? 0) < aTargetTime) {
            sLowIndex = sMiddleIndex + 1;
            continue;
        }

        sHighIndex = sMiddleIndex - 1;
    }

    const sNextRow = aChartRows[Math.min(sLowIndex, aChartRows.length - 1)];
    const sPreviousRow = aChartRows[Math.max(sLowIndex - 1, 0)];
    const sNextDistance = Math.abs((sNextRow?.[0] ?? Number.POSITIVE_INFINITY) - aTargetTime);
    const sPreviousDistance = Math.abs(
        (sPreviousRow?.[0] ?? Number.POSITIVE_INFINITY) - aTargetTime,
    );

    return sPreviousDistance <= sNextDistance ? sPreviousRow : sNextRow;
}
