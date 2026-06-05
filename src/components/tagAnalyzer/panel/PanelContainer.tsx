import { useRef, useState, type MouseEvent } from 'react';
import { PanelMarkupInteractionHint, ANNOTATION_INVALID_TARGET_MESSAGE, type PanelMarkupInteractionHintState } from './PanelMarkupInteractionHint';
import { Toast, type ContextMenuPosition } from '@/design-system/components';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import PanelFooter from './PanelFooter';
import PanelHeader, {
    PanelContextMenu,
    PanelActionKey,
    type PanelHeaderRuntimeState,
} from './PanelHeader';
import PanelBody from './PanelBody';
import PanelEditor from './editor/PanelEditor';
import { FFTModal } from '../boardModal/FFTModal';
import {
    EditAnnotationModal,
    EditHighlightModal,
    type AnnotationEditorMetaState,
    type HighlightEditorState,
} from './modal/EditMarkupModal';
import { SelectionSummaryPopover } from './modal/SelectionSummaryPopover';
import type { FFTSelectionPayload } from '../domain/ChartDomain';
import type { SetGlobalTimeRangePayload } from '../domain/BoardDomain';
import type {
    PanelRangeChangeEvent,
    PanelChartHandle,
    PanelHighlight,
    PanelInfo,
    PanelMarkupHandlers,
    PanelRangeState,
} from '../domain/PanelDomain';
import {
    PanelOverlayMode,
    resolvePanelAxesForRuntime,
    resolvePanelDisplayForRuntime,
} from '../domain/PanelDomain';
import {
    MIXED_X_AXIS_KIND_WARNING,
    hasMixedXAxisValueKinds,
    hasNumericBaseTimeSeries,
} from '../domain/SeriesDomain';
import type { PanelRangeStateApplyOptions } from '../board/BoardPanelState';
import { hasResolvedIntervalOption } from '../domain/time/TimeIntervalUtils';
import { handlePanelBrushSelection } from './PanelBrushSelection';
import type { PanelSelectionSummary } from './PanelBrushSelection';
import { useChartAreaWidthObserver } from '../board/useChartAreaWidthObserver';
import { usePanelAnnotation } from './usePanelAnnotation';
import { usePanelEditor } from './editor/usePanelEditor';
import { usePanelHighlight } from './usePanelHighlight';
import {
    PanelChartLoadStatus,
    usePanelChartDataRuntime,
} from './usePanelChartDataRuntime';
import { usePanelRangeControls } from './usePanelRangeControls';
import './PanelChartShell.scss';

export type PanelContainerRuntimeProps = {
    rangeState: PanelRangeState;
    chartAreaWidth: number | undefined;
    dataRefreshVersion: number;
    rollupTableList: string[];
    onRangeStateChange: (
        rangeState: PanelRangeState,
        options?: PanelRangeStateApplyOptions,
    ) => void;
};

type PanelContainerStateProps = {
    isRaw: boolean;
    isRawLocked: boolean;
    isOverlap: boolean;
    canKeepCurrentViewRange: boolean;
};

type PanelContainerActions = {
    onChartAreaWidthChange: (width: number | undefined) => void;
    refreshData: () => void;
    refreshTime: () => void;
    onSavePanelInfo: (panelInfo: PanelInfo) => Promise<boolean>;
    reloadAfterEditorSave: (panelInfo: PanelInfo) => void;
    onToggleRaw: () => void;
    onApplyPanelInfo: (panelInfo: PanelInfo) => void;
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
    HIGHLIGHT_EDITOR = 'HIGHLIGHT_EDITOR',
    ANNOTATION_EDITOR = 'ANNOTATION_EDITOR',
    DELETE_CONFIRM = 'DELETE_CONFIRM',
    EXPORT_CSV = 'EXPORT_CSV',
}

