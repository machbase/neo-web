import { useRef, useState, type MouseEvent } from 'react';
import { PanelMarkupInteractionHint, ANNOTATION_INVALID_TARGET_MESSAGE, type PanelMarkupInteractionHintState } from './PanelMarkupInteractionHint';
import { Toast, type ContextMenuPosition } from '@/design-system/components';
import PanelFooter from './PanelFooter';
import PanelHeader, {
    PanelActionKey,
    type PanelHeaderRuntimeState,
} from './PanelHeader';
import PanelBody from './PanelBody';
import PanelEditor from './editor/PanelEditor';
import type {
    AnnotationEditorMetaState,
} from './modal/PanelMarkupModalTypes';
import {
    PanelPopupMode,
    PanelPopups,
    type PanelPopupState,
    type PanelSelectionSummary,
} from './PanelPopups';
import TimeRangeModal from '../boardModal/TimeRangeModal';
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
    DEFAULT_PANEL_HIGHLIGHT_LABEL,
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
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
import type { ReloadAfterEditorSaveOptions } from '../board/useConfigReload';
import { hasResolvedIntervalOption } from '../domain/time/interval/TimeIntervalUtils';
import type {
    IntervalOption,
    TimeRangeConfig,
    TimeRangeMs,
} from '../domain/time/model/TimeTypes';
import {
    canResolveTimeRangeConfig,
    resolveTimeRangeConfig,
} from '../domain/time/resolution/TimeRangeConfigResolver';
import {
    createAbsoluteTimeRangeConfig,
    isValidTimeRange,
} from '../domain/time/range/TimeRangeUtils';
import { buildSelectionSummaryPayload } from './PanelBrushSelection';
import { useChartAreaWidthObserver } from '../board/useChartAreaWidthObserver';
import { usePanelAnnotation } from './usePanelAnnotation';
import { usePanelEditorActions } from './editor/usePanelEditor';
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
    isOverlap: boolean;
};

