import PanelChartFooter from './PanelChartFooter';
import PanelHeader from './PanelHeader';
import PanelChartBody from './PanelChartBody';
import PanelOverlays from './PanelOverlays';
import PanelEditor from './editor/PanelEditor';
import './PanelChartShell.scss';
import {
    useEffect,
    useRef,
    useState,
} from 'react';
import type {
    BoardRangeSyncState,
    PersistPanelStatePayload,
} from '../domain/BoardModel';
import { usePanelChartRangeController } from './usePanelChartRangeController';
import { usePanelBrushSelection } from './chartBody/usePanelBrushSelection';
import { usePanelInteractionController } from './usePanelInteractionController';
import { usePanelOverlayEditors } from './usePanelOverlayEditors';
import type {
    PanelChartHandle,
} from './PanelTypes';
import {
    type PanelInfo,
} from '../domain/PanelModel';
import type {
    IntervalOption,
    TimeRangeConfig,
    TimeRangeMs,
} from '../time/TimeTypes';

function createRawModePanelInfo(panelInfo: PanelInfo, isRaw: boolean): PanelInfo {
    const sNextToolbar = panelInfo.toolbar.isRaw === isRaw
        ? panelInfo.toolbar
        : {
              ...panelInfo.toolbar,
              isRaw: isRaw,
          };

    if (!isRaw || panelInfo.axes.sampling.enabled) {
        return sNextToolbar === panelInfo.toolbar
            ? panelInfo
            : {
                  ...panelInfo,
                  toolbar: sNextToolbar,
              };
    }

    return {
        ...panelInfo,
        toolbar: sNextToolbar,
        axes: {
            ...panelInfo.axes,
            sampling: {
                ...panelInfo.axes.sampling,
                enabled: true,
            },
        },
    };
}

export type PanelContainerBoardState = {
    timeRange: TimeRangeConfig;
    isActiveTab: boolean;
    rangeSyncState: BoardRangeSyncState;
    rollupTableList: string[];
};

export type PanelContainerOverlapState = {
    isSelected: boolean;
    isAnchor: boolean;
};

export type PanelContainerBoardActions = {
    onPersistPanelState: (payload: PersistPanelStatePayload) => void;
    onSavePanel: (panelInfo: PanelInfo) => void;
    onSetGlobalTimeRange: (payload: {
        dataTime: TimeRangeMs;
        navigatorTime: TimeRangeMs;
        interval: IntervalOption;
    }) => void;
};

export type PanelContainerPanelActions = {
    onToggleOverlapSelection: () => void;
    onUpdateOverlapSelection: (start: number, end: number, isRaw: boolean) => void;
    onDeletePanel: (start: number, end: number, isRaw: boolean) => void;
};

