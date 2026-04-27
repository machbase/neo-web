import PanelChartFooter from './PanelChartFooter';
import BoardPanelHeader from './BoardPanelHeader';
import PanelChartBody from './PanelChartBody';
import BoardPanelContextMenu from './BoardPanelContextMenu';
import CreateSeriesAnnotationPopover from '../panelModal/CreateSeriesAnnotationPopover';
import HighlightRenamePopover from '../panelModal/HighlightRenamePopover';
import SeriesAnnotationPopover from '../panelModal/SeriesAnnotationPopover';
import './PanelChartShell.scss';
import { memo, useEffect, useRef, useState } from 'react';
import type { MouseEvent, SetStateAction } from 'react';
import { changeUtcToText } from '@/utils/helpers/date';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import {
    createPanelRangeControlHandlers,
} from '../utils/time/PanelRangeControlLogic';
import { EMPTY_TIME_RANGE } from '../utils/time/constants/TimeRangeConstants';
import { hasResolvedIntervalOption } from '../utils/time/IntervalUtils';
import {
    isSameTimeRange,
    resolveGlobalTimeTargetRange,
    resolveInitialPanelRange,
    resolveResetTimeRange,
    restoreTimeRangePair,
} from '../utils/time/PanelTimeRangeResolver';
import { resolveTimeBoundaryRanges } from '../utils/time/TimeBoundaryRangeResolver';
import { toLegacyTimeRangeInput } from '../utils/legacy/LegacyTimeAdapter';
import type {
    BoardChartActions,
    BoardChartState,
    BoardContext,
} from '../utils/boardTypes';
import type {
    PanelChartHandle,
    PanelHighlightEditRequest,
    PanelNavigateState,
    PanelPresentationState,
    PanelRefreshHandlers,
    PanelRangeAppliedContext,
    PanelSeriesAnnotationEditRequest,
    PanelState,
} from '../utils/panelRuntimeTypes';
import type { PanelInfo } from '../utils/panelModelTypes';
import type { ValueRangePair } from '../../TagAnalyzerCommonTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import { usePanelChartRuntimeController } from './usePanelChartRuntimeController';
import type {
    CreateSeriesAnnotationPopoverState,
    HighlightRenameState,
    SeriesAnnotationPopoverState,
} from '../panelModal/PanelModalTypes';

type BoardPanelProps = {
    pPanelInfo: PanelInfo;
    pBoardContext: BoardContext;
    pIsActiveTab: boolean;
    pChartBoardState: BoardChartState;
    pChartBoardActions: BoardChartActions;
    pIsSelectedForOverlap: boolean;
    pIsOverlapAnchor: boolean;
    pRollupTableList: string[];
    pOnToggleOverlapSelection: (start: number, end: number, isRaw: boolean) => void;
    pOnUpdateOverlapSelection: (start: number, end: number, isRaw: boolean) => void;
    pOnDeletePanel: (start: number, end: number, isRaw: boolean) => void;
};

type BoardPanelContextMenuState = {
    isOpen: boolean;
    position: {
        x: number;
        y: number;
    };
};

const INITIAL_CONTEXT_MENU_STATE: BoardPanelContextMenuState = {
    isOpen: false,
    position: { x: 0, y: 0 },
};

const INITIAL_HIGHLIGHT_RENAME_STATE: HighlightRenameState = {
    isOpen: false,
    highlightIndex: undefined,
    position: { x: 0, y: 0 },
    labelText: '',
};

const INITIAL_SERIES_ANNOTATION_POPOVER_STATE: SeriesAnnotationPopoverState = {
    isOpen: false,
    seriesIndex: undefined,
    annotationIndex: undefined,
    position: { x: 0, y: 0 },
    labelText: '',
    timeRange: undefined,
};

const INITIAL_CREATE_SERIES_ANNOTATION_POPOVER_STATE: CreateSeriesAnnotationPopoverState = {
    isOpen: false,
    position: { x: 0, y: 0 },
    seriesIndex: undefined,
    yearText: '',
    monthText: '',
    dayText: '',
    labelText: '',
};

const DEFAULT_HIGHLIGHT_LABEL = 'unnamed';
const DEFAULT_ANNOTATION_LABEL = 'note';

