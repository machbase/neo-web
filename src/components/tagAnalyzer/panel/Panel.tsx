import { memo, useEffect, useRef, useState, type MouseEvent } from 'react';
import PanelChart from '../chart/PanelChart';
import { PanelOverlayMode, type PanelChartHandle } from '../chart/chartInteraction';
import { useChartAreaWidthObserver } from '../chart/useChartAreaWidthObserver';
import { Toast } from '@/design-system/components';
import { PanelFooter } from './internal/PanelFooter';
import { PanelHeader } from './internal/PanelHeader';
import { PanelActionKey } from './internal/panelActions';
import {
    PanelRangeDialog,
    usePanelRangeDialog,
} from './internal/PanelRangeDialog';
import { PanelSurfaceLayer } from './internal/PanelSurfaceLayer';
import {
    ANNOTATION_INVALID_TARGET_MESSAGE,
    PanelCursorHint,
} from './internal/PanelCursorHint';
import PanelEditor from './editor/PanelEditor';
import { SelectionSummaryPopover } from '../tools/AnalysisModals';
import { buildSelectionSummaryPayload } from '../tools/analysisModel';
import { type PanelInfo } from './panelModel';
import {
    resolveSetGlobalRangeRequest,
    usePanelRangeRuntime,
    type PanelBroadcastRequests,
} from './panelRuntime';
import {
    getSeriesListAxisKind,
    MIXED_X_AXIS_KIND_WARNING,
    type RollupTableMap,
} from '../seriesModel';
import {
    type AxisKind,
    type AxisRange,
    type RangeState,
    type ResolvedRangeState,
} from '../range/rangeModel';
import {
    usePanelData,
    type PanelDataIssue,
} from './internal/panelData';
import { usePanelInteraction } from './internal/panelInteraction';
import './Panel.scss';