function PanelContainer({
    panelInfo,
    boardState,
    overlapState,
    boardActions,
    panelActions,
}: {
    panelInfo: PanelInfo;
    boardState: PanelContainerBoardState;
    overlapState: PanelContainerOverlapState;
    boardActions: PanelContainerBoardActions;
    panelActions: PanelContainerPanelActions;
}) {
    const chartAreaRef = useRef<HTMLDivElement | null>(null);
    const panelChartApiRef = useRef<PanelChartHandle | null>(null);

    const [localPanelInfo, setLocalPanelInfo] = useState<PanelInfo>(panelInfo);
    const [activePanelModal, setActivePanelModal] = useState<
        'deletePanel' | 'exportCsv' | undefined
    >(undefined);
    const [shouldRefreshAfterEdit, setShouldRefreshAfterEdit] = useState(false);
    const {
        chartRangeState,
        hasLoadedChartData,
        isChartLoading,
        refreshPanelData,
        refreshInitialTimeRange,
        rangeHandlers,
        navigatorShiftActions,
        navigatorZoomActions,
    } = usePanelChartRangeController({
        panelInfo: localPanelInfo,
        boardTime: boardState.timeRange,
        isActiveTab: boardState.isActiveTab,
        boardRangeSyncState: boardState.rangeSyncState,
        isSelectedForOverlap: overlapState.isSelected,
        rollupTableList: boardState.rollupTableList,
        chartAreaRef: chartAreaRef,
        panelChartApiRef: panelChartApiRef,
        currentIsRaw: localPanelInfo.toolbar.isRaw,
        shouldRefreshAfterEdit: shouldRefreshAfterEdit,
        onPersistPanelState: boardActions.onPersistPanelState,
        onUpdateOverlapSelection: panelActions.onUpdateOverlapSelection,
        onEditRefreshHandled: () => setShouldRefreshAfterEdit(false),
    });

    function savePanel(nextPanelInfo: PanelInfo) {
        setLocalPanelInfo(nextPanelInfo);
        boardActions.onSavePanel(nextPanelInfo);
    }

    const overlayEditors = usePanelOverlayEditors({
        panelInfo: localPanelInfo,
        chartAreaRef: chartAreaRef,
        onPanelInfoChange: setLocalPanelInfo,
        onSavePanel: savePanel,
    });

    function toggleRaw(nextRaw: boolean) {
        const sNextPanelInfo = overlayEditors.getPanelInfoWithCurrentMarkup(
            createRawModePanelInfo(localPanelInfo, nextRaw),
        );

        overlayEditors.closePanelEditors();
        setLocalPanelInfo(sNextPanelInfo);
        if (nextRaw && !localPanelInfo.axes.sampling.enabled) {
            boardActions.onSavePanel(sNextPanelInfo);
        }

        if (chartRangeState.panelRange.startTime) {
            boardActions.onPersistPanelState({
                targetPanelKey: sNextPanelInfo.meta.index_key,
                timeInfo: {
                    panelRange: chartRangeState.panelRange,
                    navigatorRange: chartRangeState.navigatorRange,
                },
                isRaw: nextRaw,
            });
        }
        void refreshPanelData(
            chartRangeState.panelRange,
            nextRaw,
            chartRangeState.navigatorRange,
            sNextPanelInfo,
        );
    }

    const {
        panelHeaderState,
        panelHeaderActions,
        panelOverlayModeState,
        panelOverlayModeActions,
        fftSelection,
        onFftSelectionChange,
        handlePanelContextMenu,
        closeContextMenu,
    } = usePanelInteractionController({
        panelInfo: localPanelInfo,
        isRaw: localPanelInfo.toolbar.isRaw,
        chartRangeState: chartRangeState,
        isSelectedForOverlap: overlapState.isSelected,
        isOverlapAnchor: overlapState.isAnchor,
        canSaveLocal: hasLoadedChartData,
        isAnnotationEditorOpen: overlayEditors.isAnnotationEditorOpen,
        onClosePanelEditors: overlayEditors.closePanelEditors,
        onCloseAnnotationEditor: overlayEditors.cancelAnnotationEditor,
        onToggleOverlapSelection: panelActions.onToggleOverlapSelection,
        onToggleRaw: toggleRaw,
        onSetGlobalTimeRange: boardActions.onSetGlobalTimeRange,
        onRefreshPanelData: refreshPanelData,
        onRefreshInitialTimeRange: refreshInitialTimeRange,
        onOpenExportCsv: () => setActivePanelModal('exportCsv'),
        onOpenDeleteConfirm: () => setActivePanelModal('deletePanel'),
    });

    const {
        chartMarkupHandlers,
        onHighlightSelection,
    } = overlayEditors.createChartMarkupActions({
        isAnnotationActive: panelOverlayModeState.isAnnotationActive,
        onCloseAnnotationMode: panelOverlayModeActions.onCloseAnnotation,
        onCloseContextMenu: closeContextMenu,
    });
    const {
        highlightEditor,
        editAnnotation,
    } = overlayEditors.createOverlayEditorActions({
        onCloseAnnotationMode: panelOverlayModeActions.onCloseAnnotation,
    });
    const brushSelection = usePanelBrushSelection({
        chartAreaRef: chartAreaRef,
        chartData: chartRangeState.chartData,
        seriesList: overlayEditors.panelSeriesList,
        isHighlightActive: panelOverlayModeState.isHighlightActive,
        isDragSelectActive: panelOverlayModeState.isDragSelectActive,
        onCloseHighlight: panelOverlayModeActions.onCloseHighlight,
        onDragSelectStateChange: panelOverlayModeActions.onDragSelectStateChange,
        onHighlightSelection: onHighlightSelection,
        onFftSelectionChange: onFftSelectionChange,
    });

    function saveEditedPanel(nextPanelInfo: PanelInfo) {
        setShouldRefreshAfterEdit(true);
        savePanel(
            overlayEditors.getPanelInfoWithCurrentMarkup(
                nextPanelInfo,
                nextPanelInfo.data.tag_set,
            ),
        );
    }

    const deletePanelModalStateAndActions = {
        isOpen: activePanelModal === 'deletePanel',
        onClose: () => setActivePanelModal(undefined),
        onConfirm: () =>
            panelActions.onDeletePanel(
                chartRangeState.panelRange.startTime,
                chartRangeState.panelRange.endTime,
                localPanelInfo.toolbar.isRaw,
            ),
    };
    const exportCsvModalStateAndActions = {
        isOpen: activePanelModal === 'exportCsv',
        chartData: chartRangeState.chartData,
        chartRef: panelChartApiRef,
        onClose: () => setActivePanelModal(undefined),
    };

    useEffect(() => {
        setLocalPanelInfo(panelInfo);
    }, [panelInfo]);

    return (
        <div
            className="panel-form"
            style={{ border: `0.5px solid ${overlapState.isSelected ? '#FDB532' : '#454545'}` }}
            onContextMenu={handlePanelContextMenu}
        >
            <PanelHeader
                pHeaderState={panelHeaderState}
                pHeaderActions={panelHeaderActions}
                pOverlayModeState={panelOverlayModeState}
                pOverlayModeActions={panelOverlayModeActions}
            />
            <div className="panel-chart-section">
                <PanelChartBody
                    pChartAreaRef={chartAreaRef}
                    pChartApiRef={panelChartApiRef}
                    pChartState={{
                        axes: localPanelInfo.axes,
                        display: localPanelInfo.display,
                        seriesList: overlayEditors.panelSeriesList,
                        useNormalize: localPanelInfo.use_normalize,
                        highlights: overlayEditors.panelHighlights,
                    }}
                    pIsRaw={panelHeaderState.isRaw}
                    pOverlayModeState={panelOverlayModeState}
                    pNavigateState={chartRangeState}
                    pIsLoading={isChartLoading}
                    pRangeHandlers={rangeHandlers}
                    pMarkupHandlers={chartMarkupHandlers}
                    pOnSelection={brushSelection.handleSelection}
                />
                <PanelChartFooter
                    pShowLegend={localPanelInfo.display.show_legend}
                    pVisiblePanelRange={chartRangeState.panelRange}
                    pIsLoading={isChartLoading}
                    pNavigatorShiftActions={navigatorShiftActions}
                    pNavigatorZoomActions={navigatorZoomActions}
                />
            </div>
            {panelOverlayModeState.isEditing && (
                <PanelEditor
                    pOnSavePanel={saveEditedPanel}
                    pOnClose={panelOverlayModeActions.onCloseEdit}
                    pPanelInfo={localPanelInfo}
                    pIsRawMode={panelHeaderState.isRaw}
                />
            )}
            <PanelOverlays
                headerState={panelHeaderState}
                headerActions={panelHeaderActions}
                overlayModeState={panelOverlayModeState}
                overlayModeActions={panelOverlayModeActions}
                onCloseContextMenu={closeContextMenu}
                fftSelection={fftSelection}
                selectionSummary={{
                    selection: brushSelection.selection,
                    popoverState: brushSelection.selectionPopoverState,
                    onClose: brushSelection.handleCloseSelection,
                }}
                highlightEditor={highlightEditor}
                editAnnotation={editAnnotation}
                deletePanel={deletePanelModalStateAndActions}
                exportCsv={exportCsvModalStateAndActions}
            />
        </div>
    );
}

export default PanelContainer;
