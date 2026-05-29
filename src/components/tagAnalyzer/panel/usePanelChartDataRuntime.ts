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
    type PanelDataRefreshResult,
    type PanelRangeApplyOptions,
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

type RangeLoadPlan = {
    reloadMain: boolean;
    reloadNavigator: boolean;
};

type LoadRangeDataArgs = Omit<PanelRangeApplyOptions, 'navigatorRange'> & {
    loadConfig: PanelChartDataLoadConfig;
    navigatorRange: TimeRangeMs;
    reloadMain: boolean;
    reloadNavigator: boolean;
};

type LoadRangeData = (
    options: LoadRangeDataArgs,
) => Promise<PanelDataRefreshResult>;

const EMPTY_INTERVAL_OPTION = { IntervalType: '', IntervalValue: 0 } as const;
const MIN_QUERIED_DATA_RANGE_WIDTH = 1;
const DEBUG_PANEL_RANGE_REFRESH = true;

function debugPanelRangeRefresh(message: string, payload: unknown): void {
    if (DEBUG_PANEL_RANGE_REFRESH) {
        console.log(`[TA range] ${message}`, payload);
    }
}

function showLimitReachedWarning(): void {
    Toast.warning('Only limit amount was displayed.', undefined);
}

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
): string {
    return JSON.stringify({
        seriesList: loadConfig.seriesList,
        isRaw: loadConfig.isRaw,
    });
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

    debugPanelRangeRefresh('received data', {
        limited: sIsLimitReached,
        receivedDataRange: sQueriedDataRange,
        rows: seriesFetchResults.map(({ fetchResult }) =>
            fetchResult?.data?.rows?.length ?? 0,
        ),
    });

    return sAnalysis;
}

function getConcreteQueriedDataRange(
    loadState: MainPanelSeriesLoadResult,
): TimeRangeMs | undefined {
    return isConcreteTimeRange(loadState.queriedDataRange)
        ? loadState.queriedDataRange
        : undefined;
}

