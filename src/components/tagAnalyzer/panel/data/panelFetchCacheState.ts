import type { TimeRangeMs } from '../../domain/time/TimeTypes';
import type { FetchPanelSeriesRowsResult } from '../../fetch/panelData/PanelDataFetchTypes';
import {
    hasFetchLimitReached,
    hasSeriesFetchError,
} from './panelFetchResultStatus';

export type MainFetchCacheState = {
    baseKey: string;
    fetchedRange: TimeRangeMs | undefined;
    reuseKey: string | undefined;
};

export type NavigatorFetchCacheState = {
    baseKey: string;
    fetchedRange: TimeRangeMs | undefined;
};

export function updateMainFetchCache(
    cacheRef: { current: MainFetchCacheState },
    baseKey: string,
    fetchedRange: TimeRangeMs,
    reuseKey: string | undefined,
    result: FetchPanelSeriesRowsResult,
): void {
    if (!reuseKey || hasFetchLimitReached(result) || hasSeriesFetchError(result)) {
        cacheRef.current = {
            baseKey,
            fetchedRange: undefined,
            reuseKey: undefined,
        };
        return;
    }

    cacheRef.current = {
        baseKey,
        fetchedRange,
        reuseKey,
    };
}

export function updateNavigatorFetchCache(
    cacheRef: { current: NavigatorFetchCacheState },
    baseKey: string,
    fetchedRange: TimeRangeMs,
    result: FetchPanelSeriesRowsResult,
): void {
    if (hasSeriesFetchError(result)) {
        cacheRef.current = {
            baseKey,
            fetchedRange: undefined,
        };
        return;
    }

    cacheRef.current = {
        baseKey,
        fetchedRange,
    };
}
