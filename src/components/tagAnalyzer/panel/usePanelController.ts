import { useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { getNavigatorRangeFromEvent } from './PanelRangeMath';
import {
    createTagAnalyzerTimeRange,
    EMPTY_TAG_ANALYZER_TIME_RANGE,
    isSameTimeRange,
} from '../utils/TagAnalyzerDateUtils';
import {
    loadPanelChartState,
    // Used by usePanelChartRuntimeController to type chart load state.
    type PanelChartLoadState,
} from '../utils/TagAnalyzerFetchUtils';
import type {
    PanelChartHandle,
    PanelNavigateState,
    PanelRangeChangeEvent,
} from './PanelModel';
import type {
    ValueRange,
    PanelInfo,
    TimeRangeConfig,
    TimeRange,
} from '../common/modelTypes';

// Context passed back to board shells after a visible panel range has fully applied.
// Used by usePanelChartRuntimeController to type range applied context.
type PanelRangeAppliedContext = {
    navigatorRange: TimeRange;
    isRaw: boolean;
};

// Used by usePanelChartRuntimeController to type refresh result.
type PanelRefreshResult = {
    appliedRange: TimeRange;
    isStale: boolean;
};

// Input contract for the shared board/preview panel runtime controller hook.
// Used by usePanelChartRuntimeController to type use panel chart runtime controller params.
type UsePanelChartRuntimeControllerParams = {
    panelInfo: PanelInfo;
    boardRange: ValueRange | undefined;
    boardRangeConfig?: TimeRangeConfig | undefined;
    areaChartRef: MutableRefObject<HTMLDivElement | null>;
    chartRef: MutableRefObject<PanelChartHandle | null>;
    rollupTableList: string[];
    isRaw: boolean;
    onPanelRangeApplied:
        | ((aPanelRange: TimeRange, aContext: PanelRangeAppliedContext) => void)
        | undefined;
};

/**
 * Builds the empty navigate state used before any panel data has been loaded.
 * @returns A fresh empty navigate state for the shared chart controller.
 */
export function createInitialPanelNavigateState(): PanelNavigateState {
    return {
        chartData: [],
        navigatorChartData: [],
        panelRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
        navigatorRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
        rangeOption: undefined,
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
    aPanelRange: TimeRange | undefined,
): Partial<PanelNavigateState> {
    return {
        chartData: aResult.chartData.datasets,
        navigatorChartData: aResult.chartData.datasets,
        rangeOption: aResult.rangeOption,
        ...(aPanelRange ? { panelRange: aPanelRange } : {}),
        ...(aResult.overflowRange
            ? { panelRange: aResult.overflowRange, preOverflowTimeRange: aResult.overflowRange }
            : { preOverflowTimeRange: EMPTY_TAG_ANALYZER_TIME_RANGE }),
    };
}

/**
 * Shares panel and slider-range orchestration between board and preview chart shells.
 * @param panelInfo The current panel info supplying chart data, time, and display settings.
 * @param boardRange The optional board-level time override.
 * @param areaChartRef The measured chart container ref used for width calculations.
 * @param chartRef The imperative chart ref used for range synchronization.
 * @param rollupTableList The available rollup tables used during data fetches.
 * @param isRaw Whether the panel should currently load raw data.
 * @param onPanelRangeApplied The optional callback notified after a range is fully applied.
 * @returns The shared navigate state plus range and reload handlers for the chart shell.
 */
export function usePanelChartRuntimeController({
    panelInfo,
    boardRange,
    boardRangeConfig,
    areaChartRef,
    chartRef,
    rollupTableList,
    isRaw,
    onPanelRangeApplied,
}: UsePanelChartRuntimeControllerParams) {
    const [navigateState, setNavigateState] = useState<PanelNavigateState>(
        createInitialPanelNavigateState,
    );
    const navigateStateRef = useRef<PanelNavigateState>(createInitialPanelNavigateState());
    const skipNextFetchRef = useRef(false);
    const panelLoadRequestIdRef = useRef(0);
    const loadedDataRangeRef = useRef<TimeRange>(EMPTY_TAG_ANALYZER_TIME_RANGE);


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
    const notifyPanelRangeApplied = function notifyPanelRangeApplied(aPanelRange: TimeRange) {
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
        aTimeRange: TimeRange | undefined,
        aRaw = isRaw,
        aDataRange: TimeRange | undefined,
    ): Promise<PanelRefreshResult> {
        const sRequestedRange = aTimeRange ?? navigateStateRef.current.panelRange;
        const sLoadedDataRange = aDataRange ?? sRequestedRange;
        const sRequestId = ++panelLoadRequestIdRef.current;
        const sLoadState = await loadPanelChartState({
            panelData: panelInfo.data,
            panelTime: panelInfo.time,
            panelAxes: panelInfo.axes,
            boardRange,
            boardRangeConfig,
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

        const sAppliedRange = sLoadState.overflowRange ?? sRequestedRange;
        loadedDataRangeRef.current = sLoadedDataRange;

        updateNavigateState(buildNavigateStatePatchFromPanelLoad(sLoadState, undefined));
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
     * Applies a visible panel range, reloading chart data when the visible window
     * zooms (width changes) or escapes the currently loaded data range.
     * @param aPanelRange The next visible panel range.
     * @param aNavigatorRange The next slider overview range.
     * @param aRaw Whether the panel should load raw data.
     * @returns Nothing.
     * Side effect: updates shared navigate state, may fetch chart data, and notifies the outer shell.
     */
    const applyPanelAndNavigatorRanges = async function applyPanelAndNavigatorRanges(
        aPanelRange: TimeRange,
        aNavigatorRange: TimeRange,
        aRaw = isRaw,
    ) {
        const sNavigatorRangeChanged = !isSameTimeRange(
            aNavigatorRange,
            navigateStateRef.current.navigatorRange,
        );

        // Detect zoom: the visible range width changed without an explicit navigator update.
        const sPrevWidth =
            navigateStateRef.current.panelRange.endTime -
            navigateStateRef.current.panelRange.startTime;
        const sNextWidth = aPanelRange.endTime - aPanelRange.startTime;
        const sVisibleRangeZoomed =
            !sNavigatorRangeChanged &&
            sPrevWidth > 0 &&
            Math.abs(sNextWidth - sPrevWidth) / sPrevWidth > 0.01;

        // Detect pan outside loaded data: after a zoom scoped data to a narrow
        // range, panning away needs fresh data for the new visible window.
        const sLoaded = loadedDataRangeRef.current;
        const sPanelEscapedLoadedData =
            !sNavigatorRangeChanged &&
            sLoaded.startTime > 0 &&
            (aPanelRange.startTime < sLoaded.startTime || aPanelRange.endTime > sLoaded.endTime);

        const sNeedsFetch =
            sNavigatorRangeChanged || sVisibleRangeZoomed || sPanelEscapedLoadedData;

        // Snapshot the current navigator overview data before the fetch replaces it.
        // When only the panel range changed, the navigator preview should keep showing
        // the full overview while the main chart gets finer-resolution data.
        const sPreFetchNavigatorData = navigateStateRef.current.navigatorChartData;

        updateNavigateState({
            panelRange: aPanelRange,
            navigatorRange: aNavigatorRange,
            preOverflowTimeRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
        });

        if (!sNeedsFetch) {
            notifyPanelRangeApplied(aPanelRange);
            return;
        }

        // When the navigator range changed explicitly (zoom-out escaping bounds,
        // shift, etc.), fetch the full navigator range as before.
        // Otherwise fetch only the visible panel range for finer resolution.
        const sDataRange = sNavigatorRangeChanged ? aNavigatorRange : aPanelRange;
        const sRefreshResult = await refreshPanelData(aPanelRange, aRaw, sDataRange);
        if (sRefreshResult.isStale) {
            return;
        }

        // For zoom-scoped fetches, keep the original overview data in the navigator
        // so the slider preview still shows the full range.
        if (!sNavigatorRangeChanged) {
            updateNavigateState({ navigatorChartData: sPreFetchNavigatorData });
        }

        notifyPanelRangeApplied(sRefreshResult.appliedRange);
    };

    /**
     * Tracks slider window changes and stores the new overview range.
     * @param aEvent The incoming navigator change event.
     * @returns Nothing.
     * Side effect: updates the stored slider range for later panel zoom calculations.
     */
    const handleNavigatorRangeChange = function handleNavigatorRangeChange(
        aEvent: PanelRangeChangeEvent,
    ) {
        const sNextNavigatorRange = getNavigatorRangeFromEvent(aEvent);
        updateNavigateState({ navigatorRange: sNextNavigatorRange });
    };

    /**
     * Applies a panel zoom or drag-range change and keeps panel data aligned with the visible window.
     * @param aEvent The incoming panel range change event.
     * @returns Nothing.
     * Side effect: updates panel state, may fetch new panel data, and may notify the outer shell about the applied range.
     */
    const handlePanelRangeChange = async function handlePanelRangeChange(
        aEvent: PanelRangeChangeEvent,
    ) {
        if (aEvent.min === undefined || aEvent.max === undefined) return;

        const sNextPanelRange = createTagAnalyzerTimeRange(aEvent.min, aEvent.max);
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
     * @param aPanelRange The next visible panel range.
     * @param aNavigatorRange The next navigator range, when different from the panel range.
     * @returns Nothing.
     * Side effect: routes the supplied ranges through the shared navigator and panel update handlers.
     */
    const setExtremes = function setExtremes(
        aPanelRange: TimeRange,
        aNavigatorRange: TimeRange | undefined,
    ) {
        void applyPanelAndNavigatorRanges(
            aPanelRange,
            aNavigatorRange ?? navigateStateRef.current.navigatorRange,
            undefined,
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
        aPanelRange: TimeRange,
        aNavigatorRange: TimeRange = aPanelRange,
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
