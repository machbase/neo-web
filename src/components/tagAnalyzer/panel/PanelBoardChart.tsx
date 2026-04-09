import PanelFooter from './PanelFooter';
import PanelHeader from './PanelHeader';
import PanelBody from './PanelBody';
import './Panel.scss';
import { useEffect, useRef, useState } from 'react';
import type { SetStateAction } from 'react';
import { changeUtcToText } from '@/utils/helpers/date';
import { useRecoilValue } from 'recoil';
import { gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import {
    applyFocusedRange,
    applyShiftedNavigatorRangeLeft,
    applyShiftedNavigatorRangeRight,
    applyShiftedPanelRangeLeft,
    applyShiftedPanelRangeRight,
    applyZoomIn,
    applyZoomOut,
    buildPanelPresentationState,
    createPanelTimeKeeperPayload,
    resolveGlobalTimeTargetRange,
    resolveTimeKeeperRanges,
    resolveInitialPanelRange,
    resolveResetTimeRange,
} from './PanelRuntimeUtils';
import type { TagAnalyzerBoardContext, TagAnalyzerBoardPanelActions, TagAnalyzerBoardPanelState } from '../TagAnalyzerTypes';
import type { PanelChartHandle, PanelState } from './TagAnalyzerPanelTypes';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerPanelInfo,
    TagAnalyzerTimeRange,
} from './TagAnalyzerPanelModelTypes';
import { usePanelChartRuntimeController } from './usePanelChartRuntimeController';

// Props for the board-only chart shell that wraps the shared runtime controller.
type PanelBoardChartProps = {
    pPanelInfo: TagAnalyzerPanelInfo;
    pBoardContext: TagAnalyzerBoardContext;
    pChartBoardState: {
        refreshCount: TagAnalyzerBoardPanelState['refreshCount'];
        bgnEndTimeRange: Partial<TagAnalyzerBgnEndTimeRange> | undefined;
        globalTimeRange: TagAnalyzerGlobalTimeRangeState | null;
    };
    pChartBoardActions: {
        onPersistPanelState: TagAnalyzerBoardPanelActions['onPersistPanelState'];
        onSetGlobalTimeRange: TagAnalyzerBoardPanelActions['onSetGlobalTimeRange'];
        onOpenEditRequest: TagAnalyzerBoardPanelActions['onOpenEditRequest'];
    };
    pIsSelectedForOverlap: boolean;
    pIsOverlapAnchor: boolean;
    pOnToggleOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnUpdateOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnDeletePanel: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
};

// Context returned by the shared runtime controller after a panel range has finished applying.
type AppliedBoardPanelRangeContext = {
    navigatorRange: TagAnalyzerTimeRange;
    isRaw: boolean;
};

// Future Refactor Target: this board controller still overlaps heavily with the preview controller.
// Keep the duplicated orchestration visible until we can safely extract a shared controller path.
/**
 * Renders the board panel shell and keeps board-only persistence, overlap, and global-time wiring outside the shared runtime controller.
 * @param pProps The board panel inputs and board-specific action handlers.
 * @returns The board panel card for the current TagAnalyzer panel.
 */
