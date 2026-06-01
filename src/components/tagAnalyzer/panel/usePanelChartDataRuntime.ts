import { useEffect, useRef, useState } from 'react';
import { Toast } from '@/design-system/components';
import {
    buildChartSeriesData,
    mapRowsToChartData,
    type ChartSeriesData,
} from '../domain/ChartDomain';
import {
    resolvePanelAxesForRuntime,
    type PanelInfo,
    type PanelRangeState,
} from '../domain/PanelDomain';
import type { IntervalOption, TimeRangeMs } from '../domain/time/TimeTypes';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalUtils';
import {
    isConcreteTimeRange,
    isSameTimeRange,
} from '../domain/time/TimeRangeUtils';
import {
    getNavigatorTrackPixelWidth,
    normalizeNavigatorRangeForPanelRange,
} from '../board/PanelNavigatorRangeLimits';
import {
    RAW_NAVIGATOR_SAMPLE_COUNT,
    fetchMainPanelSeriesRows,
    fetchNavigatorPanelSeriesRows,
} from '../fetch/PanelSeriesDataRepository';
import type {
    FetchPanelSeriesRowsResult,
    PanelSeriesFetchResult,
} from '../fetch/FetchContracts';
import {
    INITIAL_PANEL_CHART_DATA_STATE,
    PanelChartLoadStatus,
    type PanelChartDataLoadConfig,
    type PanelChartDataState,
    type PanelDataRefreshPolicy,
    type PanelRangeRefreshOptions,
} from './PanelDataRuntimeState';

type UsePanelChartDataRuntimeParams = {
    panelInfo: PanelInfo;
    rangeState: PanelRangeState;
    chartAreaWidth: number | undefined;
    rollupTableList: string[];
    dataRefreshVersion: number;
    dataRefreshPolicy: PanelDataRefreshPolicy;
    onRangeStateChange: (
        rangeState: PanelRangeState,
        options?: PanelRangeRefreshOptions,
    ) => void;
};

type UsePanelChartDataRuntimeResult = {
    chartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
    resolvedIntervalOption: IntervalOption | undefined;
    loadStatus: {
        chart: PanelChartLoadStatus;
        navigator: PanelChartLoadStatus;
    };
};

type MainPanelSeriesLoadResult = {
    chartData: ChartSeriesData[];
    resolvedIntervalOption: IntervalOption;
    isLimitReached?: boolean | undefined;
    queriedDataRange?: TimeRangeMs | undefined;
};

type NavigatorPanelSeriesLoadResult = { chartData: ChartSeriesData[] };

type MainQueryResultAnalysis = {
    isLimitReached: boolean;
    queriedDataRange?: TimeRangeMs | undefined;
};

type AppliedPanelLoadRanges = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
};

type PanelRefreshRequest = {
    version: number;
    isNew: boolean;
    configOverride: Partial<PanelChartDataLoadConfig> | undefined;
    forceReload: boolean;
    preserveNavigatorRange: boolean;
    forceRawMainSampling: boolean;
    clampPanelRangeToLoadedDataRange: boolean;
};

type MainPanelDataLoadResult = {
    isStale: boolean;
    appliedRanges?: AppliedPanelLoadRanges | undefined;
};

const EMPTY_INTERVAL_OPTION = { IntervalType: '', IntervalValue: 0 } as const;
const MIN_QUERIED_DATA_RANGE_WIDTH = 1;

function getChartLoadErrorMessage(error: unknown): string {
    return error instanceof Error && error.message
        ? error.message
        : 'Failed to load chart data.';
}

function wasChartLoadErrorPresented(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        (error as { tagAnalyzerUserPresented?: unknown }).tagAnalyzerUserPresented === true
    );
}

function getPanelLoadConfig(
    panelInfo: PanelInfo,
    loadConfigOverride?: Partial<PanelChartDataLoadConfig>,
): PanelChartDataLoadConfig {
    const sRuntimeAxes = resolvePanelAxesForRuntime(panelInfo.axes);

    return {
        seriesList: panelInfo.data.tag_set,
        queryLimit: panelInfo.data.count ?? -1,
        intervalType: panelInfo.data.interval_type,
        isRaw: panelInfo.general.is_raw,
        xAxis: sRuntimeAxes.x_axis,
        mainChartSampling: sRuntimeAxes.main_chart_sampling,
        ...loadConfigOverride,
    };
}

function getMainPanelLoadConfigSignature(
    loadConfig: PanelChartDataLoadConfig,
    rollupTableList: string[],
): string {
    return JSON.stringify({
        loadConfig,
        rollupTableList,
    });
}

