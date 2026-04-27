import type { ChartRow } from '../utils/series/PanelSeriesTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';

export function getAnnotationAnchorTime(timeRange: TimeRangeMs): number {
    if (timeRange.endTime > timeRange.startTime) {
        return (timeRange.startTime + timeRange.endTime) / 2;
    }

    return timeRange.startTime;
}

export function findNearestChartRow(
    chartRows: ChartRow[],
    targetTime: number,
): ChartRow | undefined {
    if (chartRows.length === 0 || !Number.isFinite(targetTime)) {
        return undefined;
    }

    let sLowIndex = 0;
    let sHighIndex = chartRows.length - 1;

    while (sLowIndex <= sHighIndex) {
        const sMiddleIndex = Math.floor((sLowIndex + sHighIndex) / 2);
        const sMiddleTime = chartRows[sMiddleIndex]?.[0];

        if (sMiddleTime === targetTime) {
            return chartRows[sMiddleIndex];
        }

        if ((sMiddleTime ?? 0) < targetTime) {
            sLowIndex = sMiddleIndex + 1;
            continue;
        }

        sHighIndex = sMiddleIndex - 1;
    }

    const sNextRow = chartRows[Math.min(sLowIndex, chartRows.length - 1)];
    const sPreviousRow = chartRows[Math.max(sLowIndex - 1, 0)];
    const sNextDistance = Math.abs((sNextRow?.[0] ?? Number.POSITIVE_INFINITY) - targetTime);
    const sPreviousDistance = Math.abs(
        (sPreviousRow?.[0] ?? Number.POSITIVE_INFINITY) - targetTime,
    );

    return sPreviousDistance <= sNextDistance ? sPreviousRow : sNextRow;
}
