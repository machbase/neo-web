import PanelFooter from './PanelFooter';
import PanelHeader from './PanelHeader';
import PanelBody from './PanelBody';
import './Panel.scss';
import { useEffect, useRef, useState } from 'react';
import { changeUtcToText } from '@/utils/helpers/date';
import { useRecoilValue } from 'recoil';
import { gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import {
    applyFocusedRange,
    applyShiftedNavigatorRangeLeft,
    applyShiftedNavigatorRangeRight,
    applyShiftedPanelRangeLeft,
    applyShiftedPanelRangeRight,
    applyZoomIn,
    applyZoomOut,
    buildPanelPresentationState,
    createPanelTimeKeeperPayload,
    getExpandedNavigatorRange,
    getNavigatorRangeFromEvent,
    resolveGlobalTimeTargetRange,
    resolveTimeKeeperRanges,
    resolveAppliedPanelRange,
    shouldReloadNavigatorData,
    resolveInitialPanelRange,
    resolveResetTimeRange,
} from './PanelRuntimeUtils';
import {
    loadNavigatorChartState,
    loadPanelChartState,
} from './PanelFetchUtils';
import type { TagAnalyzerBoardContext, TagAnalyzerBoardPanelActions, TagAnalyzerBoardPanelState } from '../TagAnalyzerTypes';
import type { PanelChartHandle, PanelNavigateState, PanelRangeChangeEvent, PanelState } from './TagAnalyzerPanelTypes';
import { EMPTY_TAG_ANALYZER_TIME_RANGE, createTagAnalyzerTimeRange } from './PanelModelUtils';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerPanelInfo,
    TagAnalyzerTimeRange,
} from './TagAnalyzerPanelModelTypes';

// Future Refactor Target: this board controller still overlaps heavily with the preview controller.
// Keep the duplicated orchestration visible until we can safely extract a shared controller path.
// --- Component ---

