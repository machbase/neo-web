import { memo, useRef, type MouseEvent } from 'react';
import PanelChart, {
    ANNOTATION_INVALID_TARGET_MESSAGE,
    PanelOverlayCursorHint,
    type PanelChartHandle,
    useChartAreaWidthObserver,
} from '../chart/PanelChart';
import { Toast } from '@/design-system/components';
import { PanelFooter } from './internal/PanelFooter';
import { PanelHeader } from './internal/PanelHeader';
import { PanelActionKey } from './internal/panelActions';
import {
    PanelRangeDialog,
    usePanelRangeDialog,
} from './internal/PanelRangeDialog';
import { PanelSurfaceLayer } from './internal/PanelSurfaceLayer';
import PanelEditor from './editor/PanelEditor';
import { resolvePanelEditorApply } from './editor/panelEditorPolicy';
import { SelectionSummaryPopover } from '../tools/AnalysisModals';
import { buildSelectionSummaryPayload } from '../tools/analysisModel';
import { type PanelInfo } from './panelModel';
import {
    resolveSetGlobalRangeRequest,
    usePanelRangeRuntime,
    type PanelBroadcastRequests,
} from './panelRuntime';
import { MIXED_X_AXIS_KIND_WARNING, type RollupTableMap } from '../seriesModel';
import {
    type AxisKind,
    type AxisRange,
    type RangeState,
    type ResolvedRangeState,
} from '../range/rangeModel';
import { type ChartSeriesData } from '../chart/chartData';
import {
    usePanelData,
    type PanelDataLoadMetrics,
} from './internal/panelData';
import { usePanelInteraction } from './internal/panelInteraction';
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

    const interaction = usePanelInteraction(panelInfo.query.tagSet);
    const {
        overlayMode,
        activeSurface,
        draftHighlight,
        editorStatus,
        selectionSummary,
        overlayCursorHint,
        hoveredMainSeriesName,
    } = interaction.state;
    const {
        toggleOverlay,
        showContextMenu,
        beginHighlightCreate,
        beginHighlightEdit,
        beginAnnotationCreate,
        beginAnnotationEdit,
        requestDelete,
        requestExport,
        dismissSurface,
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
    const rangeDialog = usePanelRangeDialog({
        rangeState,
        renderRange,
        isNumericXAxis,
        onMainRangeChange,
        onNavigatorRangeChange,
    });
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
        const { nextPanelInfo, reloadPolicy } = resolvePanelEditorApply(
            panelInfo,
            editorConfig,
        );
        onApplyPanelInfo(nextPanelInfo);
        onReloadAfterEditorSave(nextPanelInfo, reloadPolicy);
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
        mainRange: renderMainRange,
        isNumericXAxis,
        isRaw,
        resolution,
        seriesRollupStatusList,
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
            [PanelActionKey.OPEN_EXPORT_CSV]: requestExport,
            [PanelActionKey.OPEN_DELETE_CONFIRM]: requestDelete,
        };

        actions[actionKey]();
    }

    function handleSelection(selectionRange: AxisRange): void {
        if (overlayMode === PanelOverlayMode.HIGHLIGHT) {
            const sChartRect = requireChartAreaRect('create a highlight');
            beginHighlightCreate(
                selectionRange,
                {
                    x: sChartRect.left + sChartRect.width / 2,
                    y: sChartRect.top + sChartRect.height / 2,
                },
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
        onOpenCreateAnnotation: beginAnnotationCreate,
        onActivateHighlightEditor: beginHighlightEdit,
        onActivateAnnotationEditor: beginAnnotationEdit,
    };

    function handlePanelContextMenu(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        showContextMenu({ x: event.clientX, y: event.clientY });
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

    return (
        <div
            data-testid="tag-analyzer-panel"
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
                onOpenMainRangeModal={rangeDialog.openMain}
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
                    draftHighlight={draftHighlight}
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
                    pOnOpenNavigatorRangeModal={rangeDialog.openNavigator}
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
            <PanelRangeDialog {...rangeDialog} />
            <PanelSurfaceLayer
                surface={activeSurface}
                panelInfo={panelInfo}
                actionState={panelHeaderState.actionState}
                isNumericXAxis={isNumericXAxis}
                mainChartData={mainChartData}
                renderMainRange={renderMainRange}
                panelChartApiRef={panelChartApiRef}
                onPanelAction={handlePanelAction}
                onApplyPanelInfo={onApplyPanelInfo}
                onDeletePanel={onDeletePanel}
                onDismiss={dismissSurface}
            />
            {selectionSummary !== undefined && (
                <SelectionSummaryPopover
                    selection={selectionSummary.selection}
                    position={selectionSummary.popoverPosition}
                    isNumericXAxis={isNumericXAxis}
                    isRaw={isRaw}
                    onClose={closeSelection}
                />
            )}
        </div>
    );
});
