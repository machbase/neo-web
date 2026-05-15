import PanelChartFooter from '../chart/PanelChartFooter';
import PanelHeader from './PanelHeader';
import PanelChartBody from '../chart/PanelChartBody';
import PanelOverlays from './PanelOverlays';
import PanelEditor from './editor/PanelEditor';
import PanelContextMenu from './modal/PanelContextMenu';
import './PanelChartShell.scss';
import {
    useEffect,
    useReducer,
    useRef,
    useState,
    type MouseEvent,
} from 'react';
import type {
    GlobalTimeRangeState,
    PanelCommandRegistry,
    PersistPanelStatePayload,
} from '../domain/BoardModel';
import {
    usePanelRangeRuntime,
} from './usePanelRangeRuntime';
import { useRegisterActivePanelCommands } from './useRegisterActivePanelCommands';
import {
    usePanelBrushSelection,
    type PanelSelectionSummary,
} from './chartBody/usePanelBrushSelection';
import {
    usePanelOverlayEditors,
    type PanelActiveMarkupEditor,
} from './usePanelOverlayEditors';
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
} from '../domain/time/TimeTypes';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalUtils';
import { formatLocalRangeLabel } from '../domain/time/TimeFormatters';
import type {
    PanelActiveDialog,
    PanelHeaderCommandDispatch,
    PanelHeaderState,
    PanelOverlayModeDispatch,
    PanelOverlayModeState,
} from './PanelTypes';
import type { PanelEditorConfig } from './editor/EditorTypes';
import {
    mergeEditorConfigIntoPanelInfo,
} from './editor/PanelEditorConfigConverter';

export type PanelOverlapSelection = {
    isSelected: boolean;
    isAnchor: boolean;
    canToggle: boolean;
    toggleSelection: (range: TimeRangeMs, isRaw: boolean) => void;
    updateSelection: (range: TimeRangeMs, isRaw: boolean) => void;
    deleteSelection: (range: TimeRangeMs, isRaw: boolean) => void;
};

type ContextMenuPosition = {
    x: number;
    y: number;
};

type PanelInteractionMode =
    | 'idle'
    | 'highlight'
    | 'annotation'
    | 'dragSelect'
    | 'edit';

type PanelInteractionState = {
    mode: PanelInteractionMode;
    contextMenuPosition: ContextMenuPosition | undefined;
    activeDialog: PanelActiveDialog | undefined;
    activeMarkupEditor: PanelActiveMarkupEditor | undefined;
    selectionSummary: PanelSelectionSummary | undefined;
};

type PanelInteractionAction =
    | { type: 'toggle-highlight' }
    | { type: 'open-annotation' }
    | { type: 'close-annotation' }
    | { type: 'toggle-drag-select' }
    | { type: 'toggle-edit' }
    | { type: 'open-fft' }
    | { type: 'close-edit' }
    | { type: 'set-selection-summary'; selectionSummary: PanelSelectionSummary }
    | { type: 'close-selection' }
    | { type: 'set-active-markup-editor'; activeMarkupEditor: PanelActiveMarkupEditor | undefined }
    | { type: 'close-markup-editor' }
    | { type: 'open-dialog'; activeDialog: PanelActiveDialog }
    | { type: 'close-dialog' }
    | { type: 'open-context-menu'; position: ContextMenuPosition }
    | { type: 'close-context-menu' };

const INITIAL_PANEL_INTERACTION_STATE: PanelInteractionState = {
    mode: 'idle',
    contextMenuPosition: undefined,
    activeDialog: undefined,
    activeMarkupEditor: undefined,
    selectionSummary: undefined,
};

