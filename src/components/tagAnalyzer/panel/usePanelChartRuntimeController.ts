import { useRef, useState } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import {
    getExpandedNavigatorRange,
    getNavigatorRangeFromEvent,
    resolveAppliedPanelRange,
    shouldReloadNavigatorData,
} from './PanelRuntimeUtils';
import {
    loadNavigatorChartState,
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

type BoardRange = {
    range_bgn: TagAnalyzerRangeValue;
    range_end: TagAnalyzerRangeValue;
};

type PanelRangeAppliedContext = {
    navigatorRange: TagAnalyzerTimeRange;
    isRaw: boolean;
};

type UsePanelChartRuntimeControllerParams = {
    panelInfo: TagAnalyzerPanelInfo;
    boardRange?: Partial<TagAnalyzerBgnEndTimeRange> | BoardRange;
    areaChartRef: RefObject<HTMLDivElement | null>;
    chartRef: MutableRefObject<PanelChartHandle | null>;
    rollupTableList: string[];
    isRaw: boolean;
    onPanelRangeApplied?: (aPanelRange: TagAnalyzerTimeRange, aContext: PanelRangeAppliedContext) => void;
};

/**
 * Builds the empty navigate state used before any panel data has been loaded.
 * @returns A fresh empty navigate state for the shared chart controller.
 */
export const createInitialPanelNavigateState = (): PanelNavigateState => ({
    chartData: undefined,
    navigatorData: undefined,
    panelRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
    navigatorRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
    rangeOption: null,
    preOverflowTimeRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
});

/**
 * Converts a panel fetch result into the navigate-state patch used by both board and preview charts.
 * @param aResult The resolved panel-chart load state.
 * @param aPanelRange The applied panel range, when one should be stored immediately.
 * @returns The navigate-state patch for the latest panel load.
 */
export const buildNavigateStatePatchFromPanelLoad = (
    aResult: PanelChartLoadState,
    aPanelRange?: TagAnalyzerTimeRange,
): Partial<PanelNavigateState> => {
    return {
        chartData: aResult.chartData.datasets,
        rangeOption: aResult.rangeOption,
        ...(aPanelRange ? { panelRange: aPanelRange } : {}),
        ...(aResult.overflowRange
            ? { panelRange: aResult.overflowRange, preOverflowTimeRange: aResult.overflowRange }
            : { preOverflowTimeRange: EMPTY_TAG_ANALYZER_TIME_RANGE }),
    };
};

/**
 * Shares panel/navigator loading and range orchestration between board and preview chart shells.
 * @param aParams The panel runtime inputs and optional board callback hooks.
 * @returns The shared navigate state plus range and reload handlers for the chart shell.
 */
export const usePanelChartRuntimeController = ({
    panelInfo,
    boardRange,
    areaChartRef,
    chartRef,
    rollupTableList,
    isRaw,
    onPanelRangeApplied,
}: UsePanelChartRuntimeControllerParams) => {
    const [navigateState, setNavigateState] = useState<PanelNavigateState>(createInitialPanelNavigateState);
    const navigateStateRef = useRef<PanelNavigateState>(createInitialPanelNavigateState());
    const skipNextFetchRef = useRef(false);

    /**
     * Merges a navigate-state patch into both the React state and the imperative ref snapshot.
     * @param aPatch The navigate-state fields to update.
     * @returns Nothing.
     */
    const updateNavigateState = (aPatch: Partial<PanelNavigateState>) => {
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
     */
    const notifyPanelRangeApplied = (aPanelRange: TagAnalyzerTimeRange) => {
        onPanelRangeApplied?.(aPanelRange, {
            navigatorRange: navigateStateRef.current.navigatorRange,
            isRaw,
        });
    };

    /**
     * Reloads the navigator dataset for the requested overview range.
     * @param aTimeRange The navigator window to load, when overriding the current one.
     * @param aRaw Whether the navigator should load raw data.
     * @returns Nothing.
     */
    const refreshNavigatorData = async (aTimeRange?: TagAnalyzerTimeRange, aRaw = isRaw) => {
        updateNavigateState({
            navigatorData: await loadNavigatorChartState({
                panelInfo,
                boardRange,
                chartWidth: areaChartRef.current?.clientWidth,
                isRaw: aRaw,
                timeRange: aTimeRange,
                rollupTableList,
            }),
        });
    };

    /**
     * Reloads the main panel dataset and reapplies any overflow-clamped visible range.
     * @param aTimeRange The panel window to load, when overriding the current one.
     * @param aRaw Whether the panel should load raw data.
     * @returns The panel range that was actually applied after any overflow clamp.
     */
    const refreshPanelData = async (aTimeRange?: TagAnalyzerTimeRange, aRaw = isRaw): Promise<TagAnalyzerTimeRange> => {
        const sRequestedRange = aTimeRange ?? navigateStateRef.current.panelRange;
        const sLoadState = await loadPanelChartState({
            panelInfo,
            boardRange,
            chartWidth: areaChartRef.current?.clientWidth,
            isRaw: aRaw,
            timeRange: aTimeRange,
            rollupTableList,
        });
        const sAppliedRange = resolveAppliedPanelRange(sRequestedRange, sLoadState.overflowRange);

        updateNavigateState(buildNavigateStatePatchFromPanelLoad(sLoadState, sAppliedRange));
        if (sLoadState.overflowRange) {
            skipNextFetchRef.current = true;
            chartRef.current?.setPanelRange(sLoadState.overflowRange);
        }

        return sAppliedRange;
    };

    /**
     * Tracks navigator window changes and reloads overview data only when the slice truly changes.
     * @param aEvent The incoming navigator change event.
     * @returns Nothing.
     */
    const handleNavigatorRangeChange = (aEvent: PanelRangeChangeEvent) => {
        const sCurrentNavigatorRange = navigateStateRef.current.navigatorRange;
        const sNextNavigatorRange = getNavigatorRangeFromEvent(aEvent);
        updateNavigateState({ navigatorRange: sNextNavigatorRange });
        if (shouldReloadNavigatorData(sNextNavigatorRange, sCurrentNavigatorRange)) {
            void refreshNavigatorData(sNextNavigatorRange);
        }
    };

    /**
     * Applies a panel zoom or drag-range change and keeps panel data aligned with the visible window.
     * @param aEvent The incoming panel range change event.
     * @returns Nothing.
     */
    const handlePanelRangeChange = async (aEvent: PanelRangeChangeEvent) => {
        if (aEvent.min === undefined || aEvent.max === undefined) return;

        const sNextPanelRange = createTagAnalyzerTimeRange(aEvent.min, aEvent.max);
        const sExpandedNavigatorRange = getExpandedNavigatorRange(aEvent, navigateStateRef.current.navigatorRange);
        if (sExpandedNavigatorRange) {
            handleNavigatorRangeChange({
                min: sExpandedNavigatorRange.startTime,
                max: sExpandedNavigatorRange.endTime,
            });
        }

        if (skipNextFetchRef.current) {
            skipNextFetchRef.current = false;
            updateNavigateState({ panelRange: sNextPanelRange });
            notifyPanelRangeApplied(sNextPanelRange);
            return;
        }

        const sAppliedRange = await refreshPanelData(sNextPanelRange);
        notifyPanelRangeApplied(sAppliedRange);
    };

    /**
     * Applies a panel range and optional navigator range through the shared chart event path.
     * @param aPanelRange The next visible panel range.
     * @param aNavigatorRange The next navigator range, when different from the panel range.
     * @returns Nothing.
     */
    const setExtremes = (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange?: TagAnalyzerTimeRange) => {
        if (aNavigatorRange) {
            handleNavigatorRangeChange({
                min: aNavigatorRange.startTime,
                max: aNavigatorRange.endTime,
            });
        }

        void handlePanelRangeChange({
            min: aPanelRange.startTime,
            max: aPanelRange.endTime,
            trigger: 'dataZoom',
        });
    };

    /**
     * Loads a matched panel/navigator pair for initialization or explicit refresh flows.
     * @param aPanelRange The panel range to load.
     * @param aNavigatorRange The navigator range to load.
     * @returns Nothing.
     */
    const applyLoadedRanges = async (
        aPanelRange: TagAnalyzerTimeRange,
        aNavigatorRange: TagAnalyzerTimeRange = aPanelRange,
    ) => {
        await refreshPanelData(aPanelRange);
        await refreshNavigatorData(aNavigatorRange);
        updateNavigateState({ navigatorRange: aNavigatorRange });
    };

    return {
        navigateState,
        navigateStateRef,
        updateNavigateState,
        refreshNavigatorData,
        refreshPanelData,
        handlePanelRangeChange,
        handleNavigatorRangeChange,
        setExtremes,
        applyLoadedRanges,
    };
};
