import PanelChartFooter from './PanelChartFooter';
import BoardPanelHeader from './BoardPanelHeader';
import PanelChartBody from './PanelChartBody';
import BoardPanelOverlays from './BoardPanelOverlays';
import PanelEditor from './editor/PanelEditor';
import { convertPanelInfoToEditorConfig } from './editor/PanelEditorConfigConverter';
import { FFTModal } from '../boardModal/FFTModal';
import type { FFTSelectionPayload } from '../boardModal/BoardModalTypes';
import './PanelChartShell.scss';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { changeUtcToText } from '@/utils/helpers/date';
import { loadPanelChartState } from '../utils/fetch/PanelChartStateLoader';
import {
    createPanelRangeControlHandlers,
    getNavigatorRangeFromEvent,
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
import { toStoredTimeRangeInput } from '../utils/time/StoredTimeRangeAdapter';
import { resolveTimeBoundaryRanges } from '../utils/time/TimeBoundaryRangeResolver';
import type {
    BoardChartActions,
    BoardChartState,
    BoardContext,
} from './BoardTypes';
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
    PanelState,
} from './PanelTypes';
import type { PanelHighlight, PanelInfo } from '../utils/panelModelTypes';
import type { ValueRangePair } from '../TagAnalyzerCommonTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import type { PanelSeriesDefinition } from '../utils/series/PanelSeriesTypes';
import type {
    AnnotationModalBundle,
    BoardPanelContextMenuState,
    ContextMenuModalBundle,
    CreateAnnotationModalBundle,
    CreateSeriesAnnotationPopoverState,
    DeletePanelModalBundle,
    HighlightRenameModalBundle,
    HighlightRenameState,
    SeriesAnnotationPopoverState,
} from './modal/PanelModalTypes';
import { buildPanelLoadNavigateStatePatch } from './PanelChartLoadNavigateStatePatch';

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
    pTables: string[];
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

const INITIAL_PANEL_NAVIGATE_STATE: PanelNavigateState = {
    chartData: [],
    navigatorChartData: [],
    panelRange: EMPTY_TIME_RANGE,
    navigatorRange: EMPTY_TIME_RANGE,
    rangeOption: undefined,
    preOverflowTimeRange: EMPTY_TIME_RANGE,
};

const DEFAULT_HIGHLIGHT_LABEL = 'unnamed';
const DEFAULT_ANNOTATION_LABEL = 'note';

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

    if (!Number.isInteger(sYear) || !Number.isInteger(sMonth) || !Number.isInteger(sDay)) {
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

function buildAnnotationSeriesOptions(tagSet: PanelSeriesDefinition[]) {
    return tagSet.map((seriesInfo, seriesIndex) => ({
        label: seriesInfo.alias.trim() || seriesInfo.sourceTagName,
        value: String(seriesIndex),
    }));
}

function appendPanelHighlight(
    highlights: PanelHighlight[],
    timeRange: TimeRangeMs,
    labelText: string = DEFAULT_HIGHLIGHT_LABEL,
): PanelHighlight[] {
    return [
        ...highlights,
        {
            text: labelText.trim() || DEFAULT_HIGHLIGHT_LABEL,
            timeRange: timeRange,
        },
    ];
}

function renamePanelHighlight(
    highlights: PanelHighlight[],
    highlightIndex: number,
    labelText: string,
): PanelHighlight[] | undefined {
    if (!highlights[highlightIndex]) {
        return undefined;
    }

    const sNextLabelText = labelText.trim() || DEFAULT_HIGHLIGHT_LABEL;

    return highlights.map((highlight, index) =>
        index === highlightIndex ? { ...highlight, text: sNextLabelText } : highlight,
    );
}

function appendSeriesAnnotation(
    panelInfo: PanelInfo,
    seriesIndex: number,
    timestamp: number,
    labelText: string,
): PanelInfo | undefined {
    const sSeriesInfo = panelInfo.data.tag_set[seriesIndex];

    if (!sSeriesInfo) {
        return undefined;
    }

    const sNextLabelText = labelText.trim() || DEFAULT_ANNOTATION_LABEL;

    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            tag_set: panelInfo.data.tag_set.map((seriesInfo, currentSeriesIndex) =>
                currentSeriesIndex !== seriesIndex
                    ? seriesInfo
                    : {
                          ...seriesInfo,
                          annotations: [
                              ...(seriesInfo.annotations ?? []),
                              {
                                  text: sNextLabelText,
                                  timeRange: {
                                      startTime: timestamp,
                                      endTime: timestamp,
                                  },
                              },
                          ],
                      },
            ),
        },
    };
}