function getNavigatorPanelDataSignature(
    loadConfig: PanelChartDataLoadConfig,
    rollupTableList: string[],
): string {
    return JSON.stringify({
        seriesList: loadConfig.seriesList,
        isRaw: loadConfig.isRaw,
        ...(!loadConfig.isRaw
            ? {
                  intervalType: loadConfig.intervalType,
                  xAxis: loadConfig.xAxis,
                  rollupTableList,
              }
            : {}),
    });
}

function getRefreshRequest(
    dataRefreshVersion: number,
    dataRefreshPolicy: PanelDataRefreshPolicy,
    lastHandledDataRefreshVersion: number | undefined,
): PanelRefreshRequest {
    const sIsNew = lastHandledDataRefreshVersion !== dataRefreshVersion;

    return {
        version: dataRefreshVersion,
        isNew: sIsNew,
        configOverride: sIsNew
            ? dataRefreshPolicy.dataLoadConfigOverride
            : undefined,
        forceReload: sIsNew && dataRefreshPolicy.forceReload,
        preserveNavigatorRange: sIsNew && dataRefreshPolicy.preserveNavigatorRange,
        forceRawMainSampling: sIsNew && dataRefreshPolicy.forceRawMainSampling,
        clampPanelRangeToLoadedDataRange:
            sIsNew && dataRefreshPolicy.clampPanelRangeToLoadedDataRange,
    };
}

function getNavigatorDataRange(
    loadConfig: PanelChartDataLoadConfig,
    rangeState: PanelRangeState,
): TimeRangeMs {
    return loadConfig.isRaw
        ? rangeState.fullRange
        : rangeState.navigatorRange;
}

function usePanelLoadRequestTracker() {
    const requestIdRef = useRef(0);

    return {
        start: () => {
            requestIdRef.current += 1;
            return requestIdRef.current;
        },
        isCurrent: (requestId: number | undefined) =>
            requestId !== undefined && requestId === requestIdRef.current,
    };
}

function applyRawMainSamplingOverride(
    loadConfig: PanelChartDataLoadConfig,
    forceRawSampling: boolean,
): PanelChartDataLoadConfig {
    if (!forceRawSampling || !loadConfig.isRaw) {
        return loadConfig;
    }

    return {
        ...loadConfig,
        queryLimit: RAW_NAVIGATOR_SAMPLE_COUNT,
        mainChartSampling: {
            enabled: true,
            sample_count: RAW_NAVIGATOR_SAMPLE_COUNT,
        },
    };
}

async function loadMainPanelSeriesChartData(
    loadConfig: PanelChartDataLoadConfig,
    chartWidth: number,
    timeRange: TimeRangeMs,
    rollupTableList: string[],
): Promise<MainPanelSeriesLoadResult> {
    const sFetchResult = await fetchMainPanelSeriesRows(
        loadConfig.seriesList,
        loadConfig.queryLimit,
        loadConfig.intervalType,
        loadConfig.xAxis,
        loadConfig.mainChartSampling,
        chartWidth,
        loadConfig.isRaw,
        timeRange,
        rollupTableList,
    );

    if (!sFetchResult) {
        return {
            chartData: [],
            resolvedIntervalOption: EMPTY_INTERVAL_OPTION,
        };
    }

    const sQueryAnalysis = analyzeMainQueryResult(
        sFetchResult.seriesFetchResults,
    );

    return {
        chartData: mapPanelSeriesRowsToChartData(sFetchResult),
        resolvedIntervalOption: sFetchResult.interval,
        ...(sQueryAnalysis.isLimitReached
            ? { isLimitReached: true }
            : {}),
        ...(sQueryAnalysis.queriedDataRange
            ? { queriedDataRange: sQueryAnalysis.queriedDataRange }
            : {}),
    };
}

async function loadNavigatorPanelSeriesChartData(
    loadConfig: PanelChartDataLoadConfig,
    chartWidth: number,
    timeRange: TimeRangeMs,
    rollupTableList: string[],
): Promise<NavigatorPanelSeriesLoadResult> {
    const sFetchResult = await fetchNavigatorPanelSeriesRows(
        loadConfig.seriesList,
        loadConfig.queryLimit,
        loadConfig.intervalType,
        loadConfig.xAxis,
        chartWidth,
        loadConfig.isRaw,
        timeRange,
        rollupTableList,
    );

    return {
        chartData: mapPanelSeriesRowsToChartData(sFetchResult),
    };
}

