import { useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import {
    getNavigatorRangeFromEvent,
    resolveAppliedPanelRange,
} from './PanelRuntimeUtils';
import {
    loadPanelChartState,
    type PanelChartLoadState,
} from './PanelFetchUtils';
import { EMPTY_TAG_ANALYZER_TIME_RANGE, createTagAnalyzerTimeRange } from './PanelModelUtils';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerPanelInfo,
    TagAnalyzerRangeValue,
    TagAnalyzerTimeRange,
} from './TagAnalyzerPanelModelTypes';
import type { PanelChartHandle, PanelNavigateState, PanelRangeChangeEvent } from './TagAnalyzerPanelTypes';

// Board-level range values reused by the shared panel runtime loader.
type BoardRange = {
    range_bgn: TagAnalyzerRangeValue;
    range_end: TagAnalyzerRangeValue;
};

// Context passed back to board shells after a visible panel range has fully applied.
type PanelRangeAppliedContext = {
    navigatorRange: TagAnalyzerTimeRange;
    isRaw: boolean;
};

type PanelRefreshResult = {
    appliedRange: TagAnalyzerTimeRange;
    isStale: boolean;
};

/**
 * Returns whether the next slider range matches the current stored overview range.
 * @param aLeft The first slider range to compare.
 * @param aRight The second slider range to compare.
 * @returns Whether both slider ranges are equal.
 */
function isSameTimeRange(aLeft: TagAnalyzerTimeRange, aRight: TagAnalyzerTimeRange): boolean {
    return aLeft.startTime === aRight.startTime && aLeft.endTime === aRight.endTime;
}

/**
 * Narrows board ranges down to the persisted range shape the fetch helpers understand.
 * @param aBoardRange The incoming board range from callers.
 * @returns Whether the value has board-style range boundaries.
 */
function isBoardRangeValue(
    aBoardRange: Partial<TagAnalyzerBgnEndTimeRange> | BoardRange | undefined,
): aBoardRange is BoardRange {
    return (
        aBoardRange !== undefined &&
        'range_bgn' in aBoardRange &&
        'range_end' in aBoardRange
    );
}

// Input contract for the shared board/preview panel runtime controller hook.
type UsePanelChartRuntimeControllerParams = {
    panelInfo: TagAnalyzerPanelInfo;
    boardRange?: Partial<TagAnalyzerBgnEndTimeRange> | BoardRange;
    areaChartRef: MutableRefObject<HTMLDivElement | null>;
    chartRef: MutableRefObject<PanelChartHandle | null>;
    rollupTableList: string[];
    isRaw: boolean;
    onPanelRangeApplied?: (aPanelRange: TagAnalyzerTimeRange, aContext: PanelRangeAppliedContext) => void;
};

/**
 * Builds the empty navigate state used before any panel data has been loaded.
 * @returns A fresh empty navigate state for the shared chart controller.
 */
export function createInitialPanelNavigateState(): PanelNavigateState {
    return {
        chartData: undefined,
        panelRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
        navigatorRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
        rangeOption: null,
        preOverflowTimeRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
    };
}

/**
 * Converts a panel fetch result into the navigate-state patch used by both board and preview charts.
 * @param aResult The resolved panel-chart load state.
 * @param aPanelRange The applied panel range, when one should be stored immediately.
 * @returns The navigate-state patch for the latest panel load.
 */
export function buildNavigateStatePatchFromPanelLoad(
    aResult: PanelChartLoadState,
    aPanelRange?: TagAnalyzerTimeRange,
): Partial<PanelNavigateState> {
    return {
        chartData: aResult.chartData.datasets,
        rangeOption: aResult.rangeOption,
        ...(aPanelRange ? { panelRange: aPanelRange } : {}),
        ...(aResult.overflowRange
            ? { panelRange: aResult.overflowRange, preOverflowTimeRange: aResult.overflowRange }
            : { preOverflowTimeRange: EMPTY_TAG_ANALYZER_TIME_RANGE }),
    };
}