function updateSeriesAnnotation(
    panelInfo: PanelInfo,
    seriesIndex: number,
    annotationIndex: number,
    timeRange: TimeRangeMs,
    labelText: string,
): PanelInfo | undefined {
    const sSeriesInfo = panelInfo.data.tag_set[seriesIndex];

    if (!sSeriesInfo?.annotations?.[annotationIndex]) {
        return undefined;
    }

    const sNextLabelText = labelText.trim() || DEFAULT_ANNOTATION_LABEL;

    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            tag_set: panelInfo.data.tag_set.map((seriesInfo, currentSeriesIndex) =>
                currentSeriesIndex !== seriesIndex
                    ? seriesInfo
                    : {
                          ...seriesInfo,
                          annotations: (seriesInfo.annotations ?? []).map(
                              (annotation, currentAnnotationIndex) =>
                                  currentAnnotationIndex === annotationIndex
                                      ? {
                                            ...annotation,
                                            text: sNextLabelText,
                                            timeRange: { ...timeRange },
                                        }
                                      : annotation,
                          ),
                      },
            ),
        },
    };
}

function removeSeriesAnnotation(
    panelInfo: PanelInfo,
    seriesIndex: number,
    annotationIndex: number,
): PanelInfo | undefined {
    const sSeriesInfo = panelInfo.data.tag_set[seriesIndex];

    if (!sSeriesInfo?.annotations?.[annotationIndex]) {
        return undefined;
    }

    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            tag_set: panelInfo.data.tag_set.map((seriesInfo, currentSeriesIndex) =>
                currentSeriesIndex !== seriesIndex
                    ? seriesInfo
                    : {
                          ...seriesInfo,
                          annotations: (seriesInfo.annotations ?? []).filter(
                              (_annotation, currentAnnotationIndex) =>
                                  currentAnnotationIndex !== annotationIndex,
                          ),
                      },
            ),
        },
    };
}

/**
 * Returns whether the panel has already resolved a chart range option.
 * Intent: Let the container gate reload logic on a single loaded-state check.
 * @param navigateState The current navigate state snapshot.
 * @returns Whether the panel chart has finished loading range metadata.
 */