/**
 * Returns whether the panel has already resolved a chart range option.
 * Intent: Let the container gate reload logic on a single loaded-state check.
 * @param navigateState The current navigate state snapshot.
 * @returns Whether the panel chart has finished loading range metadata.
 */
function hasLoadedPanelChartData(navigateState: Pick<PanelNavigateState, 'rangeOption'>): boolean {
    return navigateState.rangeOption !== undefined;
}

function getCreateAnnotationPopoverPosition(panelFormRef: HTMLDivElement | null) {
    const sPanelRect = panelFormRef?.getBoundingClientRect();

    return {
        x: (sPanelRect?.left ?? 0) + 120,
        y: (sPanelRect?.top ?? 0) + 56,
    };
}

function createUtcDateFieldText(timestamp: number) {
    const sDate = new Date(timestamp);

    return {
        yearText: String(sDate.getUTCFullYear()),
        monthText: String(sDate.getUTCMonth() + 1),
        dayText: String(sDate.getUTCDate()),
    };
}

function createUtcAnnotationTimestamp(
    yearText: string,
    monthText: string,
    dayText: string,
): number | undefined {
    const sYear = Number(yearText);
    const sMonth = Number(monthText);
    const sDay = Number(dayText);

    if (
        !Number.isInteger(sYear) ||
        !Number.isInteger(sMonth) ||
        !Number.isInteger(sDay)
    ) {
        return undefined;
    }

    const sTimestamp = Date.UTC(sYear, sMonth - 1, sDay);
    const sDate = new Date(sTimestamp);

    if (
        sDate.getUTCFullYear() !== sYear ||
        sDate.getUTCMonth() !== sMonth - 1 ||
        sDate.getUTCDate() !== sDay
    ) {
        return undefined;
    }

    return sTimestamp;
}

function getSeriesAnnotationLabel(alias: string, sourceTagName: string): string {
    return alias.trim() || sourceTagName;
}