/**
 * Shares panel and slider-range orchestration between board and preview chart shells.
 * @param aParams The panel runtime inputs and optional board callback hooks.
 * @returns The shared navigate state plus range and reload handlers for the chart shell.
 */
export function usePanelChartRuntimeController({
    panelInfo,
    boardRange,
    areaChartRef,
    chartRef,
    rollupTableList,
    isRaw,
    onPanelRangeApplied,
}: UsePanelChartRuntimeControllerParams) {
    const [navigateState, setNavigateState] = useState<PanelNavigateState>(createInitialPanelNavigateState);
    const navigateStateRef = useRef<PanelNavigateState>(createInitialPanelNavigateState());
    const skipNextFetchRef = useRef(false);
    const panelLoadRequestIdRef = useRef(0);
    const persistedBoardRange = isBoardRangeValue(boardRange) ? boardRange : undefined;

    /**
     * Merges a navigate-state patch into both the React state and the imperative ref snapshot.
     * @param aPatch The navigate-state fields to update.
     * @returns Nothing.
     * Side effect: updates both the React navigate state and the imperative ref snapshot.
     */
    const updateNavigateState = function updateNavigateState(aPatch: Partial<PanelNavigateState>) {
        setNavigateState((aPrev) => {
            const sNext = { ...aPrev, ...aPatch };
            navigateStateRef.current = sNext;
            return sNext;
        });
    };

    /**
     * Notifies the outer shell that a panel-range change has fully applied.
     * @param aPanelRange The final visible panel range.
     * @returns Nothing.
     * Side effect: may trigger board-level persistence or overlap updates through the callback.
     */
    const notifyPanelRangeApplied = function notifyPanelRangeApplied(aPanelRange: TagAnalyzerTimeRange) {
        onPanelRangeApplied?.(aPanelRange, {
            navigatorRange: navigateStateRef.current.navigatorRange,
            isRaw,
        });
    };

    /**
     * Reloads the main panel dataset and reapplies any overflow-clamped visible range.
     * @param aTimeRange The visible panel window to apply after the fetch.
     * @param aRaw Whether the panel should load raw data.
     * @param aDataRange The chart-data range to load behind the current visible panel window.
     * @returns The panel range that was actually applied after any overflow clamp.
     * Side effect: fetches panel data, updates shared navigate state, and may push a clamped range into the live chart instance.
     */
    const refreshPanelData = async function refreshPanelData(
        aTimeRange?: TagAnalyzerTimeRange,
        aRaw = isRaw,
        aDataRange?: TagAnalyzerTimeRange,
    ): Promise<PanelRefreshResult> {
        const sRequestedRange = aTimeRange ?? navigateStateRef.current.panelRange;
        const sLoadedDataRange = aDataRange ?? sRequestedRange;
        const sRequestId = ++panelLoadRequestIdRef.current;
        const sLoadState = await loadPanelChartState({
            panelInfo,
            boardRange: persistedBoardRange,
            chartWidth: areaChartRef.current?.clientWidth,
            isRaw: aRaw,
            timeRange: sLoadedDataRange,
            rollupTableList,
        });

        if (sRequestId !== panelLoadRequestIdRef.current) {
            return {
                appliedRange: navigateStateRef.current.panelRange,
                isStale: true,
            };
        }

        const sAppliedRange = resolveAppliedPanelRange(sRequestedRange, sLoadState.overflowRange);

        updateNavigateState(buildNavigateStatePatchFromPanelLoad(sLoadState));
        if (sLoadState.overflowRange) {
            skipNextFetchRef.current = true;
            chartRef.current?.setPanelRange(sLoadState.overflowRange);
        }

        return {
            appliedRange: sAppliedRange,
            isStale: false,
        };
    };

    /**
     * Applies a visible panel range, only reloading chart data when the slider overview window changes.
     * @param aPanelRange The next visible panel range.
     * @param aNavigatorRange The next slider overview range.
     * @param aRaw Whether the panel should load raw data.
     * @returns Nothing.
     * Side effect: updates shared navigate state, may fetch chart data for a new slider range, and notifies the outer shell.
     */
    const applyPanelAndNavigatorRanges = async function applyPanelAndNavigatorRanges(
        aPanelRange: TagAnalyzerTimeRange,
        aNavigatorRange: TagAnalyzerTimeRange,
        aRaw = isRaw,
    ) {
        const sNavigatorRangeChanged = !isSameTimeRange(aNavigatorRange, navigateStateRef.current.navigatorRange);

        updateNavigateState({
            panelRange: aPanelRange,
            navigatorRange: aNavigatorRange,
            preOverflowTimeRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
        });

        if (!sNavigatorRangeChanged) {
            notifyPanelRangeApplied(aPanelRange);
            return;
        }

        const sRefreshResult = await refreshPanelData(aPanelRange, aRaw, aNavigatorRange);
        if (sRefreshResult.isStale) {
            return;
        }

        notifyPanelRangeApplied(sRefreshResult.appliedRange);
    };

    /**
     * Tracks slider window changes and stores the new overview range.
     * @param aEvent The incoming navigator change event.
     * @returns Nothing.
     * Side effect: updates the stored slider range for later panel zoom calculations.
     */
    const handleNavigatorRangeChange = function handleNavigatorRangeChange(aEvent: PanelRangeChangeEvent) {
        const sNextNavigatorRange = getNavigatorRangeFromEvent(aEvent);
        updateNavigateState({ navigatorRange: sNextNavigatorRange });
    };

    /**
     * Applies a panel zoom or drag-range change and keeps panel data aligned with the visible window.
     * @param aEvent The incoming panel range change event.
     * @returns Nothing.
     * Side effect: updates panel state, may fetch new panel data, and may notify the outer shell about the applied range.
     */
    const handlePanelRangeChange = async function handlePanelRangeChange(aEvent: PanelRangeChangeEvent) {
        if (aEvent.min === undefined || aEvent.max === undefined) return;

        const sNextPanelRange = createTagAnalyzerTimeRange(aEvent.min, aEvent.max);
        const sCurrentNavigatorRange = navigateStateRef.current.navigatorRange;

        if (skipNextFetchRef.current) {
            skipNextFetchRef.current = false;
            updateNavigateState({ panelRange: sNextPanelRange });
            notifyPanelRangeApplied(sNextPanelRange);
            return;
        }

        await applyPanelAndNavigatorRanges(sNextPanelRange, sCurrentNavigatorRange);
    };

    /**
     * Applies a panel range and optional navigator range through the shared chart event path.
     * @param aPanelRange The next visible panel range.
     * @param aNavigatorRange The next navigator range, when different from the panel range.
     * @returns Nothing.
     * Side effect: routes the supplied ranges through the shared navigator and panel update handlers.
     */
    const setExtremes = function setExtremes(aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) {
        void applyPanelAndNavigatorRanges(
            aPanelRange,
            aNavigatorRange ?? navigateStateRef.current.navigatorRange,
        );
    };

    /**
     * Loads a matched panel/slider-range pair for initialization or explicit refresh flows.
     * @param aPanelRange The panel range to load.
     * @param aNavigatorRange The navigator range to load.
     * @returns Nothing.
     * Side effect: fetches panel data and stores the resolved slider range in shared state.
     */
    const applyLoadedRanges = async function applyLoadedRanges(
        aPanelRange: TagAnalyzerTimeRange,
        aNavigatorRange: TagAnalyzerTimeRange = aPanelRange,
    ) {
        updateNavigateState({
            panelRange: aPanelRange,
            navigatorRange: aNavigatorRange,
            preOverflowTimeRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
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
        refreshPanelData,
        handlePanelRangeChange,
        handleNavigatorRangeChange,
        setExtremes,
        applyLoadedRanges,
    };
}
