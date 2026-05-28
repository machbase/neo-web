import PanelFooter from './PanelFooter';
import PanelHeader, {
    PanelContextMenu,
    PanelActionKey,
    type PanelHeaderRuntimeState,
} from './PanelHeader';
import PanelBody from './PanelBody';
import PanelEditor from './editor/PanelEditor';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import { FFTModal } from '../boardModal/FFTModal';
import {
    EditAnnotationModal,
    EditHighlightModal,
    type AnnotationEditorMetaState,
    type HighlightEditorState,
} from './modal/EditMarkupModal';
import { SelectionSummaryPopover } from './modal/SelectionSummaryPopover';
import './PanelChartShell.scss';
import { useRef, useState, type MouseEvent } from 'react';
import type {
    PanelBrushSelectionEvent,
    PanelChartHandle,
    PanelHighlight,
    PanelInfo,
    PanelMarkupHandlers,
    PanelNavigatorShiftActions,
    PanelRangeHandlers,
    PanelRangeState,
    PanelZoomActions,
} from '../domain/PanelDomain';
import type { ChartSeriesData } from '../domain/ChartDomain';
import { MIXED_X_AXIS_KIND_WARNING, hasMixedXAxisValueKinds, hasNumericBaseTimeSeries } from '../domain/SeriesDomain';
import type { SetGlobalTimeRangePayload } from '../domain/BoardDomain';
import type { IntervalOption } from '../domain/time/TimeTypes';
import { PanelChartLoadStatus } from '../board/BoardPanelState';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalUtils';
import { handlePanelBrushSelection } from './PanelBrushSelection';
import { useChartAreaWidthObserver } from '../board/useChartAreaWidthObserver';
import { usePanelAnnotation } from './usePanelAnnotation';
import { usePanelEditor } from './usePanelEditor';
import { usePanelHighlight } from './usePanelHighlight';

import type { ContextMenuPosition } from '@/design-system/components';
import type { FFTSelectionPayload } from '../domain/ChartDomain';
import { PanelOverlayMode } from '../domain/PanelDomain';
import type { PanelSelectionSummary } from './PanelBrushSelection';

export type PanelContainerRuntimeProps = {
    rangeState: PanelRangeState;
    chartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
    resolvedIntervalOption: IntervalOption | undefined;
    loadStatus: { chart: PanelChartLoadStatus; navigator: PanelChartLoadStatus };
    rangeHandlers: PanelRangeHandlers;
    navigatorShiftActions: PanelNavigatorShiftActions;
    navigatorZoomActions: PanelZoomActions;
};

type PanelContainerStateProps = { isRaw: boolean; isRawLocked: boolean; isOverlap: boolean };

type PanelContainerActions = {
    onChartAreaWidthChange: (width: number | undefined) => void;
    refreshData: () => void;
    refreshTime: () => void;
    reloadPanelEdit: (panelInfo: PanelInfo) => void;
    onToggleRaw: () => void;
    onSavePanel: (panelInfo: PanelInfo) => void;
    onSetGlobalTimeRange: (payload: SetGlobalTimeRangePayload) => void;
    onDeletePanel: () => void;
    onToggleOverlap: () => void;
};

type PanelContainerProps = {
    panelInfo: PanelInfo;
    runtime: PanelContainerRuntimeProps;
    state: PanelContainerStateProps;
    actions: PanelContainerActions;
};

enum PanelPopupMode {
    NONE = 'NONE',
    CONTEXT_MENU = 'CONTEXT_MENU',
    FFT = 'FFT',
    SELECTION_SUMMARY = 'SELECTION_SUMMARY',
    HIGHLIGHT_EDITOR = 'HIGHLIGHT_EDITOR',
    ANNOTATION_EDITOR = 'ANNOTATION_EDITOR',
    DELETE_CONFIRM = 'DELETE_CONFIRM',
    EXPORT_CSV = 'EXPORT_CSV',
}

type PanelPopupState =
    | { mode: PanelPopupMode.NONE }
    | { mode: PanelPopupMode.CONTEXT_MENU; position: ContextMenuPosition }
    | { mode: PanelPopupMode.FFT; selection: FFTSelectionPayload }
    | { mode: PanelPopupMode.SELECTION_SUMMARY; summary: PanelSelectionSummary }
    | {
          mode: PanelPopupMode.HIGHLIGHT_EDITOR;
          editor: HighlightEditorState;
          temporaryHighlight?: PanelHighlight | undefined;
      }
    | {
          mode: PanelPopupMode.ANNOTATION_EDITOR;
          editorMeta: AnnotationEditorMetaState;
      }
    | { mode: PanelPopupMode.DELETE_CONFIRM }
    | { mode: PanelPopupMode.EXPORT_CSV };

