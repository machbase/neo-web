import { useRef } from 'react';
import type { GlobalTimeRangeState } from '../domain/BoardDomain';
import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import { hasNumericBaseTimeSeries } from '../domain/SeriesDomain';
import type { TimeRangeConfig, TimeRangeMs } from '../domain/time/TimeTypes';
import {
    hasVisibleTimeRangeChanged,
    isConcreteTimeRange,
    isSameTimeRange,
} from '../domain/time/TimeRangeUtils';
import {
    PanelChartLoadStatus,
    hasConcretePanelRangeState,
    type BoardPanelRecord,
    type PanelDataRefreshResult,
    type PanelMainDataRefreshResult,
    type PanelRangeApplyOptions,
    type PanelRangeRefreshOptions,
} from './BoardPanelState';
import { getPanelContainerRuntimeProps as buildPanelContainerRuntimeProps } from './getPanelContainerRuntimeProps';
import { useRangeRefresh } from './useRangeRefresh';

function assertCanRefreshRange(
    boardPanelRecord: BoardPanelRecord,
    panelRange: TimeRangeMs,
): void {
    if (!boardPanelRecord.chartAreaWidth) {
        throw new Error('Cannot refresh panel range before chart width is measured.');
    }

    if (!isConcreteTimeRange(panelRange)) {
        throw new Error('Cannot refresh panel range with an invalid panel range.');
    }
}

type RangeMutationContext = {
    boardTime: TimeRangeConfig;
    globalTimeRange: GlobalTimeRangeState | undefined;
    isActiveTab: boolean;
};

type RangeMutationPanelStore = {
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    updateRangeState: (panelKey: string, patch: Partial<PanelRangeState>) => void;
    setChartAreaWidth: (panelKey: string, chartAreaWidth: number | undefined) => void;
    normalizeNavigatorRangeForVisiblePanel: (
        panelKey: string,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
    ) => TimeRangeMs;
};

type RangeMutationDataLoaders = {
    loadMainPanelData: (
        panelInfo: PanelInfo,
        options: PanelRangeApplyOptions,
    ) => Promise<PanelMainDataRefreshResult>;
    loadNavigatorData: (
        panelInfo: PanelInfo,
        options: PanelRangeApplyOptions,
    ) => Promise<PanelDataRefreshResult>;
    commitNavigatorDataFromMainPanelData: (
        panelInfo: PanelInfo,
        options: {
            chartData: NonNullable<PanelMainDataRefreshResult['chartData']>;
            navigatorRange: TimeRangeMs;
        },
    ) => PanelDataRefreshResult;
};

type RangeMutationPersistence = {
    onAppliedRange: (panelInfo: PanelInfo, rangeState: PanelRangeState) => void;
};

type RangeMutationDependencies = {
    context: RangeMutationContext;
    panelStore: RangeMutationPanelStore;
    dataLoaders: RangeMutationDataLoaders;
    persistence: RangeMutationPersistence;
};

type RangeLoadPlan = {
    reloadMain: boolean;
    reloadNavigator: boolean;
};

function createRangeLoadPlan({
    currentRecord,
    nextRangeState,
    forceReload,
    hasLoadConfigOverride,
}: {
    currentRecord: BoardPanelRecord;
    nextRangeState: PanelRangeState;
    forceReload: boolean;
    hasLoadConfigOverride: boolean;
}): RangeLoadPlan {
    const sNavigatorRangeChanged = !isSameTimeRange(
        nextRangeState.navigatorRange,
        currentRecord.rangeState.navigatorRange,
    );
    const sPanelRangeChanged = !isSameTimeRange(
        nextRangeState.panelRange,
        currentRecord.rangeState.panelRange,
    );
    const sShouldLoadNavigatorOnly =
        sNavigatorRangeChanged &&
        !sPanelRangeChanged &&
        !forceReload &&
        !hasLoadConfigOverride;
    const sNavigatorDataOutdated =
        !isConcreteTimeRange(currentRecord.chartDataState.loadedNavigatorRange) ||
        !isSameTimeRange(
            nextRangeState.navigatorRange,
            currentRecord.chartDataState.loadedNavigatorRange,
        );
    const sReloadMain =
        !sShouldLoadNavigatorOnly &&
        (forceReload ||
            hasLoadConfigOverride ||
            !isConcreteTimeRange(currentRecord.chartDataState.loadedDataRange) ||
            !isSameTimeRange(
                nextRangeState.panelRange,
                currentRecord.chartDataState.loadedDataRange,
            ));

    return {
        reloadMain: sReloadMain,
        reloadNavigator: sShouldLoadNavigatorOnly
            ? sNavigatorDataOutdated
            : sReloadMain &&
              (forceReload || hasLoadConfigOverride || sNavigatorDataOutdated),
    };
}

