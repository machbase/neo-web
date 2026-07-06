import { useMemo, useReducer, useRef, type MouseEvent } from 'react';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import { PanelOverlayCursorHint, ANNOTATION_INVALID_TARGET_MESSAGE } from './PanelOverlayCursorHint';
import { Toast, type ContextMenuPosition } from '@/design-system/components';
import PanelFooter from './PanelFooter';
import PanelHeader, { PanelContextMenu } from './PanelHeader';
import PanelBody from './PanelBody';
import PanelEditor from './editor/PanelEditor';
import { FFTModal } from './modal/FFTModal';
import { EditAnnotationModal } from './modal/EditAnnotationModal';
import { EditHighlightModal } from './modal/EditHighlightModal';
import { SelectionSummaryPopover } from './modal/SelectionSummaryPopover';
import TimeRangeModal from '../modals/TimeRangeModal';
import type { GlobalTimeRangeState } from '../domain/BoardDomain';
import type { ChartSeriesData } from '../domain/ChartDomain';
import type {
    PanelAnnotation,
    PanelHighlight,
    PanelInfo,
    PanelRangeState,
    RuntimePanelInfo,
} from '../domain/panel/PanelConfig';
import {
    getPanelConfigFromRuntimePanel,
    DEFAULT_PANEL_HIGHLIGHT_LABEL,
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
} from '../domain/panel/PanelConfig';
import {
    resolvePanelAxesForRuntime,
    resolvePanelDisplayForRuntime,
} from '../domain/panel/PanelRuntime';
import {
    PanelOverlayMode,
    type PanelChartHandle,
    type PanelMarkupHandlers,
} from '../domain/panel/PanelActions';
import {
    MIXED_X_AXIS_KIND_WARNING,
    hasMixedXAxisValueKinds,
    hasNumericBaseTimeSeries,
} from '../domain/SeriesDomain';
import type { PanelRangeChangeOptions } from '../domain/panelRange/PanelRangeApply';
import type { RollupTableMap } from '../fetch/panelData/PanelDataFetchTypes';
import type {
    TimeRangeInput,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { isValidTimeRange } from '../domain/time/TimeRangeUtils';
import { buildSelectionSummaryPayload } from './PanelBrushSelection';
import { useChartAreaWidthObserver } from './useChartAreaWidthObserver';
import { resolveAppliedPanelInfo } from './editor/panelEditorActions';
import { PanelChartLoadStatus } from './data/panelFetchState';
import { buildLoadConfig } from './data/panelChartLoadConfig';
import { usePanelChartDataRuntime } from './usePanelChartDataRuntime';
import { usePanelHeaderInteraction } from './usePanelHeaderInteraction';
import { usePanelRangeControls } from './usePanelRangeControls';
import {
    PanelRuntimeTimeRangeTarget,
    usePanelRuntimeTimeRangeModal,
} from './usePanelRuntimeTimeRangeModal';
import {
    INITIAL_PANEL_OVERLAY_CURSOR_HINT_STATE,
    PanelPopupMode,
    INITIAL_PANEL_INTERACTION_STATE,
    type HighlightPopupState,
    panelOverlayCursorHintReducer,
    panelInteractionReducer,
} from './panelInteractionState';
import {
    addPanelAnnotation,
    addPanelHighlight,
    deletePanelAnnotation,
    deletePanelHighlight,
    getPanelAnnotation,
    getPanelHighlight,
    updatePanelAnnotation,
    updatePanelHighlight,
} from './panelConfigActions';
import './PanelChartShell.scss';

type PanelContainerRuntimeProps = {
    isActive: boolean;
    hasUnsavedBoardChanges: boolean;
    chartAreaWidth: number | undefined;
    boardTimeRange: TimeRangeInput;
    dataRefreshVersion: number;
    rollupTableList: RollupTableMap;
    onRangeStateChange: (
        rangeState: PanelRangeState,
        options?: PanelRangeChangeOptions,
    ) => void;
};


type PanelContainerActions = {
    onChartAreaWidthChange: (width: number | undefined) => void;
    refreshData: () => void;
    refreshTime: () => void;
    expandFullRange: () => void;
    reloadAfterEditorSave: (
        panelInfo: PanelInfo,
        preserveCurrentVisibleRange: boolean,
    ) => void;
    onToggleRaw: () => void;
    onApplyPanelInfo: (panelInfo: PanelInfo) => void;
    onSetGlobalTimeRange: (globalTimeRange: GlobalTimeRangeState) => void;
    onDeletePanel: () => void;
    onToggleOverlap: () => void;
};

type PanelContainerProps = {
    runtimePanelInfo: RuntimePanelInfo;
    runtime: PanelContainerRuntimeProps;
    actions: PanelContainerActions;
};

function PanelContainer({
    runtimePanelInfo,
    runtime: {
        isActive,
        hasUnsavedBoardChanges,
        chartAreaWidth,
        boardTimeRange,
        dataRefreshVersion,
        rollupTableList,
        onRangeStateChange,
    },
    actions: {
        onChartAreaWidthChange,
        refreshData,
        refreshTime,
        expandFullRange,
        reloadAfterEditorSave,
        onToggleRaw,
        onApplyPanelInfo,
        onSetGlobalTimeRange,
        onDeletePanel,
        onToggleOverlap,
    },
}: PanelContainerProps) {
    const panelInfo = useMemo(
        () => getPanelConfigFromRuntimePanel(runtimePanelInfo),
        [runtimePanelInfo],
    );
    const rangeState = runtimePanelInfo.time.runtimeRange;
    const isRaw = panelInfo.mode.isRaw;
    const isOverlapSelected = runtimePanelInfo.isOverlapSelected;
    const chartAreaRef = useRef<HTMLDivElement | null>(null);
    const panelChartApiRef = useRef<PanelChartHandle | null>(null);

    const hasMixedXAxisKinds = hasMixedXAxisValueKinds(panelInfo.query.tagSet);
    const isNumericXAxis =
        !hasMixedXAxisKinds && hasNumericBaseTimeSeries(panelInfo.query.tagSet);
    const effectiveIsRaw = isNumericXAxis || isRaw;
    const runtimePanelConfig = useMemo<PanelInfo>(
        () =>
            effectiveIsRaw === panelInfo.mode.isRaw
                ? panelInfo
                : {
                      ...panelInfo,
                      mode: {
                          ...panelInfo.mode,
                          isRaw: effectiveIsRaw,
                      },
                  },
        [effectiveIsRaw, panelInfo],
    );
    const panelDataLoadConfig = useMemo(
        () => buildLoadConfig(runtimePanelConfig),
        [runtimePanelConfig],
    );
    const runtimeAxes = useMemo(
        () =>
            resolvePanelAxesForRuntime(
                panelInfo.axes,
                panelInfo.display.pixelsPerTick,
                panelInfo.display.mainChartSampling,
            ),
        [
            panelInfo.axes,
            panelInfo.display.mainChartSampling,
            panelInfo.display.pixelsPerTick,
        ],
    );
    const runtimeDisplay = useMemo(
        () => resolvePanelDisplayForRuntime(panelInfo.display),
        [panelInfo.display],
    );

    const [panelUiState, dispatchPanelUiAction] = useReducer(
        panelInteractionReducer,
        INITIAL_PANEL_INTERACTION_STATE,
    );
    const [overlayCursorHintState, dispatchOverlayCursorHintAction] = useReducer(
        panelOverlayCursorHintReducer,
        INITIAL_PANEL_OVERLAY_CURSOR_HINT_STATE,
    );
    const {
        overlayMode,
        popupState,
        editor,
        selectionSummary,
    } = panelUiState;
    const isEditorMounted = editor.status !== 'closed';
    const isEditorClosing = editor.status === 'closing';
    const overlayCursorHint = overlayCursorHintState.hint;
    const hoveredMainSeriesName = overlayCursorHintState.hoveredMainSeriesName;

    useChartAreaWidthObserver(chartAreaRef, onChartAreaWidthChange);
    const {
        mainChartData,
        navigatorChartData,
        displayRangeState,
        resolvedIntervalOption,
        displayNotice,
        loadStatus,
    } = usePanelChartDataRuntime({
        loadConfig: panelDataLoadConfig,
        isActive,
        rangeState,
        chartAreaWidth,
        rollupTableList,
        dataRefreshVersion,
        onRangeStateChange,
    });
    const {
        displayPanelRange,
        displayNavigatorRange,
        isDefaultNavigatorRange,
    } = displayRangeState;
    const {
        rangeActions,
        navigatorShiftActions,
        zoomActions,
    } = usePanelRangeControls({
        requestRangeState: rangeState,
        displayRangeState,
        isNumericXAxis,
        onRangeStateChange,
    });

    function applyEditedPanelConfig(editorConfig: PanelInfo): void {
        const sApplied = resolveAppliedPanelInfo(panelInfo, editorConfig);

        onApplyPanelInfo(sApplied.nextPanelInfo);
        reloadAfterEditorSave(
            sApplied.nextPanelInfo,
            sApplied.preserveCurrentVisibleRange,
        );
    }

    function getHighlight(highlightIndex: number): PanelHighlight {
        return getPanelHighlight(panelInfo, highlightIndex);
    }

    function addHighlight(highlight: PanelHighlight): void {
        onApplyPanelInfo(addPanelHighlight(panelInfo, highlight));
    }

    function updateHighlight(
        highlightIndex: number,
        highlight: PanelHighlight,
    ): void {
        onApplyPanelInfo(updatePanelHighlight(
            panelInfo,
            highlightIndex,
            highlight,
        ));
    }

    function deleteHighlight(highlightIndex: number): void {
        onApplyPanelInfo(deletePanelHighlight(panelInfo, highlightIndex));
    }

    function getAnnotation(annotationIndex: number): PanelAnnotation {
        return getPanelAnnotation(panelInfo, annotationIndex);
    }

    function addAnnotation(annotation: PanelAnnotation): void {
        onApplyPanelInfo(addPanelAnnotation(panelInfo, annotation));
    }

    function updateAnnotation(
        annotationIndex: number,
        annotation: PanelAnnotation,
    ): void {
        onApplyPanelInfo(updatePanelAnnotation(
            panelInfo,
            annotationIndex,
            annotation,
        ));
    }

    function deleteAnnotation(annotationIndex: number): void {
        onApplyPanelInfo(deletePanelAnnotation(panelInfo, annotationIndex));
    }

    const draftHighlight =
        popupState.mode === PanelPopupMode.HIGHLIGHT_EDITOR &&
        popupState.draftHighlight !== undefined
            ? popupState.draftHighlight
            : undefined;

    const isEditing = isEditorMounted && !isEditorClosing;
    const isOverlayModeActive = overlayMode !== PanelOverlayMode.NO_OVERLAY;
    const {
        runtimeState: panelHeaderRuntimeState,
        handleAction: handlePanelAction,
        renameTitle: renamePanelTitle,
    } = usePanelHeaderInteraction({
        panelInfo,
        panelRange: displayPanelRange,
        navigatorRange: displayNavigatorRange,
        resolvedIntervalOption,
        canSaveLocal: loadStatus.chart === PanelChartLoadStatus.Ready,
        isNumericXAxis,
        overlayMode,
        isEditing,
        isRaw: effectiveIsRaw,
        isOverlapSelected,
        onToggleRaw,
        onApplyPanelInfo,
        onSetGlobalTimeRange,
        onRefreshData: refreshData,
        onRefreshTime: refreshTime,
        onExpandFullRange: expandFullRange,
        onPanelInteractionAction: (actionKey) => {
            dispatchPanelUiAction({ type: 'PANEL_ACTION', actionKey });
        },
    });
    const {
        runtimeTimeRangeModal,
        openRuntimeTimeRangeModal,
        closeRuntimeTimeRangeModal,
        applyRuntimeConcreteRange,
        applyRuntimeTimeRangeInput,
    } = usePanelRuntimeTimeRangeModal({
        boardTimeRange,
        rangeState,
        displayPanelRange,
        displayNavigatorRange,
        isDefaultNavigatorRange,
        isNumericXAxis,
        rangeActions,
        onRangeStateChange,
    });

    function handleSelection(selectionRange: TimeRangeMs): boolean {
        switch (overlayMode) {
            case PanelOverlayMode.HIGHLIGHT:
                openCreateHighlightEditorFromBrush(
                    selectionRange.startTime,
                    selectionRange.endTime,
                );
                return false;

            case PanelOverlayMode.DRAG_SELECT:
                openSelectionSummaryFromBrush(selectionRange);
                return false;

            case PanelOverlayMode.ANNOTATION:
            case PanelOverlayMode.NO_OVERLAY:
                return false;
        }
    }

    function openSelectionSummaryFromBrush(selectionRange: TimeRangeMs): void {
        const sSelection = buildSelectionSummaryPayload(
            selectionRange,
            mainChartData,
            panelInfo.query.tagSet,
        );

        if (!sSelection) {
            Toast.error('There is no data in the selected area.', undefined);
            return;
        }

        dispatchPanelUiAction({
            type: 'OPEN_SELECTION_SUMMARY',
            selectionSummary: {
                selection: sSelection,
                popoverPosition: getSelectionPopoverPosition(),
            },
            overlayMode: PanelOverlayMode.DRAG_SELECT,
        });
    }

    const chartMarkupHandlers: PanelMarkupHandlers = {
        onOpenCreateAnnotation: openCreateAnnotationEditor,
        onActivateHighlightEditor: openEditHighlightEditor,
        onActivateAnnotationEditor: openEditAnnotationEditor,
    };

    function openFftDialog(): void {
        if (!selectionSummary) {
            throw new Error('Cannot open FFT without an open selection summary.');
        }

        dispatchPanelUiAction({
            type: 'OPEN_POPUP',
            popupState: {
                mode: PanelPopupMode.FFT,
                selection: selectionSummary.selection,
            },
        });
    }

    function closePopup(popupMode: PanelPopupMode): void {
        dispatchPanelUiAction({ type: 'CLOSE_POPUP', popupMode });
    }

    function closePanelEditor(): void {
        dispatchPanelUiAction({ type: 'CLOSE_EDITOR' });
    }

    function finishPanelEditorClose(): void {
        dispatchPanelUiAction({ type: 'FINISH_EDITOR_CLOSE' });
    }

    function handlePanelContextMenu(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        dispatchPanelUiAction({
            type: 'OPEN_POPUP',
            popupState: {
                mode: PanelPopupMode.CONTEXT_MENU,
                position: { x: event.clientX, y: event.clientY },
            },
            overlayMode: PanelOverlayMode.NO_OVERLAY,
        });
    }

    function isPointInsideMainChart(clientX: number, clientY: number): boolean {
        return panelChartApiRef.current?.isPointInsideMainGrid(clientX, clientY) === true;
    }

    function getSelectionPopoverPosition(): { x: number; y: number } {
        const sChartRect = chartAreaRef.current?.getBoundingClientRect();

        if (!sChartRect) {
            throw new Error('Cannot place selection popover without a chart area.');
        }

        return { x: sChartRect.left - 90, y: sChartRect.top - 35 };
    }

    function handlePanelMouseMove(event: MouseEvent<HTMLDivElement>): void {
        if (!isOverlayModeActive) {
            return;
        }

        const sPanelRect = event.currentTarget.getBoundingClientRect();

        dispatchOverlayCursorHintAction({
            type: 'SHOW_OVERLAY_CURSOR_HINT',
            hint: {
                x: event.clientX - sPanelRect.left,
                y: event.clientY - sPanelRect.top,
                isValidTarget: isPointInsideMainChart(event.clientX, event.clientY),
                hoveredMainSeriesName,
                overlayMode,
            },
        });
    }

    function handleHoveredMainSeriesChange(
        seriesName: string | undefined,
    ): void {
        dispatchOverlayCursorHintAction({
            type: 'SET_HOVERED_MAIN_SERIES',
            seriesName,
        });
    }

    function handlePanelClickCapture(event: MouseEvent<HTMLDivElement>): void {
        const sTarget = event.target;
        const sIsInteractiveTarget =
            sTarget instanceof Element &&
            sTarget.closest('button, input, select, textarea, a, [role="button"]') !== null;
        if (overlayMode !== PanelOverlayMode.ANNOTATION || sIsInteractiveTarget) {
            return;
        }

        if (isPointInsideMainChart(event.clientX, event.clientY)) {
            return;
        }

        Toast.error(ANNOTATION_INVALID_TARGET_MESSAGE, undefined);
    }

    function openCreateAnnotationEditor(
        position: ContextMenuPosition,
        seriesIndex: number | undefined,
        timestamp: number,
    ): void {
        if (
            seriesIndex !== undefined &&
            (seriesIndex < 0 || seriesIndex >= panelInfo.query.tagSet.length)
        ) {
            throw new Error(`Invalid annotation series index: ${seriesIndex}.`);
        }

        const sSeriesKey =
            seriesIndex !== undefined
                ? panelInfo.query.tagSet[seriesIndex].key
                : undefined;

        dispatchPanelUiAction({
            type: 'OPEN_POPUP',
            popupState: {
                mode: PanelPopupMode.ANNOTATION_EDITOR,
                editorMeta: {
                    position,
                    seriesKey: sSeriesKey,
                    timestamp,
                },
            },
            overlayMode: PanelOverlayMode.NO_OVERLAY,
        });
    }

    function openEditAnnotationEditor(
        position: ContextMenuPosition,
        annotationIndex: number,
    ): void {
        const sAnnotation = getAnnotation(annotationIndex);

        dispatchPanelUiAction({
            type: 'OPEN_POPUP',
            popupState: {
                mode: PanelPopupMode.ANNOTATION_EDITOR,
                editorMeta: {
                    position,
                    seriesKey: sAnnotation.seriesKey,
                    annotationIndex,
                },
            },
            overlayMode: PanelOverlayMode.NO_OVERLAY,
        });
    }

    function openEditHighlightEditor(
        position: ContextMenuPosition,
        highlightIndex: number,
    ): void {
        dispatchPanelUiAction({
            type: 'OPEN_POPUP',
            popupState: {
                mode: PanelPopupMode.HIGHLIGHT_EDITOR,
                editor: {
                    mode: 'edit',
                    position,
                    highlightIndex,
                },
            },
            overlayMode: PanelOverlayMode.NO_OVERLAY,
        });
    }

    function openCreateHighlightEditorFromBrush(
        startTime: number,
        endTime: number,
    ): void {
        dispatchPanelUiAction({
            type: 'SET_OVERLAY_MODE',
            overlayMode: PanelOverlayMode.NO_OVERLAY,
        });
        const sStartTime = Math.min(startTime, endTime);
        const sEndTime = Math.max(startTime, endTime);

        if (sEndTime <= sStartTime) {
            return;
        }

        const sChartRect = chartAreaRef.current?.getBoundingClientRect();

        if (!sChartRect) {
            throw new Error('Cannot create a highlight without a chart area.');
        }

        dispatchPanelUiAction({
            type: 'OPEN_POPUP',
            popupState: {
                mode: PanelPopupMode.HIGHLIGHT_EDITOR,
                editor: {
                    mode: 'create',
                    position: {
                        x: sChartRect.left + sChartRect.width / 2,
                        y: sChartRect.top + sChartRect.height / 2,
                    },
                },
                draftHighlight: {
                    text: DEFAULT_PANEL_HIGHLIGHT_LABEL,
                    timeRange: {
                        startTime: sStartTime,
                        endTime: sEndTime,
                    },
                    fillColor: DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
                    textColor: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
                },
            },
        });
    }

    return (
        <div
            className="panel-form"
            style={{ border: `0.5px solid ${isOverlapSelected ? '#FDB532' : '#454545'}` }}
            onContextMenu={handlePanelContextMenu}
            onMouseMove={handlePanelMouseMove}
            onMouseLeave={() => {
                dispatchOverlayCursorHintAction({
                    type: 'CLEAR_OVERLAY_CURSOR_HINT',
                });
            }}
            onClickCapture={handlePanelClickCapture}
        >
            {isOverlayModeActive && (
                <PanelOverlayCursorHint hint={overlayCursorHint} />
            )}
            <PanelHeader
                runtimeState={panelHeaderRuntimeState}
                onAction={handlePanelAction}
                onToggleOverlap={onToggleOverlap}
                onRenamePanelTitle={renamePanelTitle}
                onOpenTimeRangeModal={() =>
                    openRuntimeTimeRangeModal(
                        PanelRuntimeTimeRangeTarget.MAIN_CHART,
                    )
                }
            />
            {hasMixedXAxisKinds ? (
                <div className="panel-x-axis-warning">
                    {`${MIXED_X_AXIS_KIND_WARNING} Split this panel into separate charts. Overlap is disabled.`}
                </div>
            ) : null}
            <div className="panel-chart-section">
                <PanelBody
                    refs={{
                        chartAreaRef,
                        chartApiRef: panelChartApiRef,
                    }}
                    chartState={{
                        axes: runtimeAxes,
                        display: runtimeDisplay,
                        seriesList: panelInfo.query.tagSet,
                        useNormalize: panelInfo.mode.useNormalize,
                        useOrderBy: effectiveIsRaw
                            ? panelInfo.mode.isOrderBy
                            : true,
                        highlights: panelInfo.highlights,
                        draftHighlight,
                        annotations: panelInfo.annotations,
                    }}
                    isRaw={effectiveIsRaw}
                    overlayMode={overlayMode}
                    data={{
                        chartData: mainChartData,
                        navigatorChartData,
                    }}
                    rangeState={displayRangeState}
                    isLoading={loadStatus.chart === PanelChartLoadStatus.Loading}
                    displayNotice={displayNotice}
                    handlers={{
                        rangeActions,
                        markupHandlers: chartMarkupHandlers,
                        onHoveredMainSeriesChange: handleHoveredMainSeriesChange,
                        onSelection: handleSelection,
                    }}
                />
                <PanelFooter
                    pShowLegend={panelInfo.display.showLegend}
                    pNavigatorRange={displayNavigatorRange}
                    pIsDefaultNavigatorRange={isDefaultNavigatorRange}
                    pIsLoading={loadStatus.navigator === PanelChartLoadStatus.Loading}
                    pOnOpenTimeRangeModal={() =>
                        openRuntimeTimeRangeModal(
                            PanelRuntimeTimeRangeTarget.NAVIGATOR,
                        )
                    }
                    pNavigatorShiftActions={navigatorShiftActions}
                    pZoomActions={zoomActions}
                    pIsNumericXAxis={isNumericXAxis}
                />
            </div>
            {isEditorMounted && (
                <PanelEditor
                    pAnimationState={isEditorClosing ? 'closing' : 'opening'}
                    pOnApplyEditorConfig={applyEditedPanelConfig}
                    pOnClose={closePanelEditor}
                    pOnAnimationEnd={finishPanelEditorClose}
                    pPanelInfo={panelInfo}
                    pIsRawMode={effectiveIsRaw}
                    pHasUnsavedBoardChanges={hasUnsavedBoardChanges}
                    pPanelRange={displayPanelRange}
                />
            )}
            {runtimeTimeRangeModal !== undefined &&
                (isNumericXAxis ? (
                    <TimeRangeModal
                        rangeKind="numeric"
                        title={runtimeTimeRangeModal.title}
                        numericRange={runtimeTimeRangeModal.range}
                        onApply={applyRuntimeConcreteRange}
                        onClose={closeRuntimeTimeRangeModal}
                    />
                ) : (
                    <TimeRangeModal
                        rangeKind="time"
                        title={runtimeTimeRangeModal.title}
                        timeRange={runtimeTimeRangeModal.timeRangeInput}
                        timeRangePlaceholder={runtimeTimeRangeModal.timeRangePlaceholder}
                        allowEmptyTimeRange={runtimeTimeRangeModal.allowEmptyTimeRange}
                        lastDataTime={
                            isValidTimeRange(rangeState.fullRange)
                                ? rangeState.fullRange.endTime
                                : runtimeTimeRangeModal.range.endTime
                        }
                        previousConcreteRange={runtimeTimeRangeModal.range}
                        onApply={applyRuntimeTimeRangeInput}
                        onClose={closeRuntimeTimeRangeModal}
                    />
                ))}
            {popupState.mode === PanelPopupMode.CONTEXT_MENU && (
                <PanelContextMenu
                    runtimeState={panelHeaderRuntimeState}
                    onAction={handlePanelAction}
                    position={popupState.position}
                    onClose={() => closePopup(PanelPopupMode.CONTEXT_MENU)}
                />
            )}
            {popupState.mode === PanelPopupMode.FFT && (
                <FFTModal
                    pSeriesSummaries={popupState.selection.seriesSummaries}
                    pStartTime={popupState.selection.startTime}
                    pEndTime={popupState.selection.endTime}
                    pIsNumericXAxis={isNumericXAxis}
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            closePopup(PanelPopupMode.FFT);
                        }
                    }}
                />
            )}
            {selectionSummary !== undefined && (
                <SelectionSummaryPopover
                    selection={selectionSummary.selection}
                    position={selectionSummary.popoverPosition}
                    isNumericXAxis={isNumericXAxis}
                    onOpenFft={openFftDialog}
                    onClose={() => {
                        dispatchPanelUiAction({ type: 'CLOSE_SELECTION_SUMMARY' });
                    }}
                />
            )}
            {popupState.mode === PanelPopupMode.HIGHLIGHT_EDITOR && (
                <EditHighlightModal
                    key={getHighlightEditorKey(popupState)}
                    activeHighlightEditor={popupState.editor}
                    draftHighlight={popupState.draftHighlight}
                    highlightActions={{
                        getHighlight,
                        addHighlight,
                        updateHighlight,
                        deleteHighlight,
                    }}
                    onCancel={() => closePopup(PanelPopupMode.HIGHLIGHT_EDITOR)}
                    onApplied={() => closePopup(PanelPopupMode.HIGHLIGHT_EDITOR)}
                    isNumericXAxis={isNumericXAxis}
                />
            )}
            {popupState.mode === PanelPopupMode.ANNOTATION_EDITOR && (
                <EditAnnotationModal
                    key={popupState.editorMeta.annotationIndex ?? 'new'}
                    annotationEditorMeta={popupState.editorMeta}
                    annotationActions={{
                        getAnnotation,
                        addAnnotation,
                        updateAnnotation,
                        deleteAnnotation,
                    }}
                    annotationSeriesList={panelInfo.query.tagSet}
                    onCancel={() => closePopup(PanelPopupMode.ANNOTATION_EDITOR)}
                    onApplied={() => closePopup(PanelPopupMode.ANNOTATION_EDITOR)}
                    isNumericXAxis={isNumericXAxis}
                />
            )}
            {popupState.mode === PanelPopupMode.DELETE_CONFIRM && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            closePopup(PanelPopupMode.DELETE_CONFIRM);
                        }
                    }}
                    pCallback={onDeletePanel}
                    pContents={
                        <div className="body-content">Do you want to delete this panel?</div>
                    }
                />
            )}
            {popupState.mode === PanelPopupMode.EXPORT_CSV && (
                <SavedToLocalModal
                    pPanelInfo={filterChartDataByRange(
                        mainChartData,
                        displayPanelRange,
                    )}
                    pChartRef={panelChartApiRef}
                    pIsDarkMode
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            closePopup(PanelPopupMode.EXPORT_CSV);
                        }
                    }}
                />
            )}
        </div>
    );
}


function getHighlightEditorKey(popupState: HighlightPopupState): string {
    if (popupState.draftHighlight !== undefined) {
        const { draftHighlight } = popupState;
        return `create-${draftHighlight.timeRange.startTime}-${draftHighlight.timeRange.endTime}`;
    }

    return `edit-${popupState.editor.highlightIndex}`;
}

function filterChartDataByRange(
    chartData: ChartSeriesData[],
    range: TimeRangeMs,
): ChartSeriesData[] {
    if (!isValidTimeRange(range)) {
        return chartData;
    }

    return chartData.map((series) => ({
        ...series,
        data: series.data.filter(([timestamp]) =>
            timestamp >= range.startTime && timestamp <= range.endTime,
        ),
    }));
}

export default PanelContainer;
