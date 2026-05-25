import { useRef } from 'react';
import type { ChartSeriesData } from '../domain/ChartDomain';
import type { GlobalTimeRangeState } from '../domain/BoardDomain';
import type {
    PanelInfo,
    PanelRangeState,
} from '../domain/PanelDomain';
import { hasNumericBaseTimeSeries } from '../domain/SeriesDomain';
import type {
    TimeRangeConfig,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import {
    hasVisibleTimeRangeChanged,
    isConcreteTimeRange,
    isSameTimeRange,
} from '../domain/time/TimeRangeUtils';
import {
    PanelChartLoadStatus,
    type BoardPanelRecord,
    type PanelDataRefreshResult,
    type PanelMainDataRefreshResult,
    type PanelRangeApplyOptions,
    type PanelRangeRefreshOptions,
} from './BoardPanelState';
import { createPanelContainerRuntimePropsGetter } from './createPanelContainerRuntimePropsGetter';
import { useDataRefresh } from './useDataRefresh';
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

export function useBoardPanelRangeMutation({
    boardTime,
    globalTimeRange,
    isActiveTab,
    getBoardPanelRecord,
    updateRangeState,
    setChartAreaWidth,
    normalizeNavigatorRangeForVisiblePanel,
    loadMainPanelData,
    loadNavigatorData,
    commitNavigatorDataFromMainPanelData,
    onAppliedRange,
}: {
    boardTime: TimeRangeConfig;
    globalTimeRange: GlobalTimeRangeState | undefined;
    isActiveTab: boolean;
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    updateRangeState: (panelKey: string, patch: Partial<PanelRangeState>) => void;
    setChartAreaWidth: (
        panelKey: string,
        chartAreaWidth: number | undefined,
    ) => void;
    normalizeNavigatorRangeForVisiblePanel: (
        panelKey: string,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
    ) => TimeRangeMs;
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
            chartData: ChartSeriesData[];
            navigatorRange: TimeRangeMs;
        },
    ) => PanelDataRefreshResult;
    onAppliedRange: (panelInfo: PanelInfo, rangeState: PanelRangeState) => void;
}) {
    const initializedPanelKeysRef = useRef<Record<string, true>>({});

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

        updateRangeState(sPanelKey, {
            panelRange,
            navigatorRange: sNavigatorRange,
        });

        const sShouldReloadNavigatorData =
            dataLoadConfigOverride !== undefined ||
            !isConcreteTimeRange(
                sBoardPanelRecord.chartDataState.loadedNavigatorRange,
            ) ||
            !isSameTimeRange(
                sNavigatorRange,
                sBoardPanelRecord.chartDataState.loadedNavigatorRange,
            );
        const sMainRefreshResult = await loadMainPanelData(panelInfo, {
            panelRange,
            navigatorRange: sNavigatorRange,
            dataLoadConfigOverride,
        });
        if (sMainRefreshResult.isStale) {
            return;
        }

        const sAppliedPanelRange = sMainRefreshResult.panelRange ?? panelRange;
        const sAppliedNavigatorRange =
            sMainRefreshResult.navigatorRange ?? sNavigatorRange;
        let sNavigatorRefreshResult: PanelDataRefreshResult = {
            isStale: false,
            navigatorRange: sAppliedNavigatorRange,
        };

        if (sShouldReloadNavigatorData && sMainRefreshResult.chartData) {
            sNavigatorRefreshResult = isSameTimeRange(
                sAppliedNavigatorRange,
                sAppliedPanelRange,
            )
                ? commitNavigatorDataFromMainPanelData(panelInfo, {
                      chartData: sMainRefreshResult.chartData,
                      navigatorRange: sAppliedNavigatorRange,
                  })
                : await loadNavigatorData(panelInfo, {
                      panelRange: sAppliedPanelRange,
                      navigatorRange: sAppliedNavigatorRange,
                      dataLoadConfigOverride,
                  });
        }
        if (sNavigatorRefreshResult.isStale) {
            return;
        }

        const sAppliedRange = {
            panelRange: sAppliedPanelRange,
            navigatorRange:
                sNavigatorRefreshResult.navigatorRange ?? sAppliedNavigatorRange,
        };

        updateRangeState(sPanelKey, sAppliedRange);
        onAppliedRange(panelInfo, sAppliedRange);
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

        const sNavigatorRangeChanged = !isSameTimeRange(
            sNavigatorRange,
            sCurrentRangeState.navigatorRange,
        );
        const sPanelRangeChanged = !isSameTimeRange(
            panelRange,
            sCurrentRangeState.panelRange,
        );

        updateRangeState(sPanelKey, {
            panelRange,
            navigatorRange: sNavigatorRange,
        });

        let sRefreshResult: PanelDataRefreshResult = {
            isStale: false,
            panelRange,
            navigatorRange: sNavigatorRange,
        };

        if (
            sNavigatorRangeChanged &&
            !sPanelRangeChanged &&
            !forceReload &&
            !sHasLoadConfigOverride
        ) {
            if (
                !isConcreteTimeRange(
                    sBoardPanelRecord.chartDataState.loadedNavigatorRange,
                ) ||
                !isSameTimeRange(
                    sNavigatorRange,
                    sBoardPanelRecord.chartDataState.loadedNavigatorRange,
                )
            ) {
                sRefreshResult = await loadNavigatorData(panelInfo, {
                    panelRange,
                    navigatorRange: sNavigatorRange,
                    dataLoadConfigOverride,
                });
            }
        } else if (
            forceReload ||
            sHasLoadConfigOverride ||
            !isConcreteTimeRange(
                sBoardPanelRecord.chartDataState.loadedDataRange,
            ) ||
            !isSameTimeRange(
                panelRange,
                sBoardPanelRecord.chartDataState.loadedDataRange,
            )
        ) {
            const sShouldReloadNavigatorData =
                forceReload ||
                sHasLoadConfigOverride ||
                !isConcreteTimeRange(
                    sBoardPanelRecord.chartDataState.loadedNavigatorRange,
                ) ||
                !isSameTimeRange(
                    sNavigatorRange,
                    sBoardPanelRecord.chartDataState.loadedNavigatorRange,
                );
            const sMainRefreshResult = await loadMainPanelData(panelInfo, {
                panelRange,
                navigatorRange: sNavigatorRange,
                dataLoadConfigOverride,
                preserveNavigatorRange,
                forceRawMainSampling,
            });
            if (sMainRefreshResult.isStale) {
                return;
            }

            const sAppliedPanelRange =
                sMainRefreshResult.panelRange ?? panelRange;
            const sAppliedNavigatorRange =
                sMainRefreshResult.navigatorRange ?? sNavigatorRange;

            sRefreshResult = {
                isStale: false,
                panelRange: sAppliedPanelRange,
                navigatorRange: sAppliedNavigatorRange,
            };

            if (sShouldReloadNavigatorData && sMainRefreshResult.chartData) {
                sRefreshResult = isSameTimeRange(
                    sAppliedNavigatorRange,
                    sAppliedPanelRange,
                )
                    ? {
                          ...commitNavigatorDataFromMainPanelData(panelInfo, {
                              chartData: sMainRefreshResult.chartData,
                              navigatorRange: sAppliedNavigatorRange,
                          }),
                          panelRange: sAppliedPanelRange,
                      }
                    : {
                          ...(await loadNavigatorData(panelInfo, {
                              panelRange: sAppliedPanelRange,
                              navigatorRange: sAppliedNavigatorRange,
                              dataLoadConfigOverride,
                          })),
                          panelRange: sAppliedPanelRange,
                      };
            }
        }
        if (sRefreshResult.isStale) {
            return;
        }

        const sAppliedRange = {
            panelRange: sRefreshResult.panelRange ?? panelRange,
            navigatorRange: sRefreshResult.navigatorRange ?? sNavigatorRange,
        };

        updateRangeState(sPanelKey, sAppliedRange);
        onAppliedRange(panelInfo, sAppliedRange);
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

    const rangeRefresh = useRangeRefresh({
        boardTime,
        getBoardPanelRecord,
        applyRange,
        refreshVisibleRange,
    });
    const dataRefresh = useDataRefresh({
        getBoardPanelRecord,
        refreshFullRange: rangeRefresh.refreshFullRange,
        refreshCurrentRange,
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

    function handleChartAreaWidthChange(
        panelInfo: PanelInfo,
        width: number | undefined,
    ): void {
        const sPanelKey = panelInfo.meta.index_key;

        setChartAreaWidth(sPanelKey, width);

        if (width === undefined) {
            if (initializedPanelKeysRef.current[sPanelKey]) {
                const sNextInitializedPanelKeys = {
                    ...initializedPanelKeysRef.current,
                };

                delete sNextInitializedPanelKeys[sPanelKey];
                initializedPanelKeysRef.current = sNextInitializedPanelKeys;
            }
            return;
        }

        const sUpdatedBoardPanelRecord = getBoardPanelRecord(sPanelKey);

        if (!isActiveTab) {
            if (initializedPanelKeysRef.current[sPanelKey]) {
                const sNextInitializedPanelKeys = {
                    ...initializedPanelKeysRef.current,
                };

                delete sNextInitializedPanelKeys[sPanelKey];
                initializedPanelKeysRef.current = sNextInitializedPanelKeys;
            }
            return;
        }

        if (
            sUpdatedBoardPanelRecord.chartAreaWidth === undefined ||
            sUpdatedBoardPanelRecord.chartLoadStatus ===
                PanelChartLoadStatus.Loading ||
            initializedPanelKeysRef.current[sPanelKey]
        ) {
            return;
        }

        initializedPanelKeysRef.current = {
            ...initializedPanelKeysRef.current,
            [sPanelKey]: true,
        };

        if (panelInfo.time.useLastViewedRange) {
            const sLastViewedRange = panelInfo.time.lastViewedRange;

            void (
                isConcreteTimeRange(sLastViewedRange?.panelRange) &&
                isConcreteTimeRange(sLastViewedRange?.navigatorRange)
                    ? rangeRefresh.initializeRange(panelInfo)
                    : rangeRefresh.refreshFullRange(panelInfo)
            );
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
        const sRangeState = getBoardPanelRecord(
            nextPanelInfo.meta.index_key,
        ).rangeState;
        const sShouldPreserveLiveRange =
            nextPanelInfo.time.useLastViewedRange &&
            isConcreteTimeRange(sRangeState.panelRange) &&
            isConcreteTimeRange(sRangeState.navigatorRange);

        if (
            nextPanelInfo.time.useLastViewedRange &&
            !sShouldPreserveLiveRange
        ) {
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
        const sRangeState = getBoardPanelRecord(
            nextPanelInfo.meta.index_key,
        ).rangeState;
        const sShouldPreserveLiveRange =
            nextPanelInfo.time.useLastViewedRange &&
            isConcreteTimeRange(sRangeState.panelRange) &&
            isConcreteTimeRange(sRangeState.navigatorRange);

        if (nextPanelInfo.time.useLastViewedRange) {
            if (sShouldPreserveLiveRange) {
                void refreshCurrentRange(nextPanelInfo, {
                    forceReload: true,
                    preserveNavigatorRange: true,
                    dataLoadConfigOverride: sDataLoadConfigOverride,
                });
                return;
            }

            void rangeRefresh.refreshFullRange(nextPanelInfo);
            return;
        }

        void rangeRefresh.initializeRange(nextPanelInfo, {
            dataLoadConfigOverride: sDataLoadConfigOverride,
        });
    }

    const getPanelContainerRuntimeProps = createPanelContainerRuntimePropsGetter({
        getBoardPanelRecord,
        refreshVisibleRange,
    });

    return {
        getPanelContainerRuntimeProps,
        handleChartAreaWidthChange,
        refreshDataRange: dataRefresh.refreshDataRange,
        refreshTimeRange: rangeRefresh.refreshTimeRange,
        applyBoardRange: rangeRefresh.applyBoardRange,
        applyGlobalRange,
        reloadRawMode,
        reloadPanelEdit,
    };
}
