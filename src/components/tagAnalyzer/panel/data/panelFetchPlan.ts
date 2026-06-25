import type { TimeRangeMs, IntervalOption } from '../../domain/time/TimeTypes';
import { getIntervalMs } from '../../domain/time/TimeIntervalUtils';
import {
    createTimeRangeMs,
    getTimeRangeWidth,
    isTimeRangeWithinTimeRange,
    isValidTimeRange,
} from '../../domain/time/TimeRangeUtils';
import { CALCULATED_FETCH_ROW_BUDGET } from '../../fetch/panelData/PanelSeriesDataRepository';
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
    requestInterval: IntervalOption;
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
    requestInterval: IntervalOption;
    reuseKey: string | undefined;
    cacheState: MainFetchCacheState;
};

function resolveMainPanelFetchDecision(
    params: ResolveMainPanelFetchRangeParams,
): PanelFetchDecision {
    const sCachedRange = params.cacheState.fetchedRange;

    if (
        sCachedRange &&
        !isTimeRangeWithinTimeRange(params.requestPanelRange, params.fullRange)
    ) {
        return { kind: 'reuse', fetchedRange: sCachedRange };
    }

    if (
        sCachedRange &&
        params.cacheState.reuseKey === params.reuseKey &&
        isTimeRangeWithinTimeRange(params.requestPanelRange, sCachedRange)
    ) {
        return { kind: 'reuse', fetchedRange: sCachedRange };
    }

    return {
        kind: 'fetch',
        fetchRange: resolveMainPanelFetchRange(params),
    };
}

type ResolveNavigatorFetchRangeParams = {
    requestNavigatorRange: TimeRangeMs;
    cacheState: NavigatorFetchCacheState;
};

function resolveNavigatorFetchDecision(
    params: ResolveNavigatorFetchRangeParams,
): PanelFetchDecision {
    const sCachedRange = params.cacheState.fetchedRange;

    if (
        sCachedRange &&
        isTimeRangeWithinTimeRange(params.requestNavigatorRange, sCachedRange)
    ) {
        return { kind: 'reuse', fetchedRange: sCachedRange };
    }

    return {
        kind: 'fetch',
        fetchRange: resolveNavigatorFetchRange(params),
    };
}

function resolveNavigatorFetchRange({
    requestNavigatorRange,
    cacheState,
}: ResolveNavigatorFetchRangeParams): TimeRangeMs {
    if (
        cacheState.fetchedRange &&
        isTimeRangeWithinTimeRange(requestNavigatorRange, cacheState.fetchedRange)
    ) {
        return cacheState.fetchedRange;
    }

    return buildNavigatorPrefetchRange(requestNavigatorRange);
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

    if (sRequestPrediction > CALCULATED_FETCH_ROW_BUDGET) {
        return requestPanelRange;
    }

    const sPrefetchRange = buildPanelPrefetchRange(
        requestPanelRange,
        requestNavigatorRange,
    );

    if (
        predictCalculatedRowCount(sPrefetchRange, requestInterval) <=
        CALCULATED_FETCH_ROW_BUDGET
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
    const sMaxPrefetchWidth = sIntervalMs * CALCULATED_FETCH_ROW_BUDGET;
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
