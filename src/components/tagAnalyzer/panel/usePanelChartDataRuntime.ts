import { useMemo, useRef } from 'react';
import { type ChartSeriesData } from '../domain/ChartDomain';
import { mapFetchResultToChartData } from '../fetch/panelData/mapFetchResultToChartData';
import {
    type PanelDisplayRangeState,
    type PanelInfo,
    type PanelRangeState,
} from '../domain/panel/PanelConfig';
import type { IntervalOption } from '../domain/time/TimeTypes';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalUtils';
import {
    RAW_MAIN_SAMPLE_COUNT,
    fetchMainPanelSeriesRows,
    fetchNavigatorPanelSeriesRows,
    resolvePanelFetchInterval,
} from '../fetch/panelData/PanelSeriesDataRepository';
import type {
    FetchPanelSeriesRowsResult,
    RollupTableMap,
} from '../fetch/panelData/PanelDataFetchTypes';
import {
    buildLoadConfig,
    isReadyToFetch,
    resolveChartWidth,
} from './data/panelChartLoadConfig';
import {
    buildFetchCacheKey,
    buildMainFetchBaseKey,
    buildNavigatorFetchBaseKey,
    buildSeriesCacheKey,
    getMainFetchReuseKey,
} from './data/panelFetchCacheKeys';
import {
    updateMainFetchCache,
    updateNavigatorFetchCache,
    type MainFetchCacheState,
    type NavigatorFetchCacheState,
} from './data/panelFetchCacheState';
import {
    getPanelFetchDecisionRange,
    resolvePanelFetchPlan,
} from './data/panelFetchPlan';
import {
    PanelChartLoadStatus,
    usePanelSeriesFetch,
} from './data/panelFetchState';
import {
    applyFetchedPanelRangeCorrection,
    createPanelDisplayRangeState,
    resolveDisplayPanelRange,
    resolveInvalidRangeDisplayNotice,
    resolveNavigatorRangeWithPixelWidth,
    resolvePanelDisplayNotice,
    resolveVisibleDisplayResult,
    type PanelDisplayNotice,
} from './data/panelDisplayData';
import {
    showPanelFetchLimitToast,
    showSeriesAvailabilityToast,
} from './data/panelFetchResultStatus';

export { PanelChartLoadStatus } from './data/panelFetchState';
export {
    getPanelFetchDecisionRange,
    resolvePanelFetchPlan,
    type PanelFetchDecision,
    type PanelFetchPlan,
} from './data/panelFetchPlan';
export {
    resolvePanelDisplayNotice,
    type PanelDisplayNotice,
} from './data/panelDisplayData';
export { showSeriesAvailabilityToast } from './data/panelFetchResultStatus';

type UsePanelChartDataRuntimeParams = {
    panelInfo: PanelInfo;
    isActive: boolean;
    rangeState: PanelRangeState;
    chartAreaWidth: number | undefined;
    rollupTableList: RollupTableMap;
    dataRefreshVersion: number;
    onRangeStateChange: (rangeState: PanelRangeState) => void;
};

type UsePanelChartDataRuntimeResult = {
    chartData: ChartSeriesData[];
    visibleChartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
    displayRangeState: PanelDisplayRangeState;
    resolvedIntervalOption: IntervalOption | undefined;
    displayNotice: PanelDisplayNotice | undefined;
    loadStatus: {
        chart: PanelChartLoadStatus;
        navigator: PanelChartLoadStatus;
    };
};

