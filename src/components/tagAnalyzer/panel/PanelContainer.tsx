import PanelChartFooter from './PanelChartFooter';
import PanelHeader from './PanelHeader';
import PanelChartBody from './PanelChartBody';
import PanelOverlays from './PanelOverlays';
import PanelEditor from './editor/PanelEditor';
import { convertPanelInfoToEditorConfig } from './editor/PanelEditorConfigConverter';
import { FFTModal } from '../boardModal/FFTModal';
import './PanelChartShell.scss';
import {
    memo,
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent,
} from 'react';
import { changeUtcToText } from '@/utils/helpers/date';
import { hasResolvedIntervalOption } from './PanelIntervalOptionUtils';
import type { BoardActions, BoardState } from '../domain/BoardModel';
import {
    appendSeriesAnnotation,
    buildAnnotationSeriesOptions,
    createUtcAnnotationTimestamp,
    DEFAULT_ANNOTATION_LABEL,
    removeSeriesAnnotation,
    updateSeriesAnnotation,
} from './PanelAnnotationUtils';
import { usePanelRangeRuntime } from './usePanelRangeRuntime';
import type {
    PanelChartHandle,
    PanelHeaderActions,
    PanelHeaderState,
    PanelHighlightEditRequest,
    PanelMarkupHandlers,
    PanelRangeHandlers,
    PanelState,
    PanelSeriesAnnotationEditRequest,
} from './PanelTypes';
import {
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    type PanelInfo,
} from '../domain/PanelModel';
import type { TimeRangeConfig } from '../time/TimeTypes';
import type {
    ContextMenuOverlay,
    CreateAnnotationOverlay,
    DeletePanelOverlay,
    EditAnnotationOverlay,
    ExportCsvOverlay,
    HighlightRenameOverlay,
} from './modal/PanelModalTypes';
import type { FFTSelectionPayload } from '../boardModal/BoardModalTypes';
import {
    buildCreateAnnotationPopoverOpenState,
    INITIAL_CONTEXT_MENU_STATE,
    INITIAL_CREATE_SERIES_ANNOTATION_POPOVER_STATE,
    INITIAL_HIGHLIGHT_RENAME_STATE,
    INITIAL_SERIES_ANNOTATION_POPOVER_STATE,
    type OpenHighlightRenamePopoverParams,
    type OpenSeriesAnnotationPopoverParams,
} from './PanelOverlayState';
import { parseNonNegativeInteger } from '../domain/IntegerParsing';

const DEFAULT_HIGHLIGHT_LABEL = 'unnamed';
const INACTIVE_TRANSIENT_PANEL_MODES = {
    isFFTModal: false,
    isHighlightActive: false,
    isAnnotationActive: false,
    isDragSelectActive: false,
};

export type PanelContainerBoardRangeSyncState = Pick<
    BoardState,
    'refreshCount' | 'timeRefreshCount' | 'globalTimeRange'
>;

export type PanelContainerBoardActions = Pick<
    BoardActions,
    'onPersistPanelState' | 'onSavePanel' | 'onSetGlobalTimeRange'
>;

