import type { TagFetchRow } from '../utils/fetch/FetchContracts';
import type { TimeRangeMs } from '../utils/time/timeTypes';
import type {
    FetchPanelDatasetsResult,
    PanelDataLimitState,
} from './PanelChartLoadContracts';

/**
 * Determines whether the fetched panel data hit a limit.
 * Intent: Preserve the final visible timestamp when raw data is truncated by the fetch result.
 *
 * @param aIsRaw Whether the current request is loading raw data.
 * @param aRows The fetched rows for the current series.
 * @param aCount The expected row count for a full fetch.
 * @param aCurrentLimitEnd The current limit boundary carried across series.
 * @returns The updated limit state for the current series.
 */
export function analyzePanelDataLimit(
    aIsRaw: boolean,
    aRows: TagFetchRow[] | undefined,
    aCount: number,
    aCurrentLimitEnd: number,
): PanelDataLimitState {
    if (!aIsRaw || !aRows || aRows.length !== aCount) {
        return {
            hasDataLimit: false,
            limitEnd: aCurrentLimitEnd,
        };
    }

    const sLastTimestamp = aRows[aRows.length - 1]?.[0];
    const sPreviousTimestamp = aRows[aRows.length - 2]?.[0];
    const sShouldUseLastTimestamp = aCurrentLimitEnd !== 0 && aCurrentLimitEnd !== sLastTimestamp;
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
 * @param aFetchResult The fetch result that may contain raw overflow metadata.
 * @returns The overflow range when raw data was clamped, otherwise undefined.
 */
export function createPanelOverflowRange(
    aFetchResult: FetchPanelDatasetsResult,
): TimeRangeMs | undefined {
    if (!aFetchResult.hasDataLimit || !aFetchResult.datasets[0]?.data?.[0]) {
        return undefined;
    }

    return {
        startTime: aFetchResult.datasets[0].data[0][0],
        endTime: aFetchResult.limitEnd,
    };
}
