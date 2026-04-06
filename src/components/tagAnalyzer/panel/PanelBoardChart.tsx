import PanelFooter from './PanelFooter';
import PanelHeader from './PanelHeader';
import PanelBody from './PanelBody';
import './Panel.scss';
import { useEffect, useRef, useState } from 'react';
import { changeUtcToText } from '@/utils/helpers/date';
import { useRecoilValue } from 'recoil';
import { gRollupTableList, gSelectedTab } from '@/recoil/recoil';
import { isEmpty } from '@/utils';
import { Toast } from '@/design-system/components';
import {
    buildPanelPresentationState,
    createPanelTimeKeeperPayload,
    getFocusedPanelRange,
    getExpandedNavigatorRange,
    getMovedNavigatorRange,
    getMovedPanelRange,
    getNavigatorRangeFromEvent,
    getSelectionMenuPosition,
    normalizeChartWidth,
    resolveGlobalTimeTargetRange,
    resolveTimeKeeperRanges,
    shouldReloadNavigatorData,
    getZoomInPanelRange,
    getZoomOutRange,
    resolveInitialPanelRange,
    resolveNavigatorChartState,
    resolvePanelChartState,
    resolveResetTimeRange,
} from './PanelRuntimeUtil';
import { getDuration, computeSeriesCalcList } from '../TagAnalyzerUtil';
import type { TagAnalyzerBoardContext, TagAnalyzerBoardPanelActions, TagAnalyzerBoardPanelState } from '../TagAnalyzerType';
import type { CoordinateType, PanelNavigateState, PanelState } from './TagAnalyzerPanelTypes';
import { EMPTY_TAG_ANALYZER_TIME_RANGE, createTagAnalyzerTimeRange } from './PanelModelUtil';
import type {
    TagAnalyzerPanelInfo,
    TagAnalyzerTimeRange,
} from './TagAnalyzerPanelModelTypes';

type PanelFetchParams = {
    timeRange?: TagAnalyzerTimeRange;
    raw?: boolean;
};

const createInitialPanelState = (aIsRaw: boolean): PanelState => ({
    isRaw: aIsRaw,
    isFFTModal: false,
    isSelectionActive: false,
    isSelectionMenuOpen: false,
    fftMinTime: 0,
    fftMaxTime: 0,
    minMaxList: [],
    menuPosition: { x: 0, y: 0 },
});

const INITIAL_NAVIGATE_STATE: PanelNavigateState = {
    chartData: undefined,
    navigatorData: undefined,
    panelRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
    navigatorRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
    rangeOption: null,
    preOverflowTimeRange: EMPTY_TAG_ANALYZER_TIME_RANGE,
};

