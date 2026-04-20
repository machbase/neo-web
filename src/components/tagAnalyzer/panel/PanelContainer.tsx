import PanelFooter from './PanelFooter';
import PanelHeader from './PanelHeader';
import PanelBody from './PanelBody';
import './Panel.scss';
import { memo, useEffect, useRef, useState } from 'react';
import type { SetStateAction } from 'react';
import { useRecoilValue } from 'recoil';
import { gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import { changeUtcToText } from '@/utils/helpers/date';
import {
    createPanelRangeControlHandlers,
} from '../utils/time/PanelRangeInteractionUtils';
import {
    resolveGlobalTimeTargetRange,
    restoreTimeRangePair,
} from '../utils/time/PanelTimeRangeResolver';
import {
    resolveInitialPanelRange,
    resolveResetTimeRange,
} from '../utils/time/PanelTimeRangeResolver';
import type {
    BoardChartActions,
    BoardChartState,
    BoardContext,
} from '../utils/boardTypes';
import type {
    PanelChartHandle,
    PanelNavigateState,
    PanelPresentationState,
    PanelRangeAppliedContext,
    PanelState,
} from '../utils/panelRuntimeTypes';
import type { PanelInfo } from '../utils/panelModelTypes';
import type { PanelRangeResolutionParams, TimeRange } from '../utils/time/timeTypes';
import { usePanelChartRuntimeController } from './usePanelChartRuntimeController';

// Props for the board-only chart shell that wraps the shared runtime controller.
// Used by PanelContainer to type component props.
type PanelContainerProps = {
    pPanelInfo: PanelInfo;
    pBoardContext: BoardContext;
    pChartBoardState: BoardChartState;
    pChartBoardActions: BoardChartActions;
    pIsSelectedForOverlap: boolean;
    pIsOverlapAnchor: boolean;
    pOnToggleOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnUpdateOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnDeletePanel: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
};

/**
 * Returns whether the panel has already resolved a chart range option.
 * Intent: Let the container gate reload logic on a single loaded-state check.
 * @param aNavigateState The current navigate state snapshot.
 * @returns Whether the panel chart has finished loading range metadata.
 */
function hasLoadedPanelChartData(aNavigateState: Pick<PanelNavigateState, 'rangeOption'>): boolean {
    return aNavigateState.rangeOption !== undefined;
}

// Future Refactor Target: this board controller still overlaps heavily with the preview controller.
// Keep the duplicated orchestration visible until we can safely extract a shared controller path.
/**
 * Renders the board panel shell and keeps board-only persistence, overlap, and global-time wiring outside the shared runtime controller.
 * Intent: Keep board-specific orchestration separate from the shared chart controller hook.
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
        data,
        time,
        axes,
        display,
    } = pPanelInfo;

    // Refs
    const areaChartRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<PanelChartHandle | null>(null);
    const panelFormRef = useRef<HTMLDivElement | null>(null);

    // Global state
    const selectedTab = useRecoilValue(gSelectedTab);
    const rollupTableList = useRecoilValue(gRollupTableList);

    // Local state
    const [panelState, setPanelState] = useState<PanelState>(() =>
        ({
            isRaw: data.raw_keeper,
            isFFTModal: false,
            isDragSelectActive: false,
        }),
    );
    const [shouldRefreshAfterEdit, setShouldRefreshAfterEdit] = useState(false);
    const [canOpenFft, setCanOpenFft] = useState(false);

    // Derived
    const boardTime = {
        kind: 'resolved' as const,
        value: pBoardContext.time,
    };

    /**
     * Builds the reset and initialization inputs shared by the panel time-range helpers.
     * Intent: Gather the current board and panel time inputs in one explicit object.
     * @returns The current board and panel time-resolution inputs.
     */
    function makeResetParams(): PanelRangeResolutionParams {
        return {
            boardTime,
            panelData: data,
            panelTime: time,
            timeBoundaryRanges: pChartBoardState.timeBoundaryRanges,
            isEdit: false as const,
        };
    }

    /**
     * Persists the applied panel range through the board lane after the shared runtime controller finishes loading.
     * Intent: Keep board persistence and overlap state updates tied to one applied range.
     * @param aPanelRange The final visible panel range.
     * @param aContext The navigator range and raw-mode context for the applied panel range.
     * @returns Nothing.
     */
    function handlePanelRangeApplied(
        aPanelRange: TimeRange,
        aContext: PanelRangeAppliedContext,
    ) {
        if (time.use_time_keeper) {
            pChartBoardActions.onPersistPanelState({
                targetPanelKey: meta.index_key,
                timeInfo: {
                    panelRange: aPanelRange,
                    navigatorRange: aContext.navigatorRange,
                },
                isRaw: aContext.isRaw,
            });
        }
        if (pIsSelectedForOverlap) {
            pOnUpdateOverlapSelection(aPanelRange.startTime, aPanelRange.endTime, aContext.isRaw);
        }
    }

    const {
        navigateState,
        navigateStateRef,
        refreshPanelData,
        handlePanelRangeChange,
        handleNavigatorRangeChange,
        setExtremes,
        applyLoadedRanges,
        updateNavigateState,
    } = usePanelChartRuntimeController({
        panelInfo: pPanelInfo,
        boardTime,
        areaChartRef,
        chartRef,
        rollupTableList,
        isRaw: panelState.isRaw,
        onPanelRangeApplied: handlePanelRangeApplied,
    });

    // --- Lifecycle ---

    /**
     * Initializes the board panel from the resolved panel and navigator ranges.
     * Intent: Load the initial board panel data from the resolved time range pair.
     * @returns Nothing.
     */
    const initialize = async function initialize() {
        if (!panelFormRef.current?.clientWidth) return;

        const resolved = await resolveInitialPanelRange(makeResetParams());
        const sNormalizedTimeRangePair =
            time.use_time_keeper
                ? restoreTimeRangePair(time.time_keeper)
                : { kind: 'empty' as const };
        const keeper =
            sNormalizedTimeRangePair.kind === 'resolved'
                ? sNormalizedTimeRangePair.value
                : undefined;
        const range = keeper?.panelRange ?? resolved;
        const nRange = keeper?.navigatorRange ?? range;

        await applyLoadedRanges(range, nRange);
    };

    /**
     * Resets the current panel back to the board-resolved visible range.
     * Intent: Reapply the board-resolved range after the user changes the time boundary.
     * @returns Nothing.
     */
    const reset = async function reset() {
        if (pBoardContext.id !== selectedTab) return;
        const range = await resolveResetTimeRange(makeResetParams());
        setExtremes(range, range);
    };

    // --- Toggles ---

    /**
     * Toggles drag-select mode and closes the FFT modal when drag-select is disabled.
     * Intent: Keep the drag-select mode and FFT modal state from drifting apart.
     * @returns Nothing.
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
     * Intent: Track whether drag-select can still open FFT from the chart selection flow.
     * @param aIsDragSelectActive Whether drag-select should stay active.
     * @param aCanOpenFft Whether the FFT action should be enabled.
     * @returns Nothing.
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
     * Intent: Switch between raw and processed data while keeping the current range in sync.
     * @returns Nothing.
     */
    const toggleRaw = function toggleRaw() {
        const nextRaw = !panelState.isRaw;
        setPanelState((p) => ({ ...p, isRaw: nextRaw }));

        if (navigateState.panelRange.startTime) {
            pChartBoardActions.onPersistPanelState({
                targetPanelKey: meta.index_key,
                timeInfo: {
                    panelRange: navigateState.panelRange,
                    navigatorRange: navigateState.navigatorRange,
                },
                isRaw: nextRaw,
            });
        }
        void refreshPanelData(navigateState.panelRange, nextRaw, navigateState.navigatorRange);
    };

    // --- Composed handler objects ---

    const actionHandlers = {
        onToggleOverlap: () => {
            if (data.tag_set.length === 1) {
                pOnToggleOverlapSelection(
                    navigateState.panelRange.startTime,
                    navigateState.panelRange.endTime,
                    panelState.isRaw,
                );
            }
        },
        onToggleRaw: toggleRaw,
        onToggleDragSelect: toggleDragSelect,
        onOpenFft: () => setPanelState((p) => ({ ...p, isFFTModal: true })),
        onSetGlobalTime: () => {
            if (!navigateState.rangeOption) return;
            pChartBoardActions.onSetGlobalTimeRange({
                dataTime: resolveGlobalTimeTargetRange(
                    navigateState.preOverflowTimeRange,
                    navigateState.panelRange,
                ),
                navigatorTime: navigateState.navigatorRange,
                interval: navigateState.rangeOption,
            });
        },
        onOpenEdit: () =>
            pChartBoardActions.onOpenEditRequest({
                pPanelInfo,
                pNavigatorRange: navigateState.navigatorRange,
                pSetSaveEditedInfo: setShouldRefreshAfterEdit,
            }),
        onDelete: () =>
            pOnDeletePanel(
                navigateState.panelRange.startTime,
                navigateState.panelRange.endTime,
                panelState.isRaw,
            ),
    };
    const { shiftHandlers, zoomHandlers } = createPanelRangeControlHandlers(
        setExtremes,
        navigateState.panelRange,
        navigateState.navigatorRange,
    );
    const hasLoadedChartData = hasLoadedPanelChartData(navigateState);

    const timeText = navigateState.panelRange.startTime
        ? `${changeUtcToText(navigateState.panelRange.startTime)} ~ ${changeUtcToText(navigateState.panelRange.endTime)}`
        : '';
    const intervalText =
        !panelState.isRaw && navigateState.rangeOption
            ? `${navigateState.rangeOption.IntervalValue}${navigateState.rangeOption.IntervalType}`
            : '';
    const presentationState: PanelPresentationState = {
        title: meta.chart_title,
        timeText,
        intervalText,
        isEdit: false,
        isRaw: panelState.isRaw,
        isSelectedForOverlap: pIsSelectedForOverlap,
        isOverlapAnchor: pIsOverlapAnchor,
        canToggleOverlap: data.tag_set.length === 1,
        isDragSelectActive: panelState.isDragSelectActive,
        canOpenFft,
        canSaveLocal: hasLoadedChartData,
    };

    // --- Effects ---

    useEffect(() => {
        if (!chartRef.current || !pChartBoardState.globalTimeRange) return;
        updateNavigateState({ rangeOption: pChartBoardState.globalTimeRange.interval });
        setExtremes(
            pChartBoardState.globalTimeRange.data,
            pChartBoardState.globalTimeRange.navigator,
        );
    }, [pChartBoardState.globalTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (chartRef.current)
            void refreshPanelData(
                navigateState.panelRange,
                panelState.isRaw,
                navigateState.navigatorRange,
            );
    }, [pChartBoardState.refreshCount]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (pBoardContext.id === selectedTab && shouldRefreshAfterEdit) {
            void initialize();
            setShouldRefreshAfterEdit(false);
        }
    }, [pPanelInfo]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (chartRef.current) void reset();
    }, [pChartBoardState.timeBoundaryRanges]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (
            selectedTab === pBoardContext.id &&
            areaChartRef.current &&
            !hasLoadedPanelChartData(navigateStateRef.current)
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
                            navigateState.panelRange,
                            panelState.isRaw,
                            navigateState.navigatorRange,
                        ),
                    onRefreshTime: () => void reset(),
                }}
                pSavedChartInfo={{ chartData: navigateState.chartData, chartRef: chartRef }}
            />
            <PanelBody
                pChartRefs={{ areaChart: areaChartRef, chartWrap: chartRef }}
                pChartState={{
                    axes,
                    display,
                    useNormalize: pPanelInfo.use_normalize,
                }}
                pPanelState={panelState}
                pNavigateState={navigateState}
                pChartHandlers={{
                    onSetExtremes: handlePanelRangeChange,
                    onSetNavigatorExtremes: handleNavigatorRangeChange,
                    onSelection: () => undefined,
                }}
                pShiftHandlers={shiftHandlers}
                pTagSet={data.tag_set}
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
                    tagCount: data.tag_set.length,
                    showLegend: display.show_legend,
                }}
                pVisibleRange={navigateState.panelRange}
                pShiftHandlers={shiftHandlers}
                pZoomHandlers={zoomHandlers}
            />
        </div>
    );
}