export function useBoardPanelRangeMutation({
    context,
    panelStore,
    dataLoaders,
    persistence,
}: RangeMutationDependencies) {
    const { boardTime, globalTimeRange, isActiveTab } = context;
    const {
        getBoardPanelRecord,
        updateRangeState,
        setChartAreaWidth,
        normalizeNavigatorRangeForVisiblePanel,
    } = panelStore;
    const {
        loadMainPanelData,
        loadNavigatorData,
        commitNavigatorDataFromMainPanelData,
    } = dataLoaders;
    const { onAppliedRange } = persistence;
    const initializedPanelKeysRef = useRef<Record<string, true>>({});

    async function loadRangeData(
        panelInfo: PanelInfo,
        {
            panelRange,
            navigatorRange,
            dataLoadConfigOverride,
            preserveNavigatorRange,
            forceRawMainSampling,
            clampPanelRangeToLoadedDataRange,
            reloadMain,
            reloadNavigator,
        }: Omit<PanelRangeApplyOptions, 'navigatorRange'> & {
            navigatorRange: TimeRangeMs;
            reloadMain: boolean;
            reloadNavigator: boolean;
        },
    ): Promise<PanelDataRefreshResult> {
        if (!reloadMain) {
            return reloadNavigator
                ? {
                      ...(await loadNavigatorData(panelInfo, {
                          panelRange,
                          navigatorRange,
                          dataLoadConfigOverride,
                      })),
                      panelRange,
                  }
                : { isStale: false, panelRange, navigatorRange };
        }

        const sMainResult = await loadMainPanelData(panelInfo, {
            panelRange,
            navigatorRange,
            dataLoadConfigOverride,
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
            ? commitNavigatorDataFromMainPanelData(panelInfo, {
                  chartData: sMainResult.chartData,
                  navigatorRange: sAppliedNavigatorRange,
              })
            : await loadNavigatorData(panelInfo, {
                  panelRange: sAppliedPanelRange,
                  navigatorRange: sAppliedNavigatorRange,
                  dataLoadConfigOverride,
              });

        return {
            ...sNavigatorResult,
            panelRange: sAppliedPanelRange,
            navigatorRange: sNavigatorResult.navigatorRange ?? sAppliedNavigatorRange,
        };
    }

    function commitLoadedRange(
        panelInfo: PanelInfo,
        fallbackRange: PanelRangeState,
        refreshResult: PanelDataRefreshResult,
    ): void {
        if (refreshResult.isStale) {
            return;
        }

        const sAppliedRange = {
            panelRange: refreshResult.panelRange ?? fallbackRange.panelRange,
            navigatorRange:
                refreshResult.navigatorRange ?? fallbackRange.navigatorRange,
        };

        updateRangeState(panelInfo.meta.index_key, sAppliedRange);
        onAppliedRange(panelInfo, sAppliedRange);
    }

    async function applyRange(
        panelInfo: PanelInfo,
        {
            panelRange,
            navigatorRange = panelRange,
            dataLoadConfigOverride,
        }: PanelRangeApplyOptions,
    ): Promise<void> {
        const sPanelKey = panelInfo.meta.index_key;
        const sBoardPanelRecord = getBoardPanelRecord(sPanelKey);
        if (sBoardPanelRecord.chartLoadStatus === PanelChartLoadStatus.Loading) {
            return;
        }
        assertCanRefreshRange(sBoardPanelRecord, panelRange);

        const sNavigatorRange = normalizeNavigatorRangeForVisiblePanel(
            sPanelKey,
            panelRange,
            navigatorRange,
        );
        updateRangeState(sPanelKey, { panelRange, navigatorRange: sNavigatorRange });

        const sShouldReloadNavigatorData =
            dataLoadConfigOverride !== undefined ||
            !isConcreteTimeRange(
                sBoardPanelRecord.chartDataState.loadedNavigatorRange,
            ) ||
            !isSameTimeRange(
                sNavigatorRange,
                sBoardPanelRecord.chartDataState.loadedNavigatorRange,
            );

        commitLoadedRange(
            panelInfo,
            { panelRange, navigatorRange: sNavigatorRange },
            await loadRangeData(panelInfo, {
                panelRange,
                navigatorRange: sNavigatorRange,
                dataLoadConfigOverride,
                reloadMain: true,
                reloadNavigator: sShouldReloadNavigatorData,
            }),
        );
    }

    async function refreshVisibleRange(
        panelInfo: PanelInfo,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
        {
            preserveNavigatorRange = false,
            forceReload = false,
            dataLoadConfigOverride,
            forceRawMainSampling,
            clampPanelRangeToLoadedDataRange,
        }: PanelRangeRefreshOptions = {},
    ): Promise<void> {
        const sPanelKey = panelInfo.meta.index_key;
        const sBoardPanelRecord = getBoardPanelRecord(sPanelKey);
        if (sBoardPanelRecord.chartLoadStatus === PanelChartLoadStatus.Loading) {
            return;
        }
        assertCanRefreshRange(sBoardPanelRecord, panelRange);

        const sNavigatorRange = preserveNavigatorRange
            ? navigatorRange
            : normalizeNavigatorRangeForVisiblePanel(
                  sPanelKey,
                  panelRange,
                  navigatorRange,
              );
        const sCurrentRangeState = sBoardPanelRecord.rangeState;
        const sRangeChanged = hasVisibleTimeRangeChanged(
            panelRange,
            sNavigatorRange,
            sCurrentRangeState,
        );
        const sHasLoadConfigOverride = dataLoadConfigOverride !== undefined;

        if (!sRangeChanged && !forceReload && !sHasLoadConfigOverride) {
            return;
        }

        updateRangeState(sPanelKey, {
            panelRange,
            navigatorRange: sNavigatorRange,
        });

        const sLoadPlan = createRangeLoadPlan({
            currentRecord: sBoardPanelRecord,
            nextRangeState: {
                panelRange,
                navigatorRange: sNavigatorRange,
            },
            forceReload,
            hasLoadConfigOverride: sHasLoadConfigOverride,
        });
        const sRefreshResult = await loadRangeData(panelInfo, {
            panelRange,
            navigatorRange: sNavigatorRange,
            dataLoadConfigOverride,
            preserveNavigatorRange,
            forceRawMainSampling,
            clampPanelRangeToLoadedDataRange,
            ...sLoadPlan,
        });

        commitLoadedRange(
            panelInfo,
            { panelRange, navigatorRange: sNavigatorRange },
            sRefreshResult,
        );
    }

    async function refreshCurrentRange(
        panelInfo: PanelInfo,
        options: PanelRangeRefreshOptions = {},
    ): Promise<void> {
        const sRangeState = getBoardPanelRecord(panelInfo.meta.index_key).rangeState;

        await refreshVisibleRange(
            panelInfo,
            sRangeState.panelRange,
            sRangeState.navigatorRange,
            options,
        );
    }

    async function refreshDataRange(panelInfo: PanelInfo): Promise<void> {
        const sRangeState = getBoardPanelRecord(panelInfo.meta.index_key).rangeState;

        if (!hasConcretePanelRangeState(sRangeState)) {
            await rangeRefresh.refreshFullRange(panelInfo);
            return;
        }

        await refreshCurrentRange(panelInfo, {
            forceReload: true,
            preserveNavigatorRange: true,
            forceRawMainSampling: true,
        });
    }

    const rangeRefresh = useRangeRefresh({
        boardTime,
        getBoardPanelRecord,
        applyRange,
        refreshVisibleRange,
    });

    async function applyGlobalRange(
        panelInfo: PanelInfo,
        globalTimeRangeToApply: GlobalTimeRangeState,
    ): Promise<void> {
        if (hasNumericBaseTimeSeries(panelInfo.data.tag_set)) {
            return;
        }

        await applyRange(panelInfo, {
            panelRange: globalTimeRangeToApply.data,
            navigatorRange: globalTimeRangeToApply.navigator,
        });
    }

    function markPanelUninitialized(panelKey: string): void {
        delete initializedPanelKeysRef.current[panelKey];
    }

    function handleChartAreaWidthChange(
        panelInfo: PanelInfo,
        width: number | undefined,
    ): void {
        const sPanelKey = panelInfo.meta.index_key;

        setChartAreaWidth(sPanelKey, width);

        if (width === undefined || !isActiveTab) {
            markPanelUninitialized(sPanelKey);
            return;
        }

        const sUpdatedBoardPanelRecord = getBoardPanelRecord(sPanelKey);

        if (
            sUpdatedBoardPanelRecord.chartAreaWidth === undefined ||
            sUpdatedBoardPanelRecord.chartLoadStatus ===
                PanelChartLoadStatus.Loading ||
            initializedPanelKeysRef.current[sPanelKey]
        ) {
            return;
        }

        initializedPanelKeysRef.current[sPanelKey] = true;

        if (panelInfo.time.useLastViewedRange) {
            void rangeRefresh.initializeRange(panelInfo);
            return;
        }

        void (
            globalTimeRange &&
            !hasNumericBaseTimeSeries(panelInfo.data.tag_set)
                ? applyGlobalRange(panelInfo, globalTimeRange)
                : rangeRefresh.initializeRange(panelInfo)
        );
    }

    function reloadRawMode(nextPanelInfo: PanelInfo): void {
        const sRangeState = getBoardPanelRecord(nextPanelInfo.meta.index_key).rangeState;
        const sShouldPreserveLiveRange =
            nextPanelInfo.time.useLastViewedRange &&
            isConcreteTimeRange(sRangeState.panelRange) &&
            isConcreteTimeRange(sRangeState.navigatorRange);

        if (nextPanelInfo.time.useLastViewedRange && !sShouldPreserveLiveRange) {
            void rangeRefresh.refreshFullRange(nextPanelInfo);
            return;
        }

        void refreshCurrentRange(nextPanelInfo, {
            forceReload: true,
            preserveNavigatorRange: sShouldPreserveLiveRange,
            dataLoadConfigOverride: {
                isRaw: nextPanelInfo.toolbar.isRaw,
            },
        });
    }

    function reloadPanelEdit(nextPanelInfo: PanelInfo): void {
        const sDataLoadConfigOverride = {
            seriesList: nextPanelInfo.data.tag_set,
            queryLimit: nextPanelInfo.data.count,
            intervalType: nextPanelInfo.data.interval_type,
            isRaw: nextPanelInfo.toolbar.isRaw,
            xAxis: nextPanelInfo.axes.x_axis,
            navigatorSampling: nextPanelInfo.axes.sampling,
            mainChartSampling:
                nextPanelInfo.axes.main_chart_sampling,
        };
        const sRangeState = getBoardPanelRecord(nextPanelInfo.meta.index_key).rangeState;
        const sLastViewedRange = nextPanelInfo.time.lastViewedRange;
        const sShouldPreserveLiveRange =
            nextPanelInfo.time.useLastViewedRange &&
            isConcreteTimeRange(sLastViewedRange?.panelRange) &&
            isConcreteTimeRange(sLastViewedRange?.navigatorRange) &&
            isConcreteTimeRange(sRangeState.panelRange) &&
            isConcreteTimeRange(sRangeState.navigatorRange);

        if (sShouldPreserveLiveRange) {
            void refreshCurrentRange(nextPanelInfo, {
                forceReload: true,
                preserveNavigatorRange: true,
                dataLoadConfigOverride: sDataLoadConfigOverride,
            });
            return;
        }

        void rangeRefresh.initializeRange(nextPanelInfo, {
            dataLoadConfigOverride: sDataLoadConfigOverride,
        });
    }

    return {
        getPanelContainerRuntimeProps: (panelInfo: PanelInfo) =>
            buildPanelContainerRuntimeProps({
                panelInfo,
                getBoardPanelRecord,
                refreshVisibleRange,
            }),
        handleChartAreaWidthChange,
        refreshDataRange,
        refreshTimeRange: rangeRefresh.refreshTimeRange,
        applyBoardRange: rangeRefresh.applyBoardRange,
        applyGlobalRange,
        reloadRawMode,
        reloadPanelEdit,
    };
}
