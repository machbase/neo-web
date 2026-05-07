import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { loadPanelChartState } from '../fetch/PanelChartDataLoader';
import { resolveTimeBoundaryRanges } from '../fetch/TimeBoundaryRangeResolver';
import type { BoardActions, BoardState } from '../domain/BoardModel';
import type { PanelInfo } from '../domain/PanelModel';
import { EMPTY_TIME_RANGE } from '../time/TimeConstants';
import type {
    FetchedTimeBoundaryRange,
    ResolvedTimeRangeMs,
    TimeRangeConfig,
} from '../time/TimeTypes';
import { isSameTimeRange } from '../time/TimeRangeUtils';
import { buildPanelLoadNavigateStatePatch } from './PanelChartLoadNavigateStatePatch';
import {
    hasLoadedPanelChartData,
    shouldApplyResolvedRange,
} from './PanelContainerUtils';
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

type UsePanelRangeRuntimeParams = {
    panelInfo: PanelInfo;
    boardTime: TimeRangeConfig;
    isActiveTab: boolean;
    boardRangeSyncState: Pick<
        BoardState,
        'refreshCount' | 'timeRefreshCount' | 'globalTimeRange'
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
};

const INITIAL_PANEL_NAVIGATE_STATE: PanelNavigateState = {
    chartData: [],
    navigatorChartData: [],
    panelRange: EMPTY_TIME_RANGE,
    navigatorRange: EMPTY_TIME_RANGE,
    rangeOption: undefined,
    preOverflowTimeRange: EMPTY_TIME_RANGE,
};

