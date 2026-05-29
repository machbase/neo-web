import { useEffect, useRef, useState } from 'react';
import { Toast } from '@/design-system/components';
import {
    buildChartSeriesData,
    mapRowsToChartData,
    type ChartSeriesData,
} from '../domain/ChartDomain';
import {
    resolvePanelAxesForRuntime,
    resolvePanelDataForRuntime,
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
    type PanelMainDataRefreshResult,
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
    limitedDataRange?: TimeRangeMs | undefined;
};

type NavigatorPanelSeriesLoadResult = { chartData: ChartSeriesData[] };

type LimitedQueryResultAnalysis = {
    isLimitReached: boolean;
    limitedDataRange?: TimeRangeMs | undefined;
};

type AppliedPanelLoadRanges = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
};

type NavigatorDataFromMainPanelOptions = {
    chartData: ChartSeriesData[];
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
    const sRuntimeData = resolvePanelDataForRuntime(panelInfo.data);
    const sRuntimeAxes = resolvePanelAxesForRuntime(panelInfo.axes);

    return {
        seriesList: sRuntimeData.tag_set,
        queryLimit: sRuntimeData.count,
        intervalType: sRuntimeData.interval_type,
        isRaw: panelInfo.general.is_raw,
        xAxis: sRuntimeAxes.x_axis,
        navigatorSampling: sRuntimeAxes.sampling,
        mainChartSampling: sRuntimeAxes.main_chart_sampling,
        ...loadConfigOverride,
    };
}

