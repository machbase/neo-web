import { useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { getNavigatorRangeFromEvent } from '../utils/time/PanelRangeControlLogic';
import {
    EMPTY_TIME_RANGE,
} from '../utils/time/PanelTimeRangeResolver';
import type {
    PanelChartHandle,
    PanelRangeAppliedContext,
    PanelNavigateState,
    PanelRangeChangeEvent,
} from '../utils/panelRuntimeTypes';
import type { PanelInfo } from '../utils/panelModelTypes';
import type { InputTimeBounds, TimeRangeMs } from '../utils/time/timeTypes';
import {
    createInitialPanelNavigateState,
} from './PanelNavigateStateUtils';
import {
    resolvePanelRangeApplicationDecision,
} from './PanelChartRangePolicy';
import { usePanelChartDataRefresh } from './usePanelChartDataRefresh';

export {
    buildNavigateStatePatchFromPanelLoad,
    createInitialPanelNavigateState,
} from './PanelNavigateStateUtils';

// Input contract for the shared board/preview panel runtime controller hook.
// Used by usePanelChartRuntimeController to type use panel chart runtime controller params.
type UseChartRuntimeControllerParams = {
    panelInfo: PanelInfo;
    boardTime: InputTimeBounds;
    areaChartRef: MutableRefObject<HTMLDivElement | null>;
    chartRef: MutableRefObject<PanelChartHandle | null>;
    rollupTableList: string[];
    isRaw: boolean;
    onPanelRangeApplied:
        | ((aPanelRange: TimeRangeMs, aContext: PanelRangeAppliedContext) => void)
        | undefined;
};

/**
 * Shares panel and slider-range orchestration between board and preview chart shells.
 * Intent: Keep board and preview panel shells on the same range-loading workflow.
 * @param panelInfo The current panel info supplying chart data, time, and display settings.
 * @param boardTime The normalized board-level time input.
 * @param areaChartRef The measured chart container ref used for width calculations.
 * @param chartRef The imperative chart ref used for range synchronization.
 * @param rollupTableList The available rollup tables used during data fetches.
 * @param isRaw Whether the panel should currently load raw data.
 * @param onPanelRangeApplied The optional callback notified after a range is fully applied.
 * @returns The shared navigate state plus range and reload handlers for the chart shell.
 */
export function useChartRuntimeController({
    panelInfo,
    boardTime,
    areaChartRef,
    chartRef,
    rollupTableList,
    isRaw,
    onPanelRangeApplied,
}: UseChartRuntimeControllerParams) {
    const [navigateState, setNavigateState] = useState<PanelNavigateState>(
        createInitialPanelNavigateState,
    );
    const navigateStateRef = useRef<PanelNavigateState>(createInitialPanelNavigateState());

    /**
     * Merges a navigate-state patch into both the React state and the imperative ref snapshot.
     * Intent: Keep the hook state and ref snapshot synchronized in one update path.
     * @param aPatch The navigate-state fields to update.
     * @returns Nothing.
     */
    const updateNavigateState = function updateNavigateState(aPatch: Partial<PanelNavigateState>) {
        setNavigateState((aPrev) => {
            const sNext = { ...aPrev, ...aPatch };
            navigateStateRef.current = sNext;
            return sNext;
        });
    };

    const {
        loadedDataRangeRef,
        refreshPanelData,
        skipNextFetchRef,
    } = usePanelChartDataRefresh({
        panelInfo,
        boardTime,
        areaChartRef,
        chartRef,
        rollupTableList,
        navigateStateRef,
        updateNavigateState,
    });

    /**
     * Notifies the outer shell that a panel-range change has fully applied.
     * Intent: Centralize the callback that reports an applied range back to the board shell.
     * @param aPanelRange The final visible panel range.
     * @returns Nothing.
     */
    const notifyPanelRangeApplied = function notifyPanelRangeApplied(aPanelRange: TimeRangeMs) {
        onPanelRangeApplied?.(aPanelRange, {
            navigatorRange: navigateStateRef.current.navigatorRange,
            isRaw,
        });
    };

    /**
     * Applies a visible panel range, reloading chart data when range policy requires it.
     * Intent: Keep range-fetch decisions explicit and state updates in one controller path.
     * @param aPanelRange The next visible panel range.
     * @param aNavigatorRange The next slider overview range.
     * @param aRaw Whether the panel should load raw data.
     * @returns Nothing.
     */
    const applyPanelAndNavigatorRanges = async function applyPanelAndNavigatorRanges(
        aPanelRange: TimeRangeMs,
        aNavigatorRange: TimeRangeMs,
        aRaw = isRaw,
    ) {
        const sDecision = resolvePanelRangeApplicationDecision(
            aPanelRange,
            aNavigatorRange,
            navigateStateRef.current.panelRange,
            navigateStateRef.current.navigatorRange,
            loadedDataRangeRef.current,
        );

        if (!sDecision.shouldApply) {
            return;
        }

        const sPreFetchNavigatorData = navigateStateRef.current.navigatorChartData;

        updateNavigateState({
            panelRange: aPanelRange,
            navigatorRange: aNavigatorRange,
            preOverflowTimeRange: EMPTY_TIME_RANGE,
        });

        if (!sDecision.needsFetch) {
            notifyPanelRangeApplied(aPanelRange);
            return;
        }

        const sRefreshResult = await refreshPanelData(aPanelRange, aRaw, sDecision.dataRange);
        if (sRefreshResult.isStale) {
            return;
        }

        if (!sDecision.navigatorRangeChanged) {
            updateNavigateState({ navigatorChartData: sPreFetchNavigatorData });
        }

        notifyPanelRangeApplied(sRefreshResult.appliedRange);
    };

    /**
     * Tracks slider window changes and stores the new overview range.
     * Intent: Keep the navigator range in sync with the latest slider event.
     * @param aEvent The incoming navigator change event.
     * @returns Nothing.
     */
    const handleNavigatorRangeChange = function handleNavigatorRangeChange(
        aEvent: PanelRangeChangeEvent,
    ) {
        const sNextNavigatorRange = getNavigatorRangeFromEvent(aEvent);
        updateNavigateState({ navigatorRange: sNextNavigatorRange });
    };

    /**
     * Applies a panel zoom or drag-range change and keeps panel data aligned with the visible window.
     * Intent: Convert chart interaction events into shared panel-range updates.
     * @param aEvent The incoming panel range change event.
     * @returns Nothing.
     */
    const handlePanelRangeChange = async function handlePanelRangeChange(
        aEvent: PanelRangeChangeEvent,
    ) {
        if (aEvent.min === undefined || aEvent.max === undefined) return;

        const sNextPanelRange = {
            startTime: aEvent.min,
            endTime: aEvent.max,
        };
        const sCurrentNavigatorRange = navigateStateRef.current.navigatorRange;

        if (skipNextFetchRef.current) {
            skipNextFetchRef.current = false;
            updateNavigateState({ panelRange: sNextPanelRange });
            notifyPanelRangeApplied(sNextPanelRange);
            return;
        }

        await applyPanelAndNavigatorRanges(sNextPanelRange, sCurrentNavigatorRange, undefined);
    };

    /**
     * Applies a panel range and optional navigator range through the shared chart event path.
     * Intent: Reuse the same update flow whether the caller supplies one range or two.
     * @param aPanelRange The next visible panel range.
     * @param aNavigatorRange The next navigator range, when different from the panel range.
     * @returns Nothing.
     */
    const setExtremes = function setExtremes(
        aPanelRange: TimeRangeMs,
        aNavigatorRange: TimeRangeMs | undefined,
    ) {
        void applyPanelAndNavigatorRanges(
            aPanelRange,
            aNavigatorRange ?? navigateStateRef.current.navigatorRange,
            undefined,
        );
    };

    /**
     * Loads a matched panel/slider-range pair for initialization or explicit refresh flows.
     * Intent: Restore or refresh the chart with a paired panel and navigator range.
     * @param aPanelRange The panel range to load.
     * @param aNavigatorRange The navigator range to load.
     * @returns Nothing.
     */
    const applyLoadedRanges = async function applyLoadedRanges(
        aPanelRange: TimeRangeMs,
        aNavigatorRange: TimeRangeMs = aPanelRange,
    ) {
        updateNavigateState({
            panelRange: aPanelRange,
            navigatorRange: aNavigatorRange,
            preOverflowTimeRange: EMPTY_TIME_RANGE,
        });

        const sRefreshResult = await refreshPanelData(aPanelRange, isRaw, aNavigatorRange);
        if (sRefreshResult.isStale) {
            return;
        }

        updateNavigateState({
            panelRange: sRefreshResult.appliedRange,
            navigatorRange: aNavigatorRange,
        });
    };

    return {
        navigateState,
        navigateStateRef,
        updateNavigateState,
        refreshPanelData: (
            aTimeRange: TimeRangeMs | undefined,
            aRaw = isRaw,
            aDataRange: TimeRangeMs | undefined = undefined,
        ) => refreshPanelData(aTimeRange, aRaw, aDataRange),
        handlePanelRangeChange,
        handleNavigatorRangeChange,
        setExtremes,
        applyLoadedRanges,
    };
}
