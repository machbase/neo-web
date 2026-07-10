import type { TimeRangeMs, IntervalOption } from '../../domain/time/TimeTypes';
import { getIntervalMs } from '../../domain/time/TimeIntervalUtils';
import {
    createTimeRangeMs,
    getTimeRangeWidth,
    isTimeRangeWithinTimeRange,
    isValidTimeRange,
} from '../../domain/time/TimeRangeUtils';
import { hasNumericBaseTimeSeries } from '../../domain/SeriesDomain';
import { MAIN_CALCULATED_FETCH_ROW_LIMIT } from '../../fetch/panelData/PanelSeriesDataRepository';
import type { PanelChartDataLoadConfig } from './panelChartLoadConfig';
import type {
    MainFetchCacheState,
    NavigatorFetchCacheState,
} from './panelFetchCacheState';

export type PanelFetchDecision =
    | { kind: 'reuse'; fetchedRange: TimeRangeMs }
    | { kind: 'fetch'; fetchRange: TimeRangeMs };

export type PanelFetchPlan = {
    main: PanelFetchDecision;
    navigator: PanelFetchDecision;
};

type ResolvePanelFetchPlanParams = {
    requestPanelRange: TimeRangeMs;
    requestNavigatorRange: TimeRangeMs;
    fullRange: TimeRangeMs;
    loadConfig: PanelChartDataLoadConfig;
    requestInterval: IntervalOption | undefined;
    mainReuseKey: string | undefined;
    mainCacheState: MainFetchCacheState;
    navigatorCacheState: NavigatorFetchCacheState;
};

const PANEL_PREFETCH_SIDE_FACTOR = 1;
const NAVIGATOR_PREFETCH_SIDE_FACTOR = 1;

export function resolvePanelFetchPlan({
    requestPanelRange,
    requestNavigatorRange,
    fullRange,
    loadConfig,
    requestInterval,
    mainReuseKey,
    mainCacheState,
    navigatorCacheState,
}: ResolvePanelFetchPlanParams): PanelFetchPlan {
    return {
        main: resolveMainPanelFetchDecision({
            requestPanelRange,
            requestNavigatorRange,
            fullRange,
            loadConfig,
            requestInterval,
            reuseKey: mainReuseKey,
            cacheState: mainCacheState,
        }),
        navigator: resolveNavigatorFetchDecision({
            requestNavigatorRange,
            fullRange,
            cacheState: navigatorCacheState,
        }),
    };
}

export function getPanelFetchDecisionRange(
    decision: PanelFetchDecision,
): TimeRangeMs {
    return decision.kind === 'fetch' ? decision.fetchRange : decision.fetchedRange;
}

type ResolveMainPanelFetchRangeParams = {
    requestPanelRange: TimeRangeMs;
    requestNavigatorRange: TimeRangeMs;
    fullRange: TimeRangeMs;
    loadConfig: PanelChartDataLoadConfig;
    requestInterval: IntervalOption | undefined;
    reuseKey: string | undefined;
    cacheState: MainFetchCacheState;
};

function resolveMainPanelFetchDecision(
    params: ResolveMainPanelFetchRangeParams,
): PanelFetchDecision {
    const sCachedRange = params.cacheState.fetchedRange;
    const sFetchablePanelRange = getOverlappingTimeRange(
        params.requestPanelRange,
        params.fullRange,
    );

    if (!sFetchablePanelRange) {
        return sCachedRange
            ? { kind: 'reuse', fetchedRange: sCachedRange }
            : { kind: 'fetch', fetchRange: params.requestPanelRange };
    }

    if (
        sCachedRange &&
        params.cacheState.reuseKey === params.reuseKey &&
        isTimeRangeWithinTimeRange(sFetchablePanelRange, sCachedRange)
    ) {
        return { kind: 'reuse', fetchedRange: sCachedRange };
    }

    const sFetchableNavigatorRange =
        getOverlappingTimeRange(params.requestNavigatorRange, params.fullRange) ??
        sFetchablePanelRange;

    return {
        kind: 'fetch',
        fetchRange: resolveMainPanelFetchRange({
            ...params,
            requestPanelRange: sFetchablePanelRange,
            requestNavigatorRange: sFetchableNavigatorRange,
        }),
    };
}