function shouldApplyResolvedRange(
    resolvedRange: TimeRangeMs,
    currentPanelRange: TimeRangeMs,
    currentNavigatorRange: TimeRangeMs,
): boolean {
    const sNavigatorRangeIsPending = isSameTimeRange(
        currentNavigatorRange,
        EMPTY_TIME_RANGE,
    );

    return !(
        isSameTimeRange(resolvedRange, currentPanelRange) &&
        (isSameTimeRange(resolvedRange, currentNavigatorRange) || sNavigatorRangeIsPending)
    );
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
            isRaw: pPanelInfo.toolbar.isRaw,
            isFFTModal: false,
            isHighlightActive: false,
            isAnnotationActive: false,
            isDragSelectActive: false,
        }),
    );
    const [contextMenuState, setContextMenuState] =
        useState<BoardPanelContextMenuState>(INITIAL_CONTEXT_MENU_STATE);
    const [highlightRenameState, setHighlightRenameState] =
        useState<HighlightRenameState>(INITIAL_HIGHLIGHT_RENAME_STATE);
    const [createAnnotationPopoverState, setCreateAnnotationPopoverState] =
        useState<CreateSeriesAnnotationPopoverState>(
            INITIAL_CREATE_SERIES_ANNOTATION_POPOVER_STATE,
        );
    const [annotationPopoverState, setAnnotationPopoverState] =
        useState<SeriesAnnotationPopoverState>(INITIAL_SERIES_ANNOTATION_POPOVER_STATE);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
     * @param panelRange The final visible panel range.
     * @param context The navigator range and raw-mode context for the applied panel range.
     * @returns Nothing.
     */
    function handlePanelRangeApplied(
        panelRange: TimeRangeMs,
        context: PanelRangeAppliedContext,
    ) {
        if (time.use_time_keeper) {
            pChartBoardActions.onPersistPanelState({
                targetPanelKey: meta.index_key,
                timeInfo: {
                    panelRange: panelRange,
                    navigatorRange: context.navigatorRange,
                },
                isRaw: context.isRaw,
            });
        }
        if (pIsSelectedForOverlap) {
            pOnUpdateOverlapSelection(panelRange.startTime, panelRange.endTime, context.isRaw);
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
        rollupTableList: pRollupTableList,
        isRaw: panelState.isRaw,
        onPanelRangeApplied: handlePanelRangeApplied,
    });

    async function resolveFreshTimeBoundaryRanges(): Promise<ValueRangePair | null> {
        return (
            (await resolveTimeBoundaryRanges(
                data.tag_set,
                toLegacyTimeRangeInput(boardTime.value),
                toLegacyTimeRangeInput({
                    range: {
                        min: time.range_bgn,
                        max: time.range_end,
                    },
                    rangeConfig: time.range_config,
                }),
            )) ?? pChartBoardState.timeBoundaryRanges
        );
    }

    async function applyResolvedRange(
        resolveRange: (timeBoundaryRanges: ValueRangePair | null) => Promise<TimeRangeMs>,
    ) {
        if (!pIsActiveTab) {
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
     * Reloads the panel time range using the same resolver as the first panel load.
     * Intent: Make the refresh-time button restore the initial data-derived range instead of the reset-specific board range.
     * @returns Nothing.
     */
    const refreshInitialTimeRange = async function refreshInitialTimeRange() {
        await applyResolvedRange((timeBoundaryRanges) =>
            resolveInitialPanelRange(
                boardTime,
                data,
                time,
                timeBoundaryRanges,
                false,
            ),
        );
    };

    /**
     * Resets the current panel back to the board-resolved visible range.
     * Intent: Reapply the board-resolved range after the user changes the time boundary.
     * @returns Nothing.
     */
    const reset = async function reset() {
        await applyResolvedRange((timeBoundaryRanges) =>
            resolveResetTimeRange(
                boardTime,
                data,
                time,
                timeBoundaryRanges,
                false,
            ),
        );
    };

    // --- Toggles ---

    /**
     * Toggles drag-select mode and closes the FFT modal when drag-select is disabled.
     * Intent: Keep the drag-select mode and FFT modal state from drifting apart.
     * @returns Nothing.
     */
    const toggleDragSelect = function toggleDragSelect() {
        const nextIsDragSelectActive = !panelState.isDragSelectActive;
        closeTransientPanelPopovers();
        setPanelState((p) => ({
            ...p,
            isHighlightActive: false,
            isAnnotationActive: false,
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

        closeTransientPanelPopovers();
        setPanelState((prev) => ({
            ...prev,
            isFFTModal: false,
            isHighlightActive: nextIsHighlightActive,
            isAnnotationActive: false,
            isDragSelectActive: false,
        }));
        setCanOpenFft(false);
    };

    /**
     * Toggles the create-annotation popup from the panel toolbar.
     * Intent: Let the user create series annotations directly without clicking the chart canvas.
     * @returns Nothing.
     */
    const toggleAnnotation = function toggleAnnotation() {
        if (createAnnotationPopoverState.isOpen) {
            closeCreateAnnotationPopover();
            return;
        }

        const sDefaultSeriesIndex = data.tag_set.length > 0 ? 0 : undefined;
        const sDefaultTimestamp =
            navigateState.panelRange.startTime || Date.now();
        const sDefaultDateFields = createUtcDateFieldText(sDefaultTimestamp);

        closeHighlightRenamePopover();
        closeAnnotationPopover();
        closeContextMenu();
        setCreateAnnotationPopoverState({
            isOpen: true,
            position: getCreateAnnotationPopoverPosition(panelFormRef.current),
            seriesIndex: sDefaultSeriesIndex,
            yearText: sDefaultDateFields.yearText,
            monthText: sDefaultDateFields.monthText,
            dayText: sDefaultDateFields.dayText,
            labelText: '',
        });
        setPanelState((prev) => ({
            ...prev,
            isFFTModal: false,
            isHighlightActive: false,
            isAnnotationActive: true,
            isDragSelectActive: false,
        }));
        setCanOpenFft(false);
    };

    /**
     * Applies drag-select state changes reported by the chart body.
     * Intent: Track whether drag-select can still open FFT from the chart selection flow.
     * @param isDragSelectActive Whether drag-select should stay active.
     * @param canOpenFft Whether the FFT action should be enabled.
     * @returns Nothing.
     */
    const handleDragSelectStateChange = function handleDragSelectStateChange(
        isDragSelectActive: boolean,
        canOpenFft: boolean,
    ) {
        if (!isDragSelectActive) {
            setPanelState((p) => ({ ...p, isDragSelectActive: false }));
        }
        setCanOpenFft(canOpenFft);
    };

    /**
     * Saves a new unnamed highlight range into the current panel.
     * Intent: Persist highlight brush selections directly into the normalized panel model.
     * @param startTime The selected highlight start time.
     * @param endTime The selected highlight end time.
     * @returns Nothing.
     */
    function handleHighlightSelection(startTime: number, endTime: number) {
        const sStartTime = Math.min(startTime, endTime);
        const sEndTime = Math.max(startTime, endTime);

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

    const actionHandlers: PanelActionHandlers = {
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
        onToggleAnnotation: toggleAnnotation,
        onToggleDragSelect: toggleDragSelect,
        onOpenFft: () => setPanelState((p) => ({ ...p, isFFTModal: true })),
        onSetGlobalTime: () => {
            if (!hasResolvedIntervalOption(navigateState.rangeOption)) return;
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
    const refreshHandlers: PanelRefreshHandlers = {
        onRefreshData: () =>
            void refreshPanelData(
                navigateState.panelRange,
                panelState.isRaw,
                navigateState.navigatorRange,
            ),
        onRefreshTime: () => void refreshInitialTimeRange(),
    };
    const { shiftHandlers, zoomHandlers } = createPanelRangeControlHandlers(
        setExtremes,
        navigateState.panelRange,
        navigateState.navigatorRange,
    );
    const hasLoadedChartData = hasLoadedPanelChartData(navigateState);

    /**
     * Opens the shared panel delete confirmation modal.
     * Intent: Keep destructive confirmation state in one container-owned place.
     * @returns Nothing.
     */
    function openDeleteConfirm() {
        setIsDeleteModalOpen(true);
    }

    /**
     * Opens the panel context menu at the cursor position.
     * Intent: Restore the panel-level right-click menu from the container boundary.
     * @param event The right-click event from the panel container.
     * @returns Nothing.
     */
    function handlePanelContextMenu(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();

        closeTransientPanelPopovers();
        setContextMenuState({
            isOpen: true,
            position: {
                x: event.clientX,
                y: event.clientY,
            },
        });
    }

    /**
     * Closes the panel context menu without changing any other state.
     * Intent: Give the menu and sibling actions one explicit close path.
     * @returns Nothing.
     */
    function closeContextMenu() {
        setContextMenuState((prev) => ({
            ...prev,
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
     * Closes the create-annotation popup and clears its temporary form fields.
     * Intent: Reset toolbar-driven annotation creation state after the user applies or cancels.
     * @returns Nothing.
     */
    function closeCreateAnnotationPopover() {
        setCreateAnnotationPopoverState(INITIAL_CREATE_SERIES_ANNOTATION_POPOVER_STATE);
        setPanelState((prev) => ({
            ...prev,
            isAnnotationActive: false,
        }));
    }

    /**
     * Closes the annotation editor popup.
     * Intent: Reset temporary annotation editing state after the user applies, deletes, or cancels.
     * @returns Nothing.
     */
    function closeAnnotationPopover() {
        setAnnotationPopoverState(INITIAL_SERIES_ANNOTATION_POPOVER_STATE);
    }

    /**
     * Closes the transient popovers that should not survive unrelated panel interactions.
     * Intent: Give panel mode switches one explicit cleanup path for temporary edit UI.
     * @returns Nothing.
     */
    function closeTransientPanelPopovers() {
        closeHighlightRenamePopover();
        closeCreateAnnotationPopover();
        closeAnnotationPopover();
    }

    /**
     * Opens the rename popup for the selected saved highlight.
     * Intent: Let saved highlights open their own editor directly from the chart hit test.
     * @param request The clicked highlight index and screen position.
     * @returns Nothing.
     */
    function handleOpenHighlightRename(request: PanelHighlightEditRequest) {
        const sHighlight = latestPanelInfoRef.current.highlights?.[request.highlightIndex];

        if (!sHighlight) {
            closeHighlightRenamePopover();
            return;
        }

        closeContextMenu();
        closeCreateAnnotationPopover();
        closeAnnotationPopover();
        setHighlightRenameState({
            isOpen: true,
            highlightIndex: request.highlightIndex,
            position: request.position,
            labelText: sHighlight.text || DEFAULT_HIGHLIGHT_LABEL,
        });
    }

    /**
     * Opens the annotation editor for an existing saved series annotation.
     * Intent: Keep inline annotation edits inside the panel save path.
     * @param request The saved annotation edit request emitted by the chart click handler.
     * @returns Nothing.
     */
    function handleOpenSeriesAnnotationEditor(request: PanelSeriesAnnotationEditRequest) {
        const sCurrentPanelInfo = latestPanelInfoRef.current;
        const sSeriesInfo = sCurrentPanelInfo.data.tag_set[request.seriesIndex];

        if (!sSeriesInfo) {
            closeAnnotationPopover();
            return;
        }

        const sCurrentAnnotation = sSeriesInfo.annotations?.[request.annotationIndex];

        if (!sCurrentAnnotation) {
            closeAnnotationPopover();
            return;
        }

        closeContextMenu();
        closeHighlightRenamePopover();
        closeCreateAnnotationPopover();
        setAnnotationPopoverState({
            isOpen: true,
            seriesIndex: request.seriesIndex,
            annotationIndex: request.annotationIndex,
            position: request.position,
            labelText: sCurrentAnnotation.text ?? DEFAULT_ANNOTATION_LABEL,
            timeRange: sCurrentAnnotation.timeRange,
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
            highlights: sCurrentHighlights.map((highlight, index) =>
                index === sHighlightIndex
                    ? {
                          ...highlight,
                          text: sNextLabelText,
                      }
                    : highlight,
            ),
        };

        latestPanelInfoRef.current = sNextPanelInfo;
        pChartBoardActions.onSavePanel(sNextPanelInfo);
        closeHighlightRenamePopover();
    }

    /**
     * Persists a new series annotation from the toolbar popup.
     * Intent: Keep annotation creation explicit and detached from chart-click hit testing.
     * @returns Nothing.
     */
    function applyCreateSeriesAnnotation() {
        const sSeriesIndex = createAnnotationPopoverState.seriesIndex;
        const sAnnotationTimestamp = createUtcAnnotationTimestamp(
            createAnnotationPopoverState.yearText,
            createAnnotationPopoverState.monthText,
            createAnnotationPopoverState.dayText,
        );
        const sCurrentPanelInfo = latestPanelInfoRef.current;

        if (
            sSeriesIndex === undefined ||
            sAnnotationTimestamp === undefined ||
            !sCurrentPanelInfo.data.tag_set[sSeriesIndex]
        ) {
            return;
        }

        const sNextLabelText =
            createAnnotationPopoverState.labelText.trim() || DEFAULT_ANNOTATION_LABEL;
        const sNextPanelInfo: PanelInfo = {
            ...sCurrentPanelInfo,
            data: {
                ...sCurrentPanelInfo.data,
                tag_set: sCurrentPanelInfo.data.tag_set.map((seriesInfo, seriesIndex) => {
                    if (seriesIndex !== sSeriesIndex) {
                        return seriesInfo;
                    }

                    return {
                        ...seriesInfo,
                        annotations: [
                            ...seriesInfo.annotations,
                            {
                                text: sNextLabelText,
                                timeRange: {
                                    startTime: sAnnotationTimestamp,
                                    endTime: sAnnotationTimestamp,
                                },
                            },
                        ],
                    };
                }),
            },
        };

        latestPanelInfoRef.current = sNextPanelInfo;
        pChartBoardActions.onSavePanel(sNextPanelInfo);
        closeCreateAnnotationPopover();
    }

    /**
     * Persists the current annotation editor state back into the selected series.
     * Intent: Save series annotations through the same normalized panel save path as other panel edits.
     * @returns Nothing.
     */
    function applySeriesAnnotation() {
        const sSeriesIndex = annotationPopoverState.seriesIndex;
        const sTimeRange = annotationPopoverState.timeRange;
        const sCurrentPanelInfo = latestPanelInfoRef.current;

        if (
            sSeriesIndex === undefined ||
            annotationPopoverState.annotationIndex === undefined ||
            !sTimeRange ||
            !sCurrentPanelInfo.data.tag_set[sSeriesIndex]
        ) {
            closeAnnotationPopover();
            return;
        }

        const sNextLabelText = annotationPopoverState.labelText.trim() || DEFAULT_ANNOTATION_LABEL;
        const sNextPanelInfo: PanelInfo = {
            ...sCurrentPanelInfo,
            data: {
                ...sCurrentPanelInfo.data,
                tag_set: sCurrentPanelInfo.data.tag_set.map((seriesInfo, seriesIndex) => {
                    if (seriesIndex !== sSeriesIndex) {
                        return seriesInfo;
                    }

                    return {
                        ...seriesInfo,
                        annotations: seriesInfo.annotations.map((annotation, annotationIndex) =>
                            annotationIndex === annotationPopoverState.annotationIndex
                                ? {
                                      ...annotation,
                                      text: sNextLabelText,
                                      timeRange: { ...sTimeRange },
                                  }
                                : annotation,
                        ),
                    };
                }),
            },
        };

        latestPanelInfoRef.current = sNextPanelInfo;
        pChartBoardActions.onSavePanel(sNextPanelInfo);
        closeAnnotationPopover();
    }

    /**
     * Deletes the currently edited annotation from its parent series.
     * Intent: Let the inline annotation editor remove mistaken annotations without opening the panel editor.
     * @returns Nothing.
     */
    function deleteSeriesAnnotation() {
        const sSeriesIndex = annotationPopoverState.seriesIndex;
        const sAnnotationIndex = annotationPopoverState.annotationIndex;
        const sCurrentPanelInfo = latestPanelInfoRef.current;

        if (
            sSeriesIndex === undefined ||
            sAnnotationIndex === undefined ||
            !sCurrentPanelInfo.data.tag_set[sSeriesIndex]
        ) {
            closeAnnotationPopover();
            return;
        }

        const sNextPanelInfo: PanelInfo = {
            ...sCurrentPanelInfo,
            data: {
                ...sCurrentPanelInfo.data,
                tag_set: sCurrentPanelInfo.data.tag_set.map((seriesInfo, seriesIndex) => {
                    if (seriesIndex !== sSeriesIndex) {
                        return seriesInfo;
                    }

                    return {
                        ...seriesInfo,
                        annotations: seriesInfo.annotations.filter(
                            (_aAnnotation, annotationIndex) =>
                                annotationIndex !== sAnnotationIndex,
                        ),
                    };
                }),
            },
        };

        latestPanelInfoRef.current = sNextPanelInfo;
        pChartBoardActions.onSavePanel(sNextPanelInfo);
        closeAnnotationPopover();
    }

    const timeText = navigateState.panelRange.startTime
        ? `${changeUtcToText(navigateState.panelRange.startTime)} ~ ${changeUtcToText(navigateState.panelRange.endTime)}`
        : '';
    const intervalText =
        !panelState.isRaw && hasResolvedIntervalOption(navigateState.rangeOption)
            ? `${navigateState.rangeOption.IntervalValue}${navigateState.rangeOption.IntervalType}`
            : '';
    const createAnnotationSeriesOptions = data.tag_set.map((seriesInfo, seriesIndex) => ({
        label: getSeriesAnnotationLabel(seriesInfo.alias, seriesInfo.sourceTagName),
        value: String(seriesIndex),
    }));
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
        isAnnotationActive: panelState.isAnnotationActive,
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
                pRefreshHandlers={refreshHandlers}
                pSavedChartInfo={{ chartData: navigateState.chartData, chartRef: chartRef }}
                onOpenDeleteConfirm={openDeleteConfirm}
            />
            <PanelChartBody
                pChartRefs={{ areaChart: areaChartRef, chartWrap: chartRef }}
                pChartState={{
                    axes,
                    display,
                    seriesList: data.tag_set,
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
                    onOpenSeriesAnnotationEditor: handleOpenSeriesAnnotationEditor,
                }}
                pShiftHandlers={shiftHandlers}
                pTagSet={data.tag_set}
                pSetIsFFTModal={(value: SetStateAction<boolean>) =>
                    setPanelState((p) => ({
                        ...p,
                        isFFTModal: typeof value === 'function' ? value(p.isFFTModal) : value,
                    }))
                }
                pOnDragSelectStateChange={handleDragSelectStateChange}
                pOnHighlightSelection={handleHighlightSelection}
            />
            <PanelChartFooter
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
                refreshHandlers={refreshHandlers}
                onClose={closeContextMenu}
                onOpenDeleteConfirm={openDeleteConfirm}
            />
            <HighlightRenamePopover
                isOpen={highlightRenameState.isOpen}
                position={highlightRenameState.position}
                labelText={highlightRenameState.labelText}
                onLabelTextChange={(value) =>
                    setHighlightRenameState((prev) => ({
                        ...prev,
                        labelText: value,
                    }))
                }
                onApply={applyHighlightRename}
                onClose={closeHighlightRenamePopover}
            />
            <CreateSeriesAnnotationPopover
                isOpen={createAnnotationPopoverState.isOpen}
                position={createAnnotationPopoverState.position}
                seriesOptions={createAnnotationSeriesOptions}
                selectedSeriesValue={
                    createAnnotationPopoverState.seriesIndex !== undefined
                        ? String(createAnnotationPopoverState.seriesIndex)
                        : ''
                }
                yearText={createAnnotationPopoverState.yearText}
                monthText={createAnnotationPopoverState.monthText}
                dayText={createAnnotationPopoverState.dayText}
                labelText={createAnnotationPopoverState.labelText}
                onSeriesValueChange={(value) =>
                    setCreateAnnotationPopoverState((prev) => ({
                        ...prev,
                        seriesIndex: Number.isInteger(Number(value)) ? Number(value) : undefined,
                    }))
                }
                onYearTextChange={(value) =>
                    setCreateAnnotationPopoverState((prev) => ({
                        ...prev,
                        yearText: value,
                    }))
                }
                onMonthTextChange={(value) =>
                    setCreateAnnotationPopoverState((prev) => ({
                        ...prev,
                        monthText: value,
                    }))
                }
                onDayTextChange={(value) =>
                    setCreateAnnotationPopoverState((prev) => ({
                        ...prev,
                        dayText: value,
                    }))
                }
                onLabelTextChange={(value) =>
                    setCreateAnnotationPopoverState((prev) => ({
                        ...prev,
                        labelText: value,
                    }))
                }
                onApply={applyCreateSeriesAnnotation}
                onClose={closeCreateAnnotationPopover}
            />
            <SeriesAnnotationPopover
                isOpen={annotationPopoverState.isOpen}
                position={annotationPopoverState.position}
                labelText={annotationPopoverState.labelText}
                onLabelTextChange={(value) =>
                    setAnnotationPopoverState((prev) => ({
                        ...prev,
                        labelText: value,
                    }))
                }
                onApply={applySeriesAnnotation}
                onDelete={deleteSeriesAnnotation}
                onClose={closeAnnotationPopover}
            />
            {isDeleteModalOpen && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModalOpen}
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
 * @param prevProps The previous props snapshot.
 * @param nextProps The next props snapshot.
 * @returns Whether the memoized container should reuse the previous render.
 */
function areBoardPanelPropsEqual(
    prevProps: Readonly<BoardPanelProps>,
    nextProps: Readonly<BoardPanelProps>,
): boolean {
    return (
        prevProps.pPanelInfo === nextProps.pPanelInfo &&
        prevProps.pBoardContext.id === nextProps.pBoardContext.id &&
        prevProps.pBoardContext.time === nextProps.pBoardContext.time &&
        prevProps.pIsActiveTab === nextProps.pIsActiveTab &&
        prevProps.pChartBoardState.refreshCount === nextProps.pChartBoardState.refreshCount &&
        prevProps.pChartBoardState.timeBoundaryRanges ===
            nextProps.pChartBoardState.timeBoundaryRanges &&
        prevProps.pChartBoardState.globalTimeRange === nextProps.pChartBoardState.globalTimeRange &&
        prevProps.pChartBoardActions.onPersistPanelState ===
            nextProps.pChartBoardActions.onPersistPanelState &&
        prevProps.pChartBoardActions.onSavePanel ===
            nextProps.pChartBoardActions.onSavePanel &&
        prevProps.pChartBoardActions.onSetGlobalTimeRange ===
            nextProps.pChartBoardActions.onSetGlobalTimeRange &&
        prevProps.pChartBoardActions.onOpenEditRequest ===
            nextProps.pChartBoardActions.onOpenEditRequest &&
        prevProps.pIsSelectedForOverlap === nextProps.pIsSelectedForOverlap &&
        prevProps.pIsOverlapAnchor === nextProps.pIsOverlapAnchor &&
        prevProps.pRollupTableList === nextProps.pRollupTableList
    );
}

export default memo(BoardPanel, areBoardPanelPropsEqual);
