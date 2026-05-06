import PanelChartFooter from './PanelChartFooter';
import PanelHeader from './PanelHeader';
import PanelChartBody from './PanelChartBody';
import PanelOverlays from './PanelOverlays';
import PanelEditor from './editor/PanelEditor';
import { convertPanelInfoToEditorConfig } from './editor/PanelEditorConfigConverter';
import { FFTModal } from '../boardModal/FFTModal';
import './PanelChartShell.scss';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { changeUtcToText } from '@/utils/helpers/date';
import { loadPanelChartState } from '../fetch/PanelChartStateLoader';
import {
    createPanelRangeControlHandlers,
    normalizeNavigatorRange,
} from './rangeControl/PanelRangeControlLogic';
import { EMPTY_TIME_RANGE } from '../time/TimeConstants';
import { hasResolvedIntervalOption } from './PanelIntervalOptionUtils';
import {
    isSameTimeRange,
    resolvePanelTimeRange,
} from './PanelTimeRangeResolver';
import { resolveTimeBoundaryRanges } from '../fetch/TimeBoundaryRangeResolver';
import type { BoardActions, BoardState } from '../BoardTypes';
import {
    appendSeriesAnnotation,
    buildAnnotationSeriesOptions,
    createUtcAnnotationTimestamp,
    DEFAULT_ANNOTATION_LABEL,
    removeSeriesAnnotation,
    updateSeriesAnnotation,
} from './PanelAnnotationUtils';
import {
    appendPanelHighlight,
    DEFAULT_HIGHLIGHT_LABEL,
    updatePanelHighlight,
} from './PanelHighlightUtils';
import {
    hasLoadedPanelChartData,
    shouldApplyResolvedRange,
} from './PanelContainerUtils';
import { usePanelInteractionState } from './usePanelInteractionState';
import type {
    PanelActionHandlers,
    PanelChartHandle,
    PanelHighlightEditRequest,
    PanelNavigateState,
    PanelPresentationState,
    PanelRefreshHandlers,
    PanelRangeAppliedContext,
    PanelRangeChangeEvent,
    PanelSeriesAnnotationEditRequest,
} from './PanelTypes';
import type { PanelHighlight, PanelInfo } from '../PanelModelTypes';
import type {
    FetchedTimeBoundaryRange,
    ResolvedTimeRangeMs,
    TimeRangeConfig,
} from '../time/TimeTypes';
import type {
    AnnotationModalBundle,
    ContextMenuModalBundle,
    CreateAnnotationModalBundle,
    DeletePanelModalBundle,
    HighlightRenameModalBundle,
} from './modal/PanelModalTypes';
import { buildPanelLoadNavigateStatePatch } from './PanelChartLoadNavigateStatePatch';

export type PanelContainerBoardContext = {
    id: string;
    time: TimeRangeConfig;
};

export type PanelContainerBoardState = Pick<
    BoardState,
    'refreshCount' | 'timeBoundaryRanges' | 'globalTimeRange'
>;

export type PanelContainerBoardActions = Pick<
    BoardActions,
    'onPersistPanelState' | 'onSavePanel' | 'onSetGlobalTimeRange'
>;

const INITIAL_PANEL_NAVIGATE_STATE: PanelNavigateState = {
    chartData: [],
    navigatorChartData: [],
    panelRange: EMPTY_TIME_RANGE,
    navigatorRange: EMPTY_TIME_RANGE,
    rangeOption: undefined,
    preOverflowTimeRange: EMPTY_TIME_RANGE,
};

/**
 * Renders the panel shell and owns the panel chart runtime, persistence, overlap, and editor wiring.
 * Intent: Keep the panel feature orchestration explicit in one place now that the editor no longer has a separate chart path.
 * @param pProps The board panel inputs and board-specific action handlers.
 * @returns The board panel card for the current TagAnalyzer panel.
 */