export default memo(function Panel({
    panelInfo,
    rangeState: initialRangeState,
    broadcastRequests,
    isActive,
    hasUnsavedBoardChanges,
    rollupTableList,
    onPanelRangeStateChange,
    onBroadcastError,
    onApplyPanelInfo,
    onSetGlobalRange,
    onDeletePanel,
    onToggleOverlap,
}: PanelProps) {
    const isRaw = panelInfo.mode.isRaw;
    const isOverlapSelected = panelInfo.isOverlapSelected;
    const chartAreaRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const panelChartApiRef = useRef<PanelChartHandle | null>(null);
    const hoveredMainSeriesNameRef = useRef<string | undefined>();
    const [isEditorOpen, setEditorOpen] = useState(false);

    const rangeRuntime = usePanelRangeRuntime({
        ...broadcastRequests,
        panelInfo,
        rangeState: initialRangeState,
        isActive,
        onRangeStateChange: (nextRangeState) =>
            onPanelRangeStateChange(panelInfo.key, nextRangeState),
        onBroadcastError,
    });
    const { rangeState, chartAreaWidth, dataRefreshVersion } = rangeRuntime;
    const {
        setChartAreaWidth: onChartAreaWidthChange,
        applyRangeAction: onRangeButtonAction,
        setMainRange: onMainRangeChange,
        applyRawLimitRange: onRawLimitRange,
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
        selectionSummary,
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
        openSelection,
        closeSelection,
    } = interaction.actions;
    useChartAreaWidthObserver(chartAreaRef, onChartAreaWidthChange);

    const axisKind = getSeriesListAxisKind(panelInfo.query.tagSet);
    const { main, navigator, rawLimitRange, issue } = usePanelData({
        panelInfo,
        isActive,
        rangeState,
        chartAreaWidth,
        rollupTables: rollupTableList,
        dataRefreshVersion,
    });
    useEffect(() => {
        if (rangeState && rawLimitRange) {
            onRawLimitRange(rangeState.range, rawLimitRange);
        }
    }, [onRawLimitRange, rangeState, rawLimitRange]);
    const mainChartData = main.series;
    const renderRange = rawLimitRange ?? rangeState?.range;
    const hasMixedXAxisKinds =
        axisKind === undefined && panelInfo.query.tagSet.length > 0;
    const isNumericXAxis = axisKind === 'numeric';
    const renderMainRange = renderRange?.mainRange;
    const rangeDialog = usePanelRangeDialog({
        rangeState,
        renderRange,
        isNumericXAxis,
        onMainRangeChange,
        onNavigatorRangeChange,
    });
    function applyEditedPanelConfig(editorConfig: PanelInfo): void {
        onApplyPanelInfo(editorConfig);
        onReloadAfterEditorSave(editorConfig);
    }

    function requireChartAreaRect(action: string): DOMRect {
        const sChartRect = chartAreaRef.current?.getBoundingClientRect();
        if (!sChartRect) {
            throw new Error(`Cannot ${action} without a chart area.`);
        }

        return sChartRect;
    }

    const setGlobalRangeRequest = resolveSetGlobalRangeRequest(
        panelInfo,
        main.status === 'ready',
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
    if (isEditorOpen) {
        activeHeaderActions.push(PanelActionKey.TOGGLE_EDIT);
    }
    const panelHeaderState = {
        title: panelInfo.title,
        mainRange: renderMainRange,
        isNumericXAxis,
        intervalInfo: main.interval,
        actionState: {
            active: activeHeaderActions,
            disabled: setGlobalRangeRequest
                ? []
                : [PanelActionKey.SET_GLOBAL_RANGE],
        },
        canExportCsv: main.status === 'ready',
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
            [PanelActionKey.TOGGLE_EDIT]: () =>
                setEditorOpen((open) => !open),
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
        );
    }

    function handlePanelContextMenu(event: MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        showContextMenu({ x: event.clientX, y: event.clientY });
    }

    function handlePanelClickCapture(event: MouseEvent<HTMLDivElement>): void {
        const sTarget = event.target;
        const sIsInteractiveTarget =
            sTarget instanceof Element &&
            sTarget.closest('button, input, select, textarea, a, [role="button"]') !== null;
        if (overlayMode !== PanelOverlayMode.ANNOTATION || sIsInteractiveTarget) {
            return;
        }

        if (panelChartApiRef.current?.isPointInsideMainGrid(event.clientX, event.clientY) === true) {
            return;
        }

        Toast.error(ANNOTATION_INVALID_TARGET_MESSAGE, undefined);
    }

    return (
        <div
            ref={panelRef}
            data-testid={`panel-${encodeURIComponent(panelInfo.key)}`}
            className="panel-form"
            role="region"
            aria-label={`${panelInfo.title} panel`}
            style={{ border: `0.5px solid ${isOverlapSelected ? '#FDB532' : '#454545'}` }}
            onContextMenu={handlePanelContextMenu}
            onMouseLeave={() => {
                hoveredMainSeriesNameRef.current = undefined;
            }}
            onClickCapture={handlePanelClickCapture}
        >
            <PanelCursorHint
                panelRef={panelRef}
                panelChartApiRef={panelChartApiRef}
                overlayMode={overlayMode}
                hoveredMainSeriesNameRef={hoveredMainSeriesNameRef}
            />
            <PanelHeader
                state={panelHeaderState}
                onAction={handlePanelAction}
                onToggleOverlap={() => onToggleOverlap(panelInfo.key)}
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
                        navigatorChartData: navigator.series,
                    }}
                    rangeState={renderRange}
                    isLoading={main.status === 'loading'}
                    displayNotice={getPanelDataIssueMessage(issue)}
                    handlers={{
                        rangeActions: {
                            setMainRange: onMainRangeChange,
                            shiftMainRangeLeft: () => onRangeButtonAction('shift-main-left'),
                            shiftMainRangeRight: () => onRangeButtonAction('shift-main-right'),
                        },
                        markupHandlers: {
                            onOpenCreateAnnotation: beginAnnotationCreate,
                            onActivateHighlightEditor: beginHighlightEdit,
                            onActivateAnnotationEditor: beginAnnotationEdit,
                        },
                        onHoveredMainSeriesChange: (seriesName) => {
                            hoveredMainSeriesNameRef.current = seriesName;
                        },
                        onSelection: handleSelection,
                    }}
                />
                <PanelFooter
                    pShowLegend={panelInfo.display.showLegend}
                    pNavigatorRange={renderRange?.navigatorRange}
                    pIsLoading={navigator.status === 'loading'}
                    pOnRangeButtonPress={onRangeButtonAction}
                    pIsNumericXAxis={isNumericXAxis}
                    pOnOpenNavigatorRangeModal={rangeDialog.openNavigator}
                />
            </div>
            {isEditorOpen && renderRange && (
                <PanelEditor
                    pOnApplyEditorConfig={applyEditedPanelConfig}
                    pOnClose={() => setEditorOpen(false)}
                    pPanelInfo={panelInfo}
                    pHasUnsavedBoardChanges={hasUnsavedBoardChanges}
                    pMainRange={renderRange.mainRange}
                    pDataRange={rangeState?.fullRange ?? renderRange.mainRange}
                    pRollupTableList={rollupTableList}
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
                onDeletePanel={() => onDeletePanel(panelInfo.key)}
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

// -------------------- Local --------------------

type PanelProps = {
    panelInfo: PanelInfo;
    rangeState: ResolvedRangeState | undefined;
    broadcastRequests: PanelBroadcastRequests;
    isActive: boolean;
    hasUnsavedBoardChanges: boolean;
    rollupTableList: RollupTableMap;
    onPanelRangeStateChange: (
        panelKey: string,
        rangeState: ResolvedRangeState,
    ) => void;
    onBroadcastError: (broadcastKey: string, message: string) => void;
    onApplyPanelInfo: (panelInfo: PanelInfo) => void;
    onSetGlobalRange: (axisKind: AxisKind, globalRange: RangeState) => void;
    onDeletePanel: (panelKey: string) => void;
    onToggleOverlap: (panelKey: string) => void;
};

function getPanelDataIssueMessage(
    issue: PanelDataIssue | undefined,
): string | undefined {
    if (!issue) return undefined;
    if (issue.kind === 'error') return issue.message;
    return issue.kind === 'noData' ? 'No Data' : 'Some series unavailable';
}