function panelInteractionStateReducer(
    state: PanelInteractionState,
    action: PanelInteractionAction,
): PanelInteractionState {
    switch (action.type) {
        case 'toggle-highlight':
            return {
                ...closeSelectionState(state),
                mode: state.mode === 'highlight' ? 'idle' : 'highlight',
                contextMenuPosition: undefined,
                activeMarkupEditor: undefined,
            };
        case 'open-annotation':
            return {
                ...closeSelectionState(state),
                mode: 'annotation',
                contextMenuPosition: undefined,
                activeMarkupEditor: undefined,
            };
        case 'close-annotation':
            return {
                ...state,
                mode: state.mode === 'annotation' ? 'idle' : state.mode,
                activeMarkupEditor:
                    state.activeMarkupEditor?.type === 'annotation'
                        ? undefined
                        : state.activeMarkupEditor,
            };
        case 'toggle-drag-select':
            return state.mode === 'dragSelect'
                ? {
                      ...closeSelectionState(state),
                      mode: 'idle',
                  }
                : {
                      ...state,
                      mode: 'dragSelect',
                      activeMarkupEditor: undefined,
                      contextMenuPosition: undefined,
                  };
        case 'toggle-edit':
            return {
                ...closeSelectionState(state),
                contextMenuPosition: undefined,
                activeMarkupEditor: undefined,
                mode: state.mode === 'edit' ? 'idle' : 'edit',
            };
        case 'open-fft':
            if (!state.selectionSummary) {
                return state;
            }

            return {
                ...state,
                activeDialog: {
                    type: 'fft',
                    selection: state.selectionSummary.selection,
                },
                mode: state.mode === 'dragSelect' ? 'idle' : state.mode,
                selectionSummary: undefined,
            };
        case 'close-edit':
            return {
                ...state,
                mode: state.mode === 'edit' ? 'idle' : state.mode,
            };
        case 'set-selection-summary':
            return {
                ...state,
                mode: 'dragSelect',
                selectionSummary: action.selectionSummary,
                activeDialog: state.activeDialog?.type === 'fft'
                    ? undefined
                    : state.activeDialog,
            };
        case 'close-selection':
            return closeSelectionState(state);
        case 'set-active-markup-editor':
            return {
                ...state,
                activeMarkupEditor: action.activeMarkupEditor,
                mode:
                    action.activeMarkupEditor !== undefined &&
                    state.mode !== 'edit'
                        ? 'idle'
                        : state.mode,
                activeDialog: state.activeDialog?.type === 'fft'
                    ? undefined
                    : state.activeDialog,
                selectionSummary: undefined,
            };
        case 'close-markup-editor':
            return {
                ...state,
                activeMarkupEditor: undefined,
            };
        case 'open-dialog':
            return {
                ...closeSelectionState(state),
                activeDialog: action.activeDialog,
            };
        case 'close-dialog':
            return {
                ...state,
                activeDialog: undefined,
            };
        case 'open-context-menu': {
            const sNextState = closeSelectionState(state);

            return {
                ...sNextState,
                contextMenuPosition: action.position,
                mode: sNextState.mode === 'annotation' ? 'idle' : sNextState.mode,
                activeMarkupEditor: undefined,
            };
        }
        case 'close-context-menu':
            return {
                ...state,
                contextMenuPosition: undefined,
            };
        default:
            return state;
    }
}

function closeSelectionState(state: PanelInteractionState): PanelInteractionState {
    return {
        ...state,
        mode: state.mode === 'dragSelect' ? 'idle' : state.mode,
        activeDialog: state.activeDialog?.type === 'fft'
            ? undefined
            : state.activeDialog,
        selectionSummary: undefined,
    };
}

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
    onDeletePanel: () => void;
};

