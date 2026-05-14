import type { PanelSeriesFetchResult } from '../../fetch/FetchContracts';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';

export type LimitedQueryResultAnalysis = {
    isLimitReached: boolean;
    limitedDataRange?: TimeRangeMs | undefined;
};

export function analyzeLimitedQueryResult(
    seriesFetchResults: PanelSeriesFetchResult[],
    count: number,
): LimitedQueryResultAnalysis {
    const isLimitReached = hasFetchResultReachedLimit(seriesFetchResults, count);

    return {
        isLimitReached: isLimitReached,
        ...(isLimitReached
            ? {
                  limitedDataRange: getLimitedDataRange(seriesFetchResults, count),
              }
            : {}),
    };
}

function hasFetchResultReachedLimit(
    seriesFetchResults: PanelSeriesFetchResult[],
    count: number,
): boolean {
    return (
        count > 0 &&
        seriesFetchResults.some(({ fetchResult }) => {
            const rows = fetchResult?.data?.rows ?? [];

            return rows.length === count;
        })
    );
}

function getLimitedDataRange(
    seriesFetchResults: PanelSeriesFetchResult[],
    count: number,
): TimeRangeMs | undefined {
    if (count <= 0) {
        return undefined;
    }

    let sStartTime = Number.POSITIVE_INFINITY;
    let sEndTime = Number.NEGATIVE_INFINITY;

    for (const { fetchResult } of seriesFetchResults) {
        const rows = fetchResult?.data?.rows ?? [];
        if (rows.length !== count) {
            continue;
        }

        for (const row of rows) {
            const sTimestamp = Number(row[0]);
            if (!Number.isFinite(sTimestamp)) {
                continue;
            }

            sStartTime = Math.min(sStartTime, sTimestamp);
            sEndTime = Math.max(sEndTime, sTimestamp);
        }
    }

    if (
        !Number.isFinite(sStartTime) ||
        !Number.isFinite(sEndTime) ||
        sEndTime <= sStartTime
    ) {
        return undefined;
    }

    return {
        startTime: sStartTime,
        endTime: sEndTime,
    };
}
