import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { loadPanelChartState } from '../fetch/PanelChartDataLoader';
import {
    resolveSeriesTimeBoundaryRanges,
    resolveTimeBoundaryRanges,
} from '../fetch/TimeBoundaryRangeResolver';
import type { BoardActions, BoardState } from '../domain/BoardModel';
import type { PanelInfo } from '../domain/PanelModel';
import { EMPTY_TIME_RANGE } from '../time/TimeConstants';
import {
    convertTimeRangeConfigToResolvedTimeRangeMs,
} from '../time/TimeBoundaryConverters';
import { createTimeBoundaryFallbackRange } from '../time/TimeRangeResolution';
import type {
    FetchedTimeBoundaryRange,
    ResolvedTimeRangeMs,
    TimeRangeConfig,
} from '../time/TimeTypes';
import { hasResolvedIntervalOption } from '../time/TimeIntervalOptionUtils';
import { isConcreteTimeRange, isSameTimeRange } from '../time/TimeRangeUtils';
import { resolvePanelTimeRange } from './PanelTimeRangeResolver';
import {
    createPanelRangeControlHandlers,
    normalizeNavigatorRange,
} from './rangeControl/PanelRangeControlLogic';
import type {
    PanelChartHandle,
    PanelNavigateState,
    PanelRangeAppliedContext,
    PanelRangeChangeEvent,
} from './PanelTypes';

const INITIAL_PANEL_CHART_RANGE_STATE: PanelNavigateState = {
    chartData: [],
    navigatorChartData: [],
    panelRange: EMPTY_TIME_RANGE,
    navigatorRange: EMPTY_TIME_RANGE,
    rangeOption: undefined,
};