/**
 * Compares two panel container prop snapshots for memoization.
 * Intent: Skip rerenders when the board inputs and action handlers are unchanged.
 * @param aPrevProps The previous props snapshot.
 * @param aNextProps The next props snapshot.
 * @returns Whether the memoized container should reuse the previous render.
 */
function arePanelContainerPropsEqual(
    aPrevProps: Readonly<PanelContainerProps>,
    aNextProps: Readonly<PanelContainerProps>,
): boolean {
    return (
        aPrevProps.pPanelInfo === aNextProps.pPanelInfo &&
        aPrevProps.pBoardContext.id === aNextProps.pBoardContext.id &&
        aPrevProps.pBoardContext.time === aNextProps.pBoardContext.time &&
        aPrevProps.pChartBoardState.refreshCount === aNextProps.pChartBoardState.refreshCount &&
        aPrevProps.pChartBoardState.timeBoundaryRanges ===
            aNextProps.pChartBoardState.timeBoundaryRanges &&
        aPrevProps.pChartBoardState.globalTimeRange === aNextProps.pChartBoardState.globalTimeRange &&
        aPrevProps.pChartBoardActions.onPersistPanelState ===
            aNextProps.pChartBoardActions.onPersistPanelState &&
        aPrevProps.pChartBoardActions.onSetGlobalTimeRange ===
            aNextProps.pChartBoardActions.onSetGlobalTimeRange &&
        aPrevProps.pChartBoardActions.onOpenEditRequest ===
            aNextProps.pChartBoardActions.onOpenEditRequest &&
        aPrevProps.pIsSelectedForOverlap === aNextProps.pIsSelectedForOverlap &&
        aPrevProps.pIsOverlapAnchor === aNextProps.pIsOverlapAnchor
    );
}

export default memo(PanelContainer, arePanelContainerPropsEqual);