type ResolveNavigatorFetchRangeParams = {
    requestNavigatorRange: TimeRangeMs;
    fullRange: TimeRangeMs;
    cacheState: NavigatorFetchCacheState;
};

function resolveNavigatorFetchDecision(
    params: ResolveNavigatorFetchRangeParams,
): PanelFetchDecision {
    const sCachedRange = params.cacheState.fetchedRange;
    const sFetchableNavigatorRange = getOverlappingTimeRange(
        params.requestNavigatorRange,
        params.fullRange,
    );

    if (!sFetchableNavigatorRange) {
        return sCachedRange
            ? { kind: 'reuse', fetchedRange: sCachedRange }
            : { kind: 'fetch', fetchRange: params.requestNavigatorRange };
    }

    if (
        sCachedRange &&
        isTimeRangeWithinTimeRange(sFetchableNavigatorRange, sCachedRange)
    ) {
        return { kind: 'reuse', fetchedRange: sCachedRange };
    }

    return {
        kind: 'fetch',
        fetchRange: resolveNavigatorFetchRange({
            ...params,
            requestNavigatorRange: sFetchableNavigatorRange,
        }),
    };
}

function resolveNavigatorFetchRange({
    requestNavigatorRange,
    fullRange,
    cacheState,
}: ResolveNavigatorFetchRangeParams): TimeRangeMs {
    if (
        cacheState.fetchedRange &&
        isTimeRangeWithinTimeRange(requestNavigatorRange, cacheState.fetchedRange)
    ) {
        return cacheState.fetchedRange;
    }

    return clipFetchRangeToFullRange(
        buildNavigatorPrefetchRange(requestNavigatorRange),
        fullRange,
    );
}

function buildNavigatorPrefetchRange(
    requestNavigatorRange: TimeRangeMs,
): TimeRangeMs {
    const sNavigatorWidth = getTimeRangeWidth(requestNavigatorRange);
    if (!Number.isFinite(sNavigatorWidth) || sNavigatorWidth <= 0) {
        return requestNavigatorRange;
    }

    const sPrefetchRange = createTimeRangeMs(
        requestNavigatorRange.startTime - sNavigatorWidth * NAVIGATOR_PREFETCH_SIDE_FACTOR,
        requestNavigatorRange.endTime + sNavigatorWidth * NAVIGATOR_PREFETCH_SIDE_FACTOR,
    );

    return sPrefetchRange;
}

function resolveMainPanelFetchRange({
    requestPanelRange,
    requestNavigatorRange,
    fullRange,
    loadConfig,
    requestInterval,
    reuseKey,
    cacheState,
}: ResolveMainPanelFetchRangeParams): TimeRangeMs {
    if (!reuseKey) {
        return requestPanelRange;
    }

    if (
        cacheState.fetchedRange &&
        cacheState.reuseKey === reuseKey &&
        isTimeRangeWithinTimeRange(requestPanelRange, cacheState.fetchedRange)
    ) {
        return cacheState.fetchedRange;
    }

    if (loadConfig.isRaw) {
        return requestNavigatorRange;
    }

    if (hasNumericBaseTimeSeries(loadConfig.seriesList)) {
        return clipFetchRangeToFullRange(
            buildNumericCalculatedPrefetchRange(requestPanelRange),
            fullRange,
        );
    }

    if (!requestInterval) {
        throw new Error('Calculated main prefetch requires an interval.');
    }

    return resolveSafeCalculatedPrefetchRange({
        requestPanelRange,
        requestNavigatorRange,
        requestInterval,
    });
}

type ResolveSafeCalculatedPrefetchRangeParams = {
    requestPanelRange: TimeRangeMs;
    requestNavigatorRange: TimeRangeMs;
    requestInterval: IntervalOption;
};

function resolveSafeCalculatedPrefetchRange({
    requestPanelRange,
    requestNavigatorRange,
    requestInterval,
}: ResolveSafeCalculatedPrefetchRangeParams): TimeRangeMs {
    const sRequestPrediction = predictCalculatedRowCount(
        requestPanelRange,
        requestInterval,
    );

    if (sRequestPrediction > MAIN_CALCULATED_FETCH_ROW_LIMIT) {
        return requestPanelRange;
    }

    const sPrefetchRange = buildPanelPrefetchRange(
        requestPanelRange,
        requestNavigatorRange,
    );

    if (
        predictCalculatedRowCount(sPrefetchRange, requestInterval) <=
        MAIN_CALCULATED_FETCH_ROW_LIMIT
    ) {
        return sPrefetchRange;
    }

    return shrinkPrefetchRangeToPredictedRowBudget(
        requestPanelRange,
        sPrefetchRange,
        requestInterval,
    );
}

