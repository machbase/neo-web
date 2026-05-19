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
import type { PanelEditorConfig } from './editor/EditorTypes';
import { mergeEditorConfigIntoPanelState } from './editor/PanelEditorConfigConverter';
import { createPanelBrushSelectionHandler } from './PanelBrushSelection';
import { useChartAreaWidthObserver } from './useChartAreaWidthObserver';
import { usePanelAnnotation } from './usePanelAnnotation';
import { usePanelHighlight } from './usePanelHighlight';
import { usePanelOverlayState } from './usePanelOverlayState';

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

    const isChartLoading = chartLoadStatus === PanelChartLoadStatus.Loading;
    const isChartReady = chartLoadStatus === PanelChartLoadStatus.Ready;
    const currentPanelInfo =
        panelInfo.toolbar.isRaw === isRaw
            ? panelInfo
            : {
                  ...panelInfo,
                  toolbar: {
                      ...panelInfo.toolbar,
                      isRaw: isRaw,
                  },
              };

    const {
        panelOverlayModeState,
        isEditing,
        contextMenuPosition,
        fftSelection,
        isDeleteConfirmOpen,
        isExportCsvOpen,
        selectionSummary,
        resetAllModals,
        closeSelection,
        closeFftDialog,
        closeDeleteConfirm,
        closeExportCsv,
        closePanelEditor,
        closeContextMenu,
        closeAnnotation,
        openContextMenu,
        openFftDialog,
        openDeleteConfirm,
        openExportCsv,
        openSelectionSummary,
        setActiveMarkupEditorAndClearSelection,
        toggleOverlayMode,
        toggleAnnotationMode,
        toggleEditMode,
        activeHighlightEditor,
        activeAnnotationEditor,
    } = usePanelOverlayState();
    const {
        panelHighlights,
        highlightEditor,
        openHighlightEditor,
        createHighlightFromSelection,
    } = usePanelHighlight({
        highlights: currentPanelInfo.highlights,
        chartAreaRef,
        activeHighlightEditor,
        onActiveMarkupEditorChange: setActiveMarkupEditorAndClearSelection,
        onSaveHighlights: (highlights) =>
            onSavePanel({
                ...currentPanelInfo,
                highlights: highlights,
            }),
    });
    const {
        annotationEditor,
        openCreateAnnotationEditor,
        openAnnotationEditor,
    } = usePanelAnnotation({
        seriesList: currentPanelInfo.data.tag_set,
        activeAnnotationEditor,
        onActiveMarkupEditorChange: setActiveMarkupEditorAndClearSelection,
        onCloseAnnotationMode: closeAnnotation,
        onSaveSeriesList: (seriesList) =>
            onSavePanel({
                ...currentPanelInfo,
                data: {
                    ...currentPanelInfo.data,
                    tag_set: seriesList,
                },
            }),
    });
    const handleSelection = createPanelBrushSelectionHandler({
        chartData,
        seriesList: currentPanelInfo.data.tag_set,
        chartAreaRef,
        isHighlightActive: panelOverlayModeState.isHighlightActive,
        createHighlightFromSelection,
        closeContextMenu,
        closeAnnotationMode: closeAnnotation,
        onSelectionSummaryChange: openSelectionSummary,
    });
    const chartMarkupHandlers: PanelMarkupHandlers = {
        onOpenCreateAnnotation: (request) => {
            if (!panelOverlayModeState.isAnnotationActive) {
                return;
            }

            closeContextMenu();
            openCreateAnnotationEditor(request);
        },
        onActivateHighlightEditor: (request) => {
            closeContextMenu();
            closeAnnotation();
            openHighlightEditor(request);
        },
        onActivateAnnotationEditor: (request) => {
            closeContextMenu();
            closeAnnotation();
            openAnnotationEditor(request);
        },
    };

    const sResolvedIntervalOption = hasResolvedIntervalOption(
        resolvedIntervalOption,
    )
        ? resolvedIntervalOption
        : undefined;
    const panelHeaderState = {
        title: currentPanelInfo.meta.chart_title,
        panelRange,
        resolvedIntervalOption: sResolvedIntervalOption,
        canOpenFft: selectionSummary !== undefined,
        canSetGlobalTime: Boolean(sResolvedIntervalOption),
        canSaveLocal: isChartReady,
    };

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

    function toggleRawMode(): void {
        resetAllModals();
        onToggleRaw();
    }

    function handlePanelContextMenu(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        openContextMenu({
            x: event.clientX,
            y: event.clientY,
        });
    }

    function saveEditedPanelConfig(editorConfig: PanelEditorConfig) {
        const sNextPanelState = mergeEditorConfigIntoPanelState(
            {
                meta: currentPanelInfo.meta,
                data: currentPanelInfo.data,
                time: currentPanelInfo.time,
                axes: currentPanelInfo.axes,
                display: currentPanelInfo.display,
            },
            editorConfig,
        );
        const sNextPanelInfo = {
            ...currentPanelInfo,
            ...sNextPanelState,
        };

        onSavePanel(sNextPanelInfo);
        reloadPanelEdit(sNextPanelInfo);
    }

    return (
        <div
            className="panel-form"
            style={{ border: `0.5px solid ${isOverlap ? '#FDB532' : '#454545'}` }}
            onContextMenu={handlePanelContextMenu}
        >
            <PanelHeader
                headerState={panelHeaderState}
                overlayModeState={panelOverlayModeState}
                isEditing={isEditing}
                isRaw={isRaw}
                isOverlap={isOverlap}
                onToggleOverlap={onToggleOverlap}
                onToggleRaw={toggleRawMode}
                onToggleHighlight={() => toggleOverlayMode('highlight')}
                onToggleAnnotation={toggleAnnotationMode}
                onToggleDragSelect={() => toggleOverlayMode('dragSelect')}
                onOpenFft={openFftDialog}
                onSetGlobalTime={setGlobalTimeRange}
                onRefreshData={refreshData}
                onRefreshTime={refreshTime}
                onToggleEdit={toggleEditMode}
                onOpenExportCsv={openExportCsv}
                onOpenDeleteConfirm={openDeleteConfirm}
            />
            <div className="panel-chart-section">
                <PanelChartBody
                    pChartAreaRef={chartAreaRef}
                    pChartApiRef={panelChartApiRef}
                    pChartState={{
                        axes: currentPanelInfo.axes,
                        display: currentPanelInfo.display,
                        seriesList: currentPanelInfo.data.tag_set,
                        useNormalize: currentPanelInfo.use_normalize,
                        highlights: panelHighlights,
                    }}
                    pIsRaw={isRaw}
                    pOverlayModeState={panelOverlayModeState}
                    pChartData={chartData}
                    pNavigatorChartData={navigatorChartData}
                    pPanelRange={panelRange}
                    pNavigatorRange={navigatorRange}
                    pIsLoading={isChartLoading}
                    pRangeHandlers={rangeHandlers}
                    pMarkupHandlers={chartMarkupHandlers}
                    pOnSelection={handleSelection}
                />
                <PanelChartFooter
                    pShowLegend={currentPanelInfo.display.show_legend}
                    pNavigatorRange={navigatorRange}
                    pNavigatorShiftActions={navigatorShiftActions}
                    pNavigatorZoomActions={navigatorZoomActions}
                />
            </div>
            {isEditing && (
                <PanelEditor
                    pOnSaveEditorConfig={saveEditedPanelConfig}
                    pOnClose={closePanelEditor}
                    pPanelMeta={currentPanelInfo.meta}
                    pPanelData={currentPanelInfo.data}
                    pPanelTime={currentPanelInfo.time}
                    pPanelAxes={currentPanelInfo.axes}
                    pPanelDisplay={currentPanelInfo.display}
                    pIsRawMode={isRaw}
                />
            )}
            {contextMenuPosition && (
                <PanelContextMenu
                    headerState={panelHeaderState}
                    overlayModeState={panelOverlayModeState}
                    isEditing={isEditing}
                    isRaw={isRaw}
                    onToggleOverlap={onToggleOverlap}
                    onToggleRaw={toggleRawMode}
                    onToggleDragSelect={() => toggleOverlayMode('dragSelect')}
                    onOpenFft={openFftDialog}
                    onSetGlobalTime={setGlobalTimeRange}
                    onRefreshData={refreshData}
                    onRefreshTime={refreshTime}
                    onToggleEdit={toggleEditMode}
                    onOpenDeleteConfirm={openDeleteConfirm}
                    isOverlap={isOverlap}
                    position={contextMenuPosition}
                    onClose={closeContextMenu}
                />
            )}
            <PanelSelectionOverlay
                fftSelection={fftSelection}
                onCloseFft={closeFftDialog}
                selectionSummary={selectionSummary}
                onCloseSelection={closeSelection}
            />
            <PanelMarkupEditors
                highlightEditor={highlightEditor}
                annotationEditor={annotationEditor}
            />
            <PanelCommandModals
                isDeleteConfirmOpen={isDeleteConfirmOpen}
                onCloseDeleteConfirm={closeDeleteConfirm}
                isExportCsvOpen={isExportCsvOpen}
                onCloseExportCsv={closeExportCsv}
                onConfirmDeletePanel={onDeletePanel}
                exportCsvChartData={chartData}
                exportCsvChartRef={panelChartApiRef}
            />
        </div>
    );
}

export default PanelContainer;
