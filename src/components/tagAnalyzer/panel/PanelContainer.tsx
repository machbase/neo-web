import PanelFooter from './PanelFooter';
import PanelHeader, { PanelContextMenu } from './PanelHeader';
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
    PanelChartHandle,
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
import { createPanelBrushSelectionHandler } from './PanelBrushSelection';
import { useChartAreaWidthObserver } from '../board/useChartAreaWidthObserver';
import { usePanelAnnotation } from './usePanelAnnotation';
import { usePanelEditor } from './usePanelEditor';
import { usePanelHighlight } from './usePanelHighlight';

import type { ContextMenuPosition } from '@/design-system/components';
import type { FFTSelectionPayload } from '../domain/ChartDomain';
import type { PanelOverlayMode } from '../domain/PanelDomain';
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

type PanelTransientUiState = {
    overlayMode: PanelOverlayMode;
    contextMenuPosition: ContextMenuPosition | undefined;
    fftSelection: FFTSelectionPayload | undefined;
    isDeleteConfirmOpen: boolean;
    isExportCsvOpen: boolean;
    selectionSummary: PanelSelectionSummary | undefined;
    annotationEditorMeta: AnnotationEditorMetaState | undefined;
};

const INITIAL_PANEL_TRANSIENT_UI: PanelTransientUiState = {
    overlayMode: 'noOverlay',
    contextMenuPosition: undefined,
    fftSelection: undefined,
    isDeleteConfirmOpen: false,
    isExportCsvOpen: false,
    selectionSummary: undefined,
    annotationEditorMeta: undefined,
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
    
    const [transientUi, setTransientUi] = useState<PanelTransientUiState>(
        INITIAL_PANEL_TRANSIENT_UI,
    );
    const {
        overlayMode,
        contextMenuPosition,
        fftSelection,
        isDeleteConfirmOpen,
        isExportCsvOpen,
        selectionSummary,
        annotationEditorMeta,
    } = transientUi;

    function patchTransientUi(patch: Partial<PanelTransientUiState>): void {
        setTransientUi((current) => ({ ...current, ...patch }));
    }
    const {
        panelHighlights,
        activeHighlightEditor,
        temporaryHighlight,
        highlightActions,
        applyHighlightChange,
        activateEditHighlightEditor,
        activateCreateHighlightEditor,
        clearActiveHighlightEditor,
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
    const handleSelection = createPanelBrushSelectionHandler({
        chartData,
        seriesList: panelInfo.data.tag_set,
        chartAreaRef,
        isHighlightActive: overlayMode === 'highlight',
        isNumericXAxis,
        createHighlightFromSelection: activateCreateHighlightEditorFromBrush,
        closeContextMenu: () => patchTransientUi({ contextMenuPosition: undefined }),
        closeAnnotationMode: () => patchTransientUi({ overlayMode: 'noOverlay' }),
        onSelectionSummaryChange: (nextSelectionSummary) => {
            patchTransientUi({
                overlayMode: 'dragSelect',
                selectionSummary: nextSelectionSummary,
                fftSelection: undefined,
            });
        },
    });
    const chartMarkupHandlers: PanelMarkupHandlers = {
        onOpenCreateAnnotation: (position, seriesIndex, timestamp) => {
            if (overlayMode !== 'annotation') {
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
    const panelHeaderState = {
        title: panelInfo.meta.chart_title,
        panelRange,
        resolvedIntervalOption: sResolvedIntervalOption,
        canSetGlobalTime: !isNumericXAxis && Boolean(sResolvedIntervalOption),
        canSaveLocal: loadStatus.chart === PanelChartLoadStatus.Ready,
    };
    const openFftDialog = selectionSummary
        ? () => {
              patchTransientUi({
                  fftSelection: selectionSummary.selection,
                  selectionSummary: undefined,
                  overlayMode: 'noOverlay',
              });
          }
        : undefined;
    const openDeleteConfirm = () => patchTransientUi({ isDeleteConfirmOpen: true });
    const closeContextMenu = () =>
        patchTransientUi({ contextMenuPosition: undefined });
    const closeSelectionSummary = () =>
        patchTransientUi({
            selectionSummary: undefined,
            fftSelection: undefined,
            overlayMode: 'noOverlay',
        });
    const panelActionState = {
        headerState: panelHeaderState,
        overlayMode,
        isEditing,
        isRaw,
        isRawLocked,
        isOverlap,
    };
    const panelActionHandlers = {
        onToggleOverlap,
        onToggleRaw,
        onToggleHighlight: () => togglePanelOverlayMode('highlight'),
        onToggleAnnotation: toggleAnnotationOverlayMode,
        onToggleDragSelect: () => togglePanelOverlayMode('dragSelect'),
        onOpenFft: openFftDialog,
        onSetGlobalTime: setGlobalTimeRange,
        onRefreshData: refreshData,
        onRefreshTime: refreshTime,
        onToggleEdit: toggleEditMode,
        onOpenDeleteConfirm: openDeleteConfirm,
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

    function resetPanelUi(): void {
        setTransientUi(INITIAL_PANEL_TRANSIENT_UI);
        clearActiveHighlightEditor();
    }

    function closeAnnotationEditor(): void {
        patchTransientUi({
            annotationEditorMeta: undefined,
            overlayMode: 'noOverlay',
        });
    }

    function togglePanelOverlayMode(mode: 'highlight' | 'annotation' | 'dragSelect'): void {
        const sShouldOpenMode = overlayMode !== mode;

        resetPanelUi();

        if (sShouldOpenMode) {
            patchTransientUi({ overlayMode: mode });
        }
    }

    function toggleAnnotationOverlayMode(): void {
        if (annotationEditorMeta || overlayMode === 'annotation') {
            closeAnnotationEditor();
            return;
        }

        togglePanelOverlayMode('annotation');
    }

    function activateCreateHighlightEditorFromBrush(
        startTime: number,
        endTime: number,
    ): void {
        resetPanelUi();
        activateCreateHighlightEditor(startTime, endTime);
    }

    function handlePanelContextMenu(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        clearActiveHighlightEditor();
        patchTransientUi({
            annotationEditorMeta: undefined,
            selectionSummary: undefined,
            fftSelection: undefined,
            contextMenuPosition: { x: event.clientX, y: event.clientY },
            overlayMode:
                overlayMode === 'annotation' || overlayMode === 'dragSelect'
                    ? 'noOverlay'
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
            annotationEditorMeta: {
                position,
                seriesKey: sSeriesKey,
                timestamp,
            },
        });
    }

    function activateEditAnnotationEditor(
        position: AnnotationEditorMetaState['position'],
        annotationIndex: number,
    ): void {
        const sAnnotation = annotationAction.getAnnotation(annotationIndex);

        patchTransientUi({
            annotationEditorMeta: {
                position,
                seriesKey: sAnnotation.seriesKey,
                annotationIndex,
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
                {...panelActionState}
                {...panelActionHandlers}
                isNumericXAxis={isNumericXAxis}
                onOpenExportCsv={() => patchTransientUi({ isExportCsvOpen: true })}
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
                    {...panelActionState}
                    {...panelActionHandlers}
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
                    setIsOpen={closeWhenFalse(() =>
                        patchTransientUi({ fftSelection: undefined }),
                    )}
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
                    onApplyHighlightChange={applyHighlightChange}
                    onCancel={clearActiveHighlightEditor}
                    onApplied={clearActiveHighlightEditor}
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
            {isDeleteConfirmOpen && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={closeWhenFalse(() =>
                        patchTransientUi({ isDeleteConfirmOpen: false }),
                    )}
                    pCallback={onDeletePanel}
                    pContents={
                        <div className="body-content">Do you want to delete this panel?</div>
                    }
                />
            )}
            {isExportCsvOpen && (
                <SavedToLocalModal
                    pPanelInfo={chartData}
                    pChartRef={panelChartApiRef}
                    pIsDarkMode
                    setIsOpen={closeWhenFalse(() =>
                        patchTransientUi({ isExportCsvOpen: false }),
                    )}
                />
            )}
        </div>
    );
}

export default PanelContainer;