export function usePanelChartDataRuntime({
    panelInfo,
    isActive,
    rangeState,
    chartAreaWidth,
    rollupTableList,
    dataRefreshVersion,
    onRangeStateChange,
}: UsePanelChartDataRuntimeParams): UsePanelChartDataRuntimeResult {
    const sLoadConfig = useMemo(
        () => buildLoadConfig(panelInfo),
        [panelInfo],
    );
    const sChartWidth = resolveChartWidth(chartAreaWidth);
    const sIsDefaultNavigatorRange = rangeState.requestNavigatorRangeInput === undefined;
    const sRequestNavigatorRange = rangeState.requestNavigatorRange;
    const sRequestPanelRange = rangeState.requestPanelRange;
    const sNavigatorRange = resolveNavigatorRangeWithPixelWidth(
        sRequestPanelRange,
        sRequestNavigatorRange,
        chartAreaWidth,
    );
    const sCanFetch = isActive && isReadyToFetch({
        chartAreaWidth,
        panelRange: sRequestPanelRange,
        navigatorRange: sNavigatorRange,
        fullRange: rangeState.fullRange,
    });
    const sSeriesKey = buildSeriesCacheKey(sLoadConfig.seriesList);
    const sRollupKey = JSON.stringify(rollupTableList);
    const sMainFetchCacheRef = useRef<MainFetchCacheState>({
        baseKey: '',
        fetchedRange: undefined,
        reuseKey: undefined,
    });
    const sNavigatorFetchCacheRef = useRef<NavigatorFetchCacheState>({
        baseKey: '',
        fetchedRange: undefined,
    });
    const sRequestPanelInterval = useMemo(
        () =>
            resolvePanelFetchInterval(
                sLoadConfig.intervalType,
                sLoadConfig.xAxis,
                sRequestPanelRange,
                sChartWidth,
                sLoadConfig.isRaw,
            ),
        [
            sRequestPanelRange,
            sChartWidth,
            sLoadConfig.intervalType,
            sLoadConfig.xAxis,
            sLoadConfig.isRaw,
        ],
    );
    const sMainFetchReuseKey = getMainFetchReuseKey(
        sLoadConfig,
        sRequestPanelInterval,
    );
    const sMainBaseKey = buildMainFetchBaseKey(
        sLoadConfig,
        sChartWidth,
        sSeriesKey,
        sRollupKey,
        dataRefreshVersion,
    );
    if (sMainFetchCacheRef.current.baseKey !== sMainBaseKey) {
        sMainFetchCacheRef.current = {
            baseKey: sMainBaseKey,
            fetchedRange: undefined,
            reuseKey: undefined,
        };
    }

    const sNavigatorBaseKey = buildNavigatorFetchBaseKey(
        sLoadConfig,
        sChartWidth,
        sSeriesKey,
        sRollupKey,
        dataRefreshVersion,
    );
    if (sNavigatorFetchCacheRef.current.baseKey !== sNavigatorBaseKey) {
        sNavigatorFetchCacheRef.current = {
            baseKey: sNavigatorBaseKey,
            fetchedRange: undefined,
        };
    }

    const sFetchPlan = resolvePanelFetchPlan({
        requestPanelRange: sRequestPanelRange,
        requestNavigatorRange: sNavigatorRange,
        fullRange: rangeState.fullRange,
        loadConfig: sLoadConfig,
        requestInterval: sRequestPanelInterval,
        mainReuseKey: sMainFetchReuseKey,
        mainCacheState: sMainFetchCacheRef.current,
        navigatorCacheState: sNavigatorFetchCacheRef.current,
    });
    const sMainFetchRange = getPanelFetchDecisionRange(sFetchPlan.main);
    const sNavigatorFetchRange = getPanelFetchDecisionRange(sFetchPlan.navigator);
    const sMainKey = buildFetchCacheKey(
        'main',
        sLoadConfig,
        sMainFetchRange,
        sChartWidth,
        sSeriesKey,
        sRollupKey,
        dataRefreshVersion,
    );
    const sNavigatorKey = buildFetchCacheKey(
        'navigator',
        sLoadConfig,
        sNavigatorFetchRange,
        sChartWidth,
        sSeriesKey,
        sRollupKey,
        dataRefreshVersion,
    );

    const sMainFetch = usePanelSeriesFetch({
        canFetch: sCanFetch,
        cacheKey: sMainKey,
        fetchFn: () =>
            fetchMainPanelSeriesRows(
                sLoadConfig.seriesList,
                sLoadConfig.isRaw ? RAW_MAIN_SAMPLE_COUNT : sLoadConfig.queryLimit,
                sLoadConfig.intervalType,
                sLoadConfig.xAxis,
                sLoadConfig.mainChartSampling,
                sChartWidth,
                sLoadConfig.isRaw,
                sLoadConfig.useOrderBy,
                sMainFetchRange,
                rollupTableList,
                sLoadConfig.isRaw ? undefined : sRequestPanelInterval,
            ),
        validate: assertResolvedInterval,
        onSuccess: (result) => {
            showPanelFetchLimitToast(result);
            showSeriesAvailabilityToast(result);
            updateMainFetchCache(
                sMainFetchCacheRef,
                sMainBaseKey,
                sMainFetchRange,
                sMainFetchReuseKey,
                result,
            );
            applyFetchedPanelRangeCorrection({
                result,
                rangeState,
                requestPanelRange: sRequestPanelRange,
                onRangeStateChange,
            });
        },
    });
    const sNavigatorFetch = usePanelSeriesFetch({
        canFetch: sCanFetch,
        cacheKey: sNavigatorKey,
        fetchFn: () =>
            fetchNavigatorPanelSeriesRows(
                sLoadConfig.seriesList,
                sLoadConfig.queryLimit,
                sLoadConfig.intervalType,
                sLoadConfig.xAxis,
                sChartWidth,
                sLoadConfig.isRaw,
                sNavigatorFetchRange,
                sLoadConfig.rawNavigatorSampling,
                rollupTableList,
            ),
        onSuccess: (result) => {
            updateNavigatorFetchCache(
                sNavigatorFetchCacheRef,
                sNavigatorBaseKey,
                sNavigatorFetchRange,
                result,
            );
        },
    });

    const sChartData = useMemo(
        () => mapFetchResultToChartData(sMainFetch.result),
        [sMainFetch.result],
    );
    const sNavigatorChartData = useMemo(
        () => mapFetchResultToChartData(sNavigatorFetch.result),
        [sNavigatorFetch.result],
    );
    const sDisplayPanelRange = useMemo(
        () =>
            resolveDisplayPanelRange(
                sMainFetch.result,
                sRequestPanelRange,
            ),
        [sMainFetch.result, sRequestPanelRange],
    );
    const sVisibleDisplayResult = useMemo(
        () =>
            resolveVisibleDisplayResult(
                sMainFetch.result,
                sDisplayPanelRange,
            ),
        [sMainFetch.result, sDisplayPanelRange],
    );
    const sVisibleChartData = useMemo(
        () => mapFetchResultToChartData(sVisibleDisplayResult),
        [sVisibleDisplayResult],
    );
    const sDisplayNotice = useMemo(
        () =>
            resolvePanelDisplayNotice(sVisibleDisplayResult) ??
            resolveInvalidRangeDisplayNotice({
                canFetch: sCanFetch,
                loadConfig: sLoadConfig,
                rangeState,
            }),
        [sCanFetch, sLoadConfig, sVisibleDisplayResult, rangeState],
    );
    const sDisplayNavigatorRange = useMemo(
        () =>
            resolveNavigatorRangeWithPixelWidth(
                sDisplayPanelRange,
                sNavigatorRange,
                chartAreaWidth,
            ),
        [chartAreaWidth, sDisplayPanelRange, sNavigatorRange],
    );
    const sDisplayRangeState = useMemo<PanelDisplayRangeState>(
        () => createPanelDisplayRangeState(
            sDisplayPanelRange,
            sDisplayNavigatorRange,
            sIsDefaultNavigatorRange,
        ),
        [sDisplayPanelRange, sDisplayNavigatorRange, sIsDefaultNavigatorRange],
    );

    return {
        chartData: sChartData,
        visibleChartData: sVisibleChartData,
        navigatorChartData: sNavigatorChartData,
        displayRangeState: sDisplayRangeState,
        resolvedIntervalOption: sMainFetch.result?.interval,
        displayNotice: sDisplayNotice,
        loadStatus: {
            chart: sMainFetch.status,
            navigator: sNavigatorFetch.status,
        },
    };
}

function assertResolvedInterval(result: FetchPanelSeriesRowsResult): void {
    if (!hasResolvedIntervalOption(result.interval)) {
        throw new Error('Main panel fetch returned an invalid interval.');
    }
}
