import PanelChartFooter from '../chart/PanelChartFooter';
import PanelHeader from './PanelHeader';
import PanelChartBody from '../chart/PanelChartBody';
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
    PanelMarkupHandlers,
    PanelNavigatorShiftActions,
    PanelRangeHandlers,
    PanelZoomActions,
} from '../domain/PanelChartModel';
import type { ChartSeriesData } from '../domain/ChartDataModel';
import type { PanelInfo } from '../domain/PanelModel';
import type { SetGlobalTimeRangePayload } from '../domain/BoardModel';
import type {
    IntervalOption,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { PanelChartLoadStatus } from '../board/BoardPanelState';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalUtils';
import { createPanelBrushSelectionHandler } from './PanelBrushSelection';
import { useChartAreaWidthObserver } from '../board/useChartAreaWidthObserver';
import { usePanelAnnotation } from './usePanelAnnotation';
import { usePanelEditor } from './usePanelEditor';
import { usePanelHighlight } from './usePanelHighlight';
import { usePanelOverlayState } from './usePanelOverlayState';
import type { AnnotationEditorMetaState } from './modal/EditAnnotationModal';

type PanelContainerProps = {
    panelInfo: PanelInfo;
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    chartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
    resolvedIntervalOption: IntervalOption | undefined;
    chartLoadStatus: PanelChartLoadStatus;
    rangeHandlers: PanelRangeHandlers;
    navigatorShiftActions: PanelNavigatorShiftActions;
    navigatorZoomActions: PanelZoomActions;
    onChartAreaWidthChange: (width: number | undefined) => void;
    refreshData: () => void;
    refreshTime: () => void;
    reloadPanelEdit: (panelInfo: PanelInfo) => void;
    isRaw: boolean;
    onToggleRaw: () => void;
    onSavePanel: (panelInfo: PanelInfo) => void;
    onSetGlobalTimeRange: (payload: SetGlobalTimeRangePayload) => void;
    onDeletePanel: () => void;
    isOverlap: boolean;
    onToggleOverlap: () => void;
};

function PanelContainer({
    panelInfo,
    panelRange,
    navigatorRange,
    chartData,
    navigatorChartData,
    resolvedIntervalOption,
    chartLoadStatus,
    rangeHandlers,
    navigatorShiftActions,
    navigatorZoomActions,
    onChartAreaWidthChange,
    refreshData,
    refreshTime,
    reloadPanelEdit,
    isRaw,
    onToggleRaw,
    onSavePanel,
    onSetGlobalTimeRange,
    onDeletePanel,
    isOverlap,
    onToggleOverlap,
}: PanelContainerProps) {
    const chartAreaRef = useRef<HTMLDivElement | null>(null);
    const panelChartApiRef = useRef<PanelChartHandle | null>(null);
    useChartAreaWidthObserver(chartAreaRef, onChartAreaWidthChange);

    const {
        overlayMode,
        contextMenuPosition,
        fftSelection,
        isDeleteConfirmOpen,
        isExportCsvOpen,
        selectionSummary,
        setOverlayMode,
        setContextMenuPosition,
        setFftSelection,
        setIsDeleteConfirmOpen,
        setIsExportCsvOpen,
        setSelectionSummary,
        resetOverlayState,
    } = usePanelOverlayState();
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
        onSaveHighlights: (highlights) =>
            onSavePanel({
                ...panelInfo,
                highlights: highlights,
            }),
    });
    const {
        annotationAction,
        applyAnnotationChange,
        deleteSeriesAnnotation,
    } = usePanelAnnotation({
        seriesList: panelInfo.data.tag_set,
        onSaveSeriesList: (seriesList) =>
            onSavePanel({
                ...panelInfo,
                data: {
                    ...panelInfo.data,
                    tag_set: seriesList,
                },
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
        onResetPanelUi: resetPanelUi,
        onSavePanel,
        reloadPanelEdit,
    });
    const handleSelection = createPanelBrushSelectionHandler({
        chartData,
        seriesList: panelInfo.data.tag_set,
        chartAreaRef,
        isHighlightActive: overlayMode === 'highlight',
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
        onActivateAnnotationEditor: (position, seriesIndex, annotationIndex) => {
            resetPanelUi();
            activateEditAnnotationEditor(position, seriesIndex, annotationIndex);
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
        canSetGlobalTime: Boolean(sResolvedIntervalOption),
        canSaveLocal: chartLoadStatus === PanelChartLoadStatus.Ready,
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
            return;
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
        const sSeriesIndex =
            seriesIndex !== undefined &&
            seriesIndex >= 0 &&
            seriesIndex < annotationAction.getSeriesCount()
                ? seriesIndex
                : undefined;

        setAnnotationEditorMeta({
            position,
            seriesIndex: sSeriesIndex,
            timestamp,
        });
    }

    function activateEditAnnotationEditor(
        position: AnnotationEditorMetaState['position'],
        seriesIndex: number,
        annotationIndex: number,
    ): void {
        if (!annotationAction.getAnnotation(seriesIndex, annotationIndex)) {
            return;
        }

        setAnnotationEditorMeta({
            position,
            seriesIndex,
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
            <div className="panel-chart-section">
                <PanelChartBody
                    pChartAreaRef={chartAreaRef}
                    pChartApiRef={panelChartApiRef}
                    pChartState={{
                        axes: panelInfo.axes,
                        display: panelInfo.display,
                        seriesList: panelInfo.data.tag_set,
                        useNormalize: panelInfo.use_normalize,
                        highlights: panelHighlights,
                    }}
                    pIsRaw={isRaw}
                    pOverlayMode={overlayMode}
                    pChartData={chartData}
                    pNavigatorChartData={navigatorChartData}
                    pPanelRange={panelRange}
                    pNavigatorRange={navigatorRange}
                    pIsLoading={chartLoadStatus === PanelChartLoadStatus.Loading}
                    pRangeHandlers={rangeHandlers}
                    pMarkupHandlers={chartMarkupHandlers}
                    pOnSelection={handleSelection}
                />
                <PanelChartFooter
                    pShowLegend={panelInfo.display.show_legend}
                    pNavigatorRange={navigatorRange}
                    pNavigatorShiftActions={navigatorShiftActions}
                    pNavigatorZoomActions={navigatorZoomActions}
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
                onDeleteAnnotation={deleteSeriesAnnotation}
                onCloseAnnotationEditor={closeAnnotationEditor}
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
