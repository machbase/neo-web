import { useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { getNavigatorRangeFromEvent } from '../utils/time/PanelRangeControlLogic';
import { EMPTY_TIME_RANGE } from '../utils/time/constants/TimeRangeConstants';
import type {
    PanelChartHandle,
    PanelRangeAppliedContext,
    PanelNavigateState,
    PanelRangeChangeEvent,
} from '../utils/panelRuntimeTypes';
import type { PanelInfo } from '../utils/panelModelTypes';
import type { InputTimeBounds, TimeRangeMs } from '../utils/time/types/TimeTypes';
import { INITIAL_PANEL_NAVIGATE_STATE } from './ChartRuntimeConstants';
import {
    resolvePanelRangeApplicationDecision,
} from './PanelChartRangePolicy';
import { usePanelChartDataRefresh } from './usePanelChartDataRefresh';

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
        | ((panelRange: TimeRangeMs, context: PanelRangeAppliedContext) => void)
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
        INITIAL_PANEL_NAVIGATE_STATE,
    );
    const navigateStateRef = useRef<PanelNavigateState>(INITIAL_PANEL_NAVIGATE_STATE);

    /**
     * Merges a navigate-state patch into both the React state and the imperative ref snapshot.
     * Intent: Keep the hook state and ref snapshot synchronized in one update path.
     * @param patch The navigate-state fields to update.
     * @returns Nothing.
     */
    const updateNavigateState = function updateNavigateState(patch: Partial<PanelNavigateState>) {
        setNavigateState((prev) => {
            const sNext = { ...prev, ...patch };
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
     * @param panelRange The final visible panel range.
     * @returns Nothing.
     */
    const notifyPanelRangeApplied = function notifyPanelRangeApplied(panelRange: TimeRangeMs) {
        onPanelRangeApplied?.(panelRange, {
            navigatorRange: navigateStateRef.current.navigatorRange,
            isRaw,
        });
    };

    /**
     * Applies a visible panel range, reloading chart data when range policy requires it.
     * Intent: Keep range-fetch decisions explicit and state updates in one controller path.
     * @param panelRange The next visible panel range.
     * @param navigatorRange The next slider overview range.
     * @param raw Whether the panel should load raw data.
     * @returns Nothing.
     */
    const applyPanelAndNavigatorRanges = async function applyPanelAndNavigatorRanges(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
        raw = isRaw,
    ) {
        const sDecision = resolvePanelRangeApplicationDecision(
            panelRange,
            navigatorRange,
            navigateStateRef.current.panelRange,
            navigateStateRef.current.navigatorRange,
            loadedDataRangeRef.current,
        );

        if (!sDecision.shouldApply) {
            return;
        }

        const sPreFetchNavigatorData = navigateStateRef.current.navigatorChartData;

        updateNavigateState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
            preOverflowTimeRange: EMPTY_TIME_RANGE,
        });

        if (!sDecision.needsFetch) {
            notifyPanelRangeApplied(panelRange);
            return;
        }

        const sRefreshResult = await refreshPanelData(panelRange, raw, sDecision.dataRange);
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
     * @param event The incoming navigator change event.
     * @returns Nothing.
     */
    const handleNavigatorRangeChange = function handleNavigatorRangeChange(
        event: PanelRangeChangeEvent,
    ) {
        const sNextNavigatorRange = getNavigatorRangeFromEvent(event);
        updateNavigateState({ navigatorRange: sNextNavigatorRange });
    };

    /**
     * Applies a panel zoom or drag-range change and keeps panel data aligned with the visible window.
     * Intent: Convert chart interaction events into shared panel-range updates.
     * @param event The incoming panel range change event.
     * @returns Nothing.
     */
    const handlePanelRangeChange = async function handlePanelRangeChange(
        event: PanelRangeChangeEvent,
    ) {
        if (event.min === undefined || event.max === undefined) return;

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

        await applyPanelAndNavigatorRanges(sNextPanelRange, sCurrentNavigatorRange, undefined);
    };

    /**
     * Applies a panel range and optional navigator range through the shared chart event path.
     * Intent: Reuse the same update flow whether the caller supplies one range or two.
     * @param panelRange The next visible panel range.
     * @param navigatorRange The next navigator range, when different from the panel range.
     * @returns Nothing.
     */
    const setExtremes = function setExtremes(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs | undefined,
    ) {
        void applyPanelAndNavigatorRanges(
            panelRange,
            navigatorRange ?? navigateStateRef.current.navigatorRange,
            undefined,
        );
    };

    /**
     * Loads a matched panel/slider-range pair for initialization or explicit refresh flows.
     * Intent: Restore or refresh the chart with a paired panel and navigator range.
     * @param panelRange The panel range to load.
     * @param navigatorRange The navigator range to load.
     * @returns Nothing.
     */
    const applyLoadedRanges = async function applyLoadedRanges(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs = panelRange,
    ) {
        updateNavigateState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
            preOverflowTimeRange: EMPTY_TIME_RANGE,
        });

        const sRefreshResult = await refreshPanelData(panelRange, isRaw, navigatorRange);
        if (sRefreshResult.isStale) {
            return;
        }

        updateNavigateState({
            panelRange: sRefreshResult.appliedRange,
            navigatorRange: navigatorRange,
        });
    };

    return {
        navigateState,
        navigateStateRef,
        updateNavigateState,
        refreshPanelData: (
            timeRange: TimeRangeMs | undefined,
            raw = isRaw,
            dataRange: TimeRangeMs | undefined = undefined,
        ) => refreshPanelData(timeRange, raw, dataRange),
        handlePanelRangeChange,
        handleNavigatorRangeChange,
        setExtremes,
        applyLoadedRanges,
    };
}