function PanelContainer({
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
    pTables,
}: {
    pPanelInfo: PanelInfo;
    pBoardContext: PanelContainerBoardContext;
    pIsActiveTab: boolean;
    pChartBoardState: PanelContainerBoardState;
    pChartBoardActions: PanelContainerBoardActions;
    pIsSelectedForOverlap: boolean;
    pIsOverlapAnchor: boolean;
    pRollupTableList: string[];
    pOnToggleOverlapSelection: (start: number, end: number, isRaw: boolean) => void;
    pOnUpdateOverlapSelection: (start: number, end: number, isRaw: boolean) => void;
    pOnDeletePanel: (start: number, end: number, isRaw: boolean) => void;
    pTables: string[];
}) {
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
    const [panelHighlights, setPanelHighlights] = useState<PanelHighlight[]>(
        () => pPanelInfo.highlights ?? [],
    );
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [shouldRefreshAfterEdit, setShouldRefreshAfterEdit] = useState(false);
    const [hasInitializedChartRanges, setHasInitializedChartRanges] = useState(false);
    const latestPanelInfo = {
        ...pPanelInfo,
        highlights: panelHighlights,
    };
    const initialEditorConfig = useMemo(
        () => convertPanelInfoToEditorConfig(pPanelInfo),
        [pPanelInfo],
    );
    const latestPanelInfoRef = useRef<PanelInfo | null>(null);
    const [navigateState, setNavigateState] = useState<PanelNavigateState>(
        INITIAL_PANEL_NAVIGATE_STATE,
    );
    const navigateStateRef = useRef<PanelNavigateState>(INITIAL_PANEL_NAVIGATE_STATE);
    const skipNextFetchRef = useRef(false);
    const panelLoadRequestIdRef = useRef(0);
    const loadedDataRangeRef = useRef<ResolvedTimeRangeMs>(EMPTY_TIME_RANGE);
    const {
        panelState,
        fftSelection,
        contextMenuState,
        highlightRenameState,
        createAnnotationPopoverState,
        annotationPopoverState,
        setFftSelection,
        setFftModalOpen,
        handlePanelContextMenu,
        closeContextMenu,
        closeHighlightRenamePopover,
        openHighlightRenamePopover,
        updateHighlightRenameLabelText,
        updateHighlightRenameFillColor,
        updateHighlightRenameTextColor,
        updateCreateAnnotationSeriesValue,
        updateCreateAnnotationYearText,
        updateCreateAnnotationMonthText,
        updateCreateAnnotationDayText,
        updateCreateAnnotationLabelText,
        updateSeriesAnnotationLabelText,
        openSeriesAnnotationPopover,
        closeCreateAnnotationPopover,
        closeAnnotationPopover,
        closeTransientPanelPopovers,
        toggleDragSelect,
        toggleHighlight,
        toggleAnnotation,
        toggleEdit,
        toggleRaw,
        handleDragSelectStateChange,
        openFftModal,
    } = usePanelInteractionState({
        initialIsRaw: pPanelInfo.toolbar.isRaw,
        panelKey: meta.index_key,
        panelRange: navigateState.panelRange,
        navigatorRange: navigateState.navigatorRange,
        seriesCount: data.tag_set.length,
        panelFormRef: panelFormRef,
        onPersistPanelState: pChartBoardActions.onPersistPanelState,
        onRefreshPanelData: refreshPanelData,
    });
    latestPanelInfoRef.current = latestPanelInfo;

    function getLatestPanelInfo() {
        return latestPanelInfoRef.current ?? latestPanelInfo;
    }

    // Derived
    const boardTime = pBoardContext.time;

    /**
     * Persists the applied panel range through the board lane after chart data settles.
     * Intent: Keep board persistence and overlap state updates tied to one applied range.
     * @param panelRange The final visible panel range.
     * @param context The navigator range and raw-mode context for the applied panel range.
     * @returns Nothing.
     */
    function handlePanelRangeApplied(
        panelRange: ResolvedTimeRangeMs,
        context: PanelRangeAppliedContext,
    ) {
        if (time.useTimeKeeper) {
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

    function savePanel(nextPanelInfo: PanelInfo) {
        latestPanelInfoRef.current = nextPanelInfo;
        setPanelHighlights(nextPanelInfo.highlights ?? []);
        pChartBoardActions.onSavePanel(nextPanelInfo);
    }

    function updateNavigateState(patch: Partial<PanelNavigateState>) {
        setNavigateState((prev) => {
            const sNextNavigateState = { ...prev, ...patch };
            navigateStateRef.current = sNextNavigateState;
            return sNextNavigateState;
        });
    }

    async function refreshPanelData(
        timeRange: ResolvedTimeRangeMs | undefined,
        raw: boolean,
        dataRange: ResolvedTimeRangeMs | undefined,
    ) {
        const sRequestedRange = timeRange ?? navigateStateRef.current.panelRange;
        const sLoadedDataRange = dataRange ?? sRequestedRange;
        const sRequestId = ++panelLoadRequestIdRef.current;
        const sMeasuredChartWidth = areaChartRef.current?.clientWidth;
        const sChartWidth =
            typeof sMeasuredChartWidth === 'number' && sMeasuredChartWidth > 0
                ? sMeasuredChartWidth
                : 1;
        const sLoadState = await loadPanelChartState(
            pPanelInfo.data,
            pPanelInfo.time,
            pPanelInfo.axes,
            boardTime,
            sChartWidth,
            raw,
            sLoadedDataRange,
            pRollupTableList,
        );

        if (sRequestId !== panelLoadRequestIdRef.current) {
            return {
                appliedRange: navigateStateRef.current.panelRange,
                isStale: true,
            };
        }

        const sAppliedRange = sLoadState.overflowRange ?? sRequestedRange;
        loadedDataRangeRef.current = sLoadedDataRange;

        updateNavigateState(
            buildPanelLoadNavigateStatePatch(
                sLoadState,
                undefined,
                navigateStateRef.current.rangeOption,
            ),
        );
        if (sLoadState.overflowRange) {
            skipNextFetchRef.current = true;
            chartRef.current?.setPanelRange(sLoadState.overflowRange);
        }

        return {
            appliedRange: sAppliedRange,
            isStale: false,
        };
    }

    function notifyPanelRangeApplied(panelRange: ResolvedTimeRangeMs) {
        handlePanelRangeApplied(panelRange, {
            navigatorRange: navigateStateRef.current.navigatorRange,
            isRaw: panelState.isRaw,
        });
    }

    async function applyPanelAndNavigatorRanges(
        panelRange: ResolvedTimeRangeMs,
        navigatorRange: ResolvedTimeRangeMs,
        raw = panelState.isRaw,
    ) {
        const sCurrentPanelRange = navigateStateRef.current.panelRange;
        const sCurrentNavigatorRange = navigateStateRef.current.navigatorRange;
        const sLoadedDataRange = loadedDataRangeRef.current;

        if (
            isSameTimeRange(panelRange, sCurrentPanelRange) &&
            isSameTimeRange(navigatorRange, sCurrentNavigatorRange)
        ) {
            return;
        }

        const sNavigatorRangeChanged = !isSameTimeRange(
            navigatorRange,
            sCurrentNavigatorRange,
        );
        const sPreviousWidth = sCurrentPanelRange.endTime - sCurrentPanelRange.startTime;
        const sNextWidth = panelRange.endTime - panelRange.startTime;
        const sVisibleRangeZoomed =
            !sNavigatorRangeChanged &&
            sPreviousWidth > 0 &&
            Math.abs(sNextWidth - sPreviousWidth) / sPreviousWidth > 0.01;
        const sPanelEscapedLoadedData =
            !sNavigatorRangeChanged &&
            sLoadedDataRange.startTime > 0 &&
            (panelRange.startTime < sLoadedDataRange.startTime ||
                panelRange.endTime > sLoadedDataRange.endTime);
        const sNeedsFetch =
            sNavigatorRangeChanged || sVisibleRangeZoomed || sPanelEscapedLoadedData;
        const sDataRange = sNavigatorRangeChanged ? navigatorRange : panelRange;
        const sPreFetchNavigatorData = navigateStateRef.current.navigatorChartData;

        updateNavigateState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
            preOverflowTimeRange: EMPTY_TIME_RANGE,
        });

        if (!sNeedsFetch) {
            notifyPanelRangeApplied(panelRange);
            return;
        }

        const sRefreshResult = await refreshPanelData(panelRange, raw, sDataRange);
        if (sRefreshResult.isStale) {
            return;
        }

        if (!sNavigatorRangeChanged) {
            updateNavigateState({ navigatorChartData: sPreFetchNavigatorData });
        }

        notifyPanelRangeApplied(sRefreshResult.appliedRange);
    }

    function handleNavigatorRangeChange(event: PanelRangeChangeEvent) {
        if (event.min === undefined || event.max === undefined) {
            return;
        }

        const sNextNavigatorRange = normalizeNavigatorRange({
            startTime: event.min,
            endTime: event.max,
        });
        updateNavigateState({ navigatorRange: sNextNavigatorRange });
    }

    async function handlePanelRangeChange(event: PanelRangeChangeEvent) {
        if (event.min === undefined || event.max === undefined) {
            return;
        }

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

        await applyPanelAndNavigatorRanges(
            sNextPanelRange,
            sCurrentNavigatorRange,
            undefined,
        );
    }

    function setExtremes(
        panelRange: ResolvedTimeRangeMs,
        navigatorRange: ResolvedTimeRangeMs | undefined,
    ) {
        void applyPanelAndNavigatorRanges(
            panelRange,
            navigatorRange ?? navigateStateRef.current.navigatorRange,
            undefined,
        );
    }

    async function applyLoadedRanges(
        panelRange: ResolvedTimeRangeMs,
        navigatorRange: ResolvedTimeRangeMs = panelRange,
    ) {
        updateNavigateState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
            preOverflowTimeRange: EMPTY_TIME_RANGE,
        });

        const sRefreshResult = await refreshPanelData(
            panelRange,
            panelState.isRaw,
            navigatorRange,
        );
        if (sRefreshResult.isStale) {
            return;
        }

        updateNavigateState({
            panelRange: sRefreshResult.appliedRange,
            navigatorRange: navigatorRange,
        });
    }

    async function resolveFreshTimeBoundaryRanges(): Promise<FetchedTimeBoundaryRange | null> {
        return (
            (await resolveTimeBoundaryRanges(
                data.tag_set,
                boardTime,
                time.rangeConfig,
            )) ?? pChartBoardState.timeBoundaryRanges
        );
    }

    async function applyResolvedRange(
        resolveRange: (
            timeBoundaryRanges: FetchedTimeBoundaryRange | null,
        ) => Promise<ResolvedTimeRangeMs>,
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
        setHasInitializedChartRanges(false);

        const sResolvedRange = await resolvePanelTimeRange(
            boardTime,
            data,
            time,
            pChartBoardState.timeBoundaryRanges,
            'initialize',
        );
        let sPanelRange = sResolvedRange;
        let sNavigatorRange = sResolvedRange;

        if (time.useTimeKeeper) {
            const sSavedPanelRange = time.timeKeeper?.panelRange;
            const sSavedNavigatorRange = time.timeKeeper?.navigatorRange;

            if (
                sSavedPanelRange?.startTime !== undefined &&
                sSavedPanelRange.endTime !== undefined &&
                sSavedNavigatorRange?.startTime !== undefined &&
                sSavedNavigatorRange.endTime !== undefined
            ) {
                sPanelRange = sSavedPanelRange;
                sNavigatorRange = sSavedNavigatorRange;
            }
        }

        await applyLoadedRanges(sPanelRange, sNavigatorRange);
        setHasInitializedChartRanges(true);
    };

    /**
     * Reloads the panel time range using the same resolver as the first panel load.
     * Intent: Make the refresh-time button restore the initial data-derived range instead of the reset-specific board range.
     * @returns Nothing.
     */
    const refreshInitialTimeRange = async function refreshInitialTimeRange() {
        await applyResolvedRange((timeBoundaryRanges) =>
            resolvePanelTimeRange(
                boardTime,
                data,
                time,
                timeBoundaryRanges,
                'initialize',
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
            resolvePanelTimeRange(
                boardTime,
                data,
                time,
                timeBoundaryRanges,
                'reset',
            ),
        );
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

        const sNextHighlights = appendPanelHighlight(panelHighlights, {
            startTime: sStartTime,
            endTime: sEndTime,
        });

        savePanel({
            ...getLatestPanelInfo(),
            highlights: sNextHighlights,
        });
    }

    // --- Composed handler objects ---

    const sResolvedIntervalOption = hasResolvedIntervalOption(navigateState.rangeOption)
        ? navigateState.rangeOption
        : undefined;

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
        onToggleEdit: toggleEdit,
        onOpenFft: openFftModal,
        onSetGlobalTime: () => {
            if (!sResolvedIntervalOption) return;

            const sPreOverflowRange = navigateState.preOverflowTimeRange;
            const sGlobalTargetRange =
                sPreOverflowRange.startTime > 0 && sPreOverflowRange.endTime > 0
                    ? sPreOverflowRange
                    : navigateState.panelRange;

            pChartBoardActions.onSetGlobalTimeRange({
                dataTime: sGlobalTargetRange,
                navigatorTime: navigateState.navigatorRange,
                interval: sResolvedIntervalOption,
            });
        },
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
     * Opens the rename popup for the selected saved highlight.
     * Intent: Let saved highlights open their own editor directly from the chart hit test.
     * @param request The clicked highlight index and screen position.
     * @returns Nothing.
     */
    function handleOpenHighlightRename(request: PanelHighlightEditRequest) {
        const sHighlight = getLatestPanelInfo().highlights?.[request.highlightIndex];

        if (!sHighlight) {
            closeHighlightRenamePopover();
            return;
        }

        closeContextMenu();
        closeCreateAnnotationPopover();
        closeAnnotationPopover();
        openHighlightRenamePopover({
            highlightIndex: request.highlightIndex,
            position: request.position,
            labelText: sHighlight.text || DEFAULT_HIGHLIGHT_LABEL,
            fillColor: sHighlight.fillColor,
            textColor: sHighlight.textColor,
        });
    }

    /**
     * Opens the annotation editor for an existing saved series annotation.
     * Intent: Keep inline annotation edits inside the panel save path.
     * @param request The saved annotation edit request emitted by the chart click handler.
     * @returns Nothing.
     */
    function handleOpenSeriesAnnotationEditor(request: PanelSeriesAnnotationEditRequest) {
        const sCurrentPanelInfo = getLatestPanelInfo();
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
        openSeriesAnnotationPopover({
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

        if (sHighlightIndex === undefined) {
            closeHighlightRenamePopover();
            return;
        }

        const sNextHighlights = updatePanelHighlight(
            panelHighlights,
            sHighlightIndex,
            highlightRenameState.labelText,
            highlightRenameState.fillColor,
            highlightRenameState.textColor,
        );

        if (!sNextHighlights) {
            closeHighlightRenamePopover();
            return;
        }

        savePanel({
            ...getLatestPanelInfo(),
            highlights: sNextHighlights,
        });
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

        if (sSeriesIndex === undefined || sAnnotationTimestamp === undefined) {
            return;
        }

        const sNextPanelInfo = appendSeriesAnnotation(
            getLatestPanelInfo(),
            sSeriesIndex,
            sAnnotationTimestamp,
            createAnnotationPopoverState.labelText,
        );

        if (!sNextPanelInfo) {
            return;
        }

        savePanel(sNextPanelInfo);
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

        if (
            sSeriesIndex === undefined ||
            annotationPopoverState.annotationIndex === undefined ||
            !sTimeRange
        ) {
            closeAnnotationPopover();
            return;
        }

        const sNextPanelInfo = updateSeriesAnnotation(
            getLatestPanelInfo(),
            sSeriesIndex,
            annotationPopoverState.annotationIndex,
            sTimeRange,
            annotationPopoverState.labelText,
        );

        if (!sNextPanelInfo) {
            closeAnnotationPopover();
            return;
        }

        savePanel(sNextPanelInfo);
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

        if (sSeriesIndex === undefined || sAnnotationIndex === undefined) {
            closeAnnotationPopover();
            return;
        }

        const sNextPanelInfo = removeSeriesAnnotation(
            getLatestPanelInfo(),
            sSeriesIndex,
            sAnnotationIndex,
        );

        if (!sNextPanelInfo) {
            closeAnnotationPopover();
            return;
        }

        savePanel(sNextPanelInfo);
        closeAnnotationPopover();
    }

    function saveEditedPanel(nextPanelInfo: PanelInfo) {
        setShouldRefreshAfterEdit(true);
        savePanel(nextPanelInfo);
    }

    const timeText = navigateState.panelRange.startTime
        ? `${changeUtcToText(navigateState.panelRange.startTime)} ~ ${changeUtcToText(navigateState.panelRange.endTime)}`
        : '';
    const intervalText =
        !panelState.isRaw && sResolvedIntervalOption
            ? `${sResolvedIntervalOption.IntervalValue}${sResolvedIntervalOption.IntervalType}`
            : '';
    const createAnnotationSeriesOptions = buildAnnotationSeriesOptions(data.tag_set);
    const presentationState: PanelPresentationState = {
        title: meta.chart_title,
        timeText,
        intervalText,
        isEdit: panelState.isEditing,
        isRaw: panelState.isRaw,
        isSelectedForOverlap: pIsSelectedForOverlap,
        isOverlapAnchor: pIsOverlapAnchor,
        canToggleOverlap: data.tag_set.length === 1,
        isHighlightActive: panelState.isHighlightActive,
        isAnnotationActive: panelState.isAnnotationActive,
        isDragSelectActive: panelState.isDragSelectActive,
        canOpenFft: fftSelection !== undefined,
        canSetGlobalTime: Boolean(navigateState.rangeOption),
        canSaveLocal: hasLoadedChartData,
    };
    const contextMenuModalBundle: ContextMenuModalBundle = {
        state: contextMenuState,
        pPresentationState: presentationState,
        pActionHandlers: actionHandlers,
        pRefreshHandlers: refreshHandlers,
        onClose: closeContextMenu,
        onOpenDeleteConfirm: openDeleteConfirm,
    };
    const highlightRenameModalBundle: HighlightRenameModalBundle = {
        state: highlightRenameState,
        onLabelTextChange: updateHighlightRenameLabelText,
        onFillColorChange: updateHighlightRenameFillColor,
        onTextColorChange: updateHighlightRenameTextColor,
        onApply: applyHighlightRename,
        onClose: closeHighlightRenamePopover,
    };
    const createAnnotationModalBundle: CreateAnnotationModalBundle = {
        state: createAnnotationPopoverState,
        seriesOptions: createAnnotationSeriesOptions,
        onSeriesValueChange: updateCreateAnnotationSeriesValue,
        onYearTextChange: updateCreateAnnotationYearText,
        onMonthTextChange: updateCreateAnnotationMonthText,
        onDayTextChange: updateCreateAnnotationDayText,
        onLabelTextChange: updateCreateAnnotationLabelText,
        onApply: applyCreateSeriesAnnotation,
        onClose: closeCreateAnnotationPopover,
    };
    const annotationModalBundle: AnnotationModalBundle = {
        state: annotationPopoverState,
        onLabelTextChange: updateSeriesAnnotationLabelText,
        onApply: applySeriesAnnotation,
        onDelete: deleteSeriesAnnotation,
        onClose: closeAnnotationPopover,
    };
    const deletePanelModalBundle: DeletePanelModalBundle = {
        isOpen: isDeleteModalOpen,
        setIsOpen: setIsDeleteModalOpen,
        onDelete: actionHandlers.onDelete,
    };

    // --- Effects ---

    useEffect(() => {
        setPanelHighlights(pPanelInfo.highlights ?? []);
    }, [pPanelInfo.highlights]);

    useEffect(() => {
        if (!pChartBoardState.globalTimeRange || !hasLoadedChartData) return;
        updateNavigateState({ rangeOption: pChartBoardState.globalTimeRange.interval });
        setExtremes(
            pChartBoardState.globalTimeRange.data,
            pChartBoardState.globalTimeRange.navigator,
        );
    }, [hasLoadedChartData, pChartBoardState.globalTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

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
            <PanelHeader
                pPresentationState={presentationState}
                pActionHandlers={actionHandlers}
                pRefreshHandlers={refreshHandlers}
                pSavedChartInfo={{ chartData: navigateState.chartData, chartRef: chartRef }}
                onOpenDeleteConfirm={openDeleteConfirm}
            />
            <div className="panel-chart-section">
                <PanelChartBody
                    pChartRefs={{ areaChart: areaChartRef, chartWrap: chartRef }}
                    pChartState={{
                        axes,
                        display,
                        seriesList: data.tag_set,
                        useNormalize: pPanelInfo.use_normalize,
                        highlights: panelHighlights,
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
                    pOnDragSelectStateChange={handleDragSelectStateChange}
                    pOnHighlightSelection={handleHighlightSelection}
                    pOnFftSelectionChange={setFftSelection}
                />
                {panelState.isFFTModal && fftSelection && (
                    <FFTModal
                        pSeriesSummaries={fftSelection.seriesSummaries}
                        pStartTime={fftSelection.startTime}
                        pEndTime={fftSelection.endTime}
                        setIsOpen={setFftModalOpen}
                    />
                )}
                <PanelChartFooter
                    pPanelSummary={{
                        tagCount: data.tag_set.length,
                        showLegend: display.show_legend,
                    }}
                    pVisibleRange={navigateState.panelRange}
                    pShiftHandlers={shiftHandlers}
                    pZoomHandlers={zoomHandlers}
                />
            </div>
            {panelState.isEditing && (
                <PanelEditor
                    pInitialEditorConfig={initialEditorConfig}
                    pOnSavePanel={saveEditedPanel}
                    pPanelInfo={pPanelInfo}
                    pTables={pTables}
                />
            )}
            <PanelOverlays
                contextMenuModalBundle={contextMenuModalBundle}
                highlightRenameModalBundle={highlightRenameModalBundle}
                createAnnotationModalBundle={createAnnotationModalBundle}
                annotationModalBundle={annotationModalBundle}
                deletePanelModalBundle={deletePanelModalBundle}
            />
        </div>
    );
}

/**
 * Compares two panel container prop snapshots for memoization.
 * Intent: Skip rerenders when the board inputs and action handlers are unchanged.
 * @param prevInput The previous input snapshot.
 * @param nextInput The next input snapshot.
 * @returns Whether the memoized container should reuse the previous render.
 */
function arePanelContainerInputsEqual(
    prevInput: Readonly<Parameters<typeof PanelContainer>[0]>,
    nextInput: Readonly<Parameters<typeof PanelContainer>[0]>,
): boolean {
    return (
        prevInput.pPanelInfo === nextInput.pPanelInfo &&
        prevInput.pBoardContext.id === nextInput.pBoardContext.id &&
        prevInput.pBoardContext.time === nextInput.pBoardContext.time &&
        prevInput.pIsActiveTab === nextInput.pIsActiveTab &&
        prevInput.pChartBoardState.refreshCount === nextInput.pChartBoardState.refreshCount &&
        prevInput.pChartBoardState.timeBoundaryRanges ===
            nextInput.pChartBoardState.timeBoundaryRanges &&
        prevInput.pChartBoardState.globalTimeRange === nextInput.pChartBoardState.globalTimeRange &&
        prevInput.pChartBoardActions.onPersistPanelState ===
            nextInput.pChartBoardActions.onPersistPanelState &&
        prevInput.pChartBoardActions.onSavePanel ===
            nextInput.pChartBoardActions.onSavePanel &&
        prevInput.pChartBoardActions.onSetGlobalTimeRange ===
            nextInput.pChartBoardActions.onSetGlobalTimeRange &&
        prevInput.pIsSelectedForOverlap === nextInput.pIsSelectedForOverlap &&
        prevInput.pIsOverlapAnchor === nextInput.pIsOverlapAnchor &&
        prevInput.pRollupTableList === nextInput.pRollupTableList &&
        prevInput.pTables === nextInput.pTables
    );
}

export default memo(PanelContainer, arePanelContainerInputsEqual);


