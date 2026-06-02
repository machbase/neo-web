import PanelFooter from './PanelFooter';
import PanelHeader from './PanelHeader';
import PanelBody from './PanelBody';
import PanelCommandModals from './PanelCommandModals';
import PanelMarkupEditors from './PanelMarkupEditors';
import PanelSelectionOverlay from './PanelSelectionOverlay';
import PanelEditor from './editor/PanelEditor';
import PanelContextMenu from './modal/PanelContextMenu';
import './PanelChartShell.scss';
import {
    useRef,
    useState,
    type MouseEvent,
} from 'react';
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
import {
    MIXED_X_AXIS_KIND_WARNING,
    hasMixedXAxisValueKinds,
    hasNumericBaseTimeSeries,
} from '../domain/SeriesDomain';
import type { SetGlobalTimeRangePayload } from '../domain/BoardDomain';
import type {
    IntervalOption,
} from '../domain/time/TimeTypes';
import { PanelChartLoadStatus } from '../board/BoardPanelState';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalUtils';
import { createPanelBrushSelectionHandler } from './PanelBrushSelection';
import { useChartAreaWidthObserver } from '../board/useChartAreaWidthObserver';
import { usePanelAnnotation } from './usePanelAnnotation';
import { usePanelEditor } from './usePanelEditor';
import { usePanelHighlight } from './usePanelHighlight';
import type { AnnotationEditorMetaState } from './modal/EditAnnotationModal';

import type { ContextMenuPosition } from '@/design-system/components';
import type { FFTSelectionPayload } from '../domain/ChartDomain';
import type { PanelOverlayMode } from '../domain/PanelDomain';
import type { PanelSelectionSummary } from './PanelBrushSelection';

export type PanelContainerRuntimeProps = {
    rangeState: PanelRangeState;
    chartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
    resolvedIntervalOption: IntervalOption | undefined;
    loadStatus: {
        chart: PanelChartLoadStatus;
        navigator: PanelChartLoadStatus;
    };
    rangeHandlers: PanelRangeHandlers;
    navigatorShiftActions: PanelNavigatorShiftActions;
    navigatorZoomActions: PanelZoomActions;
};

type PanelContainerStateProps = {
    isRaw: boolean;
    isRawLocked: boolean;
    isOverlap: boolean;
};

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

