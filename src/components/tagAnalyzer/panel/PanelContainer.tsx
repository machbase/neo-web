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
    buildPanelPresentationState,
    createPanelRangeControlHandlers,
    createPanelTimeKeeperPayload,
    resolveGlobalTimeTargetRange,
    resolveTimeKeeperRanges,
    resolveInitialPanelRange,
    resolveResetTimeRange,
} from './PanelRangeUtils';
import type {
    TagAnalyzerBoardContext,
    BoardPanelActions,
    TagAnalyzerBoardPanelState,
} from '../TagAnalyzerTypes';
import type {
    PanelChartHandle,
    PanelState,
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerPanelInfo,
    TimeRange,
} from './PanelModel';
import { usePanelChartRuntimeController } from './usePanelController';

// Props for the board-only chart shell that wraps the shared runtime controller.
// Used by PanelContainer to type component props.
type PanelContainerProps = {
    pPanelInfo: TagAnalyzerPanelInfo;
    pBoardContext: TagAnalyzerBoardContext;
    pChartBoardState: {
        refreshCount: TagAnalyzerBoardPanelState['refreshCount'];
        bgnEndTimeRange: TagAnalyzerBgnEndTimeRange | undefined;
        globalTimeRange: TagAnalyzerGlobalTimeRangeState | null;
    };
    pChartBoardActions: {
        onPersistPanelState: BoardPanelActions['onPersistPanelState'];
        onSetGlobalTimeRange: BoardPanelActions['onSetGlobalTimeRange'];
        onOpenEditRequest: BoardPanelActions['onOpenEditRequest'];
    };
    pIsSelectedForOverlap: boolean;
    pIsOverlapAnchor: boolean;
    pOnToggleOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnUpdateOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnDeletePanel: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
};

// Context returned by the shared runtime controller after a panel range has finished applying.
// Used by PanelContainer to type applied board panel range context.
type AppliedBoardPanelRangeContext = {
    navigatorRange: TimeRange;
    isRaw: boolean;
};

// Future Refactor Target: this board controller still overlaps heavily with the preview controller.
// Keep the duplicated orchestration visible until we can safely extract a shared controller path.
/**
 * Renders the board panel shell and keeps board-only persistence, overlap, and global-time wiring outside the shared runtime controller.
 * @param pProps The board panel inputs and board-specific action handlers.
 * @returns The board panel card for the current TagAnalyzer panel.
 */
