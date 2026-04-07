import PanelFooter from '../panel/PanelFooter';
import PanelEditorPreviewHeader from './PanelEditorPreviewHeader';
import PanelEditorPreviewBody from './PanelEditorPreviewBody';
import '../panel/Panel.scss';
import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';
import { changeUtcToText } from '@/utils/helpers/date';
import {
    applyFocusedRange,
    applyShiftedNavigatorRangeLeft,
    applyShiftedNavigatorRangeRight,
    applyShiftedPanelRangeLeft,
    applyShiftedPanelRangeRight,
    applyZoomIn,
    applyZoomOut,
    buildPanelPresentationState,
    getExpandedNavigatorRange,
    getNavigatorRangeFromEvent,
    shouldReloadNavigatorData,
} from '../panel/PanelRuntimeUtil';
import {
    loadNavigatorChartState,
    loadPanelChartState,
    resolvePanelChartState,
} from '../panel/PanelFetchUtil';
import { EMPTY_TAG_ANALYZER_TIME_RANGE } from '../panel/PanelModelUtil';
import type { PanelChartHandle, PanelNavigateState, PanelState } from '../panel/TagAnalyzerPanelTypes';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerPanelInfo,
    TagAnalyzerTimeRange,
} from '../panel/TagAnalyzerPanelModelTypes';

