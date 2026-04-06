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
    shouldReloadNavigatorData,
    resolveInitialPanelRange,
    resolveResetTimeRange,
} from './PanelRuntimeUtil';
import {
    loadNavigatorChartState,
    loadPanelChartState,
} from './PanelFetchUtil';
import type { TagAnalyzerBoardContext, TagAnalyzerBoardPanelActions, TagAnalyzerBoardPanelState } from '../TagAnalyzerType';
import type { PanelNavigateState, PanelState } from './TagAnalyzerPanelTypes';
import { EMPTY_TAG_ANALYZER_TIME_RANGE, createTagAnalyzerTimeRange } from './PanelModelUtil';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerPanelInfo,
    TagAnalyzerTimeRange,
} from './TagAnalyzerPanelModelTypes';

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
    const chartRef = useRef<any>();
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

    // Derived
    const boardRange = { range_bgn: pBoardContext.range_bgn, range_end: pBoardContext.range_end };
    const getChart = () => chartRef.current?.chart;
    const updateNav = (patch: Partial<PanelNavigateState>) => setNavState((p) => ({ ...p, ...patch }));

    // --- Highcharts imperative helpers ---

    const setExtremes = (panel: TagAnalyzerTimeRange, navigator?: TagAnalyzerTimeRange) => {
        getChart()?.xAxis[0].setExtremes(panel.startTime, panel.endTime);
        if (navigator) getChart()?.navigator.xAxis.setExtremes(navigator.startTime, navigator.endTime);
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
        const result = await loadPanelChartState({
            panelInfo: pPanelInfo,
            boardRange,
            chartWidth: areaChartRef.current?.clientWidth,
            isRaw: raw ?? panelState.isRaw,
            timeRange,
            rollupTableList,
        });
        updateNav(buildNavPatchFromLoad(result));
        if (result.overflowRange) {
            skipNextFetchRef.current = true;
            getChart()?.xAxis[0].setExtremes(result.overflowRange.startTime, result.overflowRange.endTime);
        }
    };

    // --- Lifecycle ---

    const initialize = async () => {
        if (!panelFormRef.current?.clientWidth) return;

        const resolved = await resolveInitialPanelRange(makeResetParams());
        const keeper = panelTime.use_time_keeper === 'Y' ? resolveTimeKeeperRanges(panelTime.time_keeper) : undefined;
        const range = keeper?.panelRange ?? resolved;
        const nRange = keeper?.navigatorRange ?? range;

        await refreshPanelData(range);
        updateNav({ panelRange: range });
        await refreshNavigatorData(nRange);
        updateNav({ navigatorRange: nRange });
    };

    const reset = async () => {
        if (pBoardContext.id !== selectedTab || !getChart()) return;
        const range = await resolveResetTimeRange(makeResetParams());
        setExtremes(range, range);
    };

    // --- Chart event handlers ---

    const onPanelRangeChange = async (event: any) => {
        if (!event.min) return;

        const next = createTagAnalyzerTimeRange(event.min, event.max);

        const expanded = getExpandedNavigatorRange(event, navState.navigatorRange);
        if (expanded) getChart()?.navigator.xAxis.setExtremes(expanded.startTime, expanded.endTime);

        if (skipNextFetchRef.current) {
            skipNextFetchRef.current = false;
        } else {
            await refreshPanelData(next);
        }
        updateNav({ panelRange: next });

        if (panelTime.use_time_keeper === 'Y' && getChart()) {
            pChartBoardActions.onPersistPanelState(
                meta.index_key,
                createPanelTimeKeeperPayload(next, navState.navigatorRange),
                panelState.isRaw,
            );
        }
        pOnUpdateOverlapSelection(next.startTime, next.endTime, panelState.isRaw);
    };

    const onNavigatorRangeChange = (event: any) => {
        const next = getNavigatorRangeFromEvent(event);
        updateNav({ navigatorRange: next });
        if (shouldReloadNavigatorData(next, navState.navigatorRange)) {
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

        if (navState.panelRange.startTime && getChart()) {
            const ext = getChart().navigator.xAxis.getExtremes();
            pChartBoardActions.onPersistPanelState(
                meta.index_key,
                createPanelTimeKeeperPayload(navState.panelRange, createTagAnalyzerTimeRange(ext.min, ext.max)),
                nextRaw,
            );
        }
        void refreshPanelData(navState.panelRange, nextRaw);
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

    useEffect(() => {
        if (!chartRef.current || !pChartBoardState.globalTimeRange) return;
        updateNav({ rangeOption: pChartBoardState.globalTimeRange.interval ?? null });
        setExtremes(pChartBoardState.globalTimeRange.data, pChartBoardState.globalTimeRange.navigator);
    }, [pChartBoardState.globalTimeRange]);

    useEffect(() => {
        if (chartRef.current) void refreshPanelData(navState.panelRange);
    }, [pChartBoardState.refreshCount]);

    useEffect(() => {
        if (pBoardContext.id === selectedTab && shouldRefreshAfterEdit) {
            void initialize();
            setShouldRefreshAfterEdit(false);
        }
    }, [pPanelInfo]);

    useEffect(() => {
        if (chartRef.current) void reset();
    }, [pChartBoardState.bgnEndTimeRange]);

    useEffect(() => {
        if (selectedTab === pBoardContext.id && areaChartRef.current && !areaChartRef.current?.dataset?.processed) {
            void initialize();
        }
    }, [selectedTab]);

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
                pChartState={{ axes: panelAxes, display: panelDisplay, useNormalize: (pPanelInfo as any).use_normalize }}
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

function buildNavPatchFromLoad(result: Awaited<ReturnType<typeof loadPanelChartState>>): Partial<PanelNavigateState> {
    return {
        chartData: result.chartData.datasets,
        rangeOption: result.rangeOption,
        ...(result.overflowRange
            ? { panelRange: result.overflowRange, preOverflowTimeRange: result.overflowRange }
            : { preOverflowTimeRange: EMPTY_TAG_ANALYZER_TIME_RANGE }),
    };
}

export default PanelBoardChart;
