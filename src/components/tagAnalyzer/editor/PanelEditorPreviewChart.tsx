import PanelFooter from '../panel/PanelFooter';
import PanelEditorPreviewHeader from './PanelEditorPreviewHeader';
import PanelEditorPreviewBody from './PanelEditorPreviewBody';
import '../panel/Panel.scss';
import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';
import { changeUtcToText } from '@/utils/helpers/date';
import {
    buildPanelPresentationState,
    getExpandedNavigatorRange,
    getFocusedPanelRange,
    getMovedNavigatorRange,
    getMovedPanelRange,
    getNavigatorRangeFromEvent,
    getZoomInPanelRange,
    getZoomOutRange,
    normalizeChartWidth,
    resolveInitialPanelRange,
    resolveNavigatorChartState,
    resolvePanelChartState,
    resolveResetTimeRange,
    shouldReloadNavigatorData,
} from '../panel/PanelRuntimeUtil';
import { EMPTY_TAG_ANALYZER_TIME_RANGE } from '../panel/PanelModelUtil';
import type { TagAnalyzerBoardInfo } from '../TagAnalyzerType';
import type { PanelNavigateState, PanelState } from '../panel/TagAnalyzerPanelTypes';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerPanelInfo,
    TagAnalyzerTimeRange,
} from '../panel/TagAnalyzerPanelModelTypes';

type PanelFetchParams = {
    timeRange?: TagAnalyzerTimeRange;
    raw?: boolean;
};

