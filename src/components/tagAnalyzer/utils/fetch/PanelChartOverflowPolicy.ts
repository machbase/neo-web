import type { TagFetchRow } from './FetchTypes';
import type { TimeRangeMs } from '../time/types/TimeTypes';
import type {
    FetchPanelDatasetsResult,
    PanelDataLimitState,
} from './FetchTypes';

/**
 * Determines whether the fetched panel data hit a limit.
 * Intent: Preserve the final visible timestamp when raw data is truncated by the fetch result.
 *
 * @param isRaw Whether the current request is loading raw data.
 * @param rows The fetched rows for the current series.
 * @param count The expected row count for a full fetch.
 * @param currentLimitEnd The current limit boundary carried across series.
 * @returns The updated limit state for the current series.
 */
export function analyzePanelDataLimit(
    isRaw: boolean,
    rows: TagFetchRow[] | undefined,
    count: number,
    currentLimitEnd: number,
): PanelDataLimitState {
    if (!isRaw || !rows || rows.length !== count) {
        return {
            hasDataLimit: false,
            limitEnd: currentLimitEnd,
        };
    }

    const sLastTimestamp = rows[rows.length - 1]?.[0];
    const sPreviousTimestamp = rows[rows.length - 2]?.[0];
    const sShouldUseLastTimestamp = currentLimitEnd !== 0 && currentLimitEnd !== sLastTimestamp;
    const sLimitEnd = sShouldUseLastTimestamp
        ? sLastTimestamp
        : (sPreviousTimestamp ?? sLastTimestamp);

    return {
        hasDataLimit: true,
        limitEnd: sLimitEnd,
    };
}

/**
 * Resolves the overflow range returned to the runtime chart controller.
 * Intent: Keep raw overflow range construction out of the public chart loader facade.
 * @param fetchResult The fetch result that may contain raw overflow metadata.
 * @returns The overflow range when raw data was clamped, otherwise undefined.
 */
export function createPanelOverflowRange(
    fetchResult: FetchPanelDatasetsResult,
): TimeRangeMs | undefined {
    if (!fetchResult.hasDataLimit || !fetchResult.datasets[0]?.data?.[0]) {
        return undefined;
    }

    return {
        startTime: fetchResult.datasets[0].data[0][0],
        endTime: fetchResult.limitEnd,
    };
}