export function usePanelChartRangeController({
    panelInfo,
    boardTime,
    isActiveTab,
    boardRangeSyncState,
    isSelectedForOverlap,
    rollupTableList,
    chartAreaRef,
    panelChartApiRef,
    currentIsRaw,
    shouldRefreshAfterEdit,
    onPersistPanelState,
    onUpdateOverlapSelection,
    onEditRefreshHandled,
}: {
    panelInfo: PanelInfo;
    boardTime: TimeRangeConfig;
    isActiveTab: boolean;
    boardRangeSyncState: Pick<
        BoardState,
        'refreshCount' | 'timeRefreshCount' | 'boardTimeApplyCount' | 'globalTimeRange'
    >;
    isSelectedForOverlap: boolean;
    rollupTableList: string[];
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    panelChartApiRef: MutableRefObject<PanelChartHandle | null>;
    currentIsRaw: boolean;
    shouldRefreshAfterEdit: boolean;
    onPersistPanelState: BoardActions['onPersistPanelState'];
    onUpdateOverlapSelection: (start: number, end: number, isRaw: boolean) => void;
    onEditRefreshHandled: () => void;
}) {
    const { meta, data, time } = panelInfo;
    const [chartRangeState, setChartRangeState] = useState<PanelNavigateState>(
        INITIAL_PANEL_CHART_RANGE_STATE,
    );
    const [hasInitializedChartRanges, setHasInitializedChartRanges] = useState(false);
    const [isChartLoading, setIsChartLoading] = useState(false);
    const chartRangeStateRef = useRef<PanelNavigateState>(
        INITIAL_PANEL_CHART_RANGE_STATE,
    );
    const panelLoadRequestIdRef = useRef(0);
    const loadedDataRangeRef = useRef<ResolvedTimeRangeMs>(EMPTY_TIME_RANGE);
    const hasLoadedChartData = chartRangeState.rangeOption !== undefined;

    function getChartLoadWidth() {
        const sMeasuredChartWidth = chartAreaRef.current?.clientWidth;

        return typeof sMeasuredChartWidth === 'number' && sMeasuredChartWidth > 0
            ? sMeasuredChartWidth
            : 1;
    }

    function handlePanelRangeApplied(
        panelRange: ResolvedTimeRangeMs,
        context: PanelRangeAppliedContext,
    ) {
        if (time.useTimeKeeper) {
            onPersistPanelState({
                targetPanelKey: meta.index_key,
                timeInfo: {
                    panelRange: panelRange,
                    navigatorRange: context.navigatorRange,
                },
                isRaw: context.isRaw,
            });
        }
        if (isSelectedForOverlap) {
            onUpdateOverlapSelection(panelRange.startTime, panelRange.endTime, context.isRaw);
        }
    }

    function updateChartRangeState(patch: Partial<PanelNavigateState>) {
        setChartRangeState((prev) => {
            const sNextChartRangeState = { ...prev, ...patch };
            chartRangeStateRef.current = sNextChartRangeState;
            return sNextChartRangeState;
        });
    }

    async function refreshPanelData(
        timeRange: ResolvedTimeRangeMs | undefined,
        raw: boolean,
        dataRange: ResolvedTimeRangeMs | undefined,
        panelInfoOverride?: PanelInfo,
    ) {
        const sPanelInfo = panelInfoOverride ?? panelInfo;
        const sRequestedRange = timeRange ?? chartRangeStateRef.current.panelRange;
        const sLoadedDataRange = dataRange ?? sRequestedRange;
        const sRequestId = ++panelLoadRequestIdRef.current;

        setIsChartLoading(true);

        try {
            const sLoadState = await loadPanelChartState(
                sPanelInfo.data,
                sPanelInfo.time,
                sPanelInfo.axes,
                boardTime,
                getChartLoadWidth(),
                raw,
                sLoadedDataRange,
                rollupTableList,
            );

            if (sRequestId !== panelLoadRequestIdRef.current) {
                return {
                    isStale: true,
                };
            }

            loadedDataRangeRef.current = sLoadedDataRange;

            updateChartRangeState({
                chartData: sLoadState.chartData.datasets,
                navigatorChartData: sLoadState.chartData.datasets,
                rangeOption: hasResolvedIntervalOption(sLoadState.rangeOption)
                    ? sLoadState.rangeOption
                    : hasResolvedIntervalOption(chartRangeStateRef.current.rangeOption)
                      ? chartRangeStateRef.current.rangeOption
                      : sLoadState.rangeOption,
            });

            return {
                isStale: false,
            };
        } finally {
            if (sRequestId === panelLoadRequestIdRef.current) {
                setIsChartLoading(false);
            }
        }
    }

    async function refreshNavigatorData(
        navigatorRange: ResolvedTimeRangeMs,
        raw = currentIsRaw,
    ) {
        const sRequestId = ++panelLoadRequestIdRef.current;

        setIsChartLoading(true);

        try {
            const sLoadState = await loadPanelChartState(
                panelInfo.data,
                panelInfo.time,
                panelInfo.axes,
                boardTime,
                getChartLoadWidth(),
                raw,
                navigatorRange,
                rollupTableList,
            );

            if (sRequestId !== panelLoadRequestIdRef.current) {
                return {
                    isStale: true,
                };
            }

            updateChartRangeState({
                navigatorChartData: sLoadState.chartData.datasets,
            });

            return {
                isStale: false,
            };
        } finally {
            if (sRequestId === panelLoadRequestIdRef.current) {
                setIsChartLoading(false);
            }
        }
    }

    function notifyPanelRangeApplied(panelRange: ResolvedTimeRangeMs) {
        handlePanelRangeApplied(panelRange, {
            navigatorRange: chartRangeStateRef.current.navigatorRange,
            isRaw: currentIsRaw,
        });
    }

    async function applyPanelAndNavigatorRanges(
        panelRange: ResolvedTimeRangeMs,
        navigatorRange: ResolvedTimeRangeMs,
        raw = currentIsRaw,
    ) {
        const sCurrentPanelRange = chartRangeStateRef.current.panelRange;
        const sCurrentNavigatorRange = chartRangeStateRef.current.navigatorRange;
        const sLoadedDataRange = loadedDataRangeRef.current;

        if (
            isSameTimeRange(panelRange, sCurrentPanelRange) &&
            isSameTimeRange(navigatorRange, sCurrentNavigatorRange)
        ) {
            return;
        }

        const sNavigatorRangeChanged = !isSameTimeRange(
            navigatorRange,
            sCurrentNavigatorRange,
        );
        const sPanelRangeChanged = !isSameTimeRange(panelRange, sCurrentPanelRange);

        if (sNavigatorRangeChanged && !sPanelRangeChanged) {
            updateChartRangeState({
                navigatorRange: navigatorRange,
            });

            const sRefreshResult = await refreshNavigatorData(navigatorRange, raw);
            if (sRefreshResult.isStale) {
                return;
            }

            notifyPanelRangeApplied(panelRange);
            return;
        }

        const sPreviousWidth = sCurrentPanelRange.endTime - sCurrentPanelRange.startTime;
        const sNextWidth = panelRange.endTime - panelRange.startTime;
        const sVisibleRangeZoomed =
            !sNavigatorRangeChanged &&
            sPreviousWidth > 0 &&
            Math.abs(sNextWidth - sPreviousWidth) / sPreviousWidth > 0.01;
        const sPanelEscapedLoadedData =
            !sNavigatorRangeChanged &&
            sLoadedDataRange.startTime > 0 &&
            (panelRange.startTime < sLoadedDataRange.startTime ||
                panelRange.endTime > sLoadedDataRange.endTime);
        const sNeedsFetch =
            sNavigatorRangeChanged || sVisibleRangeZoomed || sPanelEscapedLoadedData;
        const sDataRange = sNavigatorRangeChanged ? navigatorRange : panelRange;
        const sPreFetchNavigatorData = chartRangeStateRef.current.navigatorChartData;

        updateChartRangeState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
        });

        if (!sNeedsFetch) {
            notifyPanelRangeApplied(panelRange);
            return;
        }

        const sRefreshResult = await refreshPanelData(panelRange, raw, sDataRange);
        if (sRefreshResult.isStale) {
            return;
        }

        if (!sNavigatorRangeChanged) {
            updateChartRangeState({ navigatorChartData: sPreFetchNavigatorData });
        }

        notifyPanelRangeApplied(panelRange);
    }

    function handleNavigatorRangeChange(event: PanelRangeChangeEvent) {
        if (event.min === undefined || event.max === undefined) {
            return;
        }

        const sNextNavigatorRange = normalizeNavigatorRange({
            startTime: event.min,
            endTime: event.max,
        });
        updateChartRangeState({ navigatorRange: sNextNavigatorRange });
    }

    async function handlePanelRangeChange(event: PanelRangeChangeEvent) {
        if (event.min === undefined || event.max === undefined) {
            return;
        }

        const sNextPanelRange = {
            startTime: event.min,
            endTime: event.max,
        };
        const sCurrentNavigatorRange = chartRangeStateRef.current.navigatorRange;

        await applyPanelAndNavigatorRanges(
            sNextPanelRange,
            sCurrentNavigatorRange,
            undefined,
        );
    }

    function setExtremes(
        panelRange: ResolvedTimeRangeMs,
        navigatorRange: ResolvedTimeRangeMs | undefined,
    ) {
        void applyPanelAndNavigatorRanges(
            panelRange,
            navigatorRange ?? chartRangeStateRef.current.navigatorRange,
            undefined,
        );
    }

    async function applyLoadedRanges(
        panelRange: ResolvedTimeRangeMs,
        navigatorRange: ResolvedTimeRangeMs = panelRange,
    ) {
        updateChartRangeState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
        });

        const sRefreshResult = await refreshPanelData(
            panelRange,
            currentIsRaw,
            navigatorRange,
        );
        if (sRefreshResult.isStale) {
            return;
        }

        updateChartRangeState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
        });
    }

    async function resolveFreshTimeBoundaryRanges(): Promise<FetchedTimeBoundaryRange | null> {
        return (
            (await resolveTimeBoundaryRanges(
                data.tag_set,
                boardTime,
                time.rangeConfig,
            )) ?? null
        );
    }

    function applyResolvedPanelRange(sResolvedRange: ResolvedTimeRangeMs) {
        if (!isConcreteTimeRange(sResolvedRange)) {
            return;
        }

        const sNavigatorRangeIsPending = isSameTimeRange(
            chartRangeStateRef.current.navigatorRange,
            EMPTY_TIME_RANGE,
        );
        const sResolvedRangeIsAlreadyApplied =
            isSameTimeRange(sResolvedRange, chartRangeStateRef.current.panelRange) &&
            (isSameTimeRange(
                sResolvedRange,
                chartRangeStateRef.current.navigatorRange,
            ) ||
                sNavigatorRangeIsPending);

        if (sResolvedRangeIsAlreadyApplied) {
            return;
        }

        setExtremes(sResolvedRange, sResolvedRange);
    }

    async function reloadResolvedPanelRange(sResolvedRange: ResolvedTimeRangeMs) {
        if (!isConcreteTimeRange(sResolvedRange)) {
            return;
        }

        await applyLoadedRanges(sResolvedRange, sResolvedRange);
        notifyPanelRangeApplied(sResolvedRange);
    }

    async function resolveFullDataRange(): Promise<ResolvedTimeRangeMs> {
        return (
            createTimeBoundaryFallbackRange(
                (await resolveSeriesTimeBoundaryRanges(data.tag_set)) ?? null,
            ) ?? EMPTY_TIME_RANGE
        );
    }

    async function applyFullDataRange(forceReload = false) {
        if (!isActiveTab) {
            return;
        }

        const sFullDataRange = await resolveFullDataRange();

        if (forceReload) {
            await reloadResolvedPanelRange(sFullDataRange);
            return;
        }

        applyResolvedPanelRange(sFullDataRange);
    }

    async function applyBoardTimeRange() {
        if (!isActiveTab) {
            return;
        }

        const sBoundaryRanges = (await resolveSeriesTimeBoundaryRanges(data.tag_set)) ?? null;
        const sBoardRange = convertTimeRangeConfigToResolvedTimeRangeMs(
            boardTime,
            sBoundaryRanges?.end.max.timestamp,
        );

        applyResolvedPanelRange(
            isConcreteTimeRange(sBoardRange)
                ? sBoardRange
                : createTimeBoundaryFallbackRange(sBoundaryRanges) ?? EMPTY_TIME_RANGE,
        );
    }

    const initialize = async function initialize() {
        setHasInitializedChartRanges(false);

        const sResolvedRange = await resolvePanelTimeRange(
            boardTime,
            data,
            time,
            await resolveFreshTimeBoundaryRanges(),
            'initialize',
        );
        let sPanelRange = sResolvedRange;
        let sNavigatorRange = sResolvedRange;

        if (time.useTimeKeeper) {
            const sSavedPanelRange = time.timeKeeper?.panelRange;
            const sSavedNavigatorRange = time.timeKeeper?.navigatorRange;

            if (
                sSavedPanelRange?.startTime !== undefined &&
                sSavedPanelRange.endTime !== undefined &&
                sSavedNavigatorRange?.startTime !== undefined &&
                sSavedNavigatorRange.endTime !== undefined
            ) {
                sPanelRange = sSavedPanelRange;
                sNavigatorRange = sSavedNavigatorRange;
            }
        }

        await applyLoadedRanges(sPanelRange, sNavigatorRange);
        setHasInitializedChartRanges(true);
    };

    const refreshInitialTimeRange = async function refreshInitialTimeRange() {
        await applyFullDataRange(true);
    };

    const reset = async function reset() {
        await applyFullDataRange(true);
    };

    const { shiftHandlers, zoomHandlers } = createPanelRangeControlHandlers(
        setExtremes,
        chartRangeState.panelRange,
        chartRangeState.navigatorRange,
    );

    useEffect(() => {
        if (!boardRangeSyncState.globalTimeRange || !hasLoadedChartData) return;
        updateChartRangeState({ rangeOption: boardRangeSyncState.globalTimeRange.interval });
        setExtremes(
            boardRangeSyncState.globalTimeRange.data,
            boardRangeSyncState.globalTimeRange.navigator,
        );
    }, [hasLoadedChartData, boardRangeSyncState.globalTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (panelChartApiRef.current)
            void refreshPanelData(
                chartRangeState.panelRange,
                currentIsRaw,
                chartRangeState.navigatorRange,
            );
    }, [boardRangeSyncState.refreshCount]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (isActiveTab && shouldRefreshAfterEdit) {
            void initialize();
            onEditRefreshHandled();
        }
    }, [panelInfo]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (
            !panelChartApiRef.current ||
            !hasLoadedChartData ||
            !hasInitializedChartRanges
        ) {
            return;
        }

        void reset();
    }, [boardRangeSyncState.timeRefreshCount]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (
            !panelChartApiRef.current ||
            !hasLoadedChartData ||
            !hasInitializedChartRanges
        ) {
            return;
        }

        void applyBoardTimeRange();
    }, [boardRangeSyncState.boardTimeApplyCount]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (
            isActiveTab &&
            chartAreaRef.current &&
            chartRangeStateRef.current.rangeOption === undefined
        ) {
            void initialize();
        }
    }, [isActiveTab]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        chartRangeState,
        hasLoadedChartData,
        isChartLoading,
        refreshPanelData,
        refreshInitialTimeRange,
        handleNavigatorRangeChange,
        handlePanelRangeChange,
        shiftHandlers,
        zoomHandlers,
    };
}
