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
import PanelFooter from './PanelFooter';
import PanelHeader, {
    PanelActionKey,
    PanelContextMenu,
} from './PanelHeader';
import PanelEditor from '../setup/editor/PanelEditor';
import {
    buildSelectionSummaryPayload,
    SelectionSummaryPopover,
} from '../tools/AnalysisModals';
import { EditAnnotationModal, EditHighlightModal } from '../tools/MarkupModals';
import { RangeModal } from '../range/RangeModal';
import { formatRangeInputValue } from '../format/inputFormat';
import { formatAbsoluteTime } from '../persistence/serializeRange';
import {
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_LABEL,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    type PanelInfo,
} from './panelModel';
import type { usePanelRangeRuntime } from './usePanelRangeRuntime';
import { MIXED_X_AXIS_KIND_WARNING, type RollupTableMap } from '../seriesModel';
import {
    isRangeExpressionEmpty,
    type AxisRange,
    type RangeExpressionInput,
    type RangeState,
    type ResolvedRangeState,
} from '../range/rangeModel';
import { isSameRange } from '../range/rangeArithmetic';
import { createNonEmptyAxisRange } from '../range/rangeBuilder';
import { filterChartDataByRange } from '../chart/chartData';
import { usePanelDataLoading } from './panelData';
import {
    PanelOverlayMode,
    PanelPopupMode,
    usePanelInteraction,
} from './panelInteraction';
import './Panel.scss';

type PanelProps = {
    panelInfo: PanelInfo;
    rangeState: ResolvedRangeState | undefined;
    runtime: Pick<
        ReturnType<typeof usePanelRangeRuntime>,
        'chartAreaWidth' | 'dataRefreshVersion'
    > & {
        isActive: boolean;
        hasUnsavedBoardChanges: boolean;
        rollupTableList: RollupTableMap;
    };
    actions: ReturnType<typeof usePanelRangeRuntime>['actions'] & {
        onApplyPanelInfo: (panelInfo: PanelInfo) => void;
        onSetGlobalTimeRange: (globalTimeRange: RangeState) => void;
        onDeletePanel: () => void;
        onToggleOverlap: () => void;
    };
};

type RetainedMainRangeInput = {
    rangeInput: RangeExpressionInput;
    concreteRange: AxisRange;
};

type CurrentRangeTarget = 'main' | 'navigator';

export default memo(function Panel({
    panelInfo,
    rangeState,
    runtime: {
        isActive,
        hasUnsavedBoardChanges,
        chartAreaWidth,
        dataRefreshVersion,
        rollupTableList,
    },
    actions: {
        onRangeButtonAction,
        onMainRangeChange,
        onNavigatorRangeChange,
        onRangeReplace,
        onChartAreaWidthChange,
        onRefreshData,
        onRefreshRange,
        onExpandFullRange,
        onReloadAfterEditorSave,
        onApplyPanelInfo,
        onSetGlobalTimeRange,
        onDeletePanel,
        onToggleOverlap,
    },
}: PanelProps) {
    const isRaw = panelInfo.mode.isRaw;
    const isOverlapSelected = panelInfo.isOverlapSelected;
    const chartAreaRef = useRef<HTMLDivElement | null>(null);
    const panelChartApiRef = useRef<PanelChartHandle | null>(null);

    const {
        overlayMode,
        popupState,
        editorStatus,
        selectionSummary,
        overlayCursorHint,
        hoveredMainSeriesName,
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
    } = usePanelInteraction();
    const isEditorMounted = editorStatus !== 'closed';
    const isEditorClosing = editorStatus === 'closing';

    useChartAreaWidthObserver(chartAreaRef, onChartAreaWidthChange);

    const {
        mainChartData,
        navigatorChartData,
        renderRange,
        resolvedIntervalOption,
        resolvedNumericInterval,
        seriesRollupStatusList,
        dataSettingMetrics,
        hasMixedXAxisKinds,
        isNumericXAxis,
        displayNotice,
        loadStatus,
    } = usePanelDataLoading({
        panelInfo,
        isActive,
        rangeState,
        chartAreaWidth,
        rollupTableList,
        dataRefreshVersion,
        onRawMainRangeLimited: onMainRangeChange,
    });
    const renderMainRange = renderRange?.mainRange;
    const renderNavigatorRange = renderRange?.navigatorRange;
    function dragNavigatorSelection(range: AxisRange): void {
        if (!renderNavigatorRange) return;

        onRangeReplace({
            mainRange: range,
            navigatorRange: renderNavigatorRange,
        });
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
        onReloadAfterEditorSave(sNextPanelInfo, sPreserveCurrentVisibleRange);
    }

    function requireChartAreaRect(action: string): DOMRect {
        const sChartRect = chartAreaRef.current?.getBoundingClientRect();
        if (!sChartRect) {
            throw new Error(`Cannot ${action} without a chart area.`);
        }

        return sChartRect;
    }

    const isOverlayModeActive = overlayMode !== PanelOverlayMode.NO_OVERLAY;
    const canSetGlobalTime =
        loadStatus.chart === 'ready' &&
        renderRange !== undefined &&
        !isNumericXAxis &&
        !isRaw;
    const panelHeaderRuntimeState = {
        title: panelInfo.title,
        mainRange: renderMainRange,
        resolvedIntervalOption,
        resolvedNumericInterval,
        seriesRollupStatusList,
        canSaveLocal: loadStatus.chart === 'ready',
        canSetGlobalTime,
        isNumericXAxis,
        overlayMode,
        isEditing: isEditorMounted && !isEditorClosing,
        isRaw,
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
            [PanelActionKey.SET_GLOBAL_TIME]: () => {
                if (!canSetGlobalTime || !renderRange) {
                    throw new Error(
                        'Cannot set global time before the time range is ready.',
                    );
                }
                onSetGlobalTimeRange(renderRange);
            },
            [PanelActionKey.REFRESH_DATA]: onRefreshData,
            [PanelActionKey.REFRESH_TIME]: onRefreshRange,
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
                runtimeState={panelHeaderRuntimeState}
                onAction={handlePanelAction}
                onToggleOverlap={onToggleOverlap}
                onRenamePanelTitle={(title) =>
                    onApplyPanelInfo({ ...panelInfo, title })
                }
                onOpenTimeRangeModal={() => openCurrentRangeModal('main')}
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
                    runtimeState={panelHeaderRuntimeState}
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
