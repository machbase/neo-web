import type { ChartSeriesData } from '../../domain/ChartDomain';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';
import { createTimeRangeMs } from '../../domain/time/TimeRangeUtils';

export function getSeriesTimeBounds(
    seriesData: ChartSeriesData[],
): TimeRangeMs | undefined {
    const sTimestamps = seriesData.flatMap((series) =>
        series.data.map(([timestamp]) => timestamp),
    );

    if (sTimestamps.length === 0) {
        return undefined;
    }

    const sStartTime = Math.min(...sTimestamps);
    const sEndTime = Math.max(...sTimestamps);

    if (
        !Number.isFinite(sStartTime) ||
        !Number.isFinite(sEndTime) ||
        sEndTime <= sStartTime
    ) {
        return undefined;
    }

    return createTimeRangeMs(sStartTime, sEndTime);
}