function getPanelLoadConfigSignature(
    loadConfig: PanelChartDataLoadConfig,
    rollupTableList: string[],
): string {
    return JSON.stringify({
        loadConfig,
        rollupTableList,
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
        mainChartSampling: {
            enabled: true,
            sample_count:
                loadConfig.mainChartSampling.sample_count ||
                loadConfig.navigatorSampling.sample_count,
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

    const sLimitAnalysis = analyzeLimitedQueryResult(
        sFetchResult.seriesFetchResults,
    );

    return {
        chartData: mapPanelSeriesRowsToChartData(sFetchResult),
        resolvedIntervalOption: sFetchResult.interval,
        ...(sLimitAnalysis.isLimitReached
            ? { isLimitReached: true }
            : {}),
        ...(sLimitAnalysis.limitedDataRange
            ? { limitedDataRange: sLimitAnalysis.limitedDataRange }
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
        loadConfig.navigatorSampling,
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

function analyzeLimitedQueryResult(
    seriesFetchResults: PanelSeriesFetchResult[],
): LimitedQueryResultAnalysis {
    let sIsLimitReached = false;
    let sStartTime = Number.POSITIVE_INFINITY;
    let sEndTime = Number.NEGATIVE_INFINITY;

    for (const { fetchResult, isLimitReached } of seriesFetchResults) {
        if (!isLimitReached) {
            continue;
        }

        sIsLimitReached = true;
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

    const sLimitedDataRange =
        !Number.isFinite(sStartTime) ||
        !Number.isFinite(sEndTime) ||
        sEndTime <= sStartTime
            ? undefined
            : {
                  startTime: sStartTime,
                  endTime: sEndTime,
              };

    return {
        isLimitReached: sIsLimitReached,
        ...(sLimitedDataRange
            ? { limitedDataRange: sLimitedDataRange }
            : {}),
    };
}

function getConcreteLimitedDataRange(
    loadState: MainPanelSeriesLoadResult,
): TimeRangeMs | undefined {
    return isConcreteTimeRange(loadState.limitedDataRange)
        ? loadState.limitedDataRange
        : undefined;
}

function getAppliedPanelLoadRanges({
    panelRange,
    requestedNavigatorRange,
    preserveNavigatorRange,
    clampPanelRangeToLoadedDataRange,
    limitedDataRange,
    normalizeNavigatorRangeForVisiblePanel,
}: {
    panelRange: TimeRangeMs;
    requestedNavigatorRange: TimeRangeMs;
    preserveNavigatorRange: boolean;
    clampPanelRangeToLoadedDataRange: boolean;
    limitedDataRange: TimeRangeMs | undefined;
    normalizeNavigatorRangeForVisiblePanel: (
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
    ) => TimeRangeMs;
}): AppliedPanelLoadRanges {
    const sShouldUseLoadedPanelRange =
        clampPanelRangeToLoadedDataRange && limitedDataRange !== undefined;
    const sPanelRange = sShouldUseLoadedPanelRange
        ? limitedDataRange
        : panelRange;

    return {
        panelRange: sPanelRange,
        navigatorRange: sShouldUseLoadedPanelRange
            ? normalizeNavigatorRangeForVisiblePanel(
                  sPanelRange,
                  requestedNavigatorRange,
              )
            : preserveNavigatorRange
                ? requestedNavigatorRange
                : normalizeNavigatorRangeForVisiblePanel(
                      sPanelRange,
                      requestedNavigatorRange,
                  ),
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
    hasLoadConfigChanged,
}: {
    currentDataState: PanelChartDataState;
    nextRangeState: PanelRangeState;
    forceReload: boolean;
    hasLoadConfigChanged: boolean;
}): RangeLoadPlan {
    const sNavigatorDataOutdated =
        !isConcreteTimeRange(currentDataState.loadedNavigatorRange) ||
        !isSameTimeRange(
            nextRangeState.navigatorRange,
            currentDataState.loadedNavigatorRange,
        );
    const sPanelDataOutdated =
        !isConcreteTimeRange(currentDataState.loadedDataRange) ||
        !isSameTimeRange(
            nextRangeState.panelRange,
            currentDataState.loadedDataRange,
        );
    const sReloadMain =
        forceReload || hasLoadConfigChanged || sPanelDataOutdated;

    return {
        reloadMain: sReloadMain,
        reloadNavigator: sReloadMain
            ? forceReload || hasLoadConfigChanged || sNavigatorDataOutdated
            : sNavigatorDataOutdated,
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
    const lastLoadConfigSignatureRef = useRef<string | undefined>(undefined);
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

        setChartDataState((current) => ({
            ...current,
            ...getPanelDataStatePatch({
                mainLoadState,
                appliedRanges,
                currentIntervalOption: current.resolvedIntervalOption,
            }),
        }));
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
    ): Promise<PanelMainDataRefreshResult> {
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
                clampPanelRangeToLoadedDataRange,
                limitedDataRange: getConcreteLimitedDataRange(sMainLoadState),
                normalizeNavigatorRangeForVisiblePanel,
            });

            commitPanelLoadResult(sMainLoadState, sAppliedRanges);
            setChartLoadStatus(PanelChartLoadStatus.Ready);

            return {
                isStale: false,
                panelRange: sAppliedRanges.panelRange,
                navigatorRange: sAppliedRanges.navigatorRange,
                chartData: sMainLoadState.chartData,
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
        const sNavigatorRange = normalizeNavigatorRangeForVisiblePanel(
            panelRange,
            sRequestedNavigatorRange,
        );
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

            setChartDataState((current) => ({
                ...current,
                navigatorChartData: sLoadState.chartData,
                loadedNavigatorRange: sNavigatorRange,
            }));
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

    function commitNavigatorDataFromMainPanelData({
        chartData,
        navigatorRange,
    }: NavigatorDataFromMainPanelOptions): PanelDataRefreshResult {
        setChartDataState((current) => ({
            ...current,
            navigatorChartData: chartData,
            loadedNavigatorRange: navigatorRange,
        }));
        setNavigatorLoadStatus(PanelChartLoadStatus.Ready);

        return {
            isStale: false,
            navigatorRange,
        };
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
        const sAppliedNavigatorRange = sMainResult.navigatorRange ?? navigatorRange;
        if (!reloadNavigator || !sMainResult.chartData) {
            return {
                isStale: false,
                panelRange: sAppliedPanelRange,
                navigatorRange: sAppliedNavigatorRange,
            };
        }

        const sNavigatorResult = isSameTimeRange(
            sAppliedNavigatorRange,
            sAppliedPanelRange,
        )
            ? commitNavigatorDataFromMainPanelData({
                  chartData: sMainResult.chartData,
                  navigatorRange: sAppliedNavigatorRange,
              })
            : await loadNavigatorData(loadConfig, {
                  panelRange: sAppliedPanelRange,
                  navigatorRange: sAppliedNavigatorRange,
              });

        return {
            ...sNavigatorResult,
            panelRange: sAppliedPanelRange,
            navigatorRange: sNavigatorResult.navigatorRange ?? sAppliedNavigatorRange,
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

        const sLoadConfig = getPanelLoadConfig(
            panelInfo,
            dataRefreshPolicy.dataLoadConfigOverride,
        );
        const sLoadConfigSignature = getPanelLoadConfigSignature(
            sLoadConfig,
            rollupTableList,
        );
        const sHasLoadConfigChanged =
            lastLoadConfigSignatureRef.current !== undefined &&
            lastLoadConfigSignatureRef.current !== sLoadConfigSignature;
        const sLoadPlan = createRangeLoadPlan({
            currentDataState: chartDataStateRef.current,
            nextRangeState: rangeState,
            forceReload: dataRefreshPolicy.forceReload,
            hasLoadConfigChanged:
                dataRefreshPolicy.dataLoadConfigOverride !== undefined ||
                sHasLoadConfigChanged,
        });

        if (!sLoadPlan.reloadMain && !sLoadPlan.reloadNavigator) {
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
                preserveNavigatorRange: dataRefreshPolicy.preserveNavigatorRange,
                forceRawMainSampling: dataRefreshPolicy.forceRawMainSampling,
                clampPanelRangeToLoadedDataRange:
                    dataRefreshPolicy.clampPanelRangeToLoadedDataRange,
                ...sLoadPlan,
            });

            if (sRefreshResult.isStale) {
                return;
            }

            lastLoadConfigSignatureRef.current = sLoadConfigSignature;

            const sAppliedRange = {
                panelRange: sRefreshResult.panelRange ?? rangeState.panelRange,
                navigatorRange:
                    sRefreshResult.navigatorRange ?? rangeState.navigatorRange,
            };

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