// Owns one TagAnalyzer chart panel from data loading through chart interaction.
// It fetches panel and navigator series, manages range changes, and coordinates header/footer actions.
const PanelChart = ({
    pPanelInfo,
    pBoardContext,
    pPanelBoardState,
    pPanelBoardActions,
    pIsSelectedForOverlap,
    pIsOverlapAnchor,
    pOnToggleOverlapSelection,
    pOnUpdateOverlapSelection,
    pOnDeletePanel,
}: {
    pPanelInfo: TagAnalyzerPanelInfo;
    pBoardContext: TagAnalyzerBoardContext;
    pPanelBoardState: TagAnalyzerBoardPanelState;
    pPanelBoardActions: TagAnalyzerBoardPanelActions;
    pIsSelectedForOverlap: boolean;
    pIsOverlapAnchor: boolean;
    pOnToggleOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnUpdateOverlapSelection: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
    pOnDeletePanel: (aStart: number, aEnd: number, aIsRaw: boolean) => void;
}) => {
    const sAreaChart = useRef<any>();
    const sChartRef = useRef<any>();
    const sPanelFormRef = useRef<any>(null);
    const sSelectionAxisRef = useRef<any>(null);
    const sSkipNextFetchRef = useRef<boolean>(false);
    //
    const sPanelMeta = pPanelInfo.meta;
    const sPanelData = pPanelInfo.data;
    const sPanelTime = pPanelInfo.time;
    const sPanelAxes = pPanelInfo.axes;
    const sPanelDisplay = pPanelInfo.display;
    //
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sPanelState, setPanelState] = useState<PanelState>(createInitialPanelState(sPanelData.raw_keeper === undefined ? false : sPanelData.raw_keeper));
    const [sNavigateState, setNavigateState] = useState<PanelNavigateState>(INITIAL_NAVIGATE_STATE);
    const [sSaveEditedInfo, setSaveEditedInfo] = useState<boolean>(false);
    const sBgnEndTimeRange = pPanelBoardState.bgnEndTimeRange;
    const sBoardRange = {
        range_bgn: pBoardContext.range_bgn,
        range_end: pBoardContext.range_end,
    };

    const updatePanelState = (aPatch: Partial<PanelState>) => {
        setPanelState((aPrev) => ({ ...aPrev, ...aPatch }));
    };

    const updateNavigateState = (aPatch: Partial<PanelNavigateState>) => {
        setNavigateState((aPrev) => ({ ...aPrev, ...aPatch }));
    };

    const getChart = () => sChartRef.current?.chart;

    const setMainChartRange = (aRange: TagAnalyzerTimeRange) => {
        getChart()?.xAxis[0].setExtremes(aRange.startTime, aRange.endTime);
    };

    const setNavigatorChartRange = (aRange: TagAnalyzerTimeRange) => {
        getChart()?.navigator.xAxis.setExtremes(aRange.startTime, aRange.endTime);
    };

    const setChartRanges = (
        aPanelRange: TagAnalyzerTimeRange,
        aNavigatorRange: TagAnalyzerTimeRange = aPanelRange,
    ) => {
        setMainChartRange(aPanelRange);
        setNavigatorChartRange(aNavigatorRange);
    };

    const closeSelectionState = () => {
        sSelectionAxisRef.current?.removePlotBand('selection-plot-band');
        sSelectionAxisRef.current = null;
        updatePanelState({
            isSelectionActive: false,
            isSelectionMenuOpen: false,
            fftMinTime: 0,
            fftMaxTime: 0,
            minMaxList: [],
            menuPosition: { x: 0, y: 0 },
        });
    };

    const openSelectionState = (
        aAxis: any,
        aMenuPosition: CoordinateType,
        aStartTime: number,
        aEndTime: number,
        aMinMaxList: PanelState['minMaxList'],
    ) => {
        sSelectionAxisRef.current = aAxis;
        updatePanelState({
            isSelectionActive: true,
            isSelectionMenuOpen: true,
            fftMinTime: aStartTime,
            fftMaxTime: aEndTime,
            minMaxList: aMinMaxList,
            menuPosition: aMenuPosition,
        });
    };

    const setIsFFTModal = (aValue: boolean | ((aPrev: boolean) => boolean)) => {
        setPanelState((aPrev) => ({
            ...aPrev,
            isFFTModal: typeof aValue === 'function' ? aValue(aPrev.isFFTModal) : aValue,
        }));
    };

    const applyLoadedRanges = async (
        aPanelRange: TagAnalyzerTimeRange,
        aNavigatorRange: TagAnalyzerTimeRange = aPanelRange,
    ) => {
        await loadPanelData(aPanelRange);
        updateNavigateState({ panelRange: aPanelRange });
        await loadNavigatorData({ timeRange: aNavigatorRange, raw: undefined });
        updateNavigateState({ navigatorRange: aNavigatorRange });
    };

    const applyNavigatorRangeChange = (aEvent: any) => {
        const sExpandedNavigatorRange = getExpandedNavigatorRange(aEvent, sNavigateState.navigatorRange);
        if (!sExpandedNavigatorRange) return;

        setNavigatorChartRange(sExpandedNavigatorRange);
    };

    const syncPanelRangeData = async (aPanelRange: TagAnalyzerTimeRange) => {
        if (!sSkipNextFetchRef.current) {
            await loadPanelData(aPanelRange);
        } else {
            sSkipNextFetchRef.current = false;
        }

        updateNavigateState({ panelRange: aPanelRange });
    };

    const persistPanelState = (aRaw: boolean, aTimeInfo: any) => {
        pPanelBoardActions.onPersistPanelState(sPanelMeta.index_key, { ...aTimeInfo }, aRaw);
    };

    const persistPanelTimeKeeper = (aPanelRange: TagAnalyzerTimeRange) => {
        if (sPanelTime.use_time_keeper !== 'Y' || !getChart()) {
            return;
        }

        persistPanelState(sPanelState.isRaw, createPanelTimeKeeperPayload(aPanelRange, sNavigateState.navigatorRange));
    };

    const notifyOverlapRangeChange = (aPanelRange: TagAnalyzerTimeRange) => {
        pOnUpdateOverlapSelection(
            aPanelRange.startTime,
            aPanelRange.endTime,
            sPanelState.isRaw,
        );
    };

    // Updates the main chart window, refreshes its data, and persists overlap/time-keeper state.
    const mainHandlePanelRangeChange = async (aEvent: any) => {
        if (!aEvent.min) return;

        const sNextPanelRange = createTagAnalyzerTimeRange(aEvent.min, aEvent.max);
        applyNavigatorRangeChange(aEvent);
        await syncPanelRangeData(sNextPanelRange);
        persistPanelTimeKeeper(sNextPanelRange);
        notifyOverlapRangeChange(sNextPanelRange);
    };

    // Creates the selection summary for the highlighted chart range and opens the local selection UI.
    const mainHandleSelectionRange = (aEvent: any) => {
        if (!aEvent.xAxis || !sNavigateState.chartData) {
            return false;
        }

        const sSelection = aEvent.xAxis[0];
        sSelection.axis.removePlotBand('selection-plot-band');
        sSelection.axis.addPlotBand({
            from: sSelection.min,
            to: sSelection.max,
            color: 'rgba(68, 170, 213, 0.2)',
            id: 'selection-plot-band',
        });

        const sCalcList = computeSeriesCalcList(sSelection.axis.series, sPanelData.tag_set, sSelection.min, sSelection.max);
        if (isEmpty(sCalcList)) {
            Toast.error('There is no data in the selected area.');
            sSelection.axis.removePlotBand('selection-plot-band');
            return false;
        }

        openSelectionState(
            sSelection.axis,
            getSelectionMenuPosition(sChartRef.current?.container?.current?.getBoundingClientRect()),
            Math.floor(sSelection.min),
            Math.ceil(sSelection.max),
            sCalcList,
        );

        return false;
    };

    // Tracks the navigator window and reloads overview data when the overview range crosses a new slice.
    const mainHandleNavigatorRangeChange = (aEvent: any) => {
        const sNextNavigatorRange = getNavigatorRangeFromEvent(aEvent);
        updateNavigateState({ navigatorRange: sNextNavigatorRange });
        if (shouldReloadNavigatorData(sNextNavigatorRange, sNavigateState.navigatorRange)) {
            void loadNavigatorData({ timeRange: sNextNavigatorRange, raw: undefined });
        }
    };

    const handleZoomAction = (aAction: 'zoomIn' | 'zoomOut' | 'focus', aZoom?: number) => {
        if (aAction === 'zoomIn') {
            setMainChartRange(getZoomInPanelRange(sNavigateState.panelRange, aZoom));
            return;
        }

        if (aAction === 'zoomOut') {
            const sRangeUpdate = getZoomOutRange(sNavigateState.panelRange, sNavigateState.navigatorRange, aZoom);
            if (sRangeUpdate.navigatorRange) {
                setNavigatorChartRange(sRangeUpdate.navigatorRange);
            }
            setMainChartRange(sRangeUpdate.panelRange);
            return;
        }

        const sFocusedRange = getFocusedPanelRange(sNavigateState.panelRange);
        if (!sFocusedRange) return;
        setChartRanges(sFocusedRange.panelRange, sFocusedRange.navigatorRange);
    };

    const handlePanelRangeShift = (aDirection: 'left' | 'right') => {
        const sRangeUpdate = getMovedPanelRange(sNavigateState.panelRange, sNavigateState.navigatorRange, aDirection);
        setMainChartRange(sRangeUpdate.panelRange);
        if (sRangeUpdate.navigatorRange) {
            setNavigatorChartRange(sRangeUpdate.navigatorRange);
        }
    };

    const handleNavigatorRangeShift = (aDirection: 'left' | 'right') => {
        const sRangeUpdate = getMovedNavigatorRange(sNavigateState.panelRange, sNavigateState.navigatorRange, aDirection);
        setChartRanges(sRangeUpdate.panelRange, sRangeUpdate.navigatorRange);
    };

    const applyPanelLoadState = (aLoadState: Awaited<ReturnType<typeof resolvePanelChartState>>) => {
        updateNavigateState({
            chartData: aLoadState.chartData.datasets,
            rangeOption: aLoadState.rangeOption,
        });

        if (aLoadState.overflowRange) {
            sSkipNextFetchRef.current = true;
            updateNavigateState({
                panelRange: aLoadState.overflowRange,
                preOverflowTimeRange: aLoadState.overflowRange,
            });
            if (sChartRef?.current) {
                setMainChartRange(aLoadState.overflowRange);
            }
            return;
        }

        updateNavigateState({ preOverflowTimeRange: EMPTY_TAG_ANALYZER_TIME_RANGE });
    };

    // Loads or refreshes the navigator overview dataset for the current overview window.
    const loadNavigatorData = async (params: PanelFetchParams = {}) => {
        const sNavigatorDataState = await resolveNavigatorChartState({
            tagSet: sPanelData.tag_set || [],
            panelData: sPanelData,
            panelTime: sPanelTime,
            panelAxes: sPanelAxes,
            boardRange: sBoardRange,
            chartWidth: normalizeChartWidth(sAreaChart?.current?.clientWidth),
            isRaw: params.raw === undefined ? sPanelState.isRaw : params.raw,
            timeRange: params.timeRange,
            rollupTableList: sRollupTableList,
        });

        updateNavigateState({ navigatorData: sNavigatorDataState });
    };

    // Loads or refreshes the main chart dataset for the current visible panel window.
    const loadPanelData = async (aTimeRange?: TagAnalyzerTimeRange, aRaw?: boolean) => {
        const sPanelChartState = await resolvePanelChartState({
            tagSet: sPanelData.tag_set || [],
            panelData: sPanelData,
            panelTime: sPanelTime,
            panelAxes: sPanelAxes,
            boardRange: sBoardRange,
            chartWidth: normalizeChartWidth(sAreaChart.current?.clientWidth),
            isRaw: aRaw === undefined ? sPanelState.isRaw : aRaw,
            timeRange: aTimeRange,
            rollupTableList: sRollupTableList,
        });
        applyPanelLoadState(sPanelChartState);
    };

    // Initializes or resets the chart ranges from board time, panel time, or saved time-keeper state.
    const syncPanelRange = async (aMode: 'initialize' | 'reset') => {
        if (aMode === 'reset') {
            if (pBoardContext.id !== sSelectedTab || !getChart()) {
                return;
            }

            setChartRanges(
                await resolveResetTimeRange({
                    boardRange: sBoardRange,
                    panelData: sPanelData,
                    panelTime: sPanelTime,
                    bgnEndTimeRange: sBgnEndTimeRange,
                    isEdit: false,
                }),
            );
            return;
        }

        if (!(sPanelFormRef && sPanelFormRef.current && sPanelFormRef.current.clientWidth !== 0)) return;

        const sResolvedPanelRange = await resolveInitialPanelRange({
            boardRange: sBoardRange,
            panelData: sPanelData,
            panelTime: sPanelTime,
            bgnEndTimeRange: sBgnEndTimeRange,
            isEdit: false,
        });
        const sTimeKeeperRanges =
            sPanelTime.use_time_keeper === 'Y' ? resolveTimeKeeperRanges(sPanelTime.time_keeper) : undefined;

        if (sTimeKeeperRanges) {
            await applyLoadedRanges(sTimeKeeperRanges.panelRange, sTimeKeeperRanges.navigatorRange);
        } else {
            await applyLoadedRanges(sResolvedPanelRange);
        }
    };

    const toggleOverlap = () => {
        if (sPanelData.tag_set.length !== 1) return;
        pOnToggleOverlapSelection(sNavigateState.panelRange.startTime, sNavigateState.panelRange.endTime, sPanelState.isRaw);
    };

    const toggleRawMode = () => {
        const sNextRaw = !sPanelState.isRaw;
        updatePanelState({ isRaw: sNextRaw });
        if (sNavigateState.panelRange.startTime && getChart()) {
            persistPanelState(
                sNextRaw,
                createPanelTimeKeeperPayload(
                    sNavigateState.panelRange,
                    createTagAnalyzerTimeRange(
                        getChart().navigator.xAxis.getExtremes().min,
                        getChart().navigator.xAxis.getExtremes().max,
                    ),
                ),
            );
        }
        void loadPanelData(sNavigateState.panelRange, sNextRaw);
        if (sPanelAxes.use_sampling) {
            void loadNavigatorData({ timeRange: undefined, raw: sNextRaw });
        }
    };

    const toggleSelection = () => {
        if (sPanelState.isSelectionActive) {
            closeSelectionState();
            return;
        }

        updatePanelState({ isSelectionActive: true });
    };

    const openFft = () => {
        updatePanelState({ isFFTModal: true });
    };

    const setGlobalTime = () => {
        if (!sNavigateState.rangeOption) return;
        pPanelBoardActions.onSetGlobalTimeRange(
            resolveGlobalTimeTargetRange(sNavigateState.preOverflowTimeRange, sNavigateState.panelRange),
            sNavigateState.navigatorRange,
            sNavigateState.rangeOption,
        );
    };

    const openEditPanel = () => {
        pPanelBoardActions.onOpenEditRequest({
            pPanelInfo,
            pNavigatorRange: sNavigateState.navigatorRange,
            pSetSaveEditedInfo: setSaveEditedInfo,
        });
    };

    const deletePanel = () => {
        pOnDeletePanel(sNavigateState.panelRange.startTime, sNavigateState.panelRange.endTime, sPanelState.isRaw);
    };

    const sPanelPresentationState = buildPanelPresentationState({
        title: sPanelMeta.chart_title,
        panelRange: sNavigateState.panelRange,
        rangeOption: sNavigateState.rangeOption,
        isEdit: false,
        isRaw: sPanelState.isRaw,
        isSelectedForOverlap: pIsSelectedForOverlap,
        isOverlapAnchor: pIsOverlapAnchor,
        canToggleOverlap: sPanelData.tag_set.length === 1,
        isSelectionActive: sPanelState.isSelectionActive,
        isSelectionMenuOpen: sPanelState.isSelectionMenuOpen,
        canSaveLocal: Boolean(sNavigateState.chartData),
        changeUtcToText,
    });

    const sPanelActionHandlers = {
        onToggleOverlap: toggleOverlap,
        onToggleRaw: toggleRawMode,
        onToggleSelection: toggleSelection,
        onOpenFft: openFft,
        onSetGlobalTime: setGlobalTime,
        onOpenEdit: openEditPanel,
        onDelete: deletePanel,
    };

    const sPanelNavigationHandlers = {
        onRefreshData: () => void loadPanelData(sNavigateState.panelRange),
        onRefreshTime: () => void syncPanelRange('reset'),
        onZoomAction: handleZoomAction,
        onShiftPanelRange: handlePanelRangeShift,
        onShiftNavigatorRange: handleNavigatorRangeShift,
    };

    useEffect(() => {
        if (sChartRef.current && pPanelBoardState.globalTimeRange) {
            updateNavigateState({ rangeOption: pPanelBoardState.globalTimeRange.interval });
            setChartRanges(pPanelBoardState.globalTimeRange.data, pPanelBoardState.globalTimeRange.navigator);
        }
    }, [pPanelBoardState.globalTimeRange]);

    useEffect(() => {
        if (sChartRef.current) void loadPanelData(sNavigateState.panelRange);
    }, [pPanelBoardState.refreshCount]);

    useEffect(() => {
        if (pBoardContext.id === sSelectedTab && sSaveEditedInfo) {
            void syncPanelRange('initialize');
            setSaveEditedInfo(false);
        }
    }, [pPanelInfo]);

    useEffect(() => {
        if (sChartRef.current) {
            void syncPanelRange('reset');
        }
    }, [sBgnEndTimeRange]);

    useEffect(() => {
        if (
            sSelectedTab === pBoardContext.id &&
            sAreaChart &&
            sAreaChart.current &&
            !sAreaChart.current?.dataset?.processed
        ) {
            void syncPanelRange('initialize');
        }
    }, [sSelectedTab]);

    return (
        <div
            ref={sPanelFormRef}
            className="panel-form"
            style={pIsSelectedForOverlap ? { border: '0.5px solid #FDB532' } : { border: '0.5px solid #454545' }}
        >
            <PanelHeader
                pPresentationState={sPanelPresentationState}
                pButtonActionHandlers={sPanelActionHandlers}
                pNavigationHandlers={sPanelNavigationHandlers}
                pSavedChartInfo={{ chartData: sNavigateState.chartData, chartRef: sChartRef }}
            />
            <PanelBody
                pChartRefs={{ areaChart: sAreaChart, chartWrap: sChartRef }}
                pChartState={{
                    axes: sPanelAxes,
                    display: sPanelDisplay,
                    useNormalize: (pPanelInfo as any).use_normalize,
                }}
                pPanelState={sPanelState}
                pNavigateState={sNavigateState}
                pChartHandlers={{
                    onSetExtremes: mainHandlePanelRangeChange,
                    onSetNavigatorExtremes: mainHandleNavigatorRangeChange,
                    onSelection: mainHandleSelectionRange,
                }}
                pNavigationHandlers={sPanelNavigationHandlers}
                pTagSet={sPanelData.tag_set}
                pSetIsFFTModal={setIsFFTModal}
                pOnCloseSelection={toggleSelection}
                pGetDuration={getDuration}
            />
            <PanelFooter
                pPanelSummary={{
                    tagCount: sPanelData.tag_set.length,
                    showLegend: sPanelDisplay.show_legend,
                }}
                pNavigateState={sNavigateState}
                pNavigationHandlers={sPanelNavigationHandlers}
            />
        </div>
    );
};
export default PanelChart;