function PanelContainer({
    pPanelInfo,
    pBoardContext,
    pChartBoardState,
    pChartBoardActions,
    pIsSelectedForOverlap,
    pIsOverlapAnchor,
    pOnToggleOverlapSelection,
    pOnUpdateOverlapSelection,
    pOnDeletePanel,
}: PanelContainerProps) {
    const {
        meta,
        data: panelData,
        time: panelTime,
        axes: panelAxes,
        display: panelDisplay,
    } = pPanelInfo;

    // Refs
    const areaChartRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<PanelChartHandle | null>(null);
    const panelFormRef = useRef<HTMLDivElement | null>(null);

    // Global state
    const selectedTab = useRecoilValue(gSelectedTab);
    const rollupTableList = useRecoilValue(gRollupTableList);

    // Local state
    const [panelState, setPanelState] = useState<PanelState>({
        ...INITIAL_PANEL_STATE,
        isRaw: panelData.raw_keeper ?? false,
    });
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
    function handlePanelRangeApplied(
        aPanelRange: TimeRange,
        aContext: AppliedBoardPanelRangeContext,
    ) {
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
        const keeper =
            panelTime.use_time_keeper === 'Y'
                ? resolveTimeKeeperRanges(panelTime.time_keeper)
                : undefined;
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
    const handleDragSelectStateChange = function handleDragSelectStateChange(
        aIsDragSelectActive: boolean,
        aCanOpenFft: boolean,
    ) {
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
        void refreshPanelData(navState.panelRange, nextRaw, navState.navigatorRange);
    };

    // --- Composed handler objects ---

    const actionHandlers = {
        onToggleOverlap: () => {
            if (panelData.tag_set.length === 1) {
                pOnToggleOverlapSelection(
                    navState.panelRange.startTime,
                    navState.panelRange.endTime,
                    panelState.isRaw,
                );
            }
        },
        onToggleRaw: toggleRaw,
        onToggleDragSelect: toggleDragSelect,
        onOpenFft: () => setPanelState((p) => ({ ...p, isFFTModal: true })),
        onSetGlobalTime: () => {
            if (!navState.rangeOption) return;
            pChartBoardActions.onSetGlobalTimeRange(
                resolveGlobalTimeTargetRange(navState.preOverflowTimeRange, navState.panelRange),
                navState.navigatorRange,
                navState.rangeOption,
            );
        },
        onOpenEdit: () =>
            pChartBoardActions.onOpenEditRequest({
                pPanelInfo,
                pNavigatorRange: navState.navigatorRange,
                pSetSaveEditedInfo: setShouldRefreshAfterEdit,
            }),
        onDelete: () =>
            pOnDeletePanel(
                navState.panelRange.startTime,
                navState.panelRange.endTime,
                panelState.isRaw,
            ),
    };
    const rangeControlHandlers = createPanelRangeControlHandlers(
        setExtremes,
        navState.panelRange,
        navState.navigatorRange,
    );

    const presentationState = buildPanelPresentationState(
        meta.chart_title,
        navState.panelRange,
        navState.rangeOption,
        false,
        panelState.isRaw,
        pIsSelectedForOverlap,
        pIsOverlapAnchor,
        panelData.tag_set.length === 1,
        panelState.isDragSelectActive,
        canOpenFft,
        Boolean(navState.chartData),
        changeUtcToText,
    );

    // --- Effects ---

    useEffect(() => {
        if (!chartRef.current || !pChartBoardState.globalTimeRange) return;
        updateNavigateState({ rangeOption: pChartBoardState.globalTimeRange.interval ?? null });
        setExtremes(
            pChartBoardState.globalTimeRange.data,
            pChartBoardState.globalTimeRange.navigator,
        );
    }, [pChartBoardState.globalTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (chartRef.current)
            void refreshPanelData(navState.panelRange, panelState.isRaw, navState.navigatorRange);
    }, [pChartBoardState.refreshCount]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (pBoardContext.id === selectedTab && shouldRefreshAfterEdit) {
            void initialize();
            setShouldRefreshAfterEdit(false);
        }
    }, [pPanelInfo]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (chartRef.current) void reset();
    }, [pChartBoardState.bgnEndTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (
            selectedTab === pBoardContext.id &&
            areaChartRef.current &&
            !navigateStateRef.current.chartData
        ) {
            void initialize();
        }
    }, [selectedTab]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Render ---

    return (
        <div
            ref={panelFormRef}
            className="panel-form"
            style={{ border: `0.5px solid ${pIsSelectedForOverlap ? '#FDB532' : '#454545'}` }}
        >
            <PanelHeader
                pPresentationState={presentationState}
                pActionHandlers={actionHandlers}
                pRefreshHandlers={{
                    onRefreshData: () =>
                        void refreshPanelData(
                            navState.panelRange,
                            panelState.isRaw,
                            navState.navigatorRange,
                        ),
                    onRefreshTime: () => void reset(),
                }}
                pSavedChartInfo={{ chartData: navState.chartData, chartRef: chartRef }}
            />
            <PanelBody
                pChartRefs={{ areaChart: areaChartRef, chartWrap: chartRef }}
                pChartState={{
                    axes: panelAxes,
                    display: panelDisplay,
                    useNormalize: pPanelInfo.use_normalize,
                }}
                pPanelState={panelState}
                pNavigateState={navState}
                pChartHandlers={{
                    onSetExtremes: onPanelRangeChange,
                    onSetNavigatorExtremes: onNavigatorRangeChange,
                    onSelection: () => undefined,
                }}
                pShiftHandlers={rangeControlHandlers}
                pTagSet={panelData.tag_set}
                pSetIsFFTModal={(aValue: SetStateAction<boolean>) =>
                    setPanelState((p) => ({
                        ...p,
                        isFFTModal: typeof aValue === 'function' ? aValue(p.isFFTModal) : aValue,
                    }))
                }
                pOnDragSelectStateChange={handleDragSelectStateChange}
            />
            <PanelFooter
                pPanelSummary={{
                    tagCount: panelData.tag_set.length,
                    showLegend: panelDisplay.show_legend,
                }}
                pVisibleRange={navState.panelRange}
                pShiftHandlers={rangeControlHandlers}
                pZoomHandlers={rangeControlHandlers}
            />
        </div>
    );
}

const INITIAL_PANEL_STATE: PanelState = {
    isRaw: false,
    isFFTModal: false,
    isDragSelectActive: false,
};

export default PanelContainer;