type PanelContainerActions = {
    onChartAreaWidthChange: (width: number | undefined) => void;
    refreshData: () => void;
    refreshTime: () => void;
    expandFullRange: () => void;
    onSavePanelInfo: (panelInfo: PanelInfo) => Promise<boolean>;
    reloadAfterEditorSave: (
        panelInfo: PanelInfo,
        options: ReloadAfterEditorSaveOptions,
    ) => void;
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

const EMPTY_PANEL_POPUP_STATE: PanelPopupState = { mode: PanelPopupMode.NONE };

enum PanelRuntimeTimeRangeTarget {
    MAIN_CHART = 'MAIN_CHART',
    NAVIGATOR = 'NAVIGATOR',
}

type PanelRuntimeTimeRangeModal = {
    title: string;
    range: TimeRangeMs;
};

function PanelContainer({
    panelInfo,
    runtime: {
        rangeState,
        chartAreaWidth,
        dataRefreshVersion,
        rollupTableList,
        onRangeStateChange,
    },
    state: {
        isRaw,
        isOverlap,
    },
    actions: {
        onChartAreaWidthChange,
        refreshData,
        refreshTime,
        expandFullRange,
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
    const effectiveIsRaw = isNumericXAxis || isRaw;
    const runtimePanelInfo: PanelInfo =
        effectiveIsRaw === panelInfo.general.is_raw
            ? panelInfo
            : {
                  ...panelInfo,
                  general: {
                      ...panelInfo.general,
                      is_raw: effectiveIsRaw,
                  },
              };
    const runtimeAxes = resolvePanelAxesForRuntime(panelInfo.axes);
    const runtimeDisplay = resolvePanelDisplayForRuntime(
        panelInfo.display,
        panelInfo.general.use_zoom,
    );

    const [overlayMode, setOverlayMode] = useState<PanelOverlayMode>(
        PanelOverlayMode.NO_OVERLAY,
    );
    const [popupState, setPopupState] = useState<PanelPopupState>(
        EMPTY_PANEL_POPUP_STATE,
    );
    const [timeRangeModalTarget, setTimeRangeModalTarget] = useState<
        PanelRuntimeTimeRangeTarget | undefined
    >(undefined);
    const [isEditorMounted, setIsEditorMounted] = useState(false);
    const [isEditorClosing, setIsEditorClosing] = useState(false);
    const [selectionSummary, setSelectionSummary] = useState<
        PanelSelectionSummary | undefined
    >(undefined);
    const [markupInteractionHint, setMarkupInteractionHint] = useState<
        PanelMarkupInteractionHintState | undefined
    >(undefined);
    const [hoveredMainSeriesName, setHoveredMainSeriesName] = useState<
        string | undefined
    >(undefined);

    useChartAreaWidthObserver(chartAreaRef, onChartAreaWidthChange);
    const {
        rangeActions,
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
        panelInfo: runtimePanelInfo,
        rangeState,
        chartAreaWidth,
        rollupTableList,
        dataRefreshVersion,
        onRangeStateChange,
    });
    const { highlightCrud } = usePanelHighlight(
        panelInfo.highlights,
        (highlights) =>
            onApplyPanelInfo({
                ...panelInfo,
                highlights: highlights,
            }),
    );

    const {
        annotationCrud,
        annotationSeriesOptions,
    } = usePanelAnnotation(
        panelInfo.annotations,
        panelInfo.data.tag_set,
        (annotations) =>
            onApplyPanelInfo({
                ...panelInfo,
                annotations,
            }),
    );
    const {
        applyEditedPanelConfig,
        saveEditedPanelConfig,
    } = usePanelEditorActions({
        panelInfo,
        onApplyPanelInfo,
        onSavePanelInfo,
        reloadAfterEditorSave,
    });
    let sResolvedIntervalOption: IntervalOption | undefined = undefined;
    if (hasResolvedIntervalOption(resolvedIntervalOption)) {
        sResolvedIntervalOption = resolvedIntervalOption;
    }

    let panelHighlights: PanelHighlight[] = panelInfo.highlights;
    if (
        popupState.mode === PanelPopupMode.HIGHLIGHT_EDITOR &&
        popupState.draftHighlight !== undefined
    ) {
        panelHighlights = [...panelInfo.highlights, popupState.draftHighlight];
    }

    const isEditing = isEditorMounted && !isEditorClosing;
    const isOverlayModeActive = overlayMode !== PanelOverlayMode.NO_OVERLAY;

    const panelHeaderRuntimeState: PanelHeaderRuntimeState = {
        title: panelInfo.general.chart_title,
        panelRange,
        resolvedIntervalOption: sResolvedIntervalOption,
        canSetGlobalTime: !isNumericXAxis && sResolvedIntervalOption !== undefined,
        canSaveLocal: loadStatus.chart === PanelChartLoadStatus.Ready,
        canOpenFft: selectionSummary !== undefined,
        isNumericXAxis,
        overlayMode,
        isEditing,
        isRaw: effectiveIsRaw,
        isOverlap,
    };
    const runtimeTimeRangeModal =
        getRuntimeTimeRangeModal(timeRangeModalTarget);

    function getRuntimeTimeRangeModal(
        target: PanelRuntimeTimeRangeTarget | undefined,
    ): PanelRuntimeTimeRangeModal | undefined {
        if (target === undefined) {
            return undefined;
        }

        switch (target) {
            case PanelRuntimeTimeRangeTarget.MAIN_CHART:
                if (!isValidTimeRange(panelRange)) {
                    return undefined;
                }

                return {
                    title: isNumericXAxis
                        ? 'Current Visible Main Chart Value Range'
                        : 'Current Visible Main Chart Range',
                    range: panelRange,
                };

            case PanelRuntimeTimeRangeTarget.NAVIGATOR:
                if (!isValidTimeRange(navigatorRange)) {
                    return undefined;
                }

                return {
                    title: isNumericXAxis
                        ? 'Current Visible Navigator Value Range'
                        : 'Current Visible Navigator Range',
                    range: navigatorRange,
                };
        }
    }

    function openRuntimeTimeRangeModal(
        target: PanelRuntimeTimeRangeTarget,
    ): void {
        if (getRuntimeTimeRangeModal(target) === undefined) {
            return;
        }

        setTimeRangeModalTarget(target);
    }

    function closeRuntimeTimeRangeModal(): void {
        setTimeRangeModalTarget(undefined);
    }

    function applyRuntimeNumericRange(numericRange: TimeRangeMs): boolean {
        return applyRuntimeConcreteRange(numericRange);
    }

    function applyRuntimeTimeRangeConfig(
        timeRangeConfig: TimeRangeConfig,
    ): boolean {
        if (timeRangeModalTarget === undefined) {
            return false;
        }

        const sLastAnchorTime = isValidTimeRange(rangeState.fullRange)
            ? rangeState.fullRange.endTime
            : undefined;
        const sTimeRangeResolutionOptions = {
            lastAnchorTime: sLastAnchorTime,
        };

        if (
            !canResolveTimeRangeConfig(
                timeRangeConfig,
                sTimeRangeResolutionOptions,
            )
        ) {
            Toast.error('Please check the entered time.');
            return false;
        }

        const sTimeRange = resolveTimeRangeConfig(
            timeRangeConfig,
            sTimeRangeResolutionOptions,
        );

        return applyRuntimeConcreteRange(sTimeRange);
    }

    function applyRuntimeConcreteRange(range: TimeRangeMs): boolean {
        if (timeRangeModalTarget === undefined) {
            return false;
        }

        const sRangeChangeEvent: PanelRangeChangeEvent = {
            min: range.startTime,
            max: range.endTime,
        };

        switch (timeRangeModalTarget) {
            case PanelRuntimeTimeRangeTarget.MAIN_CHART:
                rangeActions.applyExactMainRange(sRangeChangeEvent);
                return true;

            case PanelRuntimeTimeRangeTarget.NAVIGATOR:
                rangeActions.applyExactNavigatorRange(sRangeChangeEvent);
                return true;
        }
    }

    function handleSelection(event: PanelRangeChangeEvent): boolean {
        switch (overlayMode) {
            case PanelOverlayMode.HIGHLIGHT:
                openCreateHighlightEditorFromBrush(event.min, event.max);
                return false;

            case PanelOverlayMode.DRAG_SELECT:
                openSelectionSummaryFromBrush(event);
                return false;

            case PanelOverlayMode.ANNOTATION:
            case PanelOverlayMode.NO_OVERLAY:
                return false;
        }
    }

    function openSelectionSummaryFromBrush(event: PanelRangeChangeEvent): void {
        const sSelection = buildSelectionSummaryPayload(
            event,
            chartData,
            panelInfo.data.tag_set,
            isNumericXAxis,
        );

        if (!sSelection) {
            Toast.error('There is no data in the selected area.', undefined);
            return;
        }

        setOverlayMode(PanelOverlayMode.DRAG_SELECT);
        setSelectionSummary({
            selection: sSelection,
            popoverPosition: getSelectionPopoverPosition(),
        });
    }

    const chartMarkupHandlers: PanelMarkupHandlers = {
        onOpenCreateAnnotation: (position, seriesIndex, timestamp) => {
            setOverlayMode(PanelOverlayMode.NO_OVERLAY);
            openCreateAnnotationEditor(
                position,
                seriesIndex,
                timestamp,
            );
        },
        onActivateHighlightEditor: (position, highlightIndex) => {
            setOverlayMode(PanelOverlayMode.NO_OVERLAY);
            openEditHighlightEditor(position, highlightIndex);
        },
        onActivateAnnotationEditor: (position, annotationIndex) => {
            setOverlayMode(PanelOverlayMode.NO_OVERLAY);
            openEditAnnotationEditor(position, annotationIndex);
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
        if (!selectionSummary) {
            throw new Error('Cannot open FFT without an open selection summary.');
        }

        setPopupState({
            mode: PanelPopupMode.FFT,
            selection: selectionSummary.selection,
        });
    }

    function closePopup(popupMode: PanelPopupMode): void {
        setPopupState(EMPTY_PANEL_POPUP_STATE);

        switch (popupMode) {
            case PanelPopupMode.ANNOTATION_EDITOR:
                setOverlayMode(PanelOverlayMode.NO_OVERLAY);
                return;

            case PanelPopupMode.NONE:
            case PanelPopupMode.CONTEXT_MENU:
            case PanelPopupMode.FFT:
            case PanelPopupMode.HIGHLIGHT_EDITOR:
            case PanelPopupMode.DELETE_CONFIRM:
            case PanelPopupMode.EXPORT_CSV:
                return;
        }
    }

    function toggleOverlayMode(nextOverlayMode: PanelOverlayMode): void {
        setPopupState(EMPTY_PANEL_POPUP_STATE);
        setOverlayMode((currentOverlayMode) =>
            currentOverlayMode === nextOverlayMode
                ? PanelOverlayMode.NO_OVERLAY
                : nextOverlayMode,
        );
    }

    function openPanelEditor(): void {
        setIsEditorMounted(true);
        setIsEditorClosing(false);
    }

    function closePanelEditor(): void {
        if (!isEditorMounted) {
            return;
        }

        setIsEditorClosing(true);
    }

    function finishPanelEditorClose(): void {
        if (!isEditorClosing) {
            return;
        }

        setIsEditorMounted(false);
        setIsEditorClosing(false);
    }

    function togglePanelEditor(): void {
        if (isEditorMounted && !isEditorClosing) {
            closePanelEditor();
            return;
        }

        openPanelEditor();
    }

    function renamePanelTitle(title: string): void {
        const sNextTitle = title.trim();

        if (
            sNextTitle.length === 0 ||
            sNextTitle === panelInfo.general.chart_title
        ) {
            return;
        }

        onApplyPanelInfo({
            ...panelInfo,
            general: {
                ...panelInfo.general,
                chart_title: sNextTitle,
            },
        });
    }

    function handlePanelAction(actionKey: PanelActionKey): void {
        switch (actionKey) {
            case PanelActionKey.TOGGLE_RAW:
                if (isNumericXAxis) {
                    return;
                }

                onToggleRaw();
                return;
            case PanelActionKey.TOGGLE_HIGHLIGHT:
                setSelectionSummary(undefined);
                toggleOverlayMode(PanelOverlayMode.HIGHLIGHT);
                return;
            case PanelActionKey.TOGGLE_ANNOTATION:
                toggleOverlayMode(PanelOverlayMode.ANNOTATION);
                return;
            case PanelActionKey.TOGGLE_DRAG_SELECT:
                setSelectionSummary(undefined);
                toggleOverlayMode(PanelOverlayMode.DRAG_SELECT);
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
            case PanelActionKey.EXPAND_FULL_RANGE:
                expandFullRange();
                return;
            case PanelActionKey.TOGGLE_EDIT:
                togglePanelEditor();
                return;
            case PanelActionKey.OPEN_EXPORT_CSV:
                setPopupState({ mode: PanelPopupMode.EXPORT_CSV });
                return;
            case PanelActionKey.OPEN_DELETE_CONFIRM:
                setPopupState({ mode: PanelPopupMode.DELETE_CONFIRM });
                return;
        }
    }

    function handlePanelContextMenu(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        setPopupState({
            mode: PanelPopupMode.CONTEXT_MENU,
            position: { x: event.clientX, y: event.clientY },
        });
        setOverlayMode(PanelOverlayMode.NO_OVERLAY);
    }

    function isPointInsideMainChart(clientX: number, clientY: number): boolean {
        return panelChartApiRef.current?.isPointInsideMainGrid(clientX, clientY) === true;
    }

    function getSelectionPopoverPosition(): { x: number; y: number } {
        const sChartRect = chartAreaRef.current?.getBoundingClientRect();

        if (!sChartRect) {
            throw new Error('Cannot place selection popover without a chart area.');
        }

        return { x: sChartRect.left - 90, y: sChartRect.top - 35 };
    }

    function handlePanelMouseMove(event: MouseEvent<HTMLDivElement>): void {
        if (!isOverlayModeActive) {
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

    function openCreateAnnotationEditor(
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

        setPopupState({
            mode: PanelPopupMode.ANNOTATION_EDITOR,
            editorMeta: {
                position,
                seriesKey: sSeriesKey,
                timestamp,
            },
        });
    }

    function openEditAnnotationEditor(
        position: AnnotationEditorMetaState['position'],
        annotationIndex: number,
    ): void {
        const sAnnotation = annotationCrud.getAnnotation(annotationIndex);

        setPopupState({
            mode: PanelPopupMode.ANNOTATION_EDITOR,
            editorMeta: {
                position,
                seriesKey: sAnnotation.seriesKey,
                annotationIndex,
            },
        });
    }

    function openEditHighlightEditor(
        position: ContextMenuPosition,
        highlightIndex: number,
    ): void {
        setPopupState({
            mode: PanelPopupMode.HIGHLIGHT_EDITOR,
            editor: {
                mode: 'edit',
                position,
                highlightIndex,
            },
        });
    }

    function openCreateHighlightEditorFromBrush(
        startTime: number,
        endTime: number,
    ): void {
        setOverlayMode(PanelOverlayMode.NO_OVERLAY);
        const sStartTime = Math.min(startTime, endTime);
        const sEndTime = Math.max(startTime, endTime);

        if (sEndTime <= sStartTime) {
            return;
        }

        const sChartRect = chartAreaRef.current?.getBoundingClientRect();

        if (!sChartRect) {
            throw new Error('Cannot create a highlight without a chart area.');
        }

        setPopupState({
            mode: PanelPopupMode.HIGHLIGHT_EDITOR,
            editor: {
                mode: 'create',
                position: {
                    x: sChartRect.left + sChartRect.width / 2,
                    y: sChartRect.top + sChartRect.height / 2,
                },
            },
            draftHighlight: {
                text: DEFAULT_PANEL_HIGHLIGHT_LABEL,
                timeRange: {
                    startTime: sStartTime,
                    endTime: sEndTime,
                },
                fillColor: DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
                textColor: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
            },
        });
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
            {isOverlayModeActive && (
                <PanelMarkupInteractionHint hint={markupInteractionHint} />
            )}
            <PanelHeader
                runtimeState={panelHeaderRuntimeState}
                onAction={handlePanelAction}
                onToggleOverlap={onToggleOverlap}
                onRenamePanelTitle={renamePanelTitle}
                onOpenTimeRangeModal={() =>
                    openRuntimeTimeRangeModal(
                        PanelRuntimeTimeRangeTarget.MAIN_CHART,
                    )
                }
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
                        useOrderBy: effectiveIsRaw
                            ? panelInfo.general.is_order_by
                            : true,
                        highlights: panelHighlights,
                        annotations: panelInfo.annotations,
                    }}
                    isRaw={effectiveIsRaw}
                    overlayMode={overlayMode}
                    data={{
                        chartData,
                        navigatorChartData,
                    }}
                    rangeState={rangeState}
                    isLoading={loadStatus.chart === PanelChartLoadStatus.Loading}
                    handlers={{
                        rangeActions,
                        markupHandlers: chartMarkupHandlers,
                        onHoveredMainSeriesChange: handleHoveredMainSeriesChange,
                        onSelection: handleSelection,
                    }}
                />
                <PanelFooter
                    pShowLegend={panelInfo.display.show_legend}
                    pNavigatorRange={navigatorRange}
                    pIsLoading={loadStatus.navigator === PanelChartLoadStatus.Loading}
                    pOnOpenTimeRangeModal={() =>
                        openRuntimeTimeRangeModal(
                            PanelRuntimeTimeRangeTarget.NAVIGATOR,
                        )
                    }
                    pNavigatorShiftActions={navigatorShiftActions}
                    pZoomActions={zoomActions}
                    pIsNumericXAxis={isNumericXAxis}
                />
            </div>
            {isEditorMounted && (
                <PanelEditor
                    pAnimationState={isEditorClosing ? 'closing' : 'opening'}
                    pOnApplyEditorConfig={applyEditedPanelConfig}
                    pOnSaveEditorConfig={saveEditedPanelConfig}
                    pOnClose={closePanelEditor}
                    pOnAnimationEnd={finishPanelEditorClose}
                    pPanelInfo={panelInfo}
                    pIsRawMode={effectiveIsRaw}
                    pPanelRange={panelRange}
                />
            )}
            {runtimeTimeRangeModal !== undefined &&
                (isNumericXAxis ? (
                    <TimeRangeModal
                        rangeKind="numeric"
                        title={runtimeTimeRangeModal.title}
                        numericRange={runtimeTimeRangeModal.range}
                        onApply={applyRuntimeNumericRange}
                        onClose={closeRuntimeTimeRangeModal}
                    />
                ) : (
                    <TimeRangeModal
                        rangeKind="time"
                        title={runtimeTimeRangeModal.title}
                        timeRange={createAbsoluteTimeRangeConfig(
                            runtimeTimeRangeModal.range.startTime,
                            runtimeTimeRangeModal.range.endTime,
                        )}
                        onApply={applyRuntimeTimeRangeConfig}
                        onClose={closeRuntimeTimeRangeModal}
                    />
                ))}
            <PanelPopups
                popupState={popupState}
                panelHeaderRuntimeState={panelHeaderRuntimeState}
                onPanelAction={handlePanelAction}
                isNumericXAxis={isNumericXAxis}
                selectionSummary={selectionSummary}
                highlightCrud={highlightCrud}
                annotationCrud={annotationCrud}
                annotationSeriesOptions={annotationSeriesOptions}
                onClosePopup={closePopup}
                onCloseSelectionSummary={() => {
                    setSelectionSummary(undefined);
                    setOverlayMode(PanelOverlayMode.NO_OVERLAY);
                }}
                onDeletePanel={onDeletePanel}
                chartData={chartData}
                panelChartApiRef={panelChartApiRef}
            />
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