function PanelBoardChart({
    pPanelInfo,
    pBoardContext,
    pChartBoardState,
    pChartBoardActions,
    pIsSelectedForOverlap,
    pIsOverlapAnchor,
    pOnToggleOverlapSelection,
    pOnUpdateOverlapSelection,
    pOnDeletePanel,
}: PanelBoardChartProps) {
    const { meta, data: panelData, time: panelTime, axes: panelAxes, display: panelDisplay } = pPanelInfo;

    // Refs
    const areaChartRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<PanelChartHandle | null>(null);
    const panelFormRef = useRef<HTMLDivElement | null>(null);

    // Global state
    const selectedTab = useRecoilValue(gSelectedTab);
    const rollupTableList = useRecoilValue(gRollupTableList);

    // Local state
    const [panelState, setPanelState] = useState<PanelState>({ ...INITIAL_PANEL_STATE, isRaw: panelData.raw_keeper ?? false });
    const [shouldRefreshAfterEdit, setShouldRefreshAfterEdit] = useState(false);
    const [canOpenFft, setCanOpenFft] = useState(false);

    // Derived
    const boardRange = { range_bgn: pBoardContext.range_bgn, range_end: pBoardContext.range_end };

    /**
     * Builds the reset and initialization inputs shared by the panel time-range helpers.
     * @returns The current board and panel time-resolution inputs.
     */
    function makeResetParams() {
        return {
            boardRange,
            panelData,
            panelTime,
            bgnEndTimeRange: pChartBoardState.bgnEndTimeRange,
            isEdit: false as const,
        };
    }

    /**
     * Persists the applied panel range through the board lane after the shared runtime controller finishes loading.
     * @param aPanelRange The final visible panel range.
     * @param aContext The navigator range and raw-mode context for the applied panel range.
     * @returns Nothing.
     * Side effect: persists time-keeper state and updates the overlap selection window through board callbacks.
     */
    function handlePanelRangeApplied(aPanelRange: TagAnalyzerTimeRange, aContext: AppliedBoardPanelRangeContext) {
        if (panelTime.use_time_keeper === 'Y') {
            pChartBoardActions.onPersistPanelState(
                meta.index_key,
                createPanelTimeKeeperPayload(aPanelRange, aContext.navigatorRange),
                aContext.isRaw,
            );
        }
        pOnUpdateOverlapSelection(aPanelRange.startTime, aPanelRange.endTime, aContext.isRaw);
    }

    const {
        navigateState: navState,
        navigateStateRef,
        refreshNavigatorData,
        refreshPanelData,
        handlePanelRangeChange: onPanelRangeChange,
        handleNavigatorRangeChange: onNavigatorRangeChange,
        setExtremes,
        applyLoadedRanges,
        updateNavigateState,
    } = usePanelChartRuntimeController({
        panelInfo: pPanelInfo,
        boardRange,
        areaChartRef,
        chartRef,
        rollupTableList,
        isRaw: panelState.isRaw,
        onPanelRangeApplied: handlePanelRangeApplied,
    });

    // --- Lifecycle ---

    /**
     * Initializes the board panel from the resolved panel and navigator ranges.
     * @returns Nothing.
     * Side effect: fetches and stores the initial panel and navigator datasets.
     */
    const initialize = async function initialize() {
        if (!panelFormRef.current?.clientWidth) return;

        const resolved = await resolveInitialPanelRange(makeResetParams());
        const keeper = panelTime.use_time_keeper === 'Y' ? resolveTimeKeeperRanges(panelTime.time_keeper) : undefined;
        const range = keeper?.panelRange ?? resolved;
        const nRange = keeper?.navigatorRange ?? range;

        await applyLoadedRanges(range, nRange);
    };

    /**
     * Resets the current panel back to the board-resolved visible range.
     * @returns Nothing.
     * Side effect: routes the reset range back through the shared panel controller.
     */
    const reset = async function reset() {
        if (pBoardContext.id !== selectedTab) return;
        const range = await resolveResetTimeRange(makeResetParams());
        setExtremes(range, range);
    };

    // --- Toggles ---

    /**
     * Toggles drag-select mode and closes the FFT modal when drag-select is disabled.
     * @returns Nothing.
     * Side effect: updates the panel-local selection and FFT modal state.
     */
    const toggleDragSelect = function toggleDragSelect() {
        const nextIsDragSelectActive = !panelState.isDragSelectActive;
        setPanelState((p) => ({
            ...p,
            isDragSelectActive: nextIsDragSelectActive,
            isFFTModal: nextIsDragSelectActive ? p.isFFTModal : false,
        }));
        if (!nextIsDragSelectActive) {
            setCanOpenFft(false);
        }
    };

    /**
     * Applies drag-select state changes reported by the chart body.
     * @param aIsDragSelectActive Whether drag-select should stay active.
     * @param aCanOpenFft Whether the FFT action should be enabled.
     * @returns Nothing.
     * Side effect: updates panel-local drag-select and FFT availability state.
     */
    const handleDragSelectStateChange = function handleDragSelectStateChange(aIsDragSelectActive: boolean, aCanOpenFft: boolean) {
        if (!aIsDragSelectActive) {
            setPanelState((p) => ({ ...p, isDragSelectActive: false }));
        }
        setCanOpenFft(aCanOpenFft);
    };

    /**
     * Toggles raw mode for the board panel and refreshes the affected datasets.
     * @returns Nothing.
     * Side effect: updates panel-local raw state, persists time-keeper state, and triggers panel or navigator reloads.
     */
    const toggleRaw = function toggleRaw() {
        const nextRaw = !panelState.isRaw;
        setPanelState((p) => ({ ...p, isRaw: nextRaw }));

        if (navState.panelRange.startTime) {
            pChartBoardActions.onPersistPanelState(
                meta.index_key,
                createPanelTimeKeeperPayload(navState.panelRange, navState.navigatorRange),
                nextRaw,
            );
        }
        void refreshPanelData(navState.panelRange, nextRaw);
        if (panelAxes.use_sampling) void refreshNavigatorData(undefined, nextRaw);
    };

    /**
     * Toggles overlap selection for single-series panels.
     * @returns Nothing.
     * Side effect: updates the board-managed overlap selection through the supplied callback.
     */
    function handleToggleOverlap() {
        if (panelData.tag_set.length === 1) {
            pOnToggleOverlapSelection(navState.panelRange.startTime, navState.panelRange.endTime, panelState.isRaw);
        }
    }

    /**
     * Opens the FFT modal for the current board panel.
     * @returns Nothing.
     * Side effect: updates the panel-local FFT modal state.
     */
    function handleOpenFft() {
        setPanelState((p) => ({ ...p, isFFTModal: true }));
    }

    /**
     * Broadcasts the current panel range as the shared global time range.
     * @returns Nothing.
     * Side effect: updates board-level global time state through the supplied callback.
     */
    function handleSetGlobalTime() {
        if (!navState.rangeOption) return;
        pChartBoardActions.onSetGlobalTimeRange(
            resolveGlobalTimeTargetRange(navState.preOverflowTimeRange, navState.panelRange),
            navState.navigatorRange,
            navState.rangeOption,
        );
    }

    /**
     * Opens the panel editor for the current board panel.
     * @returns Nothing.
     * Side effect: triggers the board-level edit-request flow.
     */
    function handleOpenEdit() {
        pChartBoardActions.onOpenEditRequest({
            pPanelInfo,
            pNavigatorRange: navState.navigatorRange,
            pSetSaveEditedInfo: setShouldRefreshAfterEdit,
        });
    }

    /**
     * Deletes the current board panel using the board-managed delete callback.
     * @returns Nothing.
     * Side effect: triggers the board-level delete flow with the current visible range.
     */
    function handleDelete() {
        pOnDeletePanel(navState.panelRange.startTime, navState.panelRange.endTime, panelState.isRaw);
    }

    /**
     * Refreshes only the visible main panel data for the current board panel.
     * @returns Nothing.
     * Side effect: triggers a panel-data reload through the shared runtime controller.
     */
    function handleRefreshData() {
        void refreshPanelData(navState.panelRange);
    }

    /**
     * Refreshes the current board panel time range through the reset path.
     * @returns Nothing.
     * Side effect: resolves and applies a fresh board time range.
     */
    function handleRefreshTime() {
        void reset();
    }

    /**
     * Applies a left shift to the current visible panel range.
     * @returns Nothing.
     * Side effect: routes the shifted range back through the shared runtime controller.
     */
    function handleShiftPanelRangeLeft() {
        applyShiftedPanelRangeLeft(setExtremes, navState.panelRange, navState.navigatorRange);
    }

    /**
     * Applies a right shift to the current visible panel range.
     * @returns Nothing.
     * Side effect: routes the shifted range back through the shared runtime controller.
     */
    function handleShiftPanelRangeRight() {
        applyShiftedPanelRangeRight(setExtremes, navState.panelRange, navState.navigatorRange);
    }

    /**
     * Shifts the navigator window left while keeping the panel in sync.
     * @returns Nothing.
     * Side effect: routes the shifted navigator range back through the shared runtime controller.
     */
    function handleShiftNavigatorRangeLeft() {
        applyShiftedNavigatorRangeLeft(setExtremes, navState.panelRange, navState.navigatorRange);
    }

    /**
     * Shifts the navigator window right while keeping the panel in sync.
     * @returns Nothing.
     * Side effect: routes the shifted navigator range back through the shared runtime controller.
     */
    function handleShiftNavigatorRangeRight() {
        applyShiftedNavigatorRangeRight(setExtremes, navState.panelRange, navState.navigatorRange);
    }

    /**
     * Zooms the visible panel window inward.
     * @param aZoom The zoom ratio requested by the footer control.
     * @returns Nothing.
     * Side effect: routes the zoomed range back through the shared runtime controller.
     */
    function handleZoomIn(aZoom: number) {
        applyZoomIn(setExtremes, navState.panelRange, aZoom);
    }

    /**
     * Zooms the visible panel window outward.
     * @param aZoom The zoom ratio requested by the footer control.
     * @returns Nothing.
     * Side effect: routes the zoomed range back through the shared runtime controller.
     */
    function handleZoomOut(aZoom: number) {
        applyZoomOut(setExtremes, navState.panelRange, navState.navigatorRange, aZoom);
    }

    /**
     * Focuses the visible panel range on its middle slice.
     * @returns Nothing.
     * Side effect: routes the focused range back through the shared runtime controller.
     */
    function handleFocusRange() {
        applyFocusedRange(setExtremes, navState.panelRange);
    }

    /**
     * Applies FFT modal state changes coming back from the panel body.
     * @param aValue The next FFT modal state or an updater callback.
     * @returns Nothing.
     * Side effect: updates the panel-local FFT modal state.
     */
    function handleSetIsFftModal(aValue: SetStateAction<boolean>) {
        setPanelState((p) => ({ ...p, isFFTModal: typeof aValue === 'function' ? aValue(p.isFFTModal) : aValue }));
    }

    // --- Composed handler objects ---

    const actionHandlers = {
        onToggleOverlap: handleToggleOverlap,
        onToggleRaw: toggleRaw,
        onToggleDragSelect: toggleDragSelect,
        onOpenFft: handleOpenFft,
        onSetGlobalTime: handleSetGlobalTime,
        onOpenEdit: handleOpenEdit,
        onDelete: handleDelete,
    };

    const presentationState = buildPanelPresentationState({
        title: meta.chart_title,
        panelRange: navState.panelRange,
        rangeOption: navState.rangeOption,
        isEdit: false,
        isRaw: panelState.isRaw,
        isSelectedForOverlap: pIsSelectedForOverlap,
        isOverlapAnchor: pIsOverlapAnchor,
        canToggleOverlap: panelData.tag_set.length === 1,
        isDragSelectActive: panelState.isDragSelectActive,
        canOpenFft,
        canSaveLocal: Boolean(navState.chartData),
        changeUtcToText,
    });

    /**
     * Applies board-driven global time updates onto the shared chart controller.
     * @returns Nothing.
     * Side effect: updates the current navigator option and visible range from board-level global time state.
     */
    function syncGlobalTimeRange() {
        if (!chartRef.current || !pChartBoardState.globalTimeRange) return;
        updateNavigateState({ rangeOption: pChartBoardState.globalTimeRange.interval ?? null });
        setExtremes(pChartBoardState.globalTimeRange.data, pChartBoardState.globalTimeRange.navigator);
    }

    /**
     * Reloads the current panel dataset when the board refresh counter changes.
     * @returns Nothing.
     * Side effect: triggers a panel-data refresh through the shared runtime controller.
     */
    function reloadForBoardRefresh() {
        if (chartRef.current) void refreshPanelData(navState.panelRange);
    }

    /**
     * Reinitializes the panel once after an edit save updates the panel model.
     * @returns Nothing.
     * Side effect: reloads both panel chart layers and clears the post-edit refresh flag.
     */
    function refreshAfterEditSave() {
        if (pBoardContext.id === selectedTab && shouldRefreshAfterEdit) {
            void initialize();
            setShouldRefreshAfterEdit(false);
        }
    }

    /**
     * Resets the panel when board-level begin/end overrides change.
     * @returns Nothing.
     * Side effect: routes a board-driven reset through the shared runtime controller.
     */
    function resetFromBoardRange() {
        if (chartRef.current) void reset();
    }

    /**
     * Lazily initializes the panel when its board tab becomes active and the chart area is mounted.
     * @returns Nothing.
     * Side effect: performs the first panel and navigator load for the active board tab.
     */
    function initializeWhenTabBecomesActive() {
        if (selectedTab === pBoardContext.id && areaChartRef.current && !navigateStateRef.current.navigatorData) {
            void initialize();
        }
    }

    // --- Effects ---

    useEffect(syncGlobalTimeRange, [pChartBoardState.globalTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(reloadForBoardRefresh, [pChartBoardState.refreshCount]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(refreshAfterEditSave, [pPanelInfo]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(resetFromBoardRange, [pChartBoardState.bgnEndTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(initializeWhenTabBecomesActive, [selectedTab]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Render ---

    return (
        <div ref={panelFormRef} className="panel-form" style={{ border: `0.5px solid ${pIsSelectedForOverlap ? '#FDB532' : '#454545'}` }}>
            <PanelHeader
                pPresentationState={presentationState}
                pButtonActionHandlers={actionHandlers}
                pRefreshHandlers={{
                    onRefreshData: handleRefreshData,
                    onRefreshTime: handleRefreshTime,
                }}
                pSavedChartInfo={{ chartData: navState.chartData, chartRef: chartRef }}
            />
            <PanelBody
                pChartRefs={{ areaChart: areaChartRef, chartWrap: chartRef }}
                pChartState={{ axes: panelAxes, display: panelDisplay, useNormalize: pPanelInfo.use_normalize }}
                pPanelState={panelState}
                pNavigateState={navState}
                pChartHandlers={{ onSetExtremes: onPanelRangeChange, onSetNavigatorExtremes: onNavigatorRangeChange }}
                pShiftHandlers={{
                    onShiftPanelRangeLeft: handleShiftPanelRangeLeft,
                    onShiftPanelRangeRight: handleShiftPanelRangeRight,
                }}
                pTagSet={panelData.tag_set}
                pSetIsFFTModal={handleSetIsFftModal}
                pOnDragSelectStateChange={handleDragSelectStateChange}
            />
            <PanelFooter
                pPanelSummary={{ tagCount: panelData.tag_set.length, showLegend: panelDisplay.show_legend }}
                pVisibleRange={navState.panelRange}
                pShiftHandlers={{
                    onShiftNavigatorRangeLeft: handleShiftNavigatorRangeLeft,
                    onShiftNavigatorRangeRight: handleShiftNavigatorRangeRight,
                }}
                pZoomHandlers={{
                    onZoomIn: handleZoomIn,
                    onZoomOut: handleZoomOut,
                    onFocus: handleFocusRange,
                }}
            />
        </div>
    );
}

const INITIAL_PANEL_STATE: PanelState = {
    isRaw: false,
    isFFTModal: false,
    isDragSelectActive: false,
};

export default PanelBoardChart;