function mapPanelSeriesRowsToChartData(
    fetchResult: FetchPanelSeriesRowsResult | undefined,
): ChartSeriesData[] {
    if (!fetchResult) {
        return [];
    }

    return fetchResult.seriesFetchResults.map(
        ({ seriesConfig, fetchResult: seriesFetchResult }) =>
            buildChartSeriesData(
                seriesConfig,
                mapRowsToChartData(seriesFetchResult?.data?.rows),
                fetchResult.isRaw,
            ),
    );
}

function analyzeMainQueryResult(
    seriesFetchResults: PanelSeriesFetchResult[],
): MainQueryResultAnalysis {
    const sIsLimitReached = seriesFetchResults.some(
        ({ isLimitReached }) => isLimitReached === true,
    );
    let sStartTime = Number.POSITIVE_INFINITY;
    let sEndTime = Number.NEGATIVE_INFINITY;

    for (const { fetchResult } of seriesFetchResults) {
        const rows = fetchResult?.data?.rows ?? [];
        for (const row of rows) {
            const sTimestamp = Number(row[0]);
            if (!Number.isFinite(sTimestamp)) {
                continue;
            }

            sStartTime = Math.min(sStartTime, sTimestamp);
            sEndTime = Math.max(sEndTime, sTimestamp);
        }
    }

    const sQueriedDataRange =
        !Number.isFinite(sStartTime) ||
        !Number.isFinite(sEndTime)
            ? undefined
            : {
                  startTime: sStartTime,
                  endTime: Math.max(
                      sEndTime,
                      sStartTime + MIN_QUERIED_DATA_RANGE_WIDTH,
                  ),
              };

    const sAnalysis = {
        isLimitReached: sIsLimitReached,
        ...(sQueriedDataRange
            ? { queriedDataRange: sQueriedDataRange }
            : {}),
    };

    return sAnalysis;
}

function getAppliedPanelLoadRanges({
    panelRange,
    requestedNavigatorRange,
    shouldClampPanelRangeToLoadedDataRange,
    queriedDataRange,
    normalizeNavigatorRangeForVisiblePanel,
}: {
    panelRange: TimeRangeMs;
    requestedNavigatorRange: TimeRangeMs;
    shouldClampPanelRangeToLoadedDataRange: boolean;
    queriedDataRange: TimeRangeMs | undefined;
    normalizeNavigatorRangeForVisiblePanel: (
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
    ) => TimeRangeMs;
}): AppliedPanelLoadRanges {
    const sShouldUseLoadedPanelRange =
        shouldClampPanelRangeToLoadedDataRange && queriedDataRange !== undefined;
    const sPanelRange = sShouldUseLoadedPanelRange
        ? queriedDataRange
        : panelRange;
    const sNavigatorRange = normalizeNavigatorRangeForVisiblePanel(
        sPanelRange,
        requestedNavigatorRange,
    );

    return {
        panelRange: sPanelRange,
        navigatorRange: sNavigatorRange,
    };
}

