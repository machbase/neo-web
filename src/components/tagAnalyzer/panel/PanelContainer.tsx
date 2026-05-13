import PanelChartFooter from '../chart/PanelChartFooter';
import PanelHeader from './PanelHeader';
import PanelChartBody from '../chart/PanelChartBody';
import PanelOverlays from './PanelOverlays';
import PanelEditor from './editor/PanelEditor';
import './PanelChartShell.scss';
import {
    useEffect,
    useRef,
    useState,
} from 'react';
import type {
    GlobalTimeRangeState,
    PanelCommandRegistry,
    PersistPanelStatePayload,
} from '../domain/BoardModel';
import { useChartRangeEventActions } from './useChartRangeEventActions';
import { usePanelBoardCommandRegistration } from './usePanelBoardCommandRegistration';
import { usePanelChartRuntime } from './usePanelChartRuntime';
import { usePanelVisibleTimeRangeCommit } from './usePanelVisibleTimeRangeCommit';
import { useRangeButtonActions } from './useRangeButtonActions';
import { usePanelBrushSelection } from './chartBody/usePanelBrushSelection';
import { usePanelInteractionController } from './usePanelInteractionController';
import { usePanelOverlayEditors } from './usePanelOverlayEditors';
import type {
    PanelChartHandle,
} from '../domain/PanelChartModel';
import {
    type PanelInfo,
} from '../domain/PanelModel';
import type {
    IntervalOption,
    TimeRangeConfig,
    TimeRangeMs,
} from '../time/TimeTypes';
import {
    hasVisibleTimeRangeChanged,
    isConcreteTimeRange,
} from '../time/TimeRangeUtils';

function createRawModePanelInfo(panelInfo: PanelInfo, isRaw: boolean): PanelInfo {
    const sNextToolbar = panelInfo.toolbar.isRaw === isRaw
        ? panelInfo.toolbar
        : {
              ...panelInfo.toolbar,
              isRaw: isRaw,
          };

    return sNextToolbar === panelInfo.toolbar
        ? panelInfo
        : {
              ...panelInfo,
              toolbar: sNextToolbar,
          };
}

export type PanelContainerBoardState = {
    timeRange: TimeRangeConfig;
    isActiveTab: boolean;
    globalTimeRange: GlobalTimeRangeState | undefined;
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
    onRegisterPanelCommands: PanelCommandRegistry['registerPanelCommands'];
};