function PanelContainer({
    pPanelInfo,
    pBoardTimeRange,
    pIsActiveTab,
    pBoardRangeSyncState,
    pChartBoardActions,
    pIsSelectedForOverlap,
    pIsOverlapAnchor,
    pRollupTableList,
    pOnToggleOverlapSelection,
    pOnUpdateOverlapSelection,
    pOnDeletePanel,
}: {
    pPanelInfo: PanelInfo;
    pBoardTimeRange: TimeRangeConfig;
    pIsActiveTab: boolean;
    pBoardRangeSyncState: PanelContainerBoardRangeSyncState;
    pChartBoardActions: PanelContainerBoardActions;
    pIsSelectedForOverlap: boolean;
    pIsOverlapAnchor: boolean;
    pRollupTableList: string[];
    pOnToggleOverlapSelection: () => void;
    pOnUpdateOverlapSelection: (start: number, end: number, isRaw: boolean) => void;
    pOnDeletePanel: (start: number, end: number, isRaw: boolean) => void;
}) {
    const chartAreaRef = useRef<HTMLDivElement | null>(null);
    const panelChartApiRef = useRef<PanelChartHandle | null>(null);
    const panelFormRef = useRef<HTMLDivElement | null>(null);

    const [currentPanelInfo, setCurrentPanelInfo] = useState<PanelInfo>(pPanelInfo);
    const [activePanelModal, setActivePanelModal] = useState<
        'deletePanel' | 'exportCsv' | undefined
    >(undefined);
    const [shouldRefreshAfterEdit, setShouldRefreshAfterEdit] = useState(false);
    const [panelState, setPanelState] = useState<PanelState>(() => ({
        isRaw: pPanelInfo.toolbar.isRaw,
        isFFTModal: false,
        isEditing: false,
        isHighlightActive: false,
        isAnnotationActive: false,
        isDragSelectActive: false,
    }));
    const [fftSelection, setFftSelection] = useState<FFTSelectionPayload | undefined>(undefined);
    const [contextMenuState, setContextMenuState] = useState(INITIAL_CONTEXT_MENU_STATE);
    const [highlightRenameState, setHighlightRenameState] = useState(
        INITIAL_HIGHLIGHT_RENAME_STATE,
    );
    const [createAnnotationPopoverState, setCreateAnnotationPopoverState] = useState(
        INITIAL_CREATE_SERIES_ANNOTATION_POPOVER_STATE,
    );
    const [annotationPopoverState, setAnnotationPopoverState] = useState(
        INITIAL_SERIES_ANNOTATION_POPOVER_STATE,
    );
    const initialEditorConfig = useMemo(
        () => convertPanelInfoToEditorConfig(currentPanelInfo),
        [currentPanelInfo],
    );
    const {
        navigateState,
        hasLoadedChartData,
        refreshPanelData,
        refreshInitialTimeRange,
        handleNavigatorRangeChange,
        handlePanelRangeChange,
        shiftHandlers,
        zoomHandlers,
    } = usePanelRangeRuntime({
        panelInfo: currentPanelInfo,
        boardTime: pBoardTimeRange,
        isActiveTab: pIsActiveTab,
        boardRangeSyncState: pBoardRangeSyncState,
        isSelectedForOverlap: pIsSelectedForOverlap,
        rollupTableList: pRollupTableList,
        chartAreaRef: chartAreaRef,
        panelChartApiRef: panelChartApiRef,
        currentIsRaw: panelState.isRaw,
        shouldRefreshAfterEdit: shouldRefreshAfterEdit,
        onPersistPanelState: pChartBoardActions.onPersistPanelState,
        onUpdateOverlapSelection: pOnUpdateOverlapSelection,
        onEditRefreshHandled: () => setShouldRefreshAfterEdit(false),
    });

    function closeAnnotationMode() {
        setPanelState((prev) => ({
            ...prev,
            isAnnotationActive: false,
        }));
    }

    function closeDragSelectMode() {
        setPanelState((prev) => ({
            ...prev,
            isDragSelectActive: false,
            isFFTModal: false,
        }));
        setFftSelection(undefined);
    }

    function toggleDragSelectMode() {
        const nextIsDragSelectActive = !panelState.isDragSelectActive;

        setPanelState((prev) => {
            const sNextIsDragSelectActive = !prev.isDragSelectActive;

            return {
                ...prev,
                ...INACTIVE_TRANSIENT_PANEL_MODES,
                isDragSelectActive: sNextIsDragSelectActive,
                isFFTModal: sNextIsDragSelectActive ? prev.isFFTModal : false,
            };
        });
        if (!nextIsDragSelectActive) {
            setFftSelection(undefined);
        }
    }

    function toggleHighlightMode() {
        setPanelState((prev) => ({
            ...prev,
            ...INACTIVE_TRANSIENT_PANEL_MODES,
            isHighlightActive: !prev.isHighlightActive,
        }));
        setFftSelection(undefined);
    }

    function openAnnotationMode() {
        setPanelState((prev) => ({
            ...prev,
            ...INACTIVE_TRANSIENT_PANEL_MODES,
            isAnnotationActive: true,
        }));
        setFftSelection(undefined);
    }

    function toggleEditMode() {
        setPanelState((prev) => ({
            ...prev,
            ...INACTIVE_TRANSIENT_PANEL_MODES,
            isEditing: !prev.isEditing,
        }));
        setFftSelection(undefined);
    }

    function toggleRawMode() {
        const nextRaw = !panelState.isRaw;

        setPanelState((prev) => ({
            ...prev,
            isRaw: nextRaw,
        }));
        return nextRaw;
    }

    function setFftModalOpen(isOpen: boolean) {
        setPanelState((prev) => ({
            ...prev,
            isFFTModal: isOpen,
        }));
    }

    function closeContextMenu() {
        setContextMenuState((prev) => ({ ...prev, isOpen: false }));
    }

    function closeHighlightRenamePopover() {
        setHighlightRenameState(INITIAL_HIGHLIGHT_RENAME_STATE);
    }

    function closeAnnotationPopover() {
        setAnnotationPopoverState(INITIAL_SERIES_ANNOTATION_POPOVER_STATE);
    }

    function closePanelPopovers() {
        closeHighlightRenamePopover();
        setCreateAnnotationPopoverState(INITIAL_CREATE_SERIES_ANNOTATION_POPOVER_STATE);
        closeAnnotationPopover();
    }

    function closeCreateAnnotationPopover() {
        setCreateAnnotationPopoverState(INITIAL_CREATE_SERIES_ANNOTATION_POPOVER_STATE);
        closeAnnotationMode();
    }

    function openCreateAnnotationPopover() {
        closeContextMenu();
        closePanelPopovers();
        setCreateAnnotationPopoverState(
            buildCreateAnnotationPopoverOpenState({
                panelRange: navigateState.panelRange,
                seriesCount: currentPanelInfo.data.tag_set.length,
                panelFormElement: panelFormRef.current,
            }),
        );
        openAnnotationMode();
    }

    function openHighlightRenamePopover(params: OpenHighlightRenamePopoverParams) {
        closeContextMenu();
        closePanelPopovers();
        setHighlightRenameState({ ...params, isOpen: true });
        closeAnnotationMode();
    }

    function openSeriesAnnotationPopover(params: OpenSeriesAnnotationPopoverParams) {
        closeContextMenu();
        closePanelPopovers();
        setAnnotationPopoverState({ ...params, isOpen: true });
        closeAnnotationMode();
    }

    function handlePanelContextMenu(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        closePanelPopovers();
        setContextMenuState({
            isOpen: true,
            position: {
                x: event.clientX,
                y: event.clientY,
            },
        });
        closeAnnotationMode();
    }

    function toggleDragSelect() {
        closePanelPopovers();
        closeAnnotationMode();
        toggleDragSelectMode();
    }

    function toggleHighlight() {
        closePanelPopovers();
        closeAnnotationMode();
        toggleHighlightMode();
    }

    function toggleAnnotation() {
        if (createAnnotationPopoverState.isOpen) {
            closeCreateAnnotationPopover();
            return;
        }
        openCreateAnnotationPopover();
    }

    function toggleEdit() {
        closeContextMenu();
        closePanelPopovers();
        closeAnnotationMode();
        toggleEditMode();
    }

    function toggleRaw() {
        const nextRaw = toggleRawMode();

        if (navigateState.panelRange.startTime) {
            pChartBoardActions.onPersistPanelState({
                targetPanelKey: currentPanelInfo.meta.index_key,
                timeInfo: {
                    panelRange: navigateState.panelRange,
                    navigatorRange: navigateState.navigatorRange,
                },
                isRaw: nextRaw,
            });
        }
        void refreshPanelData(
            navigateState.panelRange,
            nextRaw,
            navigateState.navigatorRange,
        );
    }

    function handleDragSelectStateChange(isDragSelectActive: boolean) {
        if (!isDragSelectActive) {
            closeDragSelectMode();
        }
    }

    function savePanel(nextPanelInfo: PanelInfo) {
        setCurrentPanelInfo(nextPanelInfo);
        pChartBoardActions.onSavePanel(nextPanelInfo);
    }

    function handleHighlightSelection(startTime: number, endTime: number) {
        const sStartTime = Math.min(startTime, endTime);
        const sEndTime = Math.max(startTime, endTime);

        if (sEndTime <= sStartTime) {
            return;
        }

        const sNextHighlights = [
            ...(currentPanelInfo.highlights ?? []),
            {
                text: DEFAULT_HIGHLIGHT_LABEL,
                timeRange: {
                    startTime: sStartTime,
                    endTime: sEndTime,
                },
                fillColor: DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
                textColor: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
            },
        ];

        savePanel({
            ...currentPanelInfo,
            highlights: sNextHighlights,
        });
    }

    const sResolvedIntervalOption = hasResolvedIntervalOption(navigateState.rangeOption)
        ? navigateState.rangeOption
        : undefined;

    function openDeleteConfirm() {
        setActivePanelModal('deletePanel');
    }

    function deletePanel() {
        pOnDeletePanel(
            navigateState.panelRange.startTime,
            navigateState.panelRange.endTime,
            panelState.isRaw,
        );
    }

    const headerActions: PanelHeaderActions = {
        onToggleOverlap: () => {
            if (currentPanelInfo.data.tag_set.length === 1) {
                pOnToggleOverlapSelection();
            }
        },
        onToggleRaw: toggleRaw,
        onToggleHighlight: toggleHighlight,
        onToggleAnnotation: toggleAnnotation,
        onToggleDragSelect: toggleDragSelect,
        onToggleEdit: toggleEdit,
        onOpenFft: () => setFftModalOpen(true),
        onSetGlobalTime: () => {
            if (!sResolvedIntervalOption) return;

            const sPreOverflowRange = navigateState.preOverflowTimeRange;
            const sGlobalTargetRange =
                sPreOverflowRange.startTime > 0 && sPreOverflowRange.endTime > 0
                    ? sPreOverflowRange
                    : navigateState.panelRange;

            pChartBoardActions.onSetGlobalTimeRange({
                dataTime: sGlobalTargetRange,
                navigatorTime: navigateState.navigatorRange,
                interval: sResolvedIntervalOption,
            });
        },
        onRefreshData: () =>
            void refreshPanelData(
                navigateState.panelRange,
                panelState.isRaw,
                navigateState.navigatorRange,
            ),
        onRefreshTime: () => void refreshInitialTimeRange(),
        onOpenExportCsv: () => setActivePanelModal('exportCsv'),
        onOpenDeleteConfirm: openDeleteConfirm,
    };
    const rangeHandlers: PanelRangeHandlers = {
        onPanelRangeChange: handlePanelRangeChange,
        onNavigatorRangeChange: handleNavigatorRangeChange,
        onShiftPanelRangeLeft: shiftHandlers.onShiftPanelRangeLeft,
        onShiftPanelRangeRight: shiftHandlers.onShiftPanelRangeRight,
        onShiftNavigatorRangeLeft: shiftHandlers.onShiftNavigatorRangeLeft,
        onShiftNavigatorRangeRight: shiftHandlers.onShiftNavigatorRangeRight,
    };

    function handleOpenHighlightRename(request: PanelHighlightEditRequest) {
        const sHighlight = currentPanelInfo.highlights?.[request.highlightIndex];

        if (!sHighlight) {
            closeHighlightRenamePopover();
            return;
        }

        openHighlightRenamePopover({
            highlightIndex: request.highlightIndex,
            position: request.position,
            labelText: sHighlight.text || DEFAULT_HIGHLIGHT_LABEL,
            fillColor: sHighlight.fillColor,
            textColor: sHighlight.textColor,
        });
    }

    function handleOpenSeriesAnnotationEditor(request: PanelSeriesAnnotationEditRequest) {
        const sSeriesInfo = currentPanelInfo.data.tag_set[request.seriesIndex];

        if (!sSeriesInfo) {
            closeAnnotationPopover();
            return;
        }

        const sCurrentAnnotation = sSeriesInfo.annotations?.[request.annotationIndex];

        if (!sCurrentAnnotation) {
            closeAnnotationPopover();
            return;
        }

        openSeriesAnnotationPopover({
            seriesIndex: request.seriesIndex,
            annotationIndex: request.annotationIndex,
            position: request.position,
            labelText: sCurrentAnnotation.text ?? DEFAULT_ANNOTATION_LABEL,
            timeRange: sCurrentAnnotation.timeRange,
        });
    }

    const markupHandlers: PanelMarkupHandlers = {
        onOpenHighlightRename: handleOpenHighlightRename,
        onOpenSeriesAnnotationEditor: handleOpenSeriesAnnotationEditor,
    };

    function applyHighlightRename() {
        const sHighlightIndex = highlightRenameState.highlightIndex;

        if (sHighlightIndex === undefined) {
            closeHighlightRenamePopover();
            return;
        }

        if (!currentPanelInfo.highlights?.[sHighlightIndex]) {
            closeHighlightRenamePopover();
            return;
        }

        const sNextLabelText =
            highlightRenameState.labelText.trim() || DEFAULT_HIGHLIGHT_LABEL;
        const sNextHighlights = currentPanelInfo.highlights.map(
            (highlight, index) =>
                index === sHighlightIndex
                    ? {
                          ...highlight,
                          text: sNextLabelText,
                          fillColor: highlightRenameState.fillColor,
                          textColor: highlightRenameState.textColor,
                      }
                    : highlight,
        );

        savePanel({
            ...currentPanelInfo,
            highlights: sNextHighlights,
        });
        closeHighlightRenamePopover();
    }

    function applyCreateSeriesAnnotation() {
        const sSeriesIndex = createAnnotationPopoverState.seriesIndex;
        const sAnnotationTimestamp = createUtcAnnotationTimestamp(
            createAnnotationPopoverState.yearText,
            createAnnotationPopoverState.monthText,
            createAnnotationPopoverState.dayText,
        );

        if (sSeriesIndex === undefined || sAnnotationTimestamp === undefined) {
            return;
        }

        const sNextPanelInfo = appendSeriesAnnotation(
            currentPanelInfo,
            sSeriesIndex,
            sAnnotationTimestamp,
            createAnnotationPopoverState.labelText,
        );

        if (!sNextPanelInfo) {
            return;
        }

        savePanel(sNextPanelInfo);
        closeCreateAnnotationPopover();
    }

    function applySeriesAnnotation() {
        const sSeriesIndex = annotationPopoverState.seriesIndex;
        const sTimeRange = annotationPopoverState.timeRange;

        if (
            sSeriesIndex === undefined ||
            annotationPopoverState.annotationIndex === undefined ||
            !sTimeRange
        ) {
            closeAnnotationPopover();
            return;
        }

        const sNextPanelInfo = updateSeriesAnnotation(
            currentPanelInfo,
            sSeriesIndex,
            annotationPopoverState.annotationIndex,
            sTimeRange,
            annotationPopoverState.labelText,
        );

        if (!sNextPanelInfo) {
            closeAnnotationPopover();
            return;
        }

        savePanel(sNextPanelInfo);
        closeAnnotationPopover();
    }

    function deleteSeriesAnnotation() {
        const sSeriesIndex = annotationPopoverState.seriesIndex;
        const sAnnotationIndex = annotationPopoverState.annotationIndex;

        if (sSeriesIndex === undefined || sAnnotationIndex === undefined) {
            closeAnnotationPopover();
            return;
        }

        const sNextPanelInfo = removeSeriesAnnotation(
            currentPanelInfo,
            sSeriesIndex,
            sAnnotationIndex,
        );

        if (!sNextPanelInfo) {
            closeAnnotationPopover();
            return;
        }

        savePanel(sNextPanelInfo);
        closeAnnotationPopover();
    }

    function saveEditedPanel(nextPanelInfo: PanelInfo) {
        setShouldRefreshAfterEdit(true);
        savePanel(nextPanelInfo);
    }

    const timeText = navigateState.panelRange.startTime
        ? `${changeUtcToText(navigateState.panelRange.startTime)} ~ ${changeUtcToText(navigateState.panelRange.endTime)}`
        : '';
    const intervalText =
        !panelState.isRaw && sResolvedIntervalOption
            ? `${sResolvedIntervalOption.IntervalValue}${sResolvedIntervalOption.IntervalType}`
            : '';
    const createAnnotationSeriesOptions = buildAnnotationSeriesOptions(
        currentPanelInfo.data.tag_set,
    );
    const headerState: PanelHeaderState = {
        title: currentPanelInfo.meta.chart_title,
        timeText,
        intervalText,
        isEditing: panelState.isEditing,
        isRaw: panelState.isRaw,
        isSelectedForOverlap: pIsSelectedForOverlap,
        isOverlapAnchor: pIsOverlapAnchor,
        isHighlightActive: panelState.isHighlightActive,
        isAnnotationActive: panelState.isAnnotationActive,
        isDragSelectActive: panelState.isDragSelectActive,
        canOpenFft: fftSelection !== undefined,
        canSetGlobalTime: Boolean(navigateState.rangeOption),
        canSaveLocal: hasLoadedChartData,
    };
    const contextMenuOverlay: ContextMenuOverlay = {
        state: contextMenuState,
        viewState: {
            ...headerState,
            isOverlapToggleAvailable: currentPanelInfo.data.tag_set.length === 1,
        },
        actions: headerActions,
        onClose: closeContextMenu,
    };
    const highlightRenameOverlay: HighlightRenameOverlay = {
        state: highlightRenameState,
        actions: {
            updateLabelText: (labelText) =>
                setHighlightRenameState((prev) => ({ ...prev, labelText })),
            updateFillColor: (fillColor) =>
                setHighlightRenameState((prev) => ({ ...prev, fillColor })),
            updateTextColor: (textColor) =>
                setHighlightRenameState((prev) => ({ ...prev, textColor })),
            apply: applyHighlightRename,
            close: closeHighlightRenamePopover,
        },
    };
    const createAnnotationOverlay: CreateAnnotationOverlay = {
        state: createAnnotationPopoverState,
        seriesOptions: createAnnotationSeriesOptions,
        actions: {
            updateSeriesValue: (value) =>
                setCreateAnnotationPopoverState((prev) => ({
                    ...prev,
                    seriesIndex: parseNonNegativeInteger(value),
                })),
            updateYearText: (yearText) =>
                setCreateAnnotationPopoverState((prev) => ({ ...prev, yearText })),
            updateMonthText: (monthText) =>
                setCreateAnnotationPopoverState((prev) => ({ ...prev, monthText })),
            updateDayText: (dayText) =>
                setCreateAnnotationPopoverState((prev) => ({ ...prev, dayText })),
            updateLabelText: (labelText) =>
                setCreateAnnotationPopoverState((prev) => ({ ...prev, labelText })),
            apply: applyCreateSeriesAnnotation,
            close: closeCreateAnnotationPopover,
        },
    };
    const editAnnotationOverlay: EditAnnotationOverlay = {
        state: annotationPopoverState,
        actions: {
            updateLabelText: (labelText) =>
                setAnnotationPopoverState((prev) => ({ ...prev, labelText })),
            apply: applySeriesAnnotation,
            deleteAnnotation: deleteSeriesAnnotation,
            close: closeAnnotationPopover,
        },
    };
    const deletePanelOverlay: DeletePanelOverlay = {
        isOpen: activePanelModal === 'deletePanel',
        onClose: () => setActivePanelModal(undefined),
        onConfirm: deletePanel,
    };
    const exportCsvOverlay: ExportCsvOverlay = {
        isOpen: activePanelModal === 'exportCsv',
        chartData: navigateState.chartData,
        chartRef: panelChartApiRef,
        onClose: () => setActivePanelModal(undefined),
    };

    useEffect(() => {
        setCurrentPanelInfo(pPanelInfo);
    }, [pPanelInfo]);

    return (
        <div
            ref={panelFormRef}
            className="panel-form"
            style={{ border: `0.5px solid ${pIsSelectedForOverlap ? '#FDB532' : '#454545'}` }}
            onContextMenu={handlePanelContextMenu}
        >
            <PanelHeader
                pHeaderState={headerState}
                pHeaderActions={headerActions}
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
                        highlights: currentPanelInfo.highlights ?? [],
                    }}
                    pPanelState={panelState}
                    pNavigateState={navigateState}
                    pRangeHandlers={rangeHandlers}
                    pMarkupHandlers={markupHandlers}
                    pOnDragSelectStateChange={handleDragSelectStateChange}
                    pOnHighlightSelection={handleHighlightSelection}
                    pOnFftSelectionChange={setFftSelection}
                />
                {panelState.isFFTModal && fftSelection && (
                    <FFTModal
                        pSeriesSummaries={fftSelection.seriesSummaries}
                        pStartTime={fftSelection.startTime}
                        pEndTime={fftSelection.endTime}
                        setIsOpen={setFftModalOpen}
                    />
                )}
                <PanelChartFooter
                    pShowLegend={currentPanelInfo.display.show_legend}
                    pVisiblePanelRange={navigateState.panelRange}
                    pNavigatorActions={{
                        onShiftLeft: shiftHandlers.onShiftNavigatorRangeLeft,
                        onShiftRight: shiftHandlers.onShiftNavigatorRangeRight,
                        onZoomIn: zoomHandlers.onZoomIn,
                        onZoomOut: zoomHandlers.onZoomOut,
                        onFocus: zoomHandlers.onFocus,
                    }}
                />
            </div>
            {panelState.isEditing && (
                <PanelEditor
                    pInitialEditorConfig={initialEditorConfig}
                    pOnSavePanel={saveEditedPanel}
                    pPanelInfo={currentPanelInfo}
                />
            )}
            <PanelOverlays
                contextMenu={contextMenuOverlay}
                highlightRename={highlightRenameOverlay}
                createAnnotation={createAnnotationOverlay}
                editAnnotation={editAnnotationOverlay}
                deletePanel={deletePanelOverlay}
                exportCsv={exportCsvOverlay}
            />
        </div>
    );
}

export default memo(PanelContainer);