function predictCalculatedRowCount(
    range: TimeRangeMs,
    interval: IntervalOption,
): number {
    const sIntervalMs = getIntervalMs(interval.IntervalType, interval.IntervalValue);
    const sRangeWidth = getTimeRangeWidth(range);

    if (sIntervalMs <= 0 || sRangeWidth <= 0) {
        return Number.POSITIVE_INFINITY;
    }

    return Math.ceil(sRangeWidth / sIntervalMs);
}

function shrinkPrefetchRangeToPredictedRowBudget(
    requestPanelRange: TimeRangeMs,
    prefetchRange: TimeRangeMs,
    interval: IntervalOption,
): TimeRangeMs {
    const sIntervalMs = getIntervalMs(interval.IntervalType, interval.IntervalValue);
    const sRequestWidth = getTimeRangeWidth(requestPanelRange);
    const sMaxPrefetchWidth = sIntervalMs * MAIN_CALCULATED_FETCH_ROW_LIMIT;
    const sExtraWidthBudget = sMaxPrefetchWidth - sRequestWidth;

    if (sIntervalMs <= 0 || sExtraWidthBudget <= 0) {
        return requestPanelRange;
    }

    const sLeftAvailable = Math.max(
        0,
        requestPanelRange.startTime - prefetchRange.startTime,
    );
    const sRightAvailable = Math.max(
        0,
        prefetchRange.endTime - requestPanelRange.endTime,
    );
    let sLeftPrefetchWidth = Math.min(sLeftAvailable, sExtraWidthBudget / 2);
    const sRightPrefetchWidth = Math.min(
        sRightAvailable,
        sExtraWidthBudget - sLeftPrefetchWidth,
    );
    sLeftPrefetchWidth = Math.min(
        sLeftAvailable,
        sExtraWidthBudget - sRightPrefetchWidth,
    );

    return createTimeRangeMs(
        requestPanelRange.startTime - sLeftPrefetchWidth,
        requestPanelRange.endTime + sRightPrefetchWidth,
    );
}

function buildPanelPrefetchRange(
    requestPanelRange: TimeRangeMs,
    requestNavigatorRange: TimeRangeMs,
): TimeRangeMs {
    if (isValidTimeRange(requestNavigatorRange)) {
        return requestNavigatorRange;
    }

    const sPanelWidth = getTimeRangeWidth(requestPanelRange);
    if (!Number.isFinite(sPanelWidth) || sPanelWidth <= 0) {
        return requestPanelRange;
    }

    return createTimeRangeMs(
        requestPanelRange.startTime - sPanelWidth * PANEL_PREFETCH_SIDE_FACTOR,
        requestPanelRange.endTime + sPanelWidth * PANEL_PREFETCH_SIDE_FACTOR,
    );
}

function buildNumericCalculatedPrefetchRange(
    requestPanelRange: TimeRangeMs,
): TimeRangeMs {
    const sPanelWidth = getTimeRangeWidth(requestPanelRange);
    if (!Number.isFinite(sPanelWidth) || sPanelWidth <= 0) {
        return requestPanelRange;
    }

    return createTimeRangeMs(
        requestPanelRange.startTime - sPanelWidth * PANEL_PREFETCH_SIDE_FACTOR,
        requestPanelRange.endTime + sPanelWidth * PANEL_PREFETCH_SIDE_FACTOR,
    );
}

function clipFetchRangeToFullRange(
    fetchRange: TimeRangeMs,
    fullRange: TimeRangeMs,
): TimeRangeMs {
    return getOverlappingTimeRange(fetchRange, fullRange) ?? fetchRange;
}

function getOverlappingTimeRange(
    range: TimeRangeMs,
    bounds: TimeRangeMs,
): TimeRangeMs | undefined {
    const sOverlappingRange = createTimeRangeMs(
        Math.max(range.startTime, bounds.startTime),
        Math.min(range.endTime, bounds.endTime),
    );

    return isValidTimeRange(sOverlappingRange) ? sOverlappingRange : undefined;
}