function PanelContainer({
    panelInfo,
    runtime: {
        rangeState,
        chartAreaWidth,
        dataRefreshVersion,
        rollupTableList,
        onRangeStateChange,
    },
    state: { isRaw, isRawLocked, isOverlap, canKeepCurrentViewRange },
    actions: {
        onChartAreaWidthChange,
        refreshData,
        refreshTime,
        onSavePanelInfo,
        reloadAfterEditorSave,
        onToggleRaw,
        onApplyPanelInfo,
        onSetGlobalTimeRange,
        onDeletePanel,
        onToggleOverlap,
    },
}: PanelContainerProps) {
    const chartAreaRef = useRef<HTMLDivElement | null>(null);
    const panelChartApiRef = useRef<PanelChartHandle | null>(null);
    const { panelRange, navigatorRange } = rangeState;

    const hasMixedXAxisKinds = hasMixedXAxisValueKinds(panelInfo.data.tag_set);
    const isNumericXAxis =
        !hasMixedXAxisKinds && hasNumericBaseTimeSeries(panelInfo.data.tag_set);
    const runtimeAxes = resolvePanelAxesForRuntime(panelInfo.axes);
    const runtimeDisplay = resolvePanelDisplayForRuntime(
        panelInfo.display,
        panelInfo.general.use_zoom,
    );

    const [overlayMode, setOverlayMode] = useState<PanelOverlayMode>(
        PanelOverlayMode.NO_OVERLAY,
    );
    const [activePopupMode, setActivePopupMode] = useState<PanelPopupMode>(
        PanelPopupMode.NONE,
    );
    const [contextMenuPosition, setContextMenuPosition] = useState<
        ContextMenuPosition | undefined
    >(undefined);
    const [selectionSummary, setSelectionSummary] = useState<
        PanelSelectionSummary | undefined
    >(undefined);
    const [isSelectionSummaryOpen, setIsSelectionSummaryOpen] = useState(false);
    const [fftSelection, setFftSelection] = useState<
        FFTSelectionPayload | undefined
    >(undefined);
    const [activeHighlightEditor, setActiveHighlightEditor] = useState<
        HighlightEditorState | undefined
    >(undefined);
    const [temporaryHighlight, setTemporaryHighlight] = useState<
        PanelHighlight | undefined
    >(undefined);
    const [annotationEditorMeta, setAnnotationEditorMeta] = useState<
        AnnotationEditorMetaState | undefined
    >(undefined);
    const [markupInteractionHint, setMarkupInteractionHint] = useState<
        PanelMarkupInteractionHintState | undefined
    >(undefined);
    const [hoveredMainSeriesName, setHoveredMainSeriesName] = useState<
        string | undefined
    >(undefined);

    useChartAreaWidthObserver(chartAreaRef, onChartAreaWidthChange);
    const {
        rangeHandlers,
        navigatorShiftActions,
        zoomActions,
    } = usePanelRangeControls({
        rangeState,
        isNumericXAxis,
        onRangeStateChange,
    });
    const {
        chartData,
        navigatorChartData,
        resolvedIntervalOption,
        loadStatus,
    } = usePanelChartDataRuntime({
        panelInfo,
        rangeState,
        chartAreaWidth,
        rollupTableList,
        dataRefreshVersion,
        onRangeStateChange,
    });
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
            onApplyPanelInfo({
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
            onApplyPanelInfo({
                ...panelInfo,
                annotations,
            }),
    });
    const {
        isEditing,
        closePanelEditor,
        toggleEditMode,
        applyEditedPanelConfig,
        saveEditedPanelConfig,
    } = usePanelEditor({
        panelInfo,
        panelRange,
        navigatorRange,
        onResetPanelUi: () => {
            setOverlayMode(PanelOverlayMode.NO_OVERLAY);
            setActivePopupMode(PanelPopupMode.NONE);
            setIsSelectionSummaryOpen(false);
        },
        onApplyPanelInfo,
        onSavePanelInfo,
        reloadAfterEditorSave,
    });
    const sResolvedIntervalOption = hasResolvedIntervalOption(
        resolvedIntervalOption,
    )
        ? resolvedIntervalOption
        : undefined;
    const panelHeaderRuntimeState: PanelHeaderRuntimeState = {
        title: panelInfo.general.chart_title,
        panelRange,
        resolvedIntervalOption: sResolvedIntervalOption,
        canSetGlobalTime: !isNumericXAxis && Boolean(sResolvedIntervalOption),
        canSaveLocal: loadStatus.chart === PanelChartLoadStatus.Ready,
        canOpenFft:
            isSelectionSummaryOpen &&
            Boolean(selectionSummary),
        isNumericXAxis,
        overlayMode,
        isEditing,
        isRaw,
        isRawLocked,
        isOverlap,
    };

    const handleSelection = (event: PanelRangeChangeEvent): boolean =>
        handlePanelBrushSelection(
            {
                chartData,
                seriesList: panelInfo.data.tag_set,
                chartAreaRef,
                overlayMode,
                isNumericXAxis,
                createHighlightFromSelection: activateCreateHighlightEditorFromBrush,
                onSelectionSummaryChange: (nextSelectionSummary) => {
                    setOverlayMode(PanelOverlayMode.DRAG_SELECT);
                    setSelectionSummary(nextSelectionSummary);
                    setIsSelectionSummaryOpen(true);
                },
            },
            event,
        );
    const chartMarkupHandlers: PanelMarkupHandlers = {
        onOpenCreateAnnotation: (position, seriesIndex, timestamp) => {
            setOverlayMode(PanelOverlayMode.NO_OVERLAY);
            activateCreateAnnotationEditor(
                position,
                seriesIndex,
                timestamp,
            );
        },
        onActivateHighlightEditor: (position, highlightIndex) => {
            setOverlayMode(PanelOverlayMode.NO_OVERLAY);
            activateEditHighlightEditor(position, highlightIndex);
        },
        onActivateAnnotationEditor: (position, annotationIndex) => {
            setOverlayMode(PanelOverlayMode.NO_OVERLAY);
            activateEditAnnotationEditor(position, annotationIndex);
        },
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
        if (
            !isSelectionSummaryOpen ||
            !selectionSummary
        ) {
            throw new Error('Cannot open FFT without an open selection summary.');
        }

        const sSelection = selectionSummary.selection;

        setFftSelection(sSelection);
        setActivePopupMode(PanelPopupMode.FFT);
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
                setActivePopupMode(PanelPopupMode.NONE);
                setIsSelectionSummaryOpen(false);
                setOverlayMode((currentOverlayMode) =>
                    currentOverlayMode === PanelOverlayMode.HIGHLIGHT
                        ? PanelOverlayMode.NO_OVERLAY
                        : PanelOverlayMode.HIGHLIGHT,
                );
                return;
            case PanelActionKey.TOGGLE_ANNOTATION:
                if (annotationEditorMeta) {
                    setAnnotationEditorMeta(undefined);
                }

                setActivePopupMode(PanelPopupMode.NONE);
                setOverlayMode((currentOverlayMode) =>
                    currentOverlayMode === PanelOverlayMode.ANNOTATION
                        ? PanelOverlayMode.NO_OVERLAY
                        : PanelOverlayMode.ANNOTATION,
                );
                return;
            case PanelActionKey.TOGGLE_DRAG_SELECT:
                setActivePopupMode(PanelPopupMode.NONE);
                setIsSelectionSummaryOpen(false);
                setOverlayMode((currentOverlayMode) =>
                    currentOverlayMode === PanelOverlayMode.DRAG_SELECT
                        ? PanelOverlayMode.NO_OVERLAY
                        : PanelOverlayMode.DRAG_SELECT,
                );
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
                setActivePopupMode(PanelPopupMode.EXPORT_CSV);
                return;
            case PanelActionKey.OPEN_DELETE_CONFIRM:
                setActivePopupMode(PanelPopupMode.DELETE_CONFIRM);
                return;
        }
    }

    function activateCreateHighlightEditorFromBrush(
        startTime: number,
        endTime: number,
    ): void {
        setOverlayMode(PanelOverlayMode.NO_OVERLAY);
        const sHighlightEditor = buildCreateHighlightEditor(startTime, endTime);
        if (!sHighlightEditor) {
            return;
        }

        setActiveHighlightEditor(sHighlightEditor.editor);
        setTemporaryHighlight(sHighlightEditor.temporaryHighlight);
        setActivePopupMode(PanelPopupMode.HIGHLIGHT_EDITOR);
    }

    function handlePanelContextMenu(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
        setActivePopupMode(PanelPopupMode.CONTEXT_MENU);
        setOverlayMode(PanelOverlayMode.NO_OVERLAY);
    }

    function isPointInsideMainChart(clientX: number, clientY: number): boolean {
        return panelChartApiRef.current?.isPointInsideMainGrid(clientX, clientY) === true;
    }

    function handlePanelMouseMove(event: MouseEvent<HTMLDivElement>): void {
        if (
            overlayMode !== PanelOverlayMode.ANNOTATION &&
            overlayMode !== PanelOverlayMode.HIGHLIGHT &&
            overlayMode !== PanelOverlayMode.DRAG_SELECT
        ) {
            return;
        }

        const sPanelRect = event.currentTarget.getBoundingClientRect();

        setMarkupInteractionHint({
            x: event.clientX - sPanelRect.left,
            y: event.clientY - sPanelRect.top,
            isValidTarget: isPointInsideMainChart(event.clientX, event.clientY),
            hoveredMainSeriesName,
            overlayMode,
        });
    }

    function handleHoveredMainSeriesChange(
        seriesName: string | undefined,
    ): void {
        setHoveredMainSeriesName(seriesName);
        setMarkupInteractionHint((currentHint) =>
            currentHint
                ? { ...currentHint, hoveredMainSeriesName: seriesName }
                : currentHint,
        );
    }

    function handlePanelClickCapture(event: MouseEvent<HTMLDivElement>): void {
        if (
            overlayMode !== PanelOverlayMode.ANNOTATION ||
            isInteractiveElement(event.target)
        ) {
            return;
        }

        if (isPointInsideMainChart(event.clientX, event.clientY)) {
            return;
        }

        Toast.error(ANNOTATION_INVALID_TARGET_MESSAGE, undefined);
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
        setActivePopupMode(PanelPopupMode.ANNOTATION_EDITOR);
    }

    function activateEditHighlightEditor(
        position: ContextMenuPosition,
        highlightIndex: number,
    ): void {
        const sHighlightEditor = buildEditHighlightEditor(position, highlightIndex);

        setActiveHighlightEditor(sHighlightEditor.editor);
        setTemporaryHighlight(sHighlightEditor.temporaryHighlight);
        setActivePopupMode(PanelPopupMode.HIGHLIGHT_EDITOR);
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
        setActivePopupMode(PanelPopupMode.ANNOTATION_EDITOR);
    }

    return (
        <div
            className="panel-form"
            style={{ border: `0.5px solid ${isOverlap ? '#FDB532' : '#454545'}` }}
            onContextMenu={handlePanelContextMenu}
            onMouseMove={handlePanelMouseMove}
            onMouseLeave={() => {
                setHoveredMainSeriesName(undefined);
                setMarkupInteractionHint(undefined);
            }}
            onClickCapture={handlePanelClickCapture}
        >
            {(overlayMode === PanelOverlayMode.ANNOTATION ||
                overlayMode === PanelOverlayMode.HIGHLIGHT ||
                overlayMode === PanelOverlayMode.DRAG_SELECT) && (
                <PanelMarkupInteractionHint hint={markupInteractionHint} />
            )}
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
                        axes: runtimeAxes,
                        display: runtimeDisplay,
                        seriesList: panelInfo.data.tag_set,
                        useNormalize: panelInfo.general.use_normalize,
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
                        onHoveredMainSeriesChange: handleHoveredMainSeriesChange,
                        onSelection: handleSelection,
                    }}
                />
                <PanelFooter
                    pShowLegend={panelInfo.display.show_legend}
                    pNavigatorRange={navigatorRange}
                    pIsLoading={loadStatus.navigator === PanelChartLoadStatus.Loading}
                    pOnNavigatorRangeChange={rangeHandlers.onNavigatorRangeChange}
                    pNavigatorShiftActions={navigatorShiftActions}
                    pZoomActions={zoomActions}
                    pIsNumericXAxis={isNumericXAxis}
                />
            </div>
            {isEditing && (
                <PanelEditor
                    pOnApplyEditorConfig={applyEditedPanelConfig}
                    pOnSaveEditorConfig={saveEditedPanelConfig}
                    pOnClose={closePanelEditor}
                    pPanelInfo={panelInfo}
                    pIsRawMode={isRaw}
                    pPanelRange={panelRange}
                    pCanKeepCurrentViewRange={canKeepCurrentViewRange}
                />
            )}
            {activePopupMode === PanelPopupMode.CONTEXT_MENU && (
                <PanelContextMenu
                    runtimeState={panelHeaderRuntimeState}
                    onAction={handlePanelAction}
                    position={contextMenuPosition!}
                    onClose={() => {
                        setActivePopupMode(PanelPopupMode.NONE);
                        setContextMenuPosition(undefined);
                    }}
                />
            )}
            {activePopupMode === PanelPopupMode.FFT && (
                <FFTModal
                    pSeriesSummaries={fftSelection!.seriesSummaries}
                    pStartTime={fftSelection!.startTime}
                    pEndTime={fftSelection!.endTime}
                    pIsNumericXAxis={isNumericXAxis}
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            setActivePopupMode(PanelPopupMode.NONE);
                            setFftSelection(undefined);
                        }
                    }}
                />
            )}
            {isSelectionSummaryOpen && selectionSummary && (
                <SelectionSummaryPopover
                    selection={selectionSummary.selection}
                    position={selectionSummary.popoverPosition}
                    isNumericXAxis={isNumericXAxis}
                    onClose={() => {
                        setIsSelectionSummaryOpen(false);
                        setOverlayMode(PanelOverlayMode.NO_OVERLAY);
                    }}
                />
            )}
            {activePopupMode === PanelPopupMode.HIGHLIGHT_EDITOR && (
                <EditHighlightModal
                    key={activeHighlightEditor!.highlightIndex}
                    activeHighlightEditor={activeHighlightEditor!}
                    temporaryHighlight={temporaryHighlight}
                    highlightActions={highlightActions}
                    onApplyHighlightChange={(formState, editor) =>
                        applyHighlightChange(
                            formState,
                            editor,
                            temporaryHighlight,
                        )
                    }
                    onCancel={() => {
                        setActivePopupMode(PanelPopupMode.NONE);
                        setActiveHighlightEditor(undefined);
                        setTemporaryHighlight(undefined);
                    }}
                    onApplied={() => {
                        setActivePopupMode(PanelPopupMode.NONE);
                        setActiveHighlightEditor(undefined);
                        setTemporaryHighlight(undefined);
                    }}
                    isNumericXAxis={isNumericXAxis}
                />
            )}
            {activePopupMode === PanelPopupMode.ANNOTATION_EDITOR && (
                <EditAnnotationModal
                    key={annotationEditorMeta!.annotationIndex ?? 'new'}
                    annotationEditorMeta={annotationEditorMeta!}
                    annotationAction={annotationAction}
                    onApplyAnnotationChange={applyAnnotationChange}
                    onDeleteAnnotation={deletePanelAnnotation}
                    onCancel={() => {
                        setActivePopupMode(PanelPopupMode.NONE);
                        setAnnotationEditorMeta(undefined);
                        setOverlayMode(PanelOverlayMode.NO_OVERLAY);
                    }}
                    onApplied={() => {
                        setActivePopupMode(PanelPopupMode.NONE);
                        setAnnotationEditorMeta(undefined);
                        setOverlayMode(PanelOverlayMode.NO_OVERLAY);
                    }}
                    isNumericXAxis={isNumericXAxis}
                />
            )}
            {activePopupMode === PanelPopupMode.DELETE_CONFIRM && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            setActivePopupMode(PanelPopupMode.NONE);
                        }
                    }}
                    pCallback={onDeletePanel}
                    pContents={
                        <div className="body-content">Do you want to delete this panel?</div>
                    }
                />
            )}
            {activePopupMode === PanelPopupMode.EXPORT_CSV && (
                <SavedToLocalModal
                    pPanelInfo={chartData}
                    pChartRef={panelChartApiRef}
                    pIsDarkMode
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            setActivePopupMode(PanelPopupMode.NONE);
                        }
                    }}
                />
            )}
        </div>
    );
}

function isInteractiveElement(target: EventTarget): boolean {
    return target instanceof Element && Boolean(
        target.closest(
            'button, input, select, textarea, a, [role="button"]',
        ),
    );
}

export default PanelContainer;