function getAppliedPanelLoadRanges({
    panelRange,
    requestedNavigatorRange,
    preserveNavigatorRange,
    shouldClampPanelRangeToLoadedDataRange,
    queriedDataRange,
    normalizeNavigatorRangeForVisiblePanel,
}: {
    panelRange: TimeRangeMs;
    requestedNavigatorRange: TimeRangeMs;
    preserveNavigatorRange: boolean;
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
    const sNavigatorRange = preserveNavigatorRange || sShouldUseLoadedPanelRange
        ? requestedNavigatorRange
        : normalizeNavigatorRangeForVisiblePanel(
              sPanelRange,
              requestedNavigatorRange,
          );

    return {
        panelRange: sPanelRange,
        navigatorRange: sNavigatorRange,
    };
}

function getResolvedPanelIntervalOption(
    loadedIntervalOption: IntervalOption,
    currentIntervalOption: IntervalOption | undefined,
): IntervalOption {
    if (hasResolvedIntervalOption(loadedIntervalOption)) {
        return loadedIntervalOption;
    }

    return hasResolvedIntervalOption(currentIntervalOption)
        ? currentIntervalOption
        : loadedIntervalOption;
}

function getPanelDataStatePatch({
    mainLoadState,
    appliedRanges,
    currentIntervalOption,
}: {
    mainLoadState: MainPanelSeriesLoadResult;
    appliedRanges: AppliedPanelLoadRanges;
    currentIntervalOption: IntervalOption | undefined;
}): Partial<PanelChartDataState> {
    return {
        chartData: mainLoadState.chartData,
        resolvedIntervalOption: getResolvedPanelIntervalOption(
            mainLoadState.resolvedIntervalOption,
            currentIntervalOption,
        ),
        loadedDataRange: appliedRanges.panelRange,
    };
}

function createRangeLoadPlan({
    currentDataState,
    nextRangeState,
    forceReload,
    hasMainLoadConfigChanged,
    hasNavigatorDataLoaded,
    hasNavigatorDataConfigChanged,
}: {
    currentDataState: PanelChartDataState;
    nextRangeState: PanelRangeState;
    forceReload: boolean;
    hasMainLoadConfigChanged: boolean;
    hasNavigatorDataLoaded: boolean;
    hasNavigatorDataConfigChanged: boolean;
}): RangeLoadPlan {
    const sPanelDataOutdated =
        !isConcreteTimeRange(currentDataState.loadedDataRange) ||
        !isSameTimeRange(
            nextRangeState.panelRange,
            currentDataState.loadedDataRange,
        );
    const sReloadMain =
        forceReload || hasMainLoadConfigChanged || sPanelDataOutdated;

    return {
        reloadMain: sReloadMain,
        reloadNavigator: !hasNavigatorDataLoaded || hasNavigatorDataConfigChanged,
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
    const loadRangeDataRef = useRef<LoadRangeData | undefined>(undefined);
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

    function setNavigatorLoadStatusIfCurrent(
        requestId: number | undefined,
        nextNavigatorLoadStatus: PanelChartLoadStatus,
    ): void {
        if (navigatorLoadRequests.isCurrent(requestId)) {
            setNavigatorLoadStatus(nextNavigatorLoadStatus);
        }
    }

    function commitPanelLoadResult(
        mainLoadState: MainPanelSeriesLoadResult,
        appliedRanges: AppliedPanelLoadRanges,
    ): void {
        if (mainLoadState.isLimitReached) {
            showLimitReachedWarning();
        }

        setChartDataState((current) => {
            const sNextState = {
                ...current,
                ...getPanelDataStatePatch({
                    mainLoadState,
                    appliedRanges,
                    currentIntervalOption: current.resolvedIntervalOption,
                }),
            };

            chartDataStateRef.current = sNextState;
            return sNextState;
        });
    }

    async function loadMainPanelData(
        loadConfig: PanelChartDataLoadConfig,
        {
            panelRange,
            navigatorRange,
            preserveNavigatorRange = false,
            forceRawMainSampling = false,
            clampPanelRangeToLoadedDataRange = false,
        }: PanelRangeApplyOptions,
    ): Promise<PanelDataRefreshResult> {
        const sRequestId = panelLoadRequests.start();

        setChartLoadStatus(PanelChartLoadStatus.Loading);

        try {
            const sRequestedNavigatorRange = navigatorRange ?? panelRange;
            const sMainLoadState = await loadMainPanelSeriesChartData(
                applyRawMainSamplingOverride(
                    loadConfig,
                    forceRawMainSampling,
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
                requestedNavigatorRange: sRequestedNavigatorRange,
                preserveNavigatorRange,
                shouldClampPanelRangeToLoadedDataRange:
                    loadConfig.isRaw || clampPanelRangeToLoadedDataRange,
                queriedDataRange: getConcreteQueriedDataRange(sMainLoadState),
                normalizeNavigatorRangeForVisiblePanel,
            });

            debugPanelRangeRefresh('main range apply', {
                requestedMainRange: panelRange,
                receivedDataRange: sMainLoadState.queriedDataRange,
                appliedMainRange: sAppliedRanges.panelRange,
                appliedNavigatorRange: sAppliedRanges.navigatorRange,
                limited: sMainLoadState.isLimitReached === true,
            });

            commitPanelLoadResult(sMainLoadState, sAppliedRanges);
            setChartLoadStatus(PanelChartLoadStatus.Ready);

            return {
                isStale: false,
                panelRange: sAppliedRanges.panelRange,
                navigatorRange: sAppliedRanges.navigatorRange,
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
        {
            panelRange,
            navigatorRange,
        }: PanelRangeApplyOptions,
    ): Promise<PanelDataRefreshResult> {
        const sRequestedNavigatorRange = navigatorRange ?? panelRange;
        const sNavigatorRange = sRequestedNavigatorRange;
        const sRequestId = panelLoadRequests.start();
        const sNavigatorRequestId = navigatorLoadRequests.start();

        setNavigatorLoadStatus(PanelChartLoadStatus.Loading);

        try {
            const sLoadState = await loadNavigatorPanelSeriesChartData(
                loadConfig,
                getChartLoadWidth(),
                sNavigatorRange,
                rollupTableList,
            );

            if (!panelLoadRequests.isCurrent(sRequestId)) {
                setNavigatorLoadStatusIfCurrent(
                    sNavigatorRequestId,
                    PanelChartLoadStatus.Ready,
                );
                return {
                    isStale: true,
                };
            }

            setChartDataState((current) => {
                const sNextState = {
                    ...current,
                    navigatorChartData: sLoadState.chartData,
                    loadedNavigatorRange: sNavigatorRange,
                };

                chartDataStateRef.current = sNextState;
                return sNextState;
            });
            setNavigatorLoadStatusIfCurrent(
                sNavigatorRequestId,
                PanelChartLoadStatus.Ready,
            );

            return {
                isStale: false,
                navigatorRange: sNavigatorRange,
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
            setNavigatorLoadStatusIfCurrent(
                sNavigatorRequestId,
                PanelChartLoadStatus.Failed,
            );

            return {
                isStale: false,
            };
        }
    }

    const loadRangeData: LoadRangeData = async ({
        loadConfig,
        panelRange,
        navigatorRange,
        preserveNavigatorRange,
        forceRawMainSampling,
        clampPanelRangeToLoadedDataRange,
        reloadMain,
        reloadNavigator,
    }) => {
        if (!reloadMain) {
            return reloadNavigator
                ? {
                      ...(await loadNavigatorData(loadConfig, {
                          panelRange,
                          navigatorRange,
                      })),
                      panelRange,
                  }
                : { isStale: false, panelRange, navigatorRange };
        }

        const sNavigatorResult = reloadNavigator
            ? await loadNavigatorData(loadConfig, {
                  panelRange,
                  navigatorRange,
              })
            : undefined;
        if (sNavigatorResult?.isStale) {
            return { isStale: true };
        }

        const sMainResult = await loadMainPanelData(loadConfig, {
            panelRange,
            navigatorRange,
            preserveNavigatorRange,
            forceRawMainSampling,
            clampPanelRangeToLoadedDataRange,
        });
        if (sMainResult.isStale) {
            return { isStale: true };
        }

        const sAppliedPanelRange = sMainResult.panelRange ?? panelRange;
        const sAppliedNavigatorRange =
            sMainResult.navigatorRange ??
            sNavigatorResult?.navigatorRange ??
            navigatorRange;

        return {
            isStale: false,
            panelRange: sAppliedPanelRange,
            navigatorRange: sAppliedNavigatorRange,
        };
    };
    loadRangeDataRef.current = loadRangeData;

    useEffect(() => {
        if (
            chartAreaWidth === undefined ||
            !isConcreteTimeRange(rangeState.panelRange) ||
            !isConcreteTimeRange(rangeState.navigatorRange)
        ) {
            return;
        }

        const sShouldApplyRefreshPolicy =
            lastHandledDataRefreshVersionRef.current !== dataRefreshVersion;
        const sDataLoadConfigOverride =
            sShouldApplyRefreshPolicy
                ? dataRefreshPolicy.dataLoadConfigOverride
                : undefined;
        const sLoadConfig = getPanelLoadConfig(panelInfo, sDataLoadConfigOverride);
        const sMainLoadConfigSignature = getMainPanelLoadConfigSignature(
            sLoadConfig,
            rollupTableList,
        );
        const sNavigatorLoadConfigSignature =
            getNavigatorPanelDataSignature(sLoadConfig);
        const sHasMainLoadConfigChanged =
            lastMainLoadConfigSignatureRef.current !== undefined &&
            lastMainLoadConfigSignatureRef.current !== sMainLoadConfigSignature;
        const sHasNavigatorLoadConfigChanged =
            lastNavigatorLoadConfigSignatureRef.current !== undefined &&
            lastNavigatorLoadConfigSignatureRef.current !==
                sNavigatorLoadConfigSignature;
        const sForceReload =
            sShouldApplyRefreshPolicy && dataRefreshPolicy.forceReload;
        const sForceRawMainSampling =
            sShouldApplyRefreshPolicy &&
            dataRefreshPolicy.forceRawMainSampling;
        const sPreserveNavigatorRange =
            sShouldApplyRefreshPolicy &&
            dataRefreshPolicy.preserveNavigatorRange;
        const sClampPanelRangeToLoadedDataRange =
            sShouldApplyRefreshPolicy &&
            dataRefreshPolicy.clampPanelRangeToLoadedDataRange;
        const sLoadPlan = createRangeLoadPlan({
            currentDataState: chartDataStateRef.current,
            nextRangeState: rangeState,
            forceReload: sForceReload,
            hasMainLoadConfigChanged:
                sDataLoadConfigOverride !== undefined ||
                sHasMainLoadConfigChanged,
            hasNavigatorDataLoaded:
                lastNavigatorLoadConfigSignatureRef.current !== undefined,
            hasNavigatorDataConfigChanged: sHasNavigatorLoadConfigChanged,
        });

        if (!sLoadPlan.reloadMain && !sLoadPlan.reloadNavigator) {
            if (sShouldApplyRefreshPolicy) {
                lastHandledDataRefreshVersionRef.current = dataRefreshVersion;
            }
            return;
        }

        void (async () => {
            const sLoadRangeData = loadRangeDataRef.current;
            if (!sLoadRangeData) {
                throw new Error('Panel chart data loader was not initialized.');
            }

            const sRefreshResult = await sLoadRangeData({
                loadConfig: sLoadConfig,
                panelRange: rangeState.panelRange,
                navigatorRange: rangeState.navigatorRange,
                preserveNavigatorRange: sPreserveNavigatorRange,
                forceRawMainSampling: sForceRawMainSampling,
                clampPanelRangeToLoadedDataRange: sClampPanelRangeToLoadedDataRange,
                ...sLoadPlan,
            });

            if (sRefreshResult.isStale) {
                return;
            }

            lastHandledDataRefreshVersionRef.current = dataRefreshVersion;
            if (sLoadPlan.reloadMain) {
                lastMainLoadConfigSignatureRef.current = sMainLoadConfigSignature;
            }
            if (sLoadPlan.reloadNavigator) {
                lastNavigatorLoadConfigSignatureRef.current =
                    sNavigatorLoadConfigSignature;
            }

            const sAppliedRange = {
                panelRange: sRefreshResult.panelRange ?? rangeState.panelRange,
                navigatorRange:
                    sRefreshResult.navigatorRange ?? rangeState.navigatorRange,
            };

            debugPanelRangeRefresh('app range after refresh', {
                previousMainRange: rangeState.panelRange,
                nextMainRange: sAppliedRange.panelRange,
                previousNavigatorRange: rangeState.navigatorRange,
                nextNavigatorRange: sAppliedRange.navigatorRange,
            });

            if (
                !isSameTimeRange(sAppliedRange.panelRange, rangeState.panelRange) ||
                !isSameTimeRange(
                    sAppliedRange.navigatorRange,
                    rangeState.navigatorRange,
                )
            ) {
                onRangeStateChangeRef.current(sAppliedRange, {
                    preserveNavigatorRange: true,
                    skipDataRefresh: true,
                });
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