const createInitialPreviewPanelState = (aIsRaw: boolean): PanelState => ({
    isRaw: aIsRaw,
    isFFTModal: false,
    isDragSelectActive: false,
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
    pFooterRange,
    pBgnEndTimeRange,
}: {
    pPanelInfo: TagAnalyzerPanelInfo;
    pFooterRange: TagAnalyzerTimeRange;
    pBgnEndTimeRange: Partial<TagAnalyzerBgnEndTimeRange>;
}) => {
    const sAreaChart = useRef<any>();
    const sChartRef = useRef<PanelChartHandle | null>(null);
    const sPanelFormRef = useRef<any>(null);
    const sSkipNextFetchRef = useRef<boolean>(false);
    const sPanelMeta = pPanelInfo.meta;
    const sPanelData = pPanelInfo.data;
    const sPanelAxes = pPanelInfo.axes;
    const sPanelDisplay = pPanelInfo.display;
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sPanelState, setPanelState] = useState<PanelState>(createInitialPreviewPanelState(sPanelData.raw_keeper === undefined ? false : sPanelData.raw_keeper));
    const [sNavigateState, setNavigateState] = useState<PanelNavigateState>(INITIAL_NAVIGATE_STATE);
    const sNavigateStateRef = useRef<PanelNavigateState>(INITIAL_NAVIGATE_STATE);

    const updatePanelState = (aPatch: Partial<PanelState>) => {
        setPanelState((aPrev) => ({ ...aPrev, ...aPatch }));
    };

    const updateNavigateState = (aPatch: Partial<PanelNavigateState>) => {
        setNavigateState((aPrev) => {
            const sNext = { ...aPrev, ...aPatch };
            sNavigateStateRef.current = sNext;
            return sNext;
        });
    };

    const getChart = () => sChartRef.current;

    const setMainChartRange = (aRange: TagAnalyzerTimeRange) => {
        getChart()?.setPanelRange(aRange);
    };

    const setNavigatorChartRange = (aRange: TagAnalyzerTimeRange) => {
        const sCurrentNavigatorRange = sNavigateStateRef.current.navigatorRange;
        updateNavigateState({ navigatorRange: aRange });
        if (shouldReloadNavigatorData(aRange, sCurrentNavigatorRange)) {
            void loadNavigatorData(aRange);
        }
    };

    const setExtremes = (aPanelRange: TagAnalyzerTimeRange, aNavigatorRange: TagAnalyzerTimeRange = aPanelRange) => {
        setNavigatorChartRange(aNavigatorRange);
        setMainChartRange(aPanelRange);
    };

    const resolvePreviewNavigatorRange = () => {
        if (sNavigateStateRef.current.navigatorRange.startTime || sNavigateStateRef.current.navigatorRange.endTime) {
            return sNavigateStateRef.current.navigatorRange;
        }

        return pFooterRange;
    };

    const resolvePreviewPanelRange = () => {
        if (pBgnEndTimeRange.bgn_min !== undefined && pBgnEndTimeRange.end_max !== undefined) {
            return {
                startTime: pBgnEndTimeRange.bgn_min,
                endTime: pBgnEndTimeRange.end_max,
            };
        }

        return pFooterRange;
    };

    const applyLoadedRanges = async (
        aPanelRange: TagAnalyzerTimeRange,
        aNavigatorRange: TagAnalyzerTimeRange = aPanelRange,
    ) => {
        await loadPanelData(aPanelRange);
        updateNavigateState({ panelRange: aPanelRange });
        await loadNavigatorData(aNavigatorRange);
        updateNavigateState({ navigatorRange: aNavigatorRange });
    };

    const applyNavigatorRangeChange = (aEvent: any) => {
        const sExpandedNavigatorRange = getExpandedNavigatorRange(aEvent, sNavigateStateRef.current.navigatorRange);
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
        const sCurrentNavigatorRange = sNavigateStateRef.current.navigatorRange;
        const sNextNavigatorRange = getNavigatorRangeFromEvent(aEvent);
        updateNavigateState({ navigatorRange: sNextNavigatorRange });
        if (shouldReloadNavigatorData(sNextNavigatorRange, sCurrentNavigatorRange)) {
            void loadNavigatorData(sNextNavigatorRange);
        }
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
    const loadNavigatorData = async (aTimeRange?: TagAnalyzerTimeRange, aRaw?: boolean) => {
        const sNavigatorDataState = await loadNavigatorChartState({
            panelInfo: pPanelInfo,
            chartWidth: sAreaChart?.current?.clientWidth,
            isRaw: aRaw === undefined ? sPanelState.isRaw : aRaw,
            timeRange: aTimeRange,
            rollupTableList: sRollupTableList,
        });

        updateNavigateState({ navigatorData: sNavigatorDataState });
    };

    // Loads or refreshes the preview main chart dataset for the current visible window.
    const loadPanelData = async (aTimeRange?: TagAnalyzerTimeRange, aRaw?: boolean) => {
        const sPanelChartState = await loadPanelChartState({
            panelInfo: pPanelInfo,
            chartWidth: sAreaChart.current?.clientWidth,
            isRaw: aRaw === undefined ? sPanelState.isRaw : aRaw,
            timeRange: aTimeRange,
            rollupTableList: sRollupTableList,
        });
        applyPanelLoadState(sPanelChartState);
    };

    // Initializes the preview range from the current panel config and refreshes both the main and overview series.
    const initializePreviewRange = async () => {
        if (!(sPanelFormRef.current && sPanelFormRef.current.clientWidth !== 0)) return;
        await applyLoadedRanges(resolvePreviewPanelRange(), resolvePreviewNavigatorRange());
    };

    // Recomputes the preview time range from the current editor values and reloads the chart data.
    const refreshPreviewTime = async () => {
        await applyLoadedRanges(resolvePreviewPanelRange(), resolvePreviewNavigatorRange());
    };

    const toggleRawMode = () => {
        const sNextRaw = !sPanelState.isRaw;
        updatePanelState({ isRaw: sNextRaw });
        void loadPanelData(sNavigateState.panelRange, sNextRaw);
        if (sPanelAxes.use_sampling) {
            void loadNavigatorData(resolvePreviewNavigatorRange(), sNextRaw);
        }
    };

    const sPanelPresentationState = buildPanelPresentationState({
        title: sPanelMeta.chart_title,
        panelRange: sNavigateState.panelRange,
        rangeOption: sNavigateState.rangeOption,
        isEdit: true,
        isRaw: sPanelState.isRaw,
        isSelectedForOverlap: false,
        isOverlapAnchor: false,
        canToggleOverlap: false,
        isDragSelectActive: false,
        canOpenFft: false,
        canSaveLocal: false,
        changeUtcToText,
    });

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
                }}
                pShiftHandlers={{
                    onShiftPanelRangeLeft: () => applyShiftedPanelRangeLeft(setExtremes, sNavigateState.panelRange, sNavigateState.navigatorRange),
                    onShiftPanelRangeRight: () => applyShiftedPanelRangeRight(setExtremes, sNavigateState.panelRange, sNavigateState.navigatorRange),
                }}
                pTagSet={sPanelData.tag_set}
            />
            <PanelFooter
                pPanelSummary={{
                    tagCount: sPanelData.tag_set.length,
                    showLegend: sPanelDisplay.show_legend,
                }}
                pNavigatorStartTime={sNavigateState.navigatorRange.startTime}
                pNavigatorEndTime={sNavigateState.navigatorRange.endTime}
                pShiftHandlers={{
                    onShiftNavigatorRangeLeft: () => applyShiftedNavigatorRangeLeft(setExtremes, sNavigateState.panelRange, sNavigateState.navigatorRange),
                    onShiftNavigatorRangeRight: () => applyShiftedNavigatorRangeRight(setExtremes, sNavigateState.panelRange, sNavigateState.navigatorRange),
                }}
                pZoomHandlers={{
                    onZoomIn: (aZoom) => applyZoomIn(setExtremes, sNavigateState.panelRange, aZoom),
                    onZoomOut: (aZoom) => applyZoomOut(setExtremes, sNavigateState.panelRange, sNavigateState.navigatorRange, aZoom),
                    onFocus: () => applyFocusedRange(setExtremes, sNavigateState.panelRange),
                }}
            />
        </div>
    );
};

export default PanelEditorPreviewChart;