const createInitialPreviewPanelState = (aIsRaw: boolean): PanelState => ({
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

const PanelEditorPreviewChart = ({
    pPanelInfo,
    pBoardInfo,
    pFooterRange,
    pBgnEndTimeRange,
}: {
    pPanelInfo: TagAnalyzerPanelInfo;
    pBoardInfo: TagAnalyzerBoardInfo;
    pFooterRange: TagAnalyzerTimeRange;
    pBgnEndTimeRange: Partial<TagAnalyzerBgnEndTimeRange>;
}) => {
    const sAreaChart = useRef<any>();
    const sChartRef = useRef<any>();
    const sPanelFormRef = useRef<any>(null);
    const sSkipNextFetchRef = useRef<boolean>(false);
    const sPanelMeta = pPanelInfo.meta;
    const sPanelData = pPanelInfo.data;
    const sPanelTime = pPanelInfo.time;
    const sPanelAxes = pPanelInfo.axes;
    const sPanelDisplay = pPanelInfo.display;
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sPanelState, setPanelState] = useState<PanelState>(createInitialPreviewPanelState(sPanelData.raw_keeper === undefined ? false : sPanelData.raw_keeper));
    const [sNavigateState, setNavigateState] = useState<PanelNavigateState>(INITIAL_NAVIGATE_STATE);

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

    const setChartRanges = (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange: TagAnalyzerTimeRange = aPanelRange) => {
        setMainChartRange(aPanelRange);
        setNavigatorChartRange(aNavigatorRange);
    };

    const resolvePreviewNavigatorRange = () => {
        if (sNavigateState.navigatorRange.startTime || sNavigateState.navigatorRange.endTime) {
            return sNavigateState.navigatorRange;
        }

        return pFooterRange;
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

    // Updates the preview chart window and reloads the visible series for the new range.
    const mainHandlePanelRangeChange = async (aEvent: any) => {
        if (!aEvent.min) return;

        const sNextPanelRange = { startTime: aEvent.min, endTime: aEvent.max };
        applyNavigatorRangeChange(aEvent);
        await syncPanelRangeData(sNextPanelRange);
    };

    // Tracks the preview navigator window and reloads overview data when the window crosses a new slice.
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

    // Loads or refreshes the preview navigator dataset for the current overview window.
    const loadNavigatorData = async (params: PanelFetchParams = {}) => {
        const sNavigatorDataState = await resolveNavigatorChartState({
            tagSet: sPanelData.tag_set || [],
            panelData: sPanelData,
            panelTime: sPanelTime,
            panelAxes: sPanelAxes,
            boardInfo: pBoardInfo,
            chartWidth: normalizeChartWidth(sAreaChart?.current?.clientWidth),
            isRaw: params.raw === undefined ? sPanelState.isRaw : params.raw,
            timeRange: params.timeRange,
            rollupTableList: sRollupTableList,
        });

        updateNavigateState({ navigatorData: sNavigatorDataState });
    };

    // Loads or refreshes the preview main chart dataset for the current visible window.
    const loadPanelData = async (aTimeRange?: TagAnalyzerTimeRange, aRaw?: boolean) => {
        const sPanelChartState = await resolvePanelChartState({
            tagSet: sPanelData.tag_set || [],
            panelData: sPanelData,
            panelTime: sPanelTime,
            panelAxes: sPanelAxes,
            boardInfo: pBoardInfo,
            chartWidth: normalizeChartWidth(sAreaChart.current?.clientWidth),
            isRaw: aRaw === undefined ? sPanelState.isRaw : aRaw,
            timeRange: aTimeRange,
            rollupTableList: sRollupTableList,
        });
        applyPanelLoadState(sPanelChartState);
    };

    // Initializes the preview range from the current panel config and refreshes both the main and overview series.
    const initializePreviewRange = async () => {
        if (!(sPanelFormRef.current && sPanelFormRef.current.clientWidth !== 0)) return;

        const sResolvedPanelRange = await resolveInitialPanelRange({
            boardInfo: pBoardInfo,
            panelData: sPanelData,
            panelTime: sPanelTime,
            bgnEndTimeRange: pBgnEndTimeRange,
            isEdit: true,
        });

        await applyLoadedRanges(sResolvedPanelRange, resolvePreviewNavigatorRange());
    };

    // Recomputes the preview time range from the current editor values and reloads the chart data.
    const refreshPreviewTime = async () => {
        const sResolvedPanelRange = await resolveResetTimeRange({
            boardInfo: pBoardInfo,
            panelData: sPanelData,
            panelTime: sPanelTime,
            bgnEndTimeRange: pBgnEndTimeRange,
            isEdit: true,
        });

        await applyLoadedRanges(sResolvedPanelRange, resolvePreviewNavigatorRange());
    };

    const toggleRawMode = () => {
        const sNextRaw = !sPanelState.isRaw;
        updatePanelState({ isRaw: sNextRaw });
        void loadPanelData(sNavigateState.panelRange, sNextRaw);
        if (sPanelAxes.use_sampling) {
            void loadNavigatorData({ timeRange: resolvePreviewNavigatorRange(), raw: sNextRaw });
        }
    };

    const sPanelPresentationState = buildPanelPresentationState({
        title: sPanelMeta.chart_title,
        panelRange: sNavigateState.panelRange,
        rangeOption: sNavigateState.rangeOption,
        isEdit: true,
        isRaw: sPanelState.isRaw,
        isSelectedForOverlap: false,
        canToggleOverlap: false,
        isSelectionActive: false,
        isSelectionMenuOpen: false,
        canSaveLocal: false,
        panelInfo: pPanelInfo,
        changeUtcToText,
    });

    const sPanelNavigationHandlers = {
        onRefreshData: () => void loadPanelData(sNavigateState.panelRange),
        onRefreshTime: () => void refreshPreviewTime(),
        onZoomAction: handleZoomAction,
        onShiftPanelRange: handlePanelRangeShift,
        onShiftNavigatorRange: handleNavigatorRangeShift,
    };

    useEffect(() => {
        void initializePreviewRange();
    }, [pPanelInfo, pBgnEndTimeRange]);

    return (
        <div ref={sPanelFormRef} className="panel-form" style={{ border: '0.5px solid #454545' }}>
            <PanelEditorPreviewHeader
                pPresentationState={sPanelPresentationState}
                pOnToggleRaw={toggleRawMode}
                pOnRefreshData={() => void loadPanelData(sNavigateState.panelRange)}
                pOnRefreshTime={() => void refreshPreviewTime()}
            />
            <PanelEditorPreviewBody
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
                    onSelection: () => false,
                }}
                pNavigationHandlers={sPanelNavigationHandlers}
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

export default PanelEditorPreviewChart;