function PanelContainer({
    panelInfo,
    runtime,
    state,
    actions,
}: PanelContainerProps) {
    const {
        rangeState,
        chartData,
        navigatorChartData,
        resolvedIntervalOption,
        loadStatus,
        rangeHandlers,
        navigatorShiftActions,
        navigatorZoomActions,
    } = runtime;
    const { panelRange, navigatorRange } = rangeState;
    const { isRaw, isRawLocked, isOverlap } = state;
    const {
        onChartAreaWidthChange,
        refreshData,
        refreshTime,
        reloadPanelEdit,
        onToggleRaw,
        onSavePanel,
        onSetGlobalTimeRange,
        onDeletePanel,
        onToggleOverlap,
    } = actions;
    const chartAreaRef = useRef<HTMLDivElement | null>(null);
    const panelChartApiRef = useRef<PanelChartHandle | null>(null);
    const hasMixedXAxisKinds = hasMixedXAxisValueKinds(panelInfo.data.tag_set);
    const isNumericXAxis =
        !hasMixedXAxisKinds && hasNumericBaseTimeSeries(panelInfo.data.tag_set);
    useChartAreaWidthObserver(chartAreaRef, onChartAreaWidthChange);
    
    const [overlayMode, setOverlayMode] = useState<PanelOverlayMode>('noOverlay');
    const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | undefined>(
        undefined,
    );
    const [fftSelection, setFftSelection] = useState<FFTSelectionPayload | undefined>(undefined);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isExportCsvOpen, setIsExportCsvOpen] = useState(false);
    const [selectionSummary, setSelectionSummary] = useState<PanelSelectionSummary | undefined>(
        undefined,
    );

    function resetOverlayState(): void {
        setSelectionSummary(undefined);
        setFftSelection(undefined);
        setContextMenuPosition(undefined);
        setIsDeleteConfirmOpen(false);
        setIsExportCsvOpen(false);
        setOverlayMode('noOverlay');
    }

    // const {
    //     overlayMode,
    //     contextMenuPosition,
    //     fftSelection,
    //     isDeleteConfirmOpen,
    //     isExportCsvOpen,
    //     selectionSummary,
    //     setOverlayMode,
    //     setContextMenuPosition,
    //     setFftSelection,
    //     setIsDeleteConfirmOpen,
    //     setIsExportCsvOpen,
    //     setSelectionSummary,
    //     resetOverlayState,
    // } = usePanelOverlayState();
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
    const [annotationEditorMeta, setAnnotationEditorMeta] = useState<
        AnnotationEditorMetaState | undefined
    >(undefined);
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
        closeContextMenu: () => setContextMenuPosition(undefined),
        closeAnnotationMode: () => setOverlayMode('noOverlay'),
        onSelectionSummaryChange: (nextSelectionSummary) => {
            setOverlayMode('dragSelect');
            setSelectionSummary(nextSelectionSummary);
            setFftSelection(undefined);
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
              setFftSelection(selectionSummary.selection);
              setSelectionSummary(undefined);
              setOverlayMode('noOverlay');
          }
        : undefined;

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
        resetOverlayState();
        clearActiveHighlightEditor();
        setAnnotationEditorMeta(undefined);
    }

    function closeAnnotationEditor(): void {
        setAnnotationEditorMeta(undefined);
        setOverlayMode('noOverlay');
    }

    function togglePanelOverlayMode(mode: 'highlight' | 'annotation' | 'dragSelect'): void {
        const sShouldOpenMode = overlayMode !== mode;

        resetPanelUi();

        if (sShouldOpenMode) {
            setOverlayMode(mode);
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
        setAnnotationEditorMeta(undefined);
        setSelectionSummary(undefined);
        setFftSelection(undefined);
        setContextMenuPosition({
            x: event.clientX,
            y: event.clientY,
        });

        if (overlayMode === 'annotation' || overlayMode === 'dragSelect') {
            setOverlayMode('noOverlay');
        }
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

        setAnnotationEditorMeta({
            position,
            seriesKey: sSeriesKey,
            timestamp,
        });
    }

    function activateEditAnnotationEditor(
        position: AnnotationEditorMetaState['position'],
        annotationIndex: number,
    ): void {
        const sAnnotation = annotationAction.getAnnotation(annotationIndex);

        setAnnotationEditorMeta({
            position,
            seriesKey: sAnnotation.seriesKey,
            annotationIndex,
        });
    }

    return (
        <div
            className="panel-form"
            style={{ border: `0.5px solid ${isOverlap ? '#FDB532' : '#454545'}` }}
            onContextMenu={handlePanelContextMenu}
        >
            <PanelHeader
                headerState={panelHeaderState}
                overlayMode={overlayMode}
                isEditing={isEditing}
                isRaw={isRaw}
                isRawLocked={isRawLocked}
                isNumericXAxis={isNumericXAxis}
                isOverlap={isOverlap}
                onToggleOverlap={onToggleOverlap}
                onToggleRaw={onToggleRaw}
                onToggleHighlight={() => togglePanelOverlayMode('highlight')}
                onToggleAnnotation={toggleAnnotationOverlayMode}
                onToggleDragSelect={() => togglePanelOverlayMode('dragSelect')}
                onOpenFft={openFftDialog}
                onSetGlobalTime={setGlobalTimeRange}
                onRefreshData={refreshData}
                onRefreshTime={refreshTime}
                onToggleEdit={toggleEditMode}
                onOpenExportCsv={() => setIsExportCsvOpen(true)}
                onOpenDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
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
                />
            )}
            {contextMenuPosition && (
                <PanelContextMenu
                    headerState={panelHeaderState}
                    overlayMode={overlayMode}
                    isEditing={isEditing}
                    isRaw={isRaw}
                    isRawLocked={isRawLocked}
                    onToggleOverlap={onToggleOverlap}
                    onToggleRaw={onToggleRaw}
                    onToggleDragSelect={() => togglePanelOverlayMode('dragSelect')}
                    onOpenFft={openFftDialog}
                    onSetGlobalTime={setGlobalTimeRange}
                    onRefreshData={refreshData}
                    onRefreshTime={refreshTime}
                    onToggleEdit={toggleEditMode}
                    onOpenDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
                    isOverlap={isOverlap}
                    position={contextMenuPosition}
                    onClose={() => setContextMenuPosition(undefined)}
                />
            )}
            <PanelSelectionOverlay
                fftSelection={fftSelection}
                onCloseFft={() => setFftSelection(undefined)}
                selectionSummary={selectionSummary}
                isNumericXAxis={isNumericXAxis}
                onCloseSelection={() => {
                    setSelectionSummary(undefined);
                    setFftSelection(undefined);
                    setOverlayMode('noOverlay');
                }}
            />
            <PanelMarkupEditors
                activeHighlightEditor={activeHighlightEditor}
                temporaryHighlight={temporaryHighlight}
                highlightActions={highlightActions}
                onApplyHighlightChange={applyHighlightChange}
                onCloseHighlightEditor={clearActiveHighlightEditor}
                annotationEditorMeta={annotationEditorMeta}
                annotationAction={annotationAction}
                onApplyAnnotationChange={applyAnnotationChange}
                onDeleteAnnotation={deletePanelAnnotation}
                onCloseAnnotationEditor={closeAnnotationEditor}
                isNumericXAxis={isNumericXAxis}
            />
            <PanelCommandModals
                isDeleteConfirmOpen={isDeleteConfirmOpen}
                onCloseDeleteConfirm={() => setIsDeleteConfirmOpen(false)}
                isExportCsvOpen={isExportCsvOpen}
                onCloseExportCsv={() => setIsExportCsvOpen(false)}
                onConfirmDeletePanel={onDeletePanel}
                exportCsvChartData={chartData}
                exportCsvChartRef={panelChartApiRef}
            />
        </div>
    );
}

export default PanelContainer;