export function usePanelRangeRuntime({
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
}: UsePanelRangeRuntimeParams) {
    const { meta, data, time } = panelInfo;
    const [navigateState, setNavigateState] = useState<PanelNavigateState>(
        INITIAL_PANEL_NAVIGATE_STATE,
    );
    const [hasInitializedChartRanges, setHasInitializedChartRanges] = useState(false);
    const navigateStateRef = useRef<PanelNavigateState>(INITIAL_PANEL_NAVIGATE_STATE);
    const skipNextFetchRef = useRef(false);
    const panelLoadRequestIdRef = useRef(0);
    const loadedDataRangeRef = useRef<ResolvedTimeRangeMs>(EMPTY_TIME_RANGE);
    const hasLoadedChartData = hasLoadedPanelChartData(navigateState);

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

    function updateNavigateState(patch: Partial<PanelNavigateState>) {
        setNavigateState((prev) => {
            const sNextNavigateState = { ...prev, ...patch };
            navigateStateRef.current = sNextNavigateState;
            return sNextNavigateState;
        });
    }

    async function refreshPanelData(
        timeRange: ResolvedTimeRangeMs | undefined,
        raw: boolean,
        dataRange: ResolvedTimeRangeMs | undefined,
    ) {
        const sRequestedRange = timeRange ?? navigateStateRef.current.panelRange;
        const sLoadedDataRange = dataRange ?? sRequestedRange;
        const sRequestId = ++panelLoadRequestIdRef.current;
        const sMeasuredChartWidth = chartAreaRef.current?.clientWidth;
        const sChartWidth =
            typeof sMeasuredChartWidth === 'number' && sMeasuredChartWidth > 0
                ? sMeasuredChartWidth
                : 1;
        const sLoadState = await loadPanelChartState(
            panelInfo.data,
            panelInfo.time,
            panelInfo.axes,
            boardTime,
            sChartWidth,
            raw,
            sLoadedDataRange,
            rollupTableList,
        );

        if (sRequestId !== panelLoadRequestIdRef.current) {
            return {
                appliedRange: navigateStateRef.current.panelRange,
                isStale: true,
            };
        }

        const sAppliedRange = sLoadState.overflowRange ?? sRequestedRange;
        loadedDataRangeRef.current = sLoadedDataRange;

        updateNavigateState(
            buildPanelLoadNavigateStatePatch(
                sLoadState,
                undefined,
                navigateStateRef.current.rangeOption,
            ),
        );
        if (sLoadState.overflowRange) {
            skipNextFetchRef.current = true;
            panelChartApiRef.current?.setPanelRange(sLoadState.overflowRange);
        }

        return {
            appliedRange: sAppliedRange,
            isStale: false,
        };
    }

    function notifyPanelRangeApplied(panelRange: ResolvedTimeRangeMs) {
        handlePanelRangeApplied(panelRange, {
            navigatorRange: navigateStateRef.current.navigatorRange,
            isRaw: currentIsRaw,
        });
    }

    async function applyPanelAndNavigatorRanges(
        panelRange: ResolvedTimeRangeMs,
        navigatorRange: ResolvedTimeRangeMs,
        raw = currentIsRaw,
    ) {
        const sCurrentPanelRange = navigateStateRef.current.panelRange;
        const sCurrentNavigatorRange = navigateStateRef.current.navigatorRange;
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
        const sPreFetchNavigatorData = navigateStateRef.current.navigatorChartData;

        updateNavigateState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
            preOverflowTimeRange: EMPTY_TIME_RANGE,
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
            updateNavigateState({ navigatorChartData: sPreFetchNavigatorData });
        }

        notifyPanelRangeApplied(sRefreshResult.appliedRange);
    }

    function handleNavigatorRangeChange(event: PanelRangeChangeEvent) {
        if (event.min === undefined || event.max === undefined) {
            return;
        }

        const sNextNavigatorRange = normalizeNavigatorRange({
            startTime: event.min,
            endTime: event.max,
        });
        updateNavigateState({ navigatorRange: sNextNavigatorRange });
    }

    async function handlePanelRangeChange(event: PanelRangeChangeEvent) {
        if (event.min === undefined || event.max === undefined) {
            return;
        }

        const sNextPanelRange = {
            startTime: event.min,
            endTime: event.max,
        };
        const sCurrentNavigatorRange = navigateStateRef.current.navigatorRange;

        if (skipNextFetchRef.current) {
            skipNextFetchRef.current = false;
            updateNavigateState({ panelRange: sNextPanelRange });
            notifyPanelRangeApplied(sNextPanelRange);
            return;
        }

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
            navigatorRange ?? navigateStateRef.current.navigatorRange,
            undefined,
        );
    }

    async function applyLoadedRanges(
        panelRange: ResolvedTimeRangeMs,
        navigatorRange: ResolvedTimeRangeMs = panelRange,
    ) {
        updateNavigateState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
            preOverflowTimeRange: EMPTY_TIME_RANGE,
        });

        const sRefreshResult = await refreshPanelData(
            panelRange,
            currentIsRaw,
            navigatorRange,
        );
        if (sRefreshResult.isStale) {
            return;
        }

        updateNavigateState({
            panelRange: sRefreshResult.appliedRange,
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

    async function applyResolvedRange(
        resolveRange: (
            timeBoundaryRanges: FetchedTimeBoundaryRange | null,
        ) => Promise<ResolvedTimeRangeMs>,
    ) {
        if (!isActiveTab) {
            return;
        }

        const sResolvedRange = await resolveRange(await resolveFreshTimeBoundaryRanges());
        if (
            !shouldApplyResolvedRange(
                sResolvedRange,
                navigateStateRef.current.panelRange,
                navigateStateRef.current.navigatorRange,
            )
        ) {
            return;
        }

        setExtremes(sResolvedRange, sResolvedRange);
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
        await applyResolvedRange((timeBoundaryRanges) =>
            resolvePanelTimeRange(
                boardTime,
                data,
                time,
                timeBoundaryRanges,
                'initialize',
            ),
        );
    };

    const reset = async function reset() {
        await applyResolvedRange((timeBoundaryRanges) =>
            resolvePanelTimeRange(
                boardTime,
                data,
                time,
                timeBoundaryRanges,
                'reset',
            ),
        );
    };

    const { shiftHandlers, zoomHandlers } = createPanelRangeControlHandlers(
        setExtremes,
        navigateState.panelRange,
        navigateState.navigatorRange,
    );

    useEffect(() => {
        if (!boardRangeSyncState.globalTimeRange || !hasLoadedChartData) return;
        updateNavigateState({ rangeOption: boardRangeSyncState.globalTimeRange.interval });
        setExtremes(
            boardRangeSyncState.globalTimeRange.data,
            boardRangeSyncState.globalTimeRange.navigator,
        );
    }, [hasLoadedChartData, boardRangeSyncState.globalTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (panelChartApiRef.current)
            void refreshPanelData(
                navigateState.panelRange,
                currentIsRaw,
                navigateState.navigatorRange,
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
            isActiveTab &&
            chartAreaRef.current &&
            !hasLoadedPanelChartData(navigateStateRef.current)
        ) {
            void initialize();
        }
    }, [isActiveTab]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        navigateState,
        hasLoadedChartData,
        refreshPanelData,
        refreshInitialTimeRange,
        handleNavigatorRangeChange,
        handlePanelRangeChange,
        shiftHandlers,
        zoomHandlers,
    };
}