function hasLoadedPanelChartData(navigateState: Pick<PanelNavigateState, 'rangeOption'>): boolean {
    return navigateState.rangeOption !== undefined;
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

/**
 * Renders the board panel shell and owns the panel chart runtime, persistence, overlap, and editor wiring.
 * Intent: Keep the panel feature orchestration explicit in one place now that the editor no longer has a separate chart path.
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
    pTables,
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
    const [panelHighlights, setPanelHighlights] = useState<PanelHighlight[]>(
        () => pPanelInfo.highlights ?? [],
    );
    const [createAnnotationPopoverState, setCreateAnnotationPopoverState] =
        useState<CreateSeriesAnnotationPopoverState>(
            INITIAL_CREATE_SERIES_ANNOTATION_POPOVER_STATE,
        );
    const [annotationPopoverState, setAnnotationPopoverState] =
        useState<SeriesAnnotationPopoverState>(INITIAL_SERIES_ANNOTATION_POPOVER_STATE);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [shouldRefreshAfterEdit, setShouldRefreshAfterEdit] = useState(false);
    const [fftSelection, setFftSelection] = useState<FFTSelectionPayload | undefined>(undefined);
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
    const loadedDataRangeRef = useRef<TimeRangeMs>(EMPTY_TIME_RANGE);
    latestPanelInfoRef.current = latestPanelInfo;

    function getLatestPanelInfo() {
        return latestPanelInfoRef.current ?? latestPanelInfo;
    }

    // Derived
    const boardTime = {
        kind: 'resolved' as const,
        value: pBoardContext.time,
    };

    /**
     * Persists the applied panel range through the board lane after chart data settles.
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
        timeRange: TimeRangeMs | undefined,
        raw: boolean,
        dataRange: TimeRangeMs | undefined,
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

    function notifyPanelRangeApplied(panelRange: TimeRangeMs) {
        handlePanelRangeApplied(panelRange, {
            navigatorRange: navigateStateRef.current.navigatorRange,
            isRaw: panelState.isRaw,
        });
    }

    async function applyPanelAndNavigatorRanges(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
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
        const sNextNavigatorRange = getNavigatorRangeFromEvent(event);
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
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs | undefined,
    ) {
        void applyPanelAndNavigatorRanges(
            panelRange,
            navigatorRange ?? navigateStateRef.current.navigatorRange,
            undefined,
        );
    }

    async function applyLoadedRanges(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs = panelRange,
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

    async function resolveFreshTimeBoundaryRanges(): Promise<ValueRangePair | null> {
        return (
            (await resolveTimeBoundaryRanges(
                data.tag_set,
                toStoredTimeRangeInput(boardTime.value),
                toStoredTimeRangeInput({
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
            setFftSelection(undefined);
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
        setFftSelection(undefined);
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
        setFftSelection(undefined);
    };

    /**
     * Toggles the inline panel editor and clears transient chart interaction modes.
     * Intent: Keep the editor lifecycle local to the panel instead of routing through board-level state.
     * @returns Nothing.
     */
    function toggleEdit() {
        closeContextMenu();
        closeTransientPanelPopovers();
        setPanelState((prev) => ({
            ...prev,
            isFFTModal: false,
            isHighlightActive: false,
            isAnnotationActive: false,
            isDragSelectActive: false,
        }));
        setFftSelection(undefined);
        setIsEditing((prev) => !prev);
    }

    /**
     * Applies drag-select state changes reported by the chart body.
     * Intent: Track whether drag-select can still open FFT from the chart selection flow.
     * @param isDragSelectActive Whether drag-select should stay active.
     * @returns Nothing.
     */
    const handleDragSelectStateChange = function handleDragSelectStateChange(
        isDragSelectActive: boolean,
    ) {
        if (!isDragSelectActive) {
            setPanelState((p) => ({
                ...p,
                isDragSelectActive: false,
                isFFTModal: false,
            }));
            setFftSelection(undefined);
        }
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
        onOpenFft: () => setPanelState((p) => ({ ...p, isFFTModal: true })),
        onSetGlobalTime: () => {
            if (!sResolvedIntervalOption) return;
            pChartBoardActions.onSetGlobalTimeRange({
                dataTime: resolveGlobalTimeTargetRange(
                    navigateState.preOverflowTimeRange,
                    navigateState.panelRange,
                ),
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

    function updateHighlightRenameLabelText(labelText: string) {
        setHighlightRenameState((prev) => ({
            ...prev,
            labelText: labelText,
        }));
    }

    function updateCreateAnnotationSeriesValue(value: string) {
        setCreateAnnotationPopoverState((prev) => ({
            ...prev,
            seriesIndex: Number.isInteger(Number(value)) ? Number(value) : undefined,
        }));
    }

    function updateCreateAnnotationYearText(yearText: string) {
        setCreateAnnotationPopoverState((prev) => ({
            ...prev,
            yearText: yearText,
        }));
    }

    function updateCreateAnnotationMonthText(monthText: string) {
        setCreateAnnotationPopoverState((prev) => ({
            ...prev,
            monthText: monthText,
        }));
    }

    function updateCreateAnnotationDayText(dayText: string) {
        setCreateAnnotationPopoverState((prev) => ({
            ...prev,
            dayText: dayText,
        }));
    }

    function updateCreateAnnotationLabelText(labelText: string) {
        setCreateAnnotationPopoverState((prev) => ({
            ...prev,
            labelText: labelText,
        }));
    }

    function updateSeriesAnnotationLabelText(labelText: string) {
        setAnnotationPopoverState((prev) => ({
            ...prev,
            labelText: labelText,
        }));
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
        const sHighlight = getLatestPanelInfo().highlights?.[request.highlightIndex];

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

        if (sHighlightIndex === undefined) {
            closeHighlightRenamePopover();
            return;
        }

        const sNextHighlights = renamePanelHighlight(
            panelHighlights,
            sHighlightIndex,
            highlightRenameState.labelText,
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
        isEdit: isEditing,
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
            <BoardPanelHeader
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
                        setIsOpen={(value: boolean) =>
                            setPanelState((p) => ({
                                ...p,
                                isFFTModal: value,
                            }))
                        }
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
            {isEditing && (
                <PanelEditor
                    pInitialEditorConfig={initialEditorConfig}
                    pOnSavePanel={saveEditedPanel}
                    pPanelInfo={pPanelInfo}
                    pTables={pTables}
                />
            )}
            <BoardPanelOverlays
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
        prevProps.pIsSelectedForOverlap === nextProps.pIsSelectedForOverlap &&
        prevProps.pIsOverlapAnchor === nextProps.pIsOverlapAnchor &&
        prevProps.pRollupTableList === nextProps.pRollupTableList &&
        prevProps.pTables === nextProps.pTables
    );
}

export default memo(BoardPanel, areBoardPanelPropsEqual);