function PanelContainer({
    panelInfo,
    boardState,
    boardActions,
    panelActions,
    overlapSelection,
}: {
    panelInfo: PanelInfo;
    boardState: PanelContainerBoardState;
    boardActions: PanelContainerBoardActions;
    panelActions: PanelContainerPanelActions;
    overlapSelection: PanelOverlapSelection;
}) {
    const chartAreaRef = useRef<HTMLDivElement | null>(null);
    const panelChartApiRef = useRef<PanelChartHandle | null>(null);

    const [localPanelInfo, setLocalPanelInfo] = useState<PanelInfo>(panelInfo);
    const rangeRuntime = usePanelRangeRuntime({
        panelInfo: localPanelInfo,
        boardTime: boardState.timeRange,
        isActiveTab: boardState.isActiveTab,
        isSelectedForOverlap: overlapSelection.isSelected,
        rollupTableList: boardState.rollupTableList,
        chartAreaRef: chartAreaRef,
        panelChartApiRef: panelChartApiRef,
        onPersistPanelState: boardActions.onPersistPanelState,
        onUpdateOverlapSelection: (start, end, isRaw) =>
            overlapSelection.updateSelection(
                { startTime: start, endTime: end },
                isRaw,
            ),
    });
    const {
        chartRangeState,
        chartLoadStatus,
        rangeHandlers,
        navigatorShiftActions,
        navigatorZoomActions,
        refreshPanelData,
        reloadAfterPanelEdit,
        refreshInitialTimeRange,
    } = rangeRuntime;
    const isChartLoading = chartLoadStatus === 'loading';

    useRegisterActivePanelCommands({
        panelKey: panelInfo.meta.index_key,
        isActiveTab: boardState.isActiveTab,
        registerPanelCommands: boardActions.onRegisterPanelCommands,
        initializeWhenReady: () =>
            void rangeRuntime.initializeAndApplyGlobalTimeRange(
                boardState.globalTimeRange,
            ),
        commands: {
            refreshData: () => void rangeRuntime.refreshCurrentVisibleData(),
            refreshTime: () =>
                void rangeRuntime.refreshInitialTimeRangeIfReady(),
            applyBoardTimeRange: (timeRange) =>
                void rangeRuntime.applyBoardTimeRange(timeRange),
            applyGlobalTimeRange: (globalTimeRange) =>
                void rangeRuntime.applyGlobalTimeRange(globalTimeRange),
        },
    });

    const [interactionState, dispatchInteractionState] = useReducer(
        panelInteractionStateReducer,
        INITIAL_PANEL_INTERACTION_STATE,
    );

    function savePanel(nextPanelInfo: PanelInfo) {
        setLocalPanelInfo(nextPanelInfo);
        boardActions.onSavePanel(nextPanelInfo);
    }

    const overlayEditors = usePanelOverlayEditors({
        panelInfo: localPanelInfo,
        chartAreaRef: chartAreaRef,
        onSavePanel: savePanel,
        activeMarkupEditor: interactionState.activeMarkupEditor,
        onActiveMarkupEditorChange: (activeMarkupEditor) =>
            dispatchInteractionState({
                type: 'set-active-markup-editor',
                activeMarkupEditor: activeMarkupEditor,
            }),
    });

    function toggleRaw(nextRaw: boolean) {
        const sNextPanelInfo = createRawModePanelInfo(localPanelInfo, nextRaw);

        dispatchInteractionState({ type: 'close-markup-editor' });
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
            navigatorRange: chartRangeState.navigatorRange,
            panelInfoOverride: sNextPanelInfo,
        });
    }

    const {
        mode: interactionMode,
        contextMenuPosition,
        activeDialog,
        selectionSummary,
    } = interactionState;
    const sResolvedIntervalOption = hasResolvedIntervalOption(chartRangeState.rangeOption)
        ? chartRangeState.rangeOption
        : undefined;
    const sTimeText = chartRangeState.panelRange.startTime
        ? `${formatLocalRangeLabel(chartRangeState.panelRange.startTime)} ~ ${formatLocalRangeLabel(chartRangeState.panelRange.endTime)}`
        : '';
    const sIntervalText =
        !localPanelInfo.toolbar.isRaw && sResolvedIntervalOption
            ? `${sResolvedIntervalOption.IntervalValue}${sResolvedIntervalOption.IntervalType}`
            : '';
    const sCanSetGlobalTime = Boolean(chartRangeState.rangeOption);
    const panelOverlayModeState: PanelOverlayModeState = {
        isEditing: interactionMode === 'edit',
        isHighlightActive: interactionMode === 'highlight',
        isAnnotationActive: interactionMode === 'annotation',
        isDragSelectActive: interactionMode === 'dragSelect',
    };
    const panelHeaderState: PanelHeaderState = {
        title: localPanelInfo.meta.chart_title,
        timeText: sTimeText,
        intervalText: sIntervalText,
        isRaw: localPanelInfo.toolbar.isRaw,
        canOpenFft: selectionSummary !== undefined,
        canSetGlobalTime: sCanSetGlobalTime,
        canSaveLocal: chartLoadStatus === 'ready',
    };

    const dispatchPanelOverlayModeCommand: PanelOverlayModeDispatch = (command) => {
        switch (command.type) {
            case 'toggle-highlight':
                dispatchInteractionState({ type: 'toggle-highlight' });
                return;
            case 'toggle-annotation':
                if (
                    interactionState.activeMarkupEditor?.type === 'annotation' ||
                    panelOverlayModeState.isAnnotationActive
                ) {
                    dispatchInteractionState({ type: 'close-annotation' });
                    return;
                }

                dispatchInteractionState({ type: 'open-annotation' });
                return;
            case 'toggle-drag-select':
                dispatchInteractionState({ type: 'toggle-drag-select' });
                return;
            case 'toggle-edit':
                dispatchInteractionState({ type: 'toggle-edit' });
                return;
            case 'open-fft':
                dispatchInteractionState({ type: 'open-fft' });
                return;
            case 'close-annotation':
                dispatchInteractionState({ type: 'close-annotation' });
                return;
            case 'close-edit':
                dispatchInteractionState({ type: 'close-edit' });
                return;
            default:
                return;
        }
    };

    const dispatchPanelHeaderCommand: PanelHeaderCommandDispatch = (command) => {
        switch (command.type) {
            case 'toggle-overlap':
                if (overlapSelection.canToggle) {
                    overlapSelection.toggleSelection(
                        chartRangeState.panelRange,
                        localPanelInfo.toolbar.isRaw,
                    );
                }
                return;
            case 'toggle-raw':
                toggleRaw(!panelHeaderState.isRaw);
                return;
            case 'set-global-time':
                if (!sResolvedIntervalOption) return;

                boardActions.onSetGlobalTimeRange({
                    dataTime: chartRangeState.panelRange,
                    navigatorTime: chartRangeState.navigatorRange,
                    interval: sResolvedIntervalOption,
                });
                return;
            case 'refresh-data':
                void refreshPanelData({
                    panelRange: chartRangeState.panelRange,
                    navigatorRange: chartRangeState.navigatorRange,
                });
                return;
            case 'refresh-time':
                void refreshInitialTimeRange();
                return;
            case 'open-export-csv':
                dispatchInteractionState({
                    type: 'open-dialog',
                    activeDialog: { type: 'exportCsv' },
                });
                return;
            case 'open-delete-confirm':
                dispatchInteractionState({
                    type: 'open-dialog',
                    activeDialog: { type: 'deletePanel' },
                });
                return;
            default:
                return;
        }
    };

    function handlePanelContextMenu(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        dispatchInteractionState({
            type: 'open-context-menu',
            position: {
                x: event.clientX,
                y: event.clientY,
            },
        });
    }

    function closeContextMenu() {
        dispatchInteractionState({ type: 'close-context-menu' });
    }

    const {
        chartMarkupHandlers,
        onHighlightSelection,
    } = overlayEditors.createChartMarkupActions({
        isAnnotationActive: panelOverlayModeState.isAnnotationActive,
        dispatchOverlayModeCommand: dispatchPanelOverlayModeCommand,
        onCloseContextMenu: closeContextMenu,
    });
    const {
        highlightEditor,
        editAnnotation,
    } = overlayEditors.createOverlayEditorActions({
        dispatchOverlayModeCommand: dispatchPanelOverlayModeCommand,
    });
    const brushSelection = usePanelBrushSelection({
        chartAreaRef: chartAreaRef,
        chartData: chartRangeState.chartData,
        seriesList: localPanelInfo.data.tag_set,
        isHighlightActive: panelOverlayModeState.isHighlightActive,
        onHighlightSelection: onHighlightSelection,
        onSelectionSummaryChange: (nextSelectionSummary) =>
            dispatchInteractionState({
                type: 'set-selection-summary',
                selectionSummary: nextSelectionSummary,
            }),
    });

    function saveEditedPanelConfig(editorConfig: PanelEditorConfig) {
        const sNextPanelInfo = mergeEditorConfigIntoPanelInfo(
            localPanelInfo,
            editorConfig,
        );
        savePanel(sNextPanelInfo);
        void reloadAfterPanelEdit(sNextPanelInfo);
    }

    function confirmDeletePanel() {
        overlapSelection.deleteSelection(
            chartRangeState.panelRange,
            localPanelInfo.toolbar.isRaw,
        );
        panelActions.onDeletePanel();
    }

    useEffect(() => {
        setLocalPanelInfo(panelInfo);
    }, [panelInfo]);

    return (
            <div
                className="panel-form"
                style={{ border: `0.5px solid ${overlapSelection.isSelected ? '#FDB532' : '#454545'}` }}
                onContextMenu={handlePanelContextMenu}
            >
                <PanelHeader
                    headerState={panelHeaderState}
                    overlayModeState={panelOverlayModeState}
                    overlapSelection={overlapSelection}
                    dispatchHeaderCommand={dispatchPanelHeaderCommand}
                    dispatchOverlayModeCommand={dispatchPanelOverlayModeCommand}
                />
                <div className="panel-chart-section">
                    <PanelChartBody
                        pChartAreaRef={chartAreaRef}
                        pChartApiRef={panelChartApiRef}
                        pChartState={{
                            axes: localPanelInfo.axes,
                            display: localPanelInfo.display,
                            seriesList: localPanelInfo.data.tag_set,
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
                        pNavigatorShiftActions={navigatorShiftActions}
                        pNavigatorZoomActions={navigatorZoomActions}
                    />
                </div>
                {panelOverlayModeState.isEditing && (
                    <PanelEditor
                        pOnSaveEditorConfig={saveEditedPanelConfig}
                        pOnClose={() =>
                            dispatchPanelOverlayModeCommand({ type: 'close-edit' })
                        }
                        pPanelInfo={localPanelInfo}
                        pIsRawMode={panelHeaderState.isRaw}
                    />
                )}
                {contextMenuPosition && (
                    <PanelContextMenu
                        headerState={panelHeaderState}
                        overlayModeState={panelOverlayModeState}
                        dispatchHeaderCommand={dispatchPanelHeaderCommand}
                        dispatchOverlayModeCommand={dispatchPanelOverlayModeCommand}
                        overlapSelection={overlapSelection}
                        position={contextMenuPosition}
                        onClose={closeContextMenu}
                    />
                )}
                <PanelOverlays
                    activeDialog={activeDialog}
                    selectionSummary={selectionSummary}
                    onCloseDialog={() =>
                        dispatchInteractionState({ type: 'close-dialog' })
                    }
                    onCloseSelection={() =>
                        dispatchInteractionState({ type: 'close-selection' })
                    }
                    onConfirmDeletePanel={confirmDeletePanel}
                    exportCsvChartData={chartRangeState.chartData}
                    exportCsvChartRef={panelChartApiRef}
                    highlightEditor={highlightEditor}
                    editAnnotation={editAnnotation}
                />
            </div>
    );
}

export default PanelContainer;