export function usePanelChartDataRuntime({
    panelInfo,
    rangeState,
    chartAreaWidth,
    rollupTableList,
    dataRefreshVersion,
    dataRefreshPolicy,
    onRangeStateChange,
}: UsePanelChartDataRuntimeParams): UsePanelChartDataRuntimeResult {
    const [chartDataState, setChartDataState] = useState<PanelChartDataState>(
        INITIAL_PANEL_CHART_DATA_STATE,
    );
    const [chartLoadStatus, setChartLoadStatus] = useState<PanelChartLoadStatus>(
        PanelChartLoadStatus.Idle,
    );
    const [navigatorLoadStatus, setNavigatorLoadStatus] =
        useState<PanelChartLoadStatus>(PanelChartLoadStatus.Idle);
    const chartDataStateRef = useRef(chartDataState);
    const lastMainLoadConfigSignatureRef = useRef<string | undefined>(undefined);
    const lastNavigatorLoadConfigSignatureRef = useRef<string | undefined>(
        undefined,
    );
    const lastHandledDataRefreshVersionRef = useRef<number | undefined>(
        undefined,
    );
    const onRangeStateChangeRef = useRef(onRangeStateChange);
    const panelLoadRequests = usePanelLoadRequestTracker();
    const navigatorLoadRequests = usePanelLoadRequestTracker();

    chartDataStateRef.current = chartDataState;
    onRangeStateChangeRef.current = onRangeStateChange;

    function getChartLoadWidth(): number {
        return typeof chartAreaWidth === 'number' && chartAreaWidth > 0
            ? chartAreaWidth
            : 1;
    }

    function normalizeNavigatorRangeForVisiblePanel(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
    ): TimeRangeMs {
        const sNavigatorTrackPixelWidth =
            typeof chartAreaWidth === 'number' && chartAreaWidth > 0
                ? getNavigatorTrackPixelWidth(chartAreaWidth)
                : undefined;

        return sNavigatorTrackPixelWidth === undefined
            ? navigatorRange
            : normalizeNavigatorRangeForPanelRange(
                  panelRange,
                  navigatorRange,
                  sNavigatorTrackPixelWidth,
              );
    }

    function commitPanelLoadResult(
        mainLoadState: MainPanelSeriesLoadResult,
        appliedRanges: AppliedPanelLoadRanges,
    ): void {
        if (mainLoadState.isLimitReached) {
            Toast.warning('Only limit amount was displayed.', undefined);
        }

        setChartDataState((current) => {
            const sResolvedIntervalOption = hasResolvedIntervalOption(
                mainLoadState.resolvedIntervalOption,
            )
                ? mainLoadState.resolvedIntervalOption
                : hasResolvedIntervalOption(current.resolvedIntervalOption)
                  ? current.resolvedIntervalOption
                  : mainLoadState.resolvedIntervalOption;
            const sNextState = {
                ...current,
                chartData: mainLoadState.chartData,
                resolvedIntervalOption: sResolvedIntervalOption,
                loadedDataRange: appliedRanges.panelRange,
            };

            chartDataStateRef.current = sNextState;
            return sNextState;
        });
    }

    async function loadMainPanelData(
        loadConfig: PanelChartDataLoadConfig,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
        refreshRequest: PanelRefreshRequest,
    ): Promise<MainPanelDataLoadResult> {
        const sRequestId = panelLoadRequests.start();

        setChartLoadStatus(PanelChartLoadStatus.Loading);

        try {
            const sMainLoadState = await loadMainPanelSeriesChartData(
                applyRawMainSamplingOverride(
                    loadConfig,
                    refreshRequest.forceRawMainSampling,
                ),
                getChartLoadWidth(),
                panelRange,
                rollupTableList,
            );

            if (!panelLoadRequests.isCurrent(sRequestId)) {
                return {
                    isStale: true,
                };
            }

            const sAppliedRanges = getAppliedPanelLoadRanges({
                panelRange,
                requestedNavigatorRange: navigatorRange,
                shouldClampPanelRangeToLoadedDataRange:
                    loadConfig.isRaw ||
                    refreshRequest.clampPanelRangeToLoadedDataRange,
                queriedDataRange: isConcreteTimeRange(
                    sMainLoadState.queriedDataRange,
                )
                    ? sMainLoadState.queriedDataRange
                    : undefined,
                normalizeNavigatorRangeForVisiblePanel,
            });

            commitPanelLoadResult(sMainLoadState, sAppliedRanges);
            setChartLoadStatus(PanelChartLoadStatus.Ready);

            return {
                isStale: false,
                appliedRanges: sAppliedRanges,
            };
        } catch (error) {
            if (!panelLoadRequests.isCurrent(sRequestId)) {
                return {
                    isStale: true,
                };
            }

            if (!wasChartLoadErrorPresented(error)) {
                Toast.error(getChartLoadErrorMessage(error), undefined);
            }
            setChartLoadStatus(PanelChartLoadStatus.Failed);

            return {
                isStale: false,
            };
        }
    }

    async function loadNavigatorData(
        loadConfig: PanelChartDataLoadConfig,
        navigatorDataRange: TimeRangeMs,
    ): Promise<boolean> {
        const sNavigatorRequestId = navigatorLoadRequests.start();

        setNavigatorLoadStatus(PanelChartLoadStatus.Loading);

        try {
            const sLoadState = await loadNavigatorPanelSeriesChartData(
                loadConfig,
                getChartLoadWidth(),
                navigatorDataRange,
                rollupTableList,
            );

            if (!navigatorLoadRequests.isCurrent(sNavigatorRequestId)) {
                return true;
            }

            setChartDataState((current) => {
                const sNextState = {
                    ...current,
                    navigatorChartData: sLoadState.chartData,
                    loadedNavigatorRange: navigatorDataRange,
                };

                chartDataStateRef.current = sNextState;
                return sNextState;
            });
            setNavigatorLoadStatus(PanelChartLoadStatus.Ready);

            return false;
        } catch (error) {
            if (!navigatorLoadRequests.isCurrent(sNavigatorRequestId)) {
                return true;
            }

            if (!wasChartLoadErrorPresented(error)) {
                Toast.error(getChartLoadErrorMessage(error), undefined);
            }
            setNavigatorLoadStatus(PanelChartLoadStatus.Failed);

            return false;
        }
    }

    useEffect(() => {
        if (
            chartAreaWidth === undefined ||
            !isConcreteTimeRange(rangeState.panelRange) ||
            !isConcreteTimeRange(rangeState.navigatorRange) ||
            !isConcreteTimeRange(rangeState.fullRange)
        ) {
            return;
        }

        const sRefreshRequest = getRefreshRequest(
            dataRefreshVersion,
            dataRefreshPolicy,
            lastHandledDataRefreshVersionRef.current,
        );
        const sLoadConfig = getPanelLoadConfig(
            panelInfo,
            sRefreshRequest.configOverride,
        );
        const sMainLoadConfigSignature = getMainPanelLoadConfigSignature(
            sLoadConfig,
            rollupTableList,
        );
        const sNavigatorLoadConfigSignature = getNavigatorPanelDataSignature(
            sLoadConfig,
            rollupTableList,
        );
        const sNavigatorDataRange = getNavigatorDataRange(sLoadConfig, rangeState);
        const sMainConfigChanged =
            sRefreshRequest.configOverride !== undefined ||
            (
                lastMainLoadConfigSignatureRef.current !== undefined &&
                lastMainLoadConfigSignatureRef.current !==
                    sMainLoadConfigSignature
            );
        const sNavigatorConfigChanged =
            lastNavigatorLoadConfigSignatureRef.current !== undefined &&
            lastNavigatorLoadConfigSignatureRef.current !==
                sNavigatorLoadConfigSignature;
        const sMainRangeNeedsData =
            !isConcreteTimeRange(chartDataStateRef.current.loadedDataRange) ||
            !isSameTimeRange(
                rangeState.panelRange,
                chartDataStateRef.current.loadedDataRange,
            );
        const sNavigatorRangeNeedsData =
            !isConcreteTimeRange(
                chartDataStateRef.current.loadedNavigatorRange,
            ) ||
            !isSameTimeRange(
                sNavigatorDataRange,
                chartDataStateRef.current.loadedNavigatorRange,
            );
        const sShouldReloadMain =
            sRefreshRequest.forceReload ||
            sMainConfigChanged ||
            sMainRangeNeedsData;
        const sShouldReloadNavigator =
            lastNavigatorLoadConfigSignatureRef.current === undefined ||
            sNavigatorConfigChanged ||
            sNavigatorRangeNeedsData;

        if (!sShouldReloadMain && !sShouldReloadNavigator) {
            if (sRefreshRequest.isNew) {
                lastHandledDataRefreshVersionRef.current = sRefreshRequest.version;
            }
            return;
        }

        void (async () => {
            const sNavigatorLoadIsStale = sShouldReloadNavigator
                ? await loadNavigatorData(sLoadConfig, sNavigatorDataRange)
                : false;
            if (sNavigatorLoadIsStale) {
                return;
            }

            const sMainResult = sShouldReloadMain
                ? await loadMainPanelData(
                      sLoadConfig,
                      rangeState.panelRange,
                      rangeState.navigatorRange,
                      sRefreshRequest,
                  )
                : undefined;
            if (sMainResult?.isStale) {
                return;
            }

            lastHandledDataRefreshVersionRef.current = sRefreshRequest.version;
            if (sShouldReloadMain) {
                lastMainLoadConfigSignatureRef.current =
                    sMainLoadConfigSignature;
            }
            if (sShouldReloadNavigator) {
                lastNavigatorLoadConfigSignatureRef.current =
                    sNavigatorLoadConfigSignature;
            }

            const sAppliedRanges = sMainResult?.appliedRanges;
            if (
                sAppliedRanges &&
                (
                    !isSameTimeRange(
                        sAppliedRanges.panelRange,
                        rangeState.panelRange,
                    ) ||
                    !isSameTimeRange(
                        sAppliedRanges.navigatorRange,
                        rangeState.navigatorRange,
                    )
                )
            ) {
                onRangeStateChangeRef.current(
                    {
                        ...sAppliedRanges,
                        fullRange: rangeState.fullRange,
                    },
                    {
                        preserveNavigatorRange: true,
                        skipDataRefresh: true,
                    },
                );
            }
        })();
    }, [
        chartAreaWidth,
        dataRefreshPolicy,
        dataRefreshVersion,
        panelInfo,
        rangeState,
        rollupTableList,
    ]);

    return {
        chartData: chartDataState.chartData,
        navigatorChartData: chartDataState.navigatorChartData,
        resolvedIntervalOption: chartDataState.resolvedIntervalOption,
        loadStatus: {
            chart: chartLoadStatus,
            navigator: navigatorLoadStatus,
        },
    };
}