type PanelTransientUiState = {
    overlayMode: PanelOverlayMode;
    popupState: PanelPopupState;
};

const INITIAL_PANEL_TRANSIENT_UI: PanelTransientUiState = {
    overlayMode: PanelOverlayMode.NO_OVERLAY,
    popupState: { mode: PanelPopupMode.NONE },
};

function getAnnotationEditorKey(annotationEditorMeta: AnnotationEditorMetaState) {
    return [
        annotationEditorMeta.annotationIndex ?? 'new',
        annotationEditorMeta.seriesKey ?? 'unassigned',
        annotationEditorMeta.timestamp ?? 'existing',
        annotationEditorMeta.position.x,
        annotationEditorMeta.position.y,
    ].join(':');
}

function getHighlightEditorKey(activeEditor: HighlightEditorState) {
    return [activeEditor.highlightIndex, activeEditor.position.x, activeEditor.position.y].join(':');
}

const closeWhenFalse = (close: () => void) => (isOpen: boolean) => {
    if (!isOpen) close();
};

function usePanelTransientUi() {
    const [transientUi, setTransientUi] = useState<PanelTransientUiState>(
        INITIAL_PANEL_TRANSIENT_UI,
    );
    const patchTransientUi = (patch: Partial<PanelTransientUiState>) => {
        setTransientUi((current) => ({ ...current, ...patch }));
    };

    return {
        ...transientUi,
        patchTransientUi,
        resetTransientUi: () => setTransientUi(INITIAL_PANEL_TRANSIENT_UI),
        openDeleteConfirm: () =>
            patchTransientUi({ popupState: { mode: PanelPopupMode.DELETE_CONFIRM } }),
        openExportCsv: () =>
            patchTransientUi({ popupState: { mode: PanelPopupMode.EXPORT_CSV } }),
        closePopup: () =>
            patchTransientUi({ popupState: { mode: PanelPopupMode.NONE } }),
        closeContextMenu: () =>
            patchTransientUi({ popupState: { mode: PanelPopupMode.NONE } }),
        closeAnnotationEditor: () =>
            patchTransientUi({
                popupState: { mode: PanelPopupMode.NONE },
                overlayMode: PanelOverlayMode.NO_OVERLAY,
            }),
        closeSelectionSummary: () =>
            patchTransientUi({
                popupState: { mode: PanelPopupMode.NONE },
                overlayMode: PanelOverlayMode.NO_OVERLAY,
            }),
    };
}

