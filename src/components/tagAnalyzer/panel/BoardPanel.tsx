import ChartFooter from '../chart/ChartFooter';
import BoardPanelHeader from './BoardPanelHeader';
import ChartBody from '../chart/ChartBody';
import BoardPanelContextMenu from './BoardPanelContextMenu';
import HighlightRenamePopover from './HighlightRenamePopover';
import '../chart/ChartShell.scss';
import { memo, useEffect, useRef, useState } from 'react';
import type { MouseEvent, SetStateAction } from 'react';
import { changeUtcToText } from '@/utils/helpers/date';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import {
    createPanelRangeControlHandlers,
} from '../utils/time/PanelRangeControlLogic';
import { EMPTY_TIME_RANGE } from '../utils/time/constants/TimeRangeConstants';
import {
    isSameTimeRange,
    resolveGlobalTimeTargetRange,
    restoreTimeRangePair,
} from '../utils/time/PanelTimeRangeResolver';
import {
    resolveInitialPanelRange,
    resolveResetTimeRange,
} from '../utils/time/PanelTimeRangeResolver';
import type {
    PanelChartHandle,
    PanelHighlightEditRequest,
    PanelNavigateState,
    PanelPresentationState,
    PanelRangeAppliedContext,
    PanelState,
} from '../utils/panelRuntimeTypes';
import type { PanelInfo } from '../utils/panelModelTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import { useChartRuntimeController } from '../chart/useChartRuntimeController';
import type {
    BoardPanelContextMenuState,
    BoardPanelProps,
    HighlightRenameState,
} from './BoardPanelTypes';
import {
    DEFAULT_HIGHLIGHT_LABEL,
    INITIAL_CONTEXT_MENU_STATE,
    INITIAL_HIGHLIGHT_RENAME_STATE,
} from './BoardPanelConstants';

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
function BoardPanel({
    pPanelInfo,
    pBoardContext,
    pIsActiveTab,
    pChartBoardState,
    pChartBoardActions,
    pIsSelectedForOverlap,
    pIsOverlapAnchor,
    pRollupTableList,
    pOnToggleOverlapSelection,
    pOnUpdateOverlapSelection,
    pOnDeletePanel,
}: BoardPanelProps) {
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

    // Local state
    const [panelState, setPanelState] = useState<PanelState>(() =>
        ({
            isRaw: data.raw_keeper,
            isFFTModal: false,
            isHighlightActive: false,
            isDragSelectActive: false,
        }),
    );
    const [contextMenuState, setContextMenuState] =
        useState<BoardPanelContextMenuState>(INITIAL_CONTEXT_MENU_STATE);
    const [highlightRenameState, setHighlightRenameState] =
        useState<HighlightRenameState>(INITIAL_HIGHLIGHT_RENAME_STATE);
    const [isContextDeleteModalOpen, setIsContextDeleteModalOpen] = useState(false);
    const [shouldRefreshAfterEdit, setShouldRefreshAfterEdit] = useState(false);
    const [canOpenFft, setCanOpenFft] = useState(false);
    const [hasInitializedChartRanges, setHasInitializedChartRanges] = useState(false);
    const latestPanelInfoRef = useRef(pPanelInfo);
    latestPanelInfoRef.current = pPanelInfo;

    // Derived
    const boardTime = {
        kind: 'resolved' as const,
        value: pBoardContext.time,
    };

    /**
     * Persists the applied panel range through the board lane after the shared runtime controller finishes loading.
     * Intent: Keep board persistence and overlap state updates tied to one applied range.
     * @param aPanelRange The final visible panel range.
     * @param aContext The navigator range and raw-mode context for the applied panel range.
     * @returns Nothing.
     */
    function handlePanelRangeApplied(
        aPanelRange: TimeRangeMs,
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
    } = useChartRuntimeController({
        panelInfo: pPanelInfo,
        boardTime,
        areaChartRef,
        chartRef,
        rollupTableList: pRollupTableList,
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
        setHasInitializedChartRanges(false);

        const resolved = await resolveInitialPanelRange(
            boardTime,
            data,
            time,
            pChartBoardState.timeBoundaryRanges,
            false,
        );
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
        setHasInitializedChartRanges(true);
    };

    /**
     * Resets the current panel back to the board-resolved visible range.
     * Intent: Reapply the board-resolved range after the user changes the time boundary.
     * @returns Nothing.
     */
    const reset = async function reset() {
        if (!pIsActiveTab) return;
        const range = await resolveResetTimeRange(
            boardTime,
            data,
            time,
            pChartBoardState.timeBoundaryRanges,
            false,
        );
        const sCurrentPanelRange = navigateStateRef.current.panelRange;
        const sCurrentNavigatorRange = navigateStateRef.current.navigatorRange;
        const sNavigatorRangeIsPending = isSameTimeRange(
            sCurrentNavigatorRange,
            EMPTY_TIME_RANGE,
        );

        if (
            isSameTimeRange(range, sCurrentPanelRange) &&
            (isSameTimeRange(range, sCurrentNavigatorRange) || sNavigatorRangeIsPending)
        ) {
            return;
        }

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
            isHighlightActive: false,
            isDragSelectActive: nextIsDragSelectActive,
            isFFTModal: nextIsDragSelectActive ? p.isFFTModal : false,
        }));
        if (!nextIsDragSelectActive) {
            setCanOpenFft(false);
        }
    };

    /**
     * Toggles highlight-selection mode and disables drag-select-only actions while highlighting.
     * Intent: Keep highlight creation independent from stats/FFT range selection.
     * @returns Nothing.
     */
    const toggleHighlight = function toggleHighlight() {
        const nextIsHighlightActive = !panelState.isHighlightActive;

        setPanelState((aPrev) => ({
            ...aPrev,
            isFFTModal: false,
            isHighlightActive: nextIsHighlightActive,
            isDragSelectActive: false,
        }));
        setCanOpenFft(false);
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
     * Saves a new unnamed highlight range into the current panel.
     * Intent: Persist highlight brush selections directly into the normalized panel model.
     * @param aStartTime The selected highlight start time.
     * @param aEndTime The selected highlight end time.
     * @returns Nothing.
     */
    function handleHighlightSelection(aStartTime: number, aEndTime: number) {
        const sStartTime = Math.min(aStartTime, aEndTime);
        const sEndTime = Math.max(aStartTime, aEndTime);

        if (sEndTime <= sStartTime) {
            return;
        }

        const sCurrentPanelInfo = latestPanelInfoRef.current;
        const sNextPanelInfo: PanelInfo = {
            ...sCurrentPanelInfo,
            highlights: [
                ...(sCurrentPanelInfo.highlights ?? []),
                {
                    text: DEFAULT_HIGHLIGHT_LABEL,
                    timeRange: {
                        startTime: sStartTime,
                        endTime: sEndTime,
                    },
                },
            ],
        };

        latestPanelInfoRef.current = sNextPanelInfo;
        pChartBoardActions.onSavePanel(sNextPanelInfo);
    }

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
        onToggleHighlight: toggleHighlight,
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

    /**
     * Opens the panel context menu at the cursor position.
     * Intent: Restore the panel-level right-click menu from the container boundary.
     * @param aEvent The right-click event from the panel container.
     * @returns Nothing.
     */
    function handlePanelContextMenu(aEvent: MouseEvent<HTMLDivElement>) {
        aEvent.preventDefault();
        aEvent.stopPropagation();

        closeHighlightRenamePopover();
        setContextMenuState({
            isOpen: true,
            position: {
                x: aEvent.clientX,
                y: aEvent.clientY,
            },
        });
    }

    /**
     * Closes the panel context menu without changing any other state.
     * Intent: Give the menu and sibling actions one explicit close path.
     * @returns Nothing.
     */
    function closeContextMenu() {
        setContextMenuState((aPrev) => ({
            ...aPrev,
            isOpen: false,
        }));
    }

    /**
     * Closes the highlight rename popup.
     * Intent: Reset temporary rename UI state after the user finishes or cancels editing.
     * @returns Nothing.
     */
    function closeHighlightRenamePopover() {
        setHighlightRenameState(INITIAL_HIGHLIGHT_RENAME_STATE);
    }

    /**
     * Opens the rename popup for the selected saved highlight.
     * Intent: Let saved highlights open their own editor directly from the chart hit test.
     * @param aRequest The clicked highlight index and screen position.
     * @returns Nothing.
     */
    function handleOpenHighlightRename(aRequest: PanelHighlightEditRequest) {
        const sHighlight = latestPanelInfoRef.current.highlights?.[aRequest.highlightIndex];

        if (!sHighlight) {
            closeHighlightRenamePopover();
            return;
        }

        closeContextMenu();
        setHighlightRenameState({
            isOpen: true,
            highlightIndex: aRequest.highlightIndex,
            position: aRequest.position,
            labelText: sHighlight.text || DEFAULT_HIGHLIGHT_LABEL,
        });
    }

    /**
     * Persists the edited highlight label back into the current panel.
     * Intent: Save highlight label edits through the same normalized panel save path as other panel changes.
     * @returns Nothing.
     */
    function applyHighlightRename() {
        const sHighlightIndex = highlightRenameState.highlightIndex;
        const sCurrentPanelInfo = latestPanelInfoRef.current;
        const sCurrentHighlights = sCurrentPanelInfo.highlights ?? [];

        if (
            sHighlightIndex === undefined ||
            !sCurrentHighlights[sHighlightIndex]
        ) {
            closeHighlightRenamePopover();
            return;
        }

        const sNextLabelText = highlightRenameState.labelText.trim() || DEFAULT_HIGHLIGHT_LABEL;
        const sNextPanelInfo: PanelInfo = {
            ...sCurrentPanelInfo,
            highlights: sCurrentHighlights.map((aHighlight, aIndex) =>
                aIndex === sHighlightIndex
                    ? {
                          ...aHighlight,
                          text: sNextLabelText,
                      }
                    : aHighlight,
            ),
        };

        latestPanelInfoRef.current = sNextPanelInfo;
        pChartBoardActions.onSavePanel(sNextPanelInfo);
        closeHighlightRenamePopover();
    }

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
        isHighlightActive: panelState.isHighlightActive,
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
        if (pIsActiveTab && shouldRefreshAfterEdit) {
            void initialize();
            setShouldRefreshAfterEdit(false);
        }
    }, [pPanelInfo]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (
            !chartRef.current ||
            !hasLoadedChartData ||
            !hasInitializedChartRanges ||
            !pChartBoardState.timeBoundaryRanges
        ) {
            return;
        }

        void reset();
    }, [pChartBoardState.timeBoundaryRanges]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (
            pIsActiveTab &&
            areaChartRef.current &&
            !hasLoadedPanelChartData(navigateStateRef.current)
        ) {
            void initialize();
        }
    }, [pIsActiveTab]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Render ---

    return (
        <div
            ref={panelFormRef}
            className="panel-form"
            style={{ border: `0.5px solid ${pIsSelectedForOverlap ? '#FDB532' : '#454545'}` }}
            onContextMenu={handlePanelContextMenu}
        >
            <BoardPanelHeader
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
            <ChartBody
                pChartRefs={{ areaChart: areaChartRef, chartWrap: chartRef }}
                pChartState={{
                    axes,
                    display,
                    useNormalize: pPanelInfo.use_normalize,
                    highlights: pPanelInfo.highlights ?? [],
                }}
                pPanelState={panelState}
                pNavigateState={navigateState}
                pChartHandlers={{
                    onSetExtremes: handlePanelRangeChange,
                    onSetNavigatorExtremes: handleNavigatorRangeChange,
                    onSelection: () => undefined,
                    onOpenHighlightRename: handleOpenHighlightRename,
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
                pOnHighlightSelection={handleHighlightSelection}
            />
            <ChartFooter
                pPanelSummary={{
                    tagCount: data.tag_set.length,
                    showLegend: display.show_legend,
                }}
                pVisibleRange={navigateState.panelRange}
                pShiftHandlers={shiftHandlers}
                pZoomHandlers={zoomHandlers}
            />
            <BoardPanelContextMenu
                isOpen={contextMenuState.isOpen}
                position={contextMenuState.position}
                isRaw={panelState.isRaw}
                isSelectedForOverlap={pIsSelectedForOverlap}
                isDragSelectActive={panelState.isDragSelectActive}
                canToggleOverlap={presentationState.canToggleOverlap}
                canOpenFft={presentationState.canOpenFft}
                isSetGlobalTimeDisabled={!navigateState.rangeOption}
                actionHandlers={actionHandlers}
                refreshHandlers={{
                    onRefreshData: () =>
                        void refreshPanelData(
                            navigateState.panelRange,
                            panelState.isRaw,
                            navigateState.navigatorRange,
                        ),
                    onRefreshTime: () => void reset(),
                }}
                onClose={closeContextMenu}
                onOpenDeleteConfirm={() => setIsContextDeleteModalOpen(true)}
            />
            <HighlightRenamePopover
                isOpen={highlightRenameState.isOpen}
                position={highlightRenameState.position}
                labelText={highlightRenameState.labelText}
                onLabelTextChange={(aValue) =>
                    setHighlightRenameState((aPrev) => ({
                        ...aPrev,
                        labelText: aValue,
                    }))
                }
                onApply={applyHighlightRename}
                onClose={closeHighlightRenamePopover}
            />
            {isContextDeleteModalOpen && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsContextDeleteModalOpen}
                    pCallback={actionHandlers.onDelete}
                    pContents={
                        <div className="body-content">{`Do you want to delete this panel?`}</div>
                    }
                />
            )}
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
function areBoardPanelPropsEqual(
    aPrevProps: Readonly<BoardPanelProps>,
    aNextProps: Readonly<BoardPanelProps>,
): boolean {
    return (
        aPrevProps.pPanelInfo === aNextProps.pPanelInfo &&
        aPrevProps.pBoardContext.id === aNextProps.pBoardContext.id &&
        aPrevProps.pBoardContext.time === aNextProps.pBoardContext.time &&
        aPrevProps.pIsActiveTab === aNextProps.pIsActiveTab &&
        aPrevProps.pChartBoardState.refreshCount === aNextProps.pChartBoardState.refreshCount &&
        aPrevProps.pChartBoardState.timeBoundaryRanges ===
            aNextProps.pChartBoardState.timeBoundaryRanges &&
        aPrevProps.pChartBoardState.globalTimeRange === aNextProps.pChartBoardState.globalTimeRange &&
        aPrevProps.pChartBoardActions.onPersistPanelState ===
            aNextProps.pChartBoardActions.onPersistPanelState &&
        aPrevProps.pChartBoardActions.onSavePanel ===
            aNextProps.pChartBoardActions.onSavePanel &&
        aPrevProps.pChartBoardActions.onSetGlobalTimeRange ===
            aNextProps.pChartBoardActions.onSetGlobalTimeRange &&
        aPrevProps.pChartBoardActions.onOpenEditRequest ===
            aNextProps.pChartBoardActions.onOpenEditRequest &&
        aPrevProps.pIsSelectedForOverlap === aNextProps.pIsSelectedForOverlap &&
        aPrevProps.pIsOverlapAnchor === aNextProps.pIsOverlapAnchor &&
        aPrevProps.pRollupTableList === aNextProps.pRollupTableList
    );
}

export default memo(BoardPanel, areBoardPanelPropsEqual);
