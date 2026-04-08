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
    resolveGlobalTimeTargetRange,
    resolveTimeKeeperRanges,
    resolveInitialPanelRange,
    resolveResetTimeRange,
} from './PanelRuntimeUtils';
import type { TagAnalyzerBoardContext, TagAnalyzerBoardPanelActions, TagAnalyzerBoardPanelState } from '../TagAnalyzerTypes';
import type { PanelChartHandle, PanelState } from './TagAnalyzerPanelTypes';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerPanelInfo,
} from './TagAnalyzerPanelModelTypes';
import { usePanelChartRuntimeController } from './usePanelChartRuntimeController';

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
    const areaChartRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<PanelChartHandle | null>(null);
    const panelFormRef = useRef<HTMLDivElement | null>(null);

    // Global state
    const selectedTab = useRecoilValue(gSelectedTab);
    const rollupTableList = useRecoilValue(gRollupTableList);

    // Local state
    const [panelState, setPanelState] = useState<PanelState>({ ...INITIAL_PANEL_STATE, isRaw: panelData.raw_keeper ?? false });
    const [shouldRefreshAfterEdit, setShouldRefreshAfterEdit] = useState(false);
    const [canOpenFft, setCanOpenFft] = useState(false);

    // Derived
    const boardRange = { range_bgn: pBoardContext.range_bgn, range_end: pBoardContext.range_end };

    const makeResetParams = () => ({
        boardRange,
        panelData,
        panelTime,
        bgnEndTimeRange: pChartBoardState.bgnEndTimeRange,
        isEdit: false as const,
    });

    const {
        navigateState: navState,
        navigateStateRef,
        refreshNavigatorData,
        refreshPanelData,
        handlePanelRangeChange: onPanelRangeChange,
        handleNavigatorRangeChange: onNavigatorRangeChange,
        setExtremes,
        applyLoadedRanges,
        updateNavigateState,
    } = usePanelChartRuntimeController({
        panelInfo: pPanelInfo,
        boardRange,
        areaChartRef,
        chartRef,
        rollupTableList,
        isRaw: panelState.isRaw,
        onPanelRangeApplied: (aPanelRange, aContext) => {
            if (panelTime.use_time_keeper === 'Y') {
                pChartBoardActions.onPersistPanelState(
                    meta.index_key,
                    createPanelTimeKeeperPayload(aPanelRange, aContext.navigatorRange),
                    aContext.isRaw,
                );
            }
            pOnUpdateOverlapSelection(aPanelRange.startTime, aPanelRange.endTime, aContext.isRaw);
        },
    });

    // --- Lifecycle ---

    const initialize = async () => {
        if (!panelFormRef.current?.clientWidth) return;

        const resolved = await resolveInitialPanelRange(makeResetParams());
        const keeper = panelTime.use_time_keeper === 'Y' ? resolveTimeKeeperRanges(panelTime.time_keeper) : undefined;
        const range = keeper?.panelRange ?? resolved;
        const nRange = keeper?.navigatorRange ?? range;

        await applyLoadedRanges(range, nRange);
    };

    const reset = async () => {
        if (pBoardContext.id !== selectedTab) return;
        const range = await resolveResetTimeRange(makeResetParams());
        setExtremes(range, range);
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

        if (navState.panelRange.startTime) {
            pChartBoardActions.onPersistPanelState(
                meta.index_key,
                createPanelTimeKeeperPayload(navState.panelRange, navState.navigatorRange),
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

    // This effect applies board-driven global time changes onto the chart controller.
    useEffect(() => {
        if (!chartRef.current || !pChartBoardState.globalTimeRange) return;
        updateNavigateState({ rangeOption: pChartBoardState.globalTimeRange.interval ?? null });
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
        if (selectedTab === pBoardContext.id && areaChartRef.current && !navigateStateRef.current.navigatorData) {
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
                pVisibleRange={navState.panelRange}
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

export default PanelBoardChart;