function PanelContainer({
    panelInfo,
    runtime: {
        rangeState,
        chartData,
        navigatorChartData,
        resolvedIntervalOption,
        loadStatus,
        rangeHandlers,
        navigatorShiftActions,
        navigatorZoomActions,
    },
    state: { isRaw, isRawLocked, isOverlap },
    actions: {
        onChartAreaWidthChange,
        refreshData,
        refreshTime,
        reloadPanelEdit,
        onToggleRaw,
        onSavePanel,
        onSetGlobalTimeRange,
        onDeletePanel,
        onToggleOverlap,
    },
}: PanelContainerProps) {
    const { panelRange, navigatorRange } = rangeState;
    const chartAreaRef = useRef<HTMLDivElement | null>(null);
    const panelChartApiRef = useRef<PanelChartHandle | null>(null);
    const hasMixedXAxisKinds = hasMixedXAxisValueKinds(panelInfo.data.tag_set);
    const isNumericXAxis =
        !hasMixedXAxisKinds && hasNumericBaseTimeSeries(panelInfo.data.tag_set);
    useChartAreaWidthObserver(chartAreaRef, onChartAreaWidthChange);
    
    const {
        overlayMode,
        popupState,
        patchTransientUi,
        resetTransientUi,
        openDeleteConfirm,
        openExportCsv,
        closePopup,
        closeContextMenu,
        closeAnnotationEditor,
        closeSelectionSummary,
    } = usePanelTransientUi();
    const contextMenuPosition =
        popupState.mode === PanelPopupMode.CONTEXT_MENU
            ? popupState.position
            : undefined;
    const fftSelection =
        popupState.mode === PanelPopupMode.FFT ? popupState.selection : undefined;
    const selectionSummary =
        popupState.mode === PanelPopupMode.SELECTION_SUMMARY
            ? popupState.summary
            : undefined;
    const activeHighlightEditor =
        popupState.mode === PanelPopupMode.HIGHLIGHT_EDITOR
            ? popupState.editor
            : undefined;
    const temporaryHighlight =
        popupState.mode === PanelPopupMode.HIGHLIGHT_EDITOR
            ? popupState.temporaryHighlight
            : undefined;
    const annotationEditorMeta =
        popupState.mode === PanelPopupMode.ANNOTATION_EDITOR
            ? popupState.editorMeta
            : undefined;
    const {
        highlightActions,
        applyHighlightChange,
        buildEditHighlightEditor,
        buildCreateHighlightEditor,
    } = usePanelHighlight({
        highlights: panelInfo.highlights,
        chartAreaRef,
        isNumericXAxis,
        onSaveHighlights: (highlights) =>
            onSavePanel({
                ...panelInfo,
                highlights: highlights,
            }),
    });
    const panelHighlights = temporaryHighlight
        ? [...panelInfo.highlights, temporaryHighlight]
        : panelInfo.highlights;
    const {
        annotationAction,
        applyAnnotationChange,
        deletePanelAnnotation,
    } = usePanelAnnotation({
        annotations: panelInfo.annotations,
        seriesList: panelInfo.data.tag_set,
        isNumericXAxis,
        onSaveAnnotations: (annotations) =>
            onSavePanel({
                ...panelInfo,
                annotations,
            }),
    });
    const {
        isEditing,
        closePanelEditor,
        toggleEditMode,
        saveEditedPanelConfig,
    } = usePanelEditor({
        panelInfo,
        panelRange,
        navigatorRange,
        onResetPanelUi: resetPanelUi,
        onSavePanel,
        reloadPanelEdit,
    });
    const handleSelection = (event: PanelBrushSelectionEvent): boolean =>
        handlePanelBrushSelection(
            {
                chartData,
                seriesList: panelInfo.data.tag_set,
                chartAreaRef,
                overlayMode,
                isNumericXAxis,
                createHighlightFromSelection: activateCreateHighlightEditorFromBrush,
                closeContextMenu: () =>
                    patchTransientUi({ popupState: { mode: PanelPopupMode.NONE } }),
                closeAnnotationMode: () =>
                    patchTransientUi({ overlayMode: PanelOverlayMode.NO_OVERLAY }),
                onSelectionSummaryChange: (nextSelectionSummary) => {
                    patchTransientUi({
                        overlayMode: PanelOverlayMode.DRAG_SELECT,
                        popupState: {
                            mode: PanelPopupMode.SELECTION_SUMMARY,
                            summary: nextSelectionSummary,
                        },
                    });
                },
            },
            event,
        );
    const chartMarkupHandlers: PanelMarkupHandlers = {
        onOpenCreateAnnotation: (position, seriesIndex, timestamp) => {
            if (overlayMode !== PanelOverlayMode.ANNOTATION) {
                return;
            }

            resetPanelUi();
            activateCreateAnnotationEditor(position, seriesIndex, timestamp);
        },
        onActivateHighlightEditor: (position, highlightIndex) => {
            resetPanelUi();
            activateEditHighlightEditor(position, highlightIndex);
        },
        onActivateAnnotationEditor: (position, annotationIndex) => {
            resetPanelUi();
            activateEditAnnotationEditor(position, annotationIndex);
        },
    };

    const sResolvedIntervalOption = hasResolvedIntervalOption(
        resolvedIntervalOption,
    )
        ? resolvedIntervalOption
        : undefined;
    const panelHeaderRuntimeState: PanelHeaderRuntimeState = {
        title: panelInfo.meta.chart_title,
        panelRange,
        resolvedIntervalOption: sResolvedIntervalOption,
        canSetGlobalTime: !isNumericXAxis && Boolean(sResolvedIntervalOption),
        canSaveLocal: loadStatus.chart === PanelChartLoadStatus.Ready,
        canOpenFft: Boolean(selectionSummary),
        isNumericXAxis,
        overlayMode,
        isEditing,
        isRaw,
        isRawLocked,
        isOverlap,
    };

    function setGlobalTimeRange(): void {
        if (!sResolvedIntervalOption) {
            throw new Error('Cannot set global time without a resolved interval.');
        }

        onSetGlobalTimeRange({
            dataTime: panelRange,
            navigatorTime: navigatorRange,
            interval: sResolvedIntervalOption,
        });
    }

    function openFftDialog(): void {
        if (!selectionSummary) {
            return;
        }

        patchTransientUi({
            popupState: {
                mode: PanelPopupMode.FFT,
                selection: selectionSummary.selection,
            },
            overlayMode: PanelOverlayMode.NO_OVERLAY,
        });
    }

    function handlePanelAction(actionKey: PanelActionKey): void {
        switch (actionKey) {
            case PanelActionKey.TOGGLE_OVERLAP:
                onToggleOverlap();
                return;
            case PanelActionKey.TOGGLE_RAW:
                onToggleRaw();
                return;
            case PanelActionKey.TOGGLE_HIGHLIGHT:
                togglePanelOverlayMode(PanelOverlayMode.HIGHLIGHT);
                return;
            case PanelActionKey.TOGGLE_ANNOTATION:
                toggleAnnotationOverlayMode();
                return;
            case PanelActionKey.TOGGLE_DRAG_SELECT:
                togglePanelOverlayMode(PanelOverlayMode.DRAG_SELECT);
                return;
            case PanelActionKey.OPEN_FFT:
                openFftDialog();
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
            case PanelActionKey.TOGGLE_EDIT:
                toggleEditMode();
                return;
            case PanelActionKey.OPEN_EXPORT_CSV:
                openExportCsv();
                return;
            case PanelActionKey.OPEN_DELETE_CONFIRM:
                openDeleteConfirm();
                return;
        }
    }

    function resetPanelUi(): void {
        resetTransientUi();
    }

    function togglePanelOverlayMode(
        mode:
            | PanelOverlayMode.HIGHLIGHT
            | PanelOverlayMode.ANNOTATION
            | PanelOverlayMode.DRAG_SELECT,
    ): void {
        const sShouldOpenMode = overlayMode !== mode;

        resetPanelUi();

        if (sShouldOpenMode) {
            patchTransientUi({ overlayMode: mode });
        }
    }

    function toggleAnnotationOverlayMode(): void {
        if (annotationEditorMeta || overlayMode === PanelOverlayMode.ANNOTATION) {
            closeAnnotationEditor();
            return;
        }

        togglePanelOverlayMode(PanelOverlayMode.ANNOTATION);
    }

    function activateCreateHighlightEditorFromBrush(
        startTime: number,
        endTime: number,
    ): void {
        resetPanelUi();
        const sHighlightEditor = buildCreateHighlightEditor(startTime, endTime);
        if (!sHighlightEditor) {
            return;
        }

        patchTransientUi({
            popupState: {
                mode: PanelPopupMode.HIGHLIGHT_EDITOR,
                ...sHighlightEditor,
            },
        });
    }

    function handlePanelContextMenu(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        patchTransientUi({
            popupState: {
                mode: PanelPopupMode.CONTEXT_MENU,
                position: { x: event.clientX, y: event.clientY },
            },
            overlayMode:
                overlayMode === PanelOverlayMode.ANNOTATION ||
                overlayMode === PanelOverlayMode.DRAG_SELECT
                    ? PanelOverlayMode.NO_OVERLAY
                    : overlayMode,
        });
    }

    function activateCreateAnnotationEditor(
        position: AnnotationEditorMetaState['position'],
        seriesIndex: number | undefined,
        timestamp: number,
    ): void {
        if (
            seriesIndex !== undefined &&
            (seriesIndex < 0 || seriesIndex >= panelInfo.data.tag_set.length)
        ) {
            throw new Error(`Invalid annotation series index: ${seriesIndex}.`);
        }

        const sSeriesKey =
            seriesIndex !== undefined
                ? panelInfo.data.tag_set[seriesIndex].key
                : undefined;

        patchTransientUi({
            popupState: {
                mode: PanelPopupMode.ANNOTATION_EDITOR,
                editorMeta: {
                    position,
                    seriesKey: sSeriesKey,
                    timestamp,
                },
            },
        });
    }

    function activateEditHighlightEditor(
        position: ContextMenuPosition,
        highlightIndex: number,
    ): void {
        patchTransientUi({
            popupState: {
                mode: PanelPopupMode.HIGHLIGHT_EDITOR,
                ...buildEditHighlightEditor(position, highlightIndex),
            },
        });
    }

    function activateEditAnnotationEditor(
        position: AnnotationEditorMetaState['position'],
        annotationIndex: number,
    ): void {
        const sAnnotation = annotationAction.getAnnotation(annotationIndex);

        patchTransientUi({
            popupState: {
                mode: PanelPopupMode.ANNOTATION_EDITOR,
                editorMeta: {
                    position,
                    seriesKey: sAnnotation.seriesKey,
                    annotationIndex,
                },
            },
        });
    }

    return (
        <div
            className="panel-form"
            style={{ border: `0.5px solid ${isOverlap ? '#FDB532' : '#454545'}` }}
            onContextMenu={handlePanelContextMenu}
        >
            <PanelHeader
                runtimeState={panelHeaderRuntimeState}
                onAction={handlePanelAction}
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
                        axes: panelInfo.axes,
                        display: panelInfo.display,
                        seriesList: panelInfo.data.tag_set,
                        useNormalize: panelInfo.use_normalize,
                        highlights: panelHighlights,
                        annotations: panelInfo.annotations,
                    }}
                    isRaw={isRaw}
                    overlayMode={overlayMode}
                    data={{
                        chartData,
                        navigatorChartData,
                    }}
                    rangeState={rangeState}
                    isLoading={loadStatus.chart === PanelChartLoadStatus.Loading}
                    handlers={{
                        rangeHandlers,
                        markupHandlers: chartMarkupHandlers,
                        onSelection: handleSelection,
                    }}
                />
                <PanelFooter
                    pShowLegend={panelInfo.display.show_legend}
                    pNavigatorRange={navigatorRange}
                    pIsLoading={loadStatus.navigator === PanelChartLoadStatus.Loading}
                    pOnNavigatorRangeChange={rangeHandlers.onNavigatorRangeChange}
                    pNavigatorShiftActions={navigatorShiftActions}
                    pNavigatorZoomActions={navigatorZoomActions}
                    pIsNumericXAxis={isNumericXAxis}
                />
            </div>
            {isEditing && (
                <PanelEditor
                    pOnSaveEditorConfig={saveEditedPanelConfig}
                    pOnClose={closePanelEditor}
                    pPanelMeta={panelInfo.meta}
                    pPanelData={panelInfo.data}
                    pPanelTime={panelInfo.time}
                    pPanelAxes={panelInfo.axes}
                    pPanelDisplay={panelInfo.display}
                    pIsRawMode={isRaw}
                    pVisiblePanelRange={panelRange}
                />
            )}
            {contextMenuPosition && (
                <PanelContextMenu
                    runtimeState={panelHeaderRuntimeState}
                    onAction={handlePanelAction}
                    position={contextMenuPosition}
                    onClose={closeContextMenu}
                />
            )}
            {fftSelection && (
                <FFTModal
                    pSeriesSummaries={fftSelection.seriesSummaries}
                    pStartTime={fftSelection.startTime}
                    pEndTime={fftSelection.endTime}
                    pIsNumericXAxis={isNumericXAxis}
                    setIsOpen={closeWhenFalse(closePopup)}
                />
            )}
            {selectionSummary && (
                <SelectionSummaryPopover
                    selection={selectionSummary.selection}
                    position={selectionSummary.popoverPosition}
                    isNumericXAxis={isNumericXAxis}
                    onClose={closeSelectionSummary}
                />
            )}
            {activeHighlightEditor && (
                <EditHighlightModal
                    key={getHighlightEditorKey(activeHighlightEditor)}
                    activeHighlightEditor={activeHighlightEditor}
                    temporaryHighlight={temporaryHighlight}
                    highlightActions={highlightActions}
                    onApplyHighlightChange={(formState, editor) =>
                        applyHighlightChange(
                            formState,
                            editor,
                            temporaryHighlight,
                        )
                    }
                    onCancel={closePopup}
                    onApplied={closePopup}
                    isNumericXAxis={isNumericXAxis}
                />
            )}
            {annotationEditorMeta && (
                <EditAnnotationModal
                    key={getAnnotationEditorKey(annotationEditorMeta)}
                    annotationEditorMeta={annotationEditorMeta}
                    annotationAction={annotationAction}
                    onApplyAnnotationChange={applyAnnotationChange}
                    onDeleteAnnotation={deletePanelAnnotation}
                    onCancel={closeAnnotationEditor}
                    onApplied={closeAnnotationEditor}
                    isNumericXAxis={isNumericXAxis}
                />
            )}
            {popupState.mode === PanelPopupMode.DELETE_CONFIRM && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={closeWhenFalse(closePopup)}
                    pCallback={onDeletePanel}
                    pContents={
                        <div className="body-content">Do you want to delete this panel?</div>
                    }
                />
            )}
            {popupState.mode === PanelPopupMode.EXPORT_CSV && (
                <SavedToLocalModal
                    pPanelInfo={chartData}
                    pChartRef={panelChartApiRef}
                    pIsDarkMode
                    setIsOpen={closeWhenFalse(closePopup)}
                />
            )}
        </div>
    );
}

export default PanelContainer;
