import { memo, useEffect, useRef, useState, type MouseEvent } from 'react';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import PanelChart, {
    ANNOTATION_INVALID_TARGET_MESSAGE,
    PanelOverlayCursorHint,
    type PanelChartHandle,
    useChartAreaWidthObserver,
} from '../chart/PanelChart';
import { Toast, type ContextMenuPosition } from '@/design-system/components';
import {
    PanelFooter,
    PanelHeader,
    PanelActionKey,
    PanelContextMenu,
} from './internal/PanelChrome';
import PanelEditor from './editor/PanelEditor';
import {
    buildSelectionSummaryPayload,
    SelectionSummaryPopover,
} from '../tools/AnalysisModals';
import { EditAnnotationModal, EditHighlightModal } from '../tools/MarkupModals';
import { RangeModal } from '../range/RangeModal';
import { formatRangeInputValue } from '../format/inputFormat';
import { formatAxisRange } from '../format/axisFormat';
import { formatNumericInterval } from '../format/numericFormat';
import { formatTimeInterval } from '../format/timeFormat';
import { formatAbsoluteTime } from '../persistence/serializeRange';
import {
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_LABEL,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    type PanelInfo,
} from './panelModel';
import {
    resolveSetGlobalRangeRequest,
    usePanelRangeRuntime,
    type PanelBroadcastRequests,
} from './panelRuntime';
import { MIXED_X_AXIS_KIND_WARNING, type RollupTableMap } from '../seriesModel';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
    type RangeState,
    type ResolvedRangeState,
} from '../range/rangeModel';
import { isSameRange } from '../range/rangeArithmetic';
import { createNonEmptyAxisRange } from '../range/rangeBuilder';
import {
    filterChartDataByRange,
    type ChartSeriesData,
} from '../chart/chartData';
import {
    usePanelData,
    type PanelDataLoadMetrics,
} from './internal/panelData';
import {
    PanelPopupMode,
    usePanelInteraction,
} from './internal/panelInteraction';
import { PanelOverlayMode } from '../chart/chartRuntime';
import './Panel.scss';

type PanelProps = {
    panelInfo: PanelInfo;
    rangeState: ResolvedRangeState | undefined;
    broadcastRequests: PanelBroadcastRequests;
    runtime: {
        isActive: boolean;
        hasUnsavedBoardChanges: boolean;
        rollupTableList: RollupTableMap;
    };
    actions: {
        onRangeStateChange: (rangeState: ResolvedRangeState) => void;
        onBroadcastError: (broadcastKey: string, message: string) => void;
        onApplyPanelInfo: (panelInfo: PanelInfo) => void;
        onSetGlobalRange: (
            axisKind: AxisKind,
            globalRange: RangeState,
        ) => void;
        onDeletePanel: () => void;
        onToggleOverlap: () => void;
    };
};

type RetainedMainRangeInput = {
    rangeInput: RangeExpressionInput;
    concreteRange: AxisRange;
};

type CurrentRangeTarget = 'main' | 'navigator';

const EMPTY_PANEL_CHART_DATA: ChartSeriesData[] = [];
const EMPTY_PANEL_DATA_METRIC: PanelDataLoadMetrics['main'] = {
    queriedEntries: undefined,
    pointCount: undefined,
    pixelWidth: undefined,
};
const EMPTY_PANEL_DATA_METRICS: PanelDataLoadMetrics = {
    main: EMPTY_PANEL_DATA_METRIC,
    navigator: EMPTY_PANEL_DATA_METRIC,
};

