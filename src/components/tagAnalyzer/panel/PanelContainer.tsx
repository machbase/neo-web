import { useMemo, useRef, type MouseEvent } from 'react';
import { PanelMarkupInteractionHint, ANNOTATION_INVALID_TARGET_MESSAGE } from './PanelMarkupInteractionHint';
import { Toast, type ContextMenuPosition } from '@/design-system/components';
import PanelFooter from './PanelFooter';
import PanelHeader, {
    PanelActionKey,
    type PanelHeaderRuntimeState,
} from './PanelHeader';
import PanelBody from './PanelBody';
import PanelEditor from './editor/PanelEditor';
import { PanelPopupMode, PanelPopups } from './PanelPopups';
import TimeRangeModal from '../boardModal/TimeRangeModal';
import type { GlobalTimeRangeState } from '../domain/BoardDomain';
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
    type PanelRangeChangeEvent,
    type PanelChartHandle,
    type PanelMarkupHandlers,
} from '../domain/panel/PanelActions';
import {
    MIXED_X_AXIS_KIND_WARNING,
    hasMixedXAxisValueKinds,
    hasNumericBaseTimeSeries,
} from '../domain/SeriesDomain';
import type { PanelRangeChangeOptions } from '../domain/panelRange/PanelRangeApply';
import {
    resolveDefaultNavigatorRange,
    resolveDefaultNavigatorRangeResolution,
} from '../domain/panelRange/PanelRangeResolver';
import type { RollupTableMap } from '../fetch/panelData/PanelDataFetchTypes';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalUtils';
import type {
    IntervalOption,
    TimeRangeInput,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import {
    clampTimeRangeToBounds,
    isValidTimeRange,
} from '../domain/time/TimeRangeUtils';
import { formatAbsoluteTimeExpression } from '../domain/time/TimeRangeInputResolver';
import type { EditableTimeRangeInputResolution } from '../parsing/TimeRangeInputParsing';
import { buildSelectionSummaryPayload } from './PanelBrushSelection';
import { useChartAreaWidthObserver } from '../board/layout/useChartAreaWidthObserver';
import { usePanelEditorActions } from './editor/usePanelEditor';
import {
    PanelChartLoadStatus,
    usePanelChartDataRuntime,
} from './usePanelChartDataRuntime';
import { usePanelRangeControls } from './usePanelRangeControls';
import {
    PanelRuntimeTimeRangeTarget,
    getHoveredMainSeriesName,
    getOpenSelectionSummary,
    getOpenTimeRangeModalTarget,
    getVisibleMarkupInteractionHint,
    usePanelInteractionState,
} from './usePanelInteractionState';
import {
    addPanelAnnotation,
    addPanelHighlight,
    deletePanelAnnotation,
    deletePanelHighlight,
    getPanelAnnotation,
    getPanelHighlight,
    renamePanelTitle as getRenamedPanelTitle,
    updatePanelAnnotation,
    updatePanelHighlight,
} from './panelConfigActions';
import './PanelChartShell.scss';

export type PanelContainerRuntimeProps = {
    isActive: boolean;
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
    onSavePanelInfo: (panelInfo: PanelInfo) => Promise<boolean>;
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

type PanelRuntimeTimeRangeModal = {
    title: string;
    range: TimeRangeMs;
    timeRangeInput: TimeRangeInput;
    timeRangePlaceholder?: TimeRangeInput;
    allowEmptyTimeRange: boolean;
};

function PanelContainer({
    runtimePanelInfo,
    runtime: {
        isActive,
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
        onSavePanelInfo,
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
    const runtimePanelConfig: PanelInfo =
        effectiveIsRaw === panelInfo.mode.isRaw
            ? panelInfo
            : {
                  ...panelInfo,
                  mode: {
                      ...panelInfo.mode,
                      isRaw: effectiveIsRaw,
                  },
              };
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

    const {
        state: panelUiState,
        dispatch: dispatchPanelUiAction,
    } = usePanelInteractionState();
    const {
        overlayMode,
        popupState,
        timeRangeModal,
        editor,
        selectionSummary: selectionSummaryState,
        markupInteraction,
    } = panelUiState;
    const timeRangeModalTarget = getOpenTimeRangeModalTarget(timeRangeModal);
    const isEditorMounted = editor.status !== 'closed';
    const isEditorClosing = editor.status === 'closing';
    const selectionSummary = getOpenSelectionSummary(selectionSummaryState);
    const markupInteractionHint = getVisibleMarkupInteractionHint(markupInteraction);
    const hoveredMainSeriesName = getHoveredMainSeriesName(
        markupInteraction.hoveredMainSeries,
    );

    useChartAreaWidthObserver(chartAreaRef, onChartAreaWidthChange);
    const {
        chartData,
        visibleChartData,
        navigatorChartData,
        displayRangeState,
        resolvedIntervalOption,
        displayNotice,
        loadStatus,
    } = usePanelChartDataRuntime({
        panelInfo: runtimePanelConfig,
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

    const {
        applyEditedPanelConfig,
        saveEditedPanelConfig,
    } = usePanelEditorActions({
        panelInfo,
        onApplyPanelInfo,
        onSavePanelInfo,
        reloadAfterEditorSave,
    });

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

    let sResolvedIntervalOption: IntervalOption | undefined = undefined;
    if (hasResolvedIntervalOption(resolvedIntervalOption)) {
        sResolvedIntervalOption = resolvedIntervalOption;
    }

    const draftHighlight =
        popupState.mode === PanelPopupMode.HIGHLIGHT_EDITOR &&
        popupState.draftHighlight !== undefined
            ? popupState.draftHighlight
            : undefined;

    const isEditing = isEditorMounted && !isEditorClosing;
    const isOverlayModeActive = overlayMode !== PanelOverlayMode.NO_OVERLAY;

    const panelHeaderRuntimeState: PanelHeaderRuntimeState = {
        title: panelInfo.title,
        panelRange: displayPanelRange,
        resolvedIntervalOption: sResolvedIntervalOption,
        canSetGlobalTime: !isNumericXAxis && sResolvedIntervalOption !== undefined,
        canSaveLocal: loadStatus.chart === PanelChartLoadStatus.Ready,
        isNumericXAxis,
        overlayMode,
        isEditing,
        isRaw: effectiveIsRaw,
        isOverlapSelected,
    };
    function getRuntimeTimeRangeModal(
        target: PanelRuntimeTimeRangeTarget | undefined,
    ): PanelRuntimeTimeRangeModal | undefined {
        if (target === undefined) {
            return undefined;
        }

        switch (target) {
            case PanelRuntimeTimeRangeTarget.MAIN_CHART:
                if (!isValidTimeRange(displayPanelRange)) {
                    return undefined;
                }

                return {
                    title: isNumericXAxis
                        ? 'Current Visible Main Chart Value Range'
                        : 'Current Visible Main Chart Range',
                    range: displayPanelRange,
                    timeRangeInput: formatConcreteRangeForTimeInput(displayPanelRange),
                    allowEmptyTimeRange: false,
                };

            case PanelRuntimeTimeRangeTarget.NAVIGATOR:
                if (!isValidTimeRange(displayNavigatorRange)) {
                    return undefined;
                }

                return {
                    title: isNumericXAxis
                        ? 'Current Visible Navigator Value Range'
                        : 'Current Visible Navigator Range',
                    range: displayNavigatorRange,
                    timeRangeInput: isDefaultNavigatorRange
                        ? { start: '', end: '' }
                        : rangeState.requestNavigatorRangeInput ??
                          formatConcreteRangeForTimeInput(displayNavigatorRange),
                    timeRangePlaceholder: isDefaultNavigatorRange
                        ? getDefaultNavigatorRangePlaceholder(
                              displayNavigatorRange,
                              resolveDefaultNavigatorRangeResolution(
                                  boardTimeRange,
                                  rangeState.fullRange,
                              ).source === 'board-time',
                          )
                        : undefined,
                    allowEmptyTimeRange: true,
                };
        }
    }

    function openRuntimeTimeRangeModal(
        target: PanelRuntimeTimeRangeTarget,
    ): void {
        if (getRuntimeTimeRangeModal(target) === undefined) {
            return;
        }

        dispatchPanelUiAction({ type: 'OPEN_TIME_RANGE_MODAL', target });
    }

    function closeRuntimeTimeRangeModal(): void {
        dispatchPanelUiAction({ type: 'CLOSE_TIME_RANGE_MODAL' });
    }

    function applyRuntimeConcreteRange(range: TimeRangeMs): boolean {
        if (timeRangeModalTarget === undefined) {
            return false;
        }

        const sRangeChangeEvent: PanelRangeChangeEvent = {
            min: range.startTime,
            max: range.endTime,
        };

        switch (timeRangeModalTarget) {
            case PanelRuntimeTimeRangeTarget.MAIN_CHART:
                rangeActions.applyExactMainRange(sRangeChangeEvent);
                return true;

            case PanelRuntimeTimeRangeTarget.NAVIGATOR:
                rangeActions.applyExactNavigatorRange(sRangeChangeEvent);
                return true;
        }
    }

    function applyRuntimeTimeRangeInput(
        timeRangeInput: EditableTimeRangeInputResolution,
    ): boolean {
        if (timeRangeInput.status === 'empty') {
            if (timeRangeModalTarget !== PanelRuntimeTimeRangeTarget.NAVIGATOR) {
                Toast.error('Please check the entered time.');
                return false;
            }

            const sDefaultNavigatorRange = resolveDefaultNavigatorRange(
                boardTimeRange,
                rangeState.fullRange,
            );

            onRangeStateChange({
                ...rangeState,
                requestPanelRange: clampTimeRangeToBounds(
                    rangeState.requestPanelRange,
                    sDefaultNavigatorRange,
                ),
                requestNavigatorRange: sDefaultNavigatorRange,
                requestNavigatorRangeInput: undefined,
            });
            return true;
        }

        if (timeRangeInput.status !== 'valid') {
            Toast.error('Please check the entered time.');
            return false;
        }

        if (timeRangeModalTarget === PanelRuntimeTimeRangeTarget.NAVIGATOR) {
            rangeActions.applyExactNavigatorRange(
                {
                    min: timeRangeInput.concreteRange.startTime,
                    max: timeRangeInput.concreteRange.endTime,
                },
                timeRangeInput.rangeInput,
            );
            return true;
        }

        return applyRuntimeConcreteRange(timeRangeInput.concreteRange);
    }

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
            visibleChartData,
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

    function setGlobalTimeRange(): void {
        if (!sResolvedIntervalOption) {
            throw new Error('Cannot set global time without a resolved interval.');
        }

        onSetGlobalTimeRange({
            data: displayPanelRange,
            navigator: displayNavigatorRange,
            interval: sResolvedIntervalOption,
        });
    }

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

    function renamePanelTitle(title: string): void {
        const sNextPanelInfo = getRenamedPanelTitle(panelInfo, title);

        if (sNextPanelInfo === panelInfo) {
            return;
        }

        onApplyPanelInfo(sNextPanelInfo);
    }

    function handlePanelAction(actionKey: PanelActionKey): void {
        switch (actionKey) {
            case PanelActionKey.TOGGLE_RAW:
                if (isNumericXAxis) {
                    return;
                }

                onToggleRaw();
                return;

            case PanelActionKey.SET_GLOBAL_TIME:
                setGlobalTimeRange();
                return;

            case PanelActionKey.REFRESH_DATA:
                refreshData();
                return;

            case PanelActionKey.REFRESH_TIME:
                refreshTime();
                return;

            case PanelActionKey.EXPAND_FULL_RANGE:
                expandFullRange();
                return;

            case PanelActionKey.TOGGLE_HIGHLIGHT:
            case PanelActionKey.TOGGLE_ANNOTATION:
            case PanelActionKey.TOGGLE_DRAG_SELECT:
            case PanelActionKey.TOGGLE_EDIT:
            case PanelActionKey.OPEN_EXPORT_CSV:
            case PanelActionKey.OPEN_DELETE_CONFIRM:
                dispatchPanelUiAction({ type: 'PANEL_ACTION', actionKey });
                return;
        }
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

        dispatchPanelUiAction({
            type: 'SHOW_MARKUP_INTERACTION_HINT',
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
        if (seriesName === undefined) {
            dispatchPanelUiAction({ type: 'CLEAR_HOVERED_MAIN_SERIES' });
            return;
        }

        dispatchPanelUiAction({
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

    const runtimeTimeRangeModal = getRuntimeTimeRangeModal(timeRangeModalTarget);

    return (
        <div
            className="panel-form"
            style={{ border: `0.5px solid ${isOverlapSelected ? '#FDB532' : '#454545'}` }}
            onContextMenu={handlePanelContextMenu}
            onMouseMove={handlePanelMouseMove}
            onMouseLeave={() => {
                dispatchPanelUiAction({ type: 'CLEAR_MOUSE_MARKUP_STATE' });
            }}
            onClickCapture={handlePanelClickCapture}
        >
            {isOverlayModeActive && (
                <PanelMarkupInteractionHint hint={markupInteractionHint} />
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
                        chartData,
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
                    pOnSaveEditorConfig={saveEditedPanelConfig}
                    pOnClose={closePanelEditor}
                    pOnAnimationEnd={finishPanelEditorClose}
                    pPanelInfo={panelInfo}
                    pIsRawMode={effectiveIsRaw}
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
            <PanelPopups
                popupState={popupState}
                panelHeaderRuntimeState={panelHeaderRuntimeState}
                onPanelAction={handlePanelAction}
                isNumericXAxis={isNumericXAxis}
                selectionSummary={selectionSummary}
                highlightActions={{
                    getHighlight,
                    addHighlight,
                    updateHighlight,
                    deleteHighlight,
                }}
                annotationActions={{
                    getAnnotation,
                    addAnnotation,
                    updateAnnotation,
                    deleteAnnotation,
                }}
                annotationSeriesList={panelInfo.query.tagSet}
                onClosePopup={closePopup}
                onCloseSelectionSummary={() => {
                    dispatchPanelUiAction({ type: 'CLOSE_SELECTION_SUMMARY' });
                }}
                onOpenFft={openFftDialog}
                onDeletePanel={onDeletePanel}
                chartData={visibleChartData}
                panelChartApiRef={panelChartApiRef}
            />
        </div>
    );
}


function formatConcreteRangeForTimeInput(range: TimeRangeMs): TimeRangeInput {
    return {
        start: formatAbsoluteTimeExpression(range.startTime),
        end: formatAbsoluteTimeExpression(range.endTime),
    };
}

function getDefaultNavigatorRangePlaceholder(
    range: TimeRangeMs,
    isBoardTimeDefault: boolean,
): TimeRangeInput {
    const sRangeInput = formatConcreteRangeForTimeInput(range);
    const sSuffix = isBoardTimeDefault ? ' (board time)' : ' (default)';

    return {
        start: `${sRangeInput.start}${sSuffix}`,
        end: `${sRangeInput.end}${sSuffix}`,
    };
}
export default PanelContainer;