const PanelBoardChart = ({
    pPanelInfo,
    pBoardContext,
    pChartBoardState,
    pChartBoardActions,
    pIsSelectedForOverlap,
    pIsOverlapAnchor,
    pOnToggleOverlapSelection,
    pOnUpdateOverlapSelection,
    pOnDeletePanel,
}: {
    pPanelInfo: TagAnalyzerPanelInfo;
    pBoardContext: TagAnalyzerBoardContext;
    pChartBoardState: {
        refreshCount: TagAnalyzerBoardPanelState['refreshCount'];
        bgnEndTimeRange: Partial<TagAnalyzerBgnEndTimeRange> | undefined;
        globalTimeRange: TagAnalyzerGlobalTimeRangeState | null;
    };
    pChartBoardActions: {
        onPersistPanelState: TagAnalyzerBoardPanelActions['onPersistPanelState'];
        onSetGlobalTimeRange: TagAnalyzerBoardPanelActions['onSetGlobalTimeRange'];
        onOpenEditRequest: TagAnalyzerBoardPanelActions['onOpenEditRequest'];
    };
    pIsSelectedForOverlap: boolean;
    pIsOverlapAnchor: boolean;
    pOnToggleOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnUpdateOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnDeletePanel: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
}) => {
    const { meta, data: panelData, time: panelTime, axes: panelAxes, display: panelDisplay } = pPanelInfo;

    // Refs
    const areaChartRef = useRef<any>();
    const chartRef = useRef<PanelChartHandle | null>(null);
    const panelFormRef = useRef<any>(null);
    const skipNextFetchRef = useRef(false);

    // Global state
    const selectedTab = useRecoilValue(gSelectedTab);
    const rollupTableList = useRecoilValue(gRollupTableList);

    // Local state
    const [panelState, setPanelState] = useState<PanelState>({ ...INITIAL_PANEL_STATE, isRaw: panelData.raw_keeper ?? false });
    const [navState, setNavState] = useState<PanelNavigateState>(INITIAL_NAV_STATE);
    const [shouldRefreshAfterEdit, setShouldRefreshAfterEdit] = useState(false);
    const [canOpenFft, setCanOpenFft] = useState(false);
    const navStateRef = useRef<PanelNavigateState>(INITIAL_NAV_STATE);

    // Derived
    const boardRange = { range_bgn: pBoardContext.range_bgn, range_end: pBoardContext.range_end };
    const getChart = () => chartRef.current;
    const updateNav = (patch: Partial<PanelNavigateState>) =>
        setNavState((p) => {
            const next = { ...p, ...patch };
            navStateRef.current = next;
            return next;
        });

    // --- ECharts imperative helpers ---

    const setExtremes = (panel: TagAnalyzerTimeRange, navigator?: TagAnalyzerTimeRange) => {
        if (navigator) {
            onNavigatorRangeChange({ min: navigator.startTime, max: navigator.endTime });
        }
        getChart()?.setPanelRange(panel);
    };

    const makeResetParams = () => ({
        boardRange,
        panelData,
        panelTime,
        bgnEndTimeRange: pChartBoardState.bgnEndTimeRange,
        isEdit: false as const,
    });

    // --- Data fetching ---

    const refreshNavigatorData = async (timeRange?: TagAnalyzerTimeRange, raw?: boolean) => {
        updateNav({
            navigatorData: await loadNavigatorChartState({
                panelInfo: pPanelInfo,
                boardRange,
                chartWidth: areaChartRef.current?.clientWidth,
                isRaw: raw ?? panelState.isRaw,
                timeRange,
                rollupTableList,
            }),
        });
    };

    const refreshPanelData = async (timeRange?: TagAnalyzerTimeRange, raw?: boolean) => {
        const requestedRange = timeRange ?? navStateRef.current.panelRange;
        const result = await loadPanelChartState({
            panelInfo: pPanelInfo,
            boardRange,
            chartWidth: areaChartRef.current?.clientWidth,
            isRaw: raw ?? panelState.isRaw,
            timeRange,
            rollupTableList,
        });
        // Panel fetches can clamp the requested window when the dataset hits the point limit.
        const appliedRange = resolveAppliedPanelRange(requestedRange, result.overflowRange);
        updateNav(buildNavPatchFromLoad(result, appliedRange));
        if (result.overflowRange) {
            skipNextFetchRef.current = true;
            getChart()?.setPanelRange(result.overflowRange);
        }
        return appliedRange;
    };

    // --- Lifecycle ---

    const initialize = async () => {
        if (!panelFormRef.current?.clientWidth) return;

        const resolved = await resolveInitialPanelRange(makeResetParams());
        const keeper = panelTime.use_time_keeper === 'Y' ? resolveTimeKeeperRanges(panelTime.time_keeper) : undefined;
        const range = keeper?.panelRange ?? resolved;
        const nRange = keeper?.navigatorRange ?? range;

        await refreshPanelData(range);
        await refreshNavigatorData(nRange);
        updateNav({ navigatorRange: nRange });
    };

    const reset = async () => {
        if (pBoardContext.id !== selectedTab || !getChart()) return;
        const range = await resolveResetTimeRange(makeResetParams());
        setExtremes(range, range);
    };

    // --- Chart event handlers ---

    const onPanelRangeChange = async (event: PanelRangeChangeEvent) => {
        if (event.min === undefined || event.max === undefined) return;

        const nextRange = createTagAnalyzerTimeRange(event.min, event.max);

        const currentNavigatorRange = navStateRef.current.navigatorRange;
        const expanded = getExpandedNavigatorRange(event, currentNavigatorRange);
        if (expanded) {
            onNavigatorRangeChange({ min: expanded.startTime, max: expanded.endTime });
        }

        // Overflow correction re-enters through `setPanelRange`, so skip only the duplicate fetch branch.
        if (skipNextFetchRef.current) {
            skipNextFetchRef.current = false;
        } else {
            const appliedRange = await refreshPanelData(nextRange);

            if (panelTime.use_time_keeper === 'Y') {
                pChartBoardActions.onPersistPanelState(
                    meta.index_key,
                    createPanelTimeKeeperPayload(appliedRange, navStateRef.current.navigatorRange),
                    panelState.isRaw,
                );
            }
            pOnUpdateOverlapSelection(appliedRange.startTime, appliedRange.endTime, panelState.isRaw);
            return;
        }

        updateNav({ panelRange: nextRange });

        if (panelTime.use_time_keeper === 'Y') {
            pChartBoardActions.onPersistPanelState(
                meta.index_key,
                createPanelTimeKeeperPayload(nextRange, navStateRef.current.navigatorRange),
                panelState.isRaw,
            );
        }
        pOnUpdateOverlapSelection(nextRange.startTime, nextRange.endTime, panelState.isRaw);
    };

    const onNavigatorRangeChange = (event: PanelRangeChangeEvent) => {
        const currentNavigatorRange = navStateRef.current.navigatorRange;
        const next = getNavigatorRangeFromEvent(event);
        updateNav({ navigatorRange: next });
        if (shouldReloadNavigatorData(next, currentNavigatorRange)) {
            void refreshNavigatorData(next);
        }
    };

    // --- Toggles ---

    const toggleDragSelect = () => {
        const nextIsDragSelectActive = !panelState.isDragSelectActive;
        setPanelState((p) => ({
            ...p,
            isDragSelectActive: nextIsDragSelectActive,
            isFFTModal: nextIsDragSelectActive ? p.isFFTModal : false,
        }));
        if (!nextIsDragSelectActive) {
            setCanOpenFft(false);
        }
    };

    const handleDragSelectStateChange = (aIsDragSelectActive: boolean, aCanOpenFft: boolean) => {
        if (!aIsDragSelectActive) {
            setPanelState((p) => ({ ...p, isDragSelectActive: false }));
        }
        setCanOpenFft(aCanOpenFft);
    };

    const toggleRaw = () => {
        const nextRaw = !panelState.isRaw;
        setPanelState((p) => ({ ...p, isRaw: nextRaw }));

        if (navStateRef.current.panelRange.startTime) {
            pChartBoardActions.onPersistPanelState(
                meta.index_key,
                createPanelTimeKeeperPayload(navStateRef.current.panelRange, navStateRef.current.navigatorRange),
                nextRaw,
            );
        }
        void refreshPanelData(navStateRef.current.panelRange, nextRaw);
        if (panelAxes.use_sampling) void refreshNavigatorData(undefined, nextRaw);
    };

    // --- Composed handler objects ---

    const actionHandlers = {
        onToggleOverlap: () => {
            if (panelData.tag_set.length === 1)
                pOnToggleOverlapSelection(navState.panelRange.startTime, navState.panelRange.endTime, panelState.isRaw);
        },
        onToggleRaw: toggleRaw,
        onToggleDragSelect: toggleDragSelect,
        onOpenFft: () => setPanelState((p) => ({ ...p, isFFTModal: true })),
        onSetGlobalTime: () => {
            if (!navState.rangeOption) return;
            pChartBoardActions.onSetGlobalTimeRange(
                resolveGlobalTimeTargetRange(navState.preOverflowTimeRange, navState.panelRange),
                navState.navigatorRange,
                navState.rangeOption,
            );
        },
        onOpenEdit: () =>
            pChartBoardActions.onOpenEditRequest({ pPanelInfo, pNavigatorRange: navState.navigatorRange, pSetSaveEditedInfo: setShouldRefreshAfterEdit }),
        onDelete: () => pOnDeletePanel(navState.panelRange.startTime, navState.panelRange.endTime, panelState.isRaw),
    };

    const presentationState = buildPanelPresentationState({
        title: meta.chart_title,
        panelRange: navState.panelRange,
        rangeOption: navState.rangeOption,
        isEdit: false,
        isRaw: panelState.isRaw,
        isSelectedForOverlap: pIsSelectedForOverlap,
        isOverlapAnchor: pIsOverlapAnchor,
        canToggleOverlap: panelData.tag_set.length === 1,
        isDragSelectActive: panelState.isDragSelectActive,
        canOpenFft,
        canSaveLocal: Boolean(navState.chartData),
        changeUtcToText,
    });

    // --- Effects ---

    // This effect applies board-driven global time changes onto the chart controller.
    useEffect(() => {
        if (!chartRef.current || !pChartBoardState.globalTimeRange) return;
        updateNav({ rangeOption: pChartBoardState.globalTimeRange.interval ?? null });
        setExtremes(pChartBoardState.globalTimeRange.data, pChartBoardState.globalTimeRange.navigator);
    }, [pChartBoardState.globalTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

    // Refresh count is the board-level signal to reload the current panel dataset.
    useEffect(() => {
        if (chartRef.current) void refreshPanelData(navState.panelRange);
    }, [pChartBoardState.refreshCount]); // eslint-disable-line react-hooks/exhaustive-deps

    // When the edited panel model changes, reinitialize this panel once for the editor-save flow.
    useEffect(() => {
        if (pBoardContext.id === selectedTab && shouldRefreshAfterEdit) {
            void initialize();
            setShouldRefreshAfterEdit(false);
        }
    }, [pPanelInfo]); // eslint-disable-line react-hooks/exhaustive-deps

    // Board begin/end overrides trigger a chart reset through the existing reset path.
    useEffect(() => {
        if (chartRef.current) void reset();
    }, [pChartBoardState.bgnEndTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

    // Initialize lazily when this board tab becomes active and the chart area is ready.
    useEffect(() => {
        if (selectedTab === pBoardContext.id && areaChartRef.current && !navStateRef.current.navigatorData) {
            void initialize();
        }
    }, [selectedTab]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Render ---

    return (
        <div ref={panelFormRef} className="panel-form" style={{ border: `0.5px solid ${pIsSelectedForOverlap ? '#FDB532' : '#454545'}` }}>
            <PanelHeader
                pPresentationState={presentationState}
                pButtonActionHandlers={actionHandlers}
                pRefreshHandlers={{
                    onRefreshData: () => void refreshPanelData(navState.panelRange),
                    onRefreshTime: () => void reset(),
                }}
                pSavedChartInfo={{ chartData: navState.chartData, chartRef: chartRef }}
            />
            <PanelBody
                pChartRefs={{ areaChart: areaChartRef, chartWrap: chartRef }}
                pChartState={{ axes: panelAxes, display: panelDisplay, useNormalize: pPanelInfo.use_normalize }}
                pPanelState={panelState}
                pNavigateState={navState}
                pChartHandlers={{ onSetExtremes: onPanelRangeChange, onSetNavigatorExtremes: onNavigatorRangeChange }}
                pShiftHandlers={{
                    onShiftPanelRangeLeft: () => applyShiftedPanelRangeLeft(setExtremes, navState.panelRange, navState.navigatorRange),
                    onShiftPanelRangeRight: () => applyShiftedPanelRangeRight(setExtremes, navState.panelRange, navState.navigatorRange),
                }}
                pTagSet={panelData.tag_set}
                pSetIsFFTModal={(v) => setPanelState((p) => ({ ...p, isFFTModal: typeof v === 'function' ? v(p.isFFTModal) : v }))}
                pOnDragSelectStateChange={handleDragSelectStateChange}
            />
            <PanelFooter
                pPanelSummary={{ tagCount: panelData.tag_set.length, showLegend: panelDisplay.show_legend }}
                pNavigatorStartTime={navState.navigatorRange.startTime}
                pNavigatorEndTime={navState.navigatorRange.endTime}
                pShiftHandlers={{
                    onShiftNavigatorRangeLeft: () => applyShiftedNavigatorRangeLeft(setExtremes, navState.panelRange, navState.navigatorRange),
                    onShiftNavigatorRangeRight: () => applyShiftedNavigatorRangeRight(setExtremes, navState.panelRange, navState.navigatorRange),
                }}
                pZoomHandlers={{
                    onZoomIn: (zoom) => applyZoomIn(setExtremes, navState.panelRange, zoom),
                    onZoomOut: (zoom) => applyZoomOut(setExtremes, navState.panelRange, navState.navigatorRange, zoom),
                    onFocus: () => applyFocusedRange(setExtremes, navState.panelRange),
                }}
            />
        </div>
    );
};

const INITIAL_PANEL_STATE: PanelState = {
    isRaw: false,
    isFFTModal: false,
    isDragSelectActive: false,
};

const INITIAL_NAV_STATE: PanelNavigateState = {
    chartData: undefined,
    navigatorData: undefined,
    panelRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
    navigatorRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
    rangeOption: null,
    preOverflowTimeRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
};

// --- Pure helpers (no state dependencies) ---

function buildNavPatchFromLoad(
    result: Awaited<ReturnType<typeof loadPanelChartState>>,
    panelRange?: TagAnalyzerTimeRange,
): Partial<PanelNavigateState> {
    return {
        chartData: result.chartData.datasets,
        rangeOption: result.rangeOption,
        ...(panelRange ? { panelRange } : {}),
        ...(result.overflowRange
            ? { panelRange: result.overflowRange, preOverflowTimeRange: result.overflowRange }
            : { preOverflowTimeRange: EMPTY_TAG_ANALYZER_TIME_RANGE }),
    };
}

export default PanelBoardChart;
