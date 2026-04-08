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
} from '../panel/PanelRuntimeUtils';
import type { PanelChartHandle, PanelState } from '../panel/TagAnalyzerPanelTypes';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerPanelInfo,
    TagAnalyzerTimeRange,
} from '../panel/TagAnalyzerPanelModelTypes';
import { usePanelChartRuntimeController } from '../panel/usePanelChartRuntimeController';

const createInitialPreviewPanelState = (aIsRaw: boolean): PanelState => ({
    isRaw: aIsRaw,
    isFFTModal: false,
    isDragSelectActive: false,
});

// Future Refactor Target: this preview controller still shares a large orchestration pattern with PanelBoardChart.
// Revisit when we can extract a shared controller without widening the current cleanup scope.
const PanelEditorPreviewChart = ({
    pPanelInfo,
    pFooterRange,
    pBgnEndTimeRange,
}: {
    pPanelInfo: TagAnalyzerPanelInfo;
    pFooterRange: TagAnalyzerTimeRange;
    pBgnEndTimeRange: Partial<TagAnalyzerBgnEndTimeRange>;
}) => {
    const sAreaChart = useRef<HTMLDivElement | null>(null);
    const sChartRef = useRef<PanelChartHandle | null>(null);
    const sPanelFormRef = useRef<HTMLDivElement | null>(null);
    const sPanelMeta = pPanelInfo.meta;
    const sPanelData = pPanelInfo.data;
    const sPanelAxes = pPanelInfo.axes;
    const sPanelDisplay = pPanelInfo.display;
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sPanelState, setPanelState] = useState<PanelState>(createInitialPreviewPanelState(sPanelData.raw_keeper === undefined ? false : sPanelData.raw_keeper));

    const updatePanelState = (aPatch: Partial<PanelState>) => {
        setPanelState((aPrev) => ({ ...aPrev, ...aPatch }));
    };

    const {
        navigateState: sNavigateState,
        refreshNavigatorData: loadNavigatorData,
        refreshPanelData: loadPanelData,
        handlePanelRangeChange: mainHandlePanelRangeChange,
        handleNavigatorRangeChange: mainHandleNavigatorRangeChange,
        setExtremes,
        applyLoadedRanges,
    } = usePanelChartRuntimeController({
        panelInfo: pPanelInfo,
        areaChartRef: sAreaChart,
        chartRef: sChartRef,
        rollupTableList: sRollupTableList,
        isRaw: sPanelState.isRaw,
    });

    const resolvePreviewNavigatorRange = () => {
        if (sNavigateState.navigatorRange.startTime || sNavigateState.navigatorRange.endTime) {
            return sNavigateState.navigatorRange;
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

    // The preview reload is intentionally driven by incoming panel config changes.
    useEffect(() => {
        void initializePreviewRange();
    }, [pPanelInfo, pBgnEndTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

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
                    useNormalize: pPanelInfo.use_normalize,
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
                pVisibleRange={sNavigateState.panelRange}
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