export type PanelContainerPanelActions = {
    onToggleOverlapSelection: (start: number, end: number, isRaw: boolean) => void;
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
    const clearBrushSelectionRef = useRef<() => void>(() => undefined);

    const [localPanelInfo, setLocalPanelInfo] = useState<PanelInfo>(panelInfo);
    const [activePanelModal, setActivePanelModal] = useState<
        'deletePanel' | 'exportCsv' | undefined
    >(undefined);
    const chartRuntime = usePanelChartRuntime({
        panelInfo: localPanelInfo,
        boardTime: boardState.timeRange,
        isActiveTab: boardState.isActiveTab,
        isSelectedForOverlap: overlapState.isSelected,
        rollupTableList: boardState.rollupTableList,
        chartAreaRef: chartAreaRef,
        panelChartApiRef: panelChartApiRef,
        currentIsRaw: localPanelInfo.toolbar.isRaw,
        onPersistPanelState: boardActions.onPersistPanelState,
        onUpdateOverlapSelection: panelActions.onUpdateOverlapSelection,
    });
    const {
        commitVisibleTimeRangeChange,
    } = usePanelVisibleTimeRangeCommit({
        chartRuntime: chartRuntime,
        currentIsRaw: localPanelInfo.toolbar.isRaw,
    });
    const chartRangeEventActions = useChartRangeEventActions({
        chartRuntime: chartRuntime,
        commitVisibleTimeRangeChange: commitVisibleTimeRangeChange,
    });
    const {
        rangeShiftActions,
        navigatorShiftActions,
        navigatorZoomActions,
    } = useRangeButtonActions({
        chartRuntime: chartRuntime,
        commitVisibleTimeRangeChange: commitVisibleTimeRangeChange,
    });
    const {
        chartRangeState,
        hasLoadedChartData,
        isChartLoading,
        refreshPanelData,
        reloadAfterPanelEdit,
        refreshInitialTimeRange,
    } = chartRuntime;
    const rangeHandlers = {
        ...chartRangeEventActions,
        ...rangeShiftActions,
    };

    function applyBoardTimeRangeFromCommand(timeRange: TimeRangeConfig) {
        void (async () => {
            if (
                !boardState.isActiveTab ||
                !panelChartApiRef.current ||
                !chartRuntime.hasLoadedChartData ||
                !chartRuntime.hasInitializedChartRanges
            ) {
                return;
            }

            const sResolvedRange = await chartRuntime.resolveBoardTimeRange(timeRange);

            if (
                !isConcreteTimeRange(sResolvedRange) ||
                !hasVisibleTimeRangeChanged(
                    sResolvedRange,
                    sResolvedRange,
                    chartRuntime.chartRangeStateRef.current,
                )
            ) {
                return;
            }

            await commitVisibleTimeRangeChange(sResolvedRange, sResolvedRange);
        })();
    }

    async function applyGlobalTimeRangeFromCommand(
        globalTimeRange: GlobalTimeRangeState | undefined,
    ) {
        if (
            !globalTimeRange ||
            !boardState.isActiveTab ||
            chartRuntime.chartRangeStateRef.current.rangeOption === undefined
        ) {
            return;
        }

        chartRuntime.updateChartRangeState({
            rangeOption: globalTimeRange.interval,
        });
        if (
            !hasVisibleTimeRangeChanged(
                globalTimeRange.data,
                globalTimeRange.navigator,
                chartRuntime.chartRangeStateRef.current,
            )
        ) {
            return;
        }

        await commitVisibleTimeRangeChange(globalTimeRange.data, globalTimeRange.navigator);
    }

    async function initializePanelAndApplyGlobalTimeRangeWhenReady() {
        await chartRuntime.initializeWhenReady();
        await applyGlobalTimeRangeFromCommand(boardState.globalTimeRange);
    }

    usePanelBoardCommandRegistration({
        panelKey: panelInfo.meta.index_key,
        isActiveTab: boardState.isActiveTab,
        registerPanelCommands: boardActions.onRegisterPanelCommands,
        initializeWhenReady: () => void initializePanelAndApplyGlobalTimeRangeWhenReady(),
        commands: {
            refreshData: () => void chartRuntime.refreshCurrentVisibleData(),
            refreshTime: () => void chartRuntime.refreshInitialTimeRangeIfReady(),
            applyBoardTimeRange: applyBoardTimeRangeFromCommand,
            applyGlobalTimeRange: (globalTimeRange) =>
                void applyGlobalTimeRangeFromCommand(globalTimeRange),
        },
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
        void refreshPanelData({
            panelRange: chartRangeState.panelRange,
            raw: nextRaw,
            navigatorRange: chartRangeState.navigatorRange,
            panelInfoOverride: sNextPanelInfo,
        });
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
        onClearBrushSelection: () => clearBrushSelectionRef.current(),
        onToggleOverlapSelection: () =>
            panelActions.onToggleOverlapSelection(
                chartRangeState.panelRange.startTime,
                chartRangeState.panelRange.endTime,
                localPanelInfo.toolbar.isRaw,
            ),
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
        onCloseHighlight: panelOverlayModeActions.onCloseHighlight,
        onDragSelectStateChange: panelOverlayModeActions.onDragSelectStateChange,
        onHighlightSelection: onHighlightSelection,
        onFftSelectionChange: onFftSelectionChange,
    });
    clearBrushSelectionRef.current = brushSelection.clearSelection;

    function saveEditedPanel(nextPanelInfo: PanelInfo) {
        const sNextPanelInfo = overlayEditors.getPanelInfoWithCurrentMarkup(
            nextPanelInfo,
            nextPanelInfo.data.tag_set,
        );
        savePanel(sNextPanelInfo);
        void reloadAfterPanelEdit(sNextPanelInfo);
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
                    pNavigatorRange={chartRangeState.navigatorRange}
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