export default memo(function Panel({
    panelInfo,
    rangeState,
    broadcastRequests,
    runtime: {
        isActive,
        hasUnsavedBoardChanges,
        rollupTableList,
    },
    actions: {
        onRangeStateChange,
        onBroadcastError,
        onApplyPanelInfo,
        onSetGlobalRange,
        onDeletePanel,
        onToggleOverlap,
    },
}: PanelProps) {
    const isRaw = panelInfo.mode.isRaw;
    const isOverlapSelected = panelInfo.isOverlapSelected;
    const chartAreaRef = useRef<HTMLDivElement | null>(null);
    const panelChartApiRef = useRef<PanelChartHandle | null>(null);

    const rangeRuntime = usePanelRangeRuntime({
        ...broadcastRequests,
        panelInfo,
        rangeState,
        isActive,
        onRangeStateChange,
        onBroadcastError,
    });
    const { chartAreaWidth, dataRefreshVersion } = rangeRuntime;
    const {
        setChartAreaWidth: onChartAreaWidthChange,
        applyRangeAction: onRangeButtonAction,
        setMainRange: onMainRangeChange,
        setNavigatorRange: onNavigatorRangeChange,
        refreshData: onRefreshData,
        refreshRange: onRefreshRange,
        expandFullRange: onExpandFullRange,
        reloadAfterEditorSave: onReloadAfterEditorSave,
    } = rangeRuntime.actions;

    const interaction = usePanelInteraction();
    const {
        overlayMode,
        popupState,
        editorStatus,
        selectionSummary,
        overlayCursorHint,
        hoveredMainSeriesName,
    } = interaction.state;
    const {
        toggleOverlay,
        setOverlayMode,
        openPopup,
        closePopup,
        toggleEditor,
        closeEditor: closeInteractionEditor,
        finishEditorClose,
        openSelection,
        closeSelection,
        showCursorHint,
        setHoveredSeries,
        clearCursorHint,
    } = interaction.actions;
    const isEditorMounted = editorStatus !== 'closed';
    const isEditorClosing = editorStatus === 'closing';

    useChartAreaWidthObserver(chartAreaRef, onChartAreaWidthChange);

    const panelData = usePanelData({
        panelInfo,
        isActive,
        rangeState,
        chartAreaWidth,
        rollupTables: rollupTableList,
        dataRefreshVersion,
    });
    const queryableData =
        panelData.kind === 'queryable' ? panelData : undefined;
    const mainChartData =
        queryableData?.series.main ?? EMPTY_PANEL_CHART_DATA;
    const navigatorChartData =
        queryableData?.series.navigator ?? EMPTY_PANEL_CHART_DATA;
    const renderRange = queryableData?.range.render ?? rangeState?.range;
    const resolution = queryableData?.query.resolution;
    const resolvedIntervalOption =
        resolution?.kind === 'time' ? resolution.interval : undefined;
    const resolvedNumericInterval =
        resolution?.kind === 'numeric' ? resolution.bucketWidth : undefined;
    const seriesRollupStatusList = [
        ...(queryableData?.query.seriesRollupStatuses ?? []),
    ];
    const dataSettingMetrics =
        queryableData?.query.metrics ?? EMPTY_PANEL_DATA_METRICS;
    const hasMixedXAxisKinds =
        panelData.kind === 'invalid' &&
        panelData.reason === 'mixedAxisKinds';
    const isNumericXAxis = queryableData?.query.axisKind === 'numeric';
    const chartLoadState = queryableData?.load.requests.main;
    const navigatorLoadState = queryableData?.load.requests.navigator;
    const hasDataRequestGeometry =
        rangeState !== undefined &&
        chartAreaWidth !== undefined &&
        Number.isFinite(chartAreaWidth) &&
        chartAreaWidth > 0;
    const displayNotice =
        queryableData?.load.notice === 'noData'
            ? 'No Data'
            : queryableData?.load.notice === 'partialData'
              ? 'Some series unavailable'
              : chartLoadState?.status === 'failed'
                ? chartLoadState.error
                : undefined;
    const loadStatus = {
        chart: hasDataRequestGeometry
            ? (chartLoadState?.status ?? 'idle')
            : 'loading',
        navigator: hasDataRequestGeometry
            ? (navigatorLoadState?.status ?? 'idle')
            : 'loading',
    };
    const renderMainRange = renderRange?.mainRange;
    const renderNavigatorRange = renderRange?.navigatorRange;
    function dragNavigatorSelection(range: AxisRange): void {
        onMainRangeChange(range);
    }

    const rangeActions = {
        applyMainZoomRange: onMainRangeChange,
        applyMainNavigatorSelectionRange: dragNavigatorSelection,
        shiftMainRangeLeft: () => onRangeButtonAction('shift-main-left'),
        shiftMainRangeRight: () => onRangeButtonAction('shift-main-right'),
    };

    function applyEditedPanelConfig(editorConfig: PanelInfo): void {
        const sRangeInput = editorConfig.time.rangeInput;
        const sPreserveCurrentVisibleRange =
            panelInfo.time.rangeInput.start === sRangeInput.start &&
            panelInfo.time.rangeInput.end === sRangeInput.end;
        const sNextPanelInfo = {
            ...editorConfig,
            query: {
                ...editorConfig.query,
                tagSet: editorConfig.axes.rightY.enabled
                    ? editorConfig.query.tagSet
                    : editorConfig.query.tagSet.map((series) => ({
                        ...series,
                        useSecondaryAxis: false,
                    })),
            },
            time: {
                ...editorConfig.time,
                lastViewedRange:
                    editorConfig.time.useLastViewedRange &&
                    sPreserveCurrentVisibleRange
                        ? editorConfig.time.lastViewedRange
                        : undefined,
            },
        };

        onApplyPanelInfo(sNextPanelInfo);
        onReloadAfterEditorSave(
            sNextPanelInfo,
            sPreserveCurrentVisibleRange
                ? 'preserveVisibleRange'
                : 'applyConfiguredRange',
        );
    }

    function requireChartAreaRect(action: string): DOMRect {
        const sChartRect = chartAreaRef.current?.getBoundingClientRect();
        if (!sChartRect) {
            throw new Error(`Cannot ${action} without a chart area.`);
        }

        return sChartRect;
    }

    const isOverlayModeActive = overlayMode !== PanelOverlayMode.NO_OVERLAY;
    const setGlobalRangeRequest = resolveSetGlobalRangeRequest(
        panelInfo,
        loadStatus.chart === 'ready',
        renderRange,
    );
    const formattedMainRange = renderMainRange
        ? formatAxisRange(renderMainRange, isNumericXAxis)
        : undefined;
    const resolutionLabel = isRaw
        ? ''
        : isNumericXAxis
          ? formatNumericInterval(resolvedNumericInterval)
          : resolvedIntervalOption
            ? formatTimeInterval(resolvedIntervalOption)
            : '';
    const activeHeaderActions: PanelActionKey[] = [];
    if (isRaw) activeHeaderActions.push(PanelActionKey.TOGGLE_RAW);
    if (overlayMode === PanelOverlayMode.HIGHLIGHT) {
        activeHeaderActions.push(PanelActionKey.TOGGLE_HIGHLIGHT);
    }
    if (overlayMode === PanelOverlayMode.ANNOTATION) {
        activeHeaderActions.push(PanelActionKey.TOGGLE_ANNOTATION);
    }
    if (overlayMode === PanelOverlayMode.DRAG_SELECT) {
        activeHeaderActions.push(PanelActionKey.TOGGLE_DRAG_SELECT);
    }
    if (isEditorMounted && !isEditorClosing) {
        activeHeaderActions.push(PanelActionKey.TOGGLE_EDIT);
    }
    const panelHeaderState = {
        title: panelInfo.title,
        range: formattedMainRange
            ? {
                  label: `${formattedMainRange.start} ~ ${formattedMainRange.end}`,
                  actionLabel: isNumericXAxis
                      ? 'Set current visible main chart value range'
                      : 'Set current visible main chart range',
              }
            : undefined,
        resolution: resolutionLabel
            ? {
                  label: resolutionLabel,
                  kind: isNumericXAxis
                      ? ('numeric' as const)
                      : ('time' as const),
              }
            : undefined,
        seriesRollupStatusList: isRaw ? [] : seriesRollupStatusList,
        actionState: {
            active: activeHeaderActions,
            disabled: setGlobalRangeRequest
                ? []
                : [PanelActionKey.SET_GLOBAL_RANGE],
        },
        canExportCsv: loadStatus.chart === 'ready',
        isOverlapSelected,
    };
    function handlePanelAction(actionKey: PanelActionKey): void {
        const actions: Record<PanelActionKey, () => void> = {
            [PanelActionKey.TOGGLE_RAW]: () => {
                const nextIsRaw = !panelInfo.mode.isRaw;
                onApplyPanelInfo({
                    ...panelInfo,
                    mode: {
                        ...panelInfo.mode,
                        isRaw: nextIsRaw,
                        isOrderBy: nextIsRaw ? false : panelInfo.mode.isOrderBy,
                    },
                });
            },
            [PanelActionKey.TOGGLE_HIGHLIGHT]: () =>
                toggleOverlay(PanelOverlayMode.HIGHLIGHT),
            [PanelActionKey.TOGGLE_ANNOTATION]: () =>
                toggleOverlay(PanelOverlayMode.ANNOTATION),
            [PanelActionKey.TOGGLE_DRAG_SELECT]: () =>
                toggleOverlay(PanelOverlayMode.DRAG_SELECT),
            [PanelActionKey.SET_GLOBAL_RANGE]: () => {
                if (!setGlobalRangeRequest) {
                    throw new Error(
                        'Cannot set the global range before the panel range is ready.',
                    );
                }
                onSetGlobalRange(
                    setGlobalRangeRequest.axisKind,
                    setGlobalRangeRequest.range,
                );
            },
            [PanelActionKey.REFRESH_DATA]: onRefreshData,
            [PanelActionKey.REFRESH_RANGE]: onRefreshRange,
            [PanelActionKey.EXPAND_FULL_RANGE]: onExpandFullRange,
            [PanelActionKey.TOGGLE_EDIT]: toggleEditor,
            [PanelActionKey.OPEN_EXPORT_CSV]: () =>
                openPopup({ mode: PanelPopupMode.EXPORT_CSV }),
            [PanelActionKey.OPEN_DELETE_CONFIRM]: () =>
                openPopup({ mode: PanelPopupMode.DELETE_CONFIRM }),
        };

        actions[actionKey]();
    }

    const [currentRangeModalTarget, setCurrentRangeModalTarget] = useState<
        CurrentRangeTarget | undefined
    >(undefined);
    const retainedMainRangeInputRef = useRef<RetainedMainRangeInput>();

    useEffect(() => {
        const sRetainedInput = retainedMainRangeInputRef.current;
        if (
            renderMainRange !== undefined &&
                sRetainedInput !== undefined &&
                !isSameRange(
                    sRetainedInput.concreteRange,
                    renderMainRange,
                )
        ) {
            retainedMainRangeInputRef.current = undefined;
        }
    }, [renderMainRange]);

    const currentRangeModal =
        currentRangeModalTarget !== undefined &&
        rangeState !== undefined
            ? currentRangeModalTarget === 'navigator'
                ? renderNavigatorRange
                : renderMainRange
            : undefined;
    const retainedMainRangeInput = retainedMainRangeInputRef.current;
    const currentRangeModalInput =
        currentRangeModalTarget === 'navigator'
            ? rangeState !== undefined &&
                !isRangeExpressionEmpty(rangeState.navigatorRangeInput)
                ? rangeState.navigatorRangeInput
                : undefined
            : currentRangeModal !== undefined &&
                retainedMainRangeInput !== undefined &&
                isSameRange(
                    retainedMainRangeInput.concreteRange,
                    currentRangeModal,
                )
              ? retainedMainRangeInput.rangeInput
            : undefined;
    function openCurrentRangeModal(target: CurrentRangeTarget): void {
        if (rangeState) setCurrentRangeModalTarget(target);
    }

    function applyCurrentRange(
        range: AxisRange,
        rangeInput: RangeExpressionInput,
    ): void {
        if (currentRangeModalTarget === undefined) return;

        if (currentRangeModalTarget === 'main') {
            retainedMainRangeInputRef.current = {
                rangeInput: { ...rangeInput },
                concreteRange: { ...range },
            };
            onMainRangeChange(range);
            return;
        }

        onNavigatorRangeChange(range, rangeInput);
    }

    function handleSelection(selectionRange: AxisRange): void {
        if (overlayMode === PanelOverlayMode.HIGHLIGHT) {
            openCreateHighlightEditorFromBrush(
                selectionRange.start,
                selectionRange.end,
            );
        } else if (overlayMode === PanelOverlayMode.DRAG_SELECT) {
            openSelectionSummaryFromBrush(selectionRange);
        }
    }

    function openSelectionSummaryFromBrush(selectionRange: AxisRange): void {
        const sSelection = buildSelectionSummaryPayload(
            selectionRange,
            mainChartData,
            panelInfo.query.tagSet,
        );

        if (!sSelection) {
            Toast.error('There is no data in the selected area.', undefined);
            return;
        }

        const sChartRect = requireChartAreaRect('place selection popover');
        openSelection(
            {
                selection: sSelection,
                popoverPosition: { x: sChartRect.left - 90, y: sChartRect.top - 35 },
            },
            PanelOverlayMode.DRAG_SELECT,
        );
    }

    const chartMarkupHandlers = {
        onOpenCreateAnnotation: openCreateAnnotationEditor,
        onActivateHighlightEditor: openEditHighlightEditor,
        onActivateAnnotationEditor: openEditAnnotationEditor,
    };

    function handlePanelContextMenu(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        openPopup(
            {
                mode: PanelPopupMode.CONTEXT_MENU,
                position: { x: event.clientX, y: event.clientY },
            },
            PanelOverlayMode.NO_OVERLAY,
        );
    }

    function isPointInsideMainChart(clientX: number, clientY: number): boolean {
        return panelChartApiRef.current?.isPointInsideMainGrid(clientX, clientY) === true;
    }

    function handlePanelMouseMove(event: MouseEvent<HTMLDivElement>): void {
        if (!isOverlayModeActive) {
            return;
        }

        const sPanelRect = event.currentTarget.getBoundingClientRect();

        showCursorHint({
            x: event.clientX - sPanelRect.left,
            y: event.clientY - sPanelRect.top,
            isValidTarget: isPointInsideMainChart(event.clientX, event.clientY),
            hoveredMainSeriesName,
            overlayMode,
        });
    }

    function handlePanelClickCapture(event: MouseEvent<HTMLDivElement>): void {
        const sTarget = event.target;
        const sIsInteractiveTarget =
            sTarget instanceof Element &&
            sTarget.closest('button, input, select, textarea, a, [role="button"]') !== null;
        if (overlayMode !== PanelOverlayMode.ANNOTATION || sIsInteractiveTarget) {
            return;
        }

        if (isPointInsideMainChart(event.clientX, event.clientY)) {
            return;
        }

        Toast.error(ANNOTATION_INVALID_TARGET_MESSAGE, undefined);
    }

    function openCreateAnnotationEditor(
        position: ContextMenuPosition,
        seriesIndex: number | undefined,
        timestamp: number,
    ): void {
        if (
            seriesIndex !== undefined &&
            (seriesIndex < 0 || seriesIndex >= panelInfo.query.tagSet.length)
        ) {
            throw new Error(`Invalid annotation series index: ${seriesIndex}.`);
        }

        const sSeriesKey =
            seriesIndex !== undefined
                ? panelInfo.query.tagSet[seriesIndex].key
                : undefined;

        openPopup(
            {
                mode: PanelPopupMode.ANNOTATION_EDITOR,
                editorMeta: {
                    position,
                    seriesKey: sSeriesKey,
                    timestamp,
                },
            },
            PanelOverlayMode.NO_OVERLAY,
        );
    }

    function openEditAnnotationEditor(
        position: ContextMenuPosition,
        annotationIndex: number,
    ): void {
        openPopup(
            {
                mode: PanelPopupMode.ANNOTATION_EDITOR,
                editorMeta: {
                    position,
                    seriesKey: panelInfo.annotations[annotationIndex].seriesKey,
                    annotationIndex,
                },
            },
            PanelOverlayMode.NO_OVERLAY,
        );
    }

    function openEditHighlightEditor(
        position: ContextMenuPosition,
        highlightIndex: number,
    ): void {
        openPopup(
            {
                mode: PanelPopupMode.HIGHLIGHT_EDITOR,
                editor: {
                    mode: 'edit',
                    position,
                    highlightIndex,
                },
            },
            PanelOverlayMode.NO_OVERLAY,
        );
    }

    function openCreateHighlightEditorFromBrush(
        startTime: number,
        endTime: number,
    ): void {
        setOverlayMode(PanelOverlayMode.NO_OVERLAY);
        const sTimeRange = createNonEmptyAxisRange(startTime, endTime);
        if (!sTimeRange) return;

        const sChartRect = requireChartAreaRect('create a highlight');

        openPopup({
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
                timeRange: sTimeRange,
                fillColor: DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
                textColor: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
            },
        });
    }

    return (
        <div
            className="panel-form"
            role="region"
            aria-label={`${panelInfo.title} panel`}
            style={{ border: `0.5px solid ${isOverlapSelected ? '#FDB532' : '#454545'}` }}
            onContextMenu={handlePanelContextMenu}
            onMouseMove={handlePanelMouseMove}
            onMouseLeave={clearCursorHint}
            onClickCapture={handlePanelClickCapture}
        >
            {isOverlayModeActive && (
                <PanelOverlayCursorHint hint={overlayCursorHint} />
            )}
            <PanelHeader
                state={panelHeaderState}
                onAction={handlePanelAction}
                onToggleOverlap={onToggleOverlap}
                onRenamePanelTitle={(title) =>
                    onApplyPanelInfo({ ...panelInfo, title })
                }
                onOpenMainRangeModal={() => openCurrentRangeModal('main')}
            />
            {hasMixedXAxisKinds && (
                <div className="panel-x-axis-warning">
                    <strong>Warning:</strong>{' '}
                    {`${MIXED_X_AXIS_KIND_WARNING} Split this panel into separate charts. Overlap is disabled.`}
                </div>
            )}
            <div className="panel-chart-section">
                <PanelChart
                    refs={{
                        chartAreaRef,
                        chartApiRef: panelChartApiRef,
                    }}
                    panelInfo={panelInfo}
                    draftHighlight={
                        popupState.mode === PanelPopupMode.HIGHLIGHT_EDITOR
                            ? popupState.draftHighlight
                            : undefined
                    }
                    overlayMode={overlayMode}
                    data={{
                        chartData: mainChartData,
                        navigatorChartData,
                    }}
                    rangeState={renderRange}
                    isLoading={loadStatus.chart === 'loading'}
                    displayNotice={displayNotice}
                    handlers={{
                        rangeActions,
                        markupHandlers: chartMarkupHandlers,
                        onHoveredMainSeriesChange: setHoveredSeries,
                        onSelection: handleSelection,
                    }}
                />
                <PanelFooter
                    pShowLegend={panelInfo.display.showLegend}
                    pNavigatorRange={renderNavigatorRange}
                    pIsLoading={loadStatus.navigator === 'loading'}
                    pOnRangeButtonPress={onRangeButtonAction}
                    pIsNumericXAxis={isNumericXAxis}
                    pOnOpenNavigatorRangeModal={() =>
                        openCurrentRangeModal('navigator')
                    }
                />
            </div>
            {isEditorMounted && renderRange && (
                <PanelEditor
                    pAnimationState={isEditorClosing ? 'closing' : 'opening'}
                    pOnApplyEditorConfig={applyEditedPanelConfig}
                    pOnClose={closeInteractionEditor}
                    pOnAnimationEnd={finishEditorClose}
                    pPanelInfo={panelInfo}
                    pHasUnsavedBoardChanges={hasUnsavedBoardChanges}
                    pMainRange={renderRange.mainRange}
                    pDataRange={rangeState?.fullRange ?? renderRange.mainRange}
                    pRollupTableList={rollupTableList}
                    pDataSettingMetrics={dataSettingMetrics}
                />
            )}
            {currentRangeModal !== undefined && (
                <RangeModal
                    key={`${currentRangeModalTarget}-${
                        isNumericXAxis ? 'numeric' : 'time'
                    }`}
                    kind={isNumericXAxis ? 'numeric' : 'time'}
                    initialRangeInput={
                        currentRangeModalInput ?? {
                            start: isNumericXAxis
                                ? formatRangeInputValue(
                                      currentRangeModal.start,
                                      true,
                                  )
                                : formatAbsoluteTime(
                                      currentRangeModal.start,
                                  ),
                            end: isNumericXAxis
                                ? formatRangeInputValue(
                                      currentRangeModal.end,
                                      true,
                                  )
                                : formatAbsoluteTime(
                                      currentRangeModal.end,
                                  ),
                        }
                    }
                    fullRange={
                        rangeState?.fullRange ?? currentRangeModal
                    }
                    currentRange={currentRangeModal}
                    onApply={(rangeInput, concreteRange) =>
                        applyCurrentRange(concreteRange, rangeInput)
                    }
                    onClose={() => setCurrentRangeModalTarget(undefined)}
                />
            )}
            {popupState.mode === PanelPopupMode.CONTEXT_MENU && (
                <PanelContextMenu
                    actionState={panelHeaderState.actionState}
                    onAction={handlePanelAction}
                    position={popupState.position}
                    onClose={() => closePopup(PanelPopupMode.CONTEXT_MENU)}
                />
            )}
            {selectionSummary !== undefined && (
                <SelectionSummaryPopover
                    selection={selectionSummary.selection}
                    position={selectionSummary.popoverPosition}
                    isNumericXAxis={isNumericXAxis}
                    isRaw={isRaw}
                    onClose={closeSelection}
                />
            )}
            {popupState.mode === PanelPopupMode.HIGHLIGHT_EDITOR && (
                <EditHighlightModal
                    key={popupState.draftHighlight !== undefined
                        ? `create-${popupState.draftHighlight.timeRange.start}-${popupState.draftHighlight.timeRange.end}`
                        : `edit-${popupState.editor.highlightIndex}`}
                    activeHighlightEditor={popupState.editor}
                    draftHighlight={popupState.draftHighlight}
                    highlights={panelInfo.highlights}
                    onChange={(highlights) =>
                        onApplyPanelInfo({ ...panelInfo, highlights })
                    }
                    onClose={() => closePopup(PanelPopupMode.HIGHLIGHT_EDITOR)}
                    isNumericXAxis={isNumericXAxis}
                />
            )}
            {popupState.mode === PanelPopupMode.ANNOTATION_EDITOR && (
                <EditAnnotationModal
                    key={popupState.editorMeta.annotationIndex ?? 'new'}
                    annotationEditorMeta={popupState.editorMeta}
                    annotations={panelInfo.annotations}
                    annotationSeriesList={panelInfo.query.tagSet}
                    onChange={(annotations) =>
                        onApplyPanelInfo({ ...panelInfo, annotations })
                    }
                    onClose={() => closePopup(PanelPopupMode.ANNOTATION_EDITOR)}
                    isNumericXAxis={isNumericXAxis}
                />
            )}
            {popupState.mode === PanelPopupMode.DELETE_CONFIRM && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={(isOpen) =>
                        !isOpen && closePopup(PanelPopupMode.DELETE_CONFIRM)
                    }
                    pCallback={onDeletePanel}
                    pContents={
                        <div className="body-content">Do you want to delete this panel?</div>
                    }
                />
            )}
            {popupState.mode === PanelPopupMode.EXPORT_CSV &&
                renderMainRange && (
                <SavedToLocalModal
                    pPanelInfo={filterChartDataByRange(
                        mainChartData,
                        renderMainRange,
                    )}
                    pChartRef={panelChartApiRef}
                    pIsDarkMode
                    setIsOpen={(isOpen) =>
                        !isOpen && closePopup(PanelPopupMode.EXPORT_CSV)
                    }
                />
            )}
        </div>
    );
});
