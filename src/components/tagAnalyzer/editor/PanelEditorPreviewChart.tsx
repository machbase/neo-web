import PanelFooter from '../panel/PanelFooter';
import PanelBody from '../panel/PanelBody';
import '../panel/PanelHeader.scss';
import '../panel/Panel.scss';
import { Refresh, LuTimerReset, MdRawOn } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
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

// Props for the editor-only preview shell that wraps the shared panel runtime controller.
type PanelEditorPreviewChartProps = {
    pPanelInfo: TagAnalyzerPanelInfo;
    pFooterRange: TagAnalyzerTimeRange;
    pBgnEndTimeRange: Partial<TagAnalyzerBgnEndTimeRange>;
};

/**
 * Builds the initial preview-only panel state before the shared runtime controller loads any data.
 * @param aIsRaw Whether the preview should start in raw mode.
 * @returns The initial preview panel state.
 */
function createInitialPreviewPanelState(aIsRaw: boolean): PanelState {
    return {
        isRaw: aIsRaw,
        isFFTModal: false,
        isDragSelectActive: false,
    };
}

// Future Refactor Target: this preview controller still shares a large orchestration pattern with PanelBoardChart.
// Revisit when we can extract a shared controller without widening the current cleanup scope.
/**
 * Renders the editor preview shell and keeps preview-only initialization logic outside the shared runtime controller.
 * @param pProps The preview inputs from the editor flow.
 * @returns The preview panel card for the current editor state.
 */
function PanelEditorPreviewChart({
    pPanelInfo,
    pFooterRange,
    pBgnEndTimeRange,
}: PanelEditorPreviewChartProps) {
    const sAreaChart = useRef<HTMLDivElement | null>(null);
    const sChartRef = useRef<PanelChartHandle | null>(null);
    const sPanelFormRef = useRef<HTMLDivElement | null>(null);
    const sPanelMeta = pPanelInfo.meta;
    const sPanelData = pPanelInfo.data;
    const sPanelAxes = pPanelInfo.axes;
    const sPanelDisplay = pPanelInfo.display;
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sPanelState, setPanelState] = useState<PanelState>(createInitialPreviewPanelState(sPanelData.raw_keeper === undefined ? false : sPanelData.raw_keeper));

    /**
     * Merges a preview-local panel-state patch into the current panel state.
     * @param aPatch The preview-local panel-state fields to update.
     * @returns Nothing.
     * Side effect: updates the preview-local panel state.
     */
    const updatePanelState = function updatePanelState(aPatch: Partial<PanelState>) {
        setPanelState((aPrev) => ({ ...aPrev, ...aPatch }));
    };

    const {
        navigateState: sNavigateState,
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

    /**
     * Resolves the preview navigator range, preferring the already-loaded navigator window when it exists.
     * @returns The navigator range that should seed the preview chart.
     */
    function resolvePreviewNavigatorRange() {
        if (sNavigateState.navigatorRange.startTime || sNavigateState.navigatorRange.endTime) {
            return sNavigateState.navigatorRange;
        }

        return pFooterRange;
    }

    /**
     * Resolves the preview panel range from fetched editor bounds or the footer range fallback.
     * @returns The initial preview panel range for the current editor state.
     */
    function resolvePreviewPanelRange() {
        if (pBgnEndTimeRange.bgn_min !== undefined && pBgnEndTimeRange.end_max !== undefined) {
            return {
                startTime: pBgnEndTimeRange.bgn_min,
                endTime: pBgnEndTimeRange.end_max,
            };
        }

        return pFooterRange;
    }

    // Initializes the preview range from the current panel config and refreshes both the main and overview series.
    /**
     * Initializes the preview chart from the current panel config and footer ranges.
     * @returns Nothing.
     * Side effect: fetches and stores both preview chart layers.
     */
    const initializePreviewRange = async function initializePreviewRange() {
        if (!(sPanelFormRef.current && sPanelFormRef.current.clientWidth !== 0)) return;
        await applyLoadedRanges(resolvePreviewPanelRange(), resolvePreviewNavigatorRange());
    };

    // Recomputes the preview time range from the current editor values and reloads the chart data.
    /**
     * Refreshes the preview chart using the latest editor-controlled time bounds.
     * @returns Nothing.
     * Side effect: fetches and stores both preview chart layers.
     */
    const refreshPreviewTime = async function refreshPreviewTime() {
        await applyLoadedRanges(resolvePreviewPanelRange(), resolvePreviewNavigatorRange());
    };

    /**
     * Toggles raw mode for the preview panel and reloads the affected datasets.
     * @returns Nothing.
     * Side effect: updates preview-local raw state and triggers preview data reloads.
     */
    const toggleRawMode = function toggleRawMode() {
        const sNextRaw = !sPanelState.isRaw;
        updatePanelState({ isRaw: sNextRaw });
        void loadPanelData(sNavigateState.panelRange, sNextRaw, sNavigateState.navigatorRange);
    };

    /**
     * Refreshes the currently loaded preview chart dataset.
     * @returns Nothing.
     * Side effect: reloads preview chart data for the current slider overview range.
     */
    function handleRefreshData() {
        void loadPanelData(sNavigateState.panelRange, sPanelState.isRaw, sNavigateState.navigatorRange);
    }

    /**
     * Refreshes the preview chart time window from the latest editor state.
     * @returns Nothing.
     * Side effect: triggers a preview range reload.
     */
    function handleRefreshTime() {
        void refreshPreviewTime();
    }

    /**
     * Applies a left shift to the visible preview panel range.
     * @returns Nothing.
     * Side effect: routes the shifted range through the shared preview runtime controller.
     */
    function handleShiftPanelRangeLeft() {
        applyShiftedPanelRangeLeft(setExtremes, sNavigateState.panelRange, sNavigateState.navigatorRange);
    }

    /**
     * Applies a right shift to the visible preview panel range.
     * @returns Nothing.
     * Side effect: routes the shifted range through the shared preview runtime controller.
     */
    function handleShiftPanelRangeRight() {
        applyShiftedPanelRangeRight(setExtremes, sNavigateState.panelRange, sNavigateState.navigatorRange);
    }

    /**
     * Shifts the preview navigator window left while keeping the panel in sync.
     * @returns Nothing.
     * Side effect: routes the shifted navigator range through the shared preview runtime controller.
     */
    function handleShiftNavigatorRangeLeft() {
        applyShiftedNavigatorRangeLeft(setExtremes, sNavigateState.panelRange, sNavigateState.navigatorRange);
    }

    /**
     * Shifts the preview navigator window right while keeping the panel in sync.
     * @returns Nothing.
     * Side effect: routes the shifted navigator range through the shared preview runtime controller.
     */
    function handleShiftNavigatorRangeRight() {
        applyShiftedNavigatorRangeRight(setExtremes, sNavigateState.panelRange, sNavigateState.navigatorRange);
    }

    /**
     * Zooms the preview panel inward.
     * @param aZoom The zoom ratio requested by the footer control.
     * @returns Nothing.
     * Side effect: routes the zoomed range through the shared preview runtime controller.
     */
    function handleZoomIn(aZoom: number) {
        applyZoomIn(setExtremes, sNavigateState.panelRange, aZoom);
    }

    /**
     * Zooms the preview panel outward.
     * @param aZoom The zoom ratio requested by the footer control.
     * @returns Nothing.
     * Side effect: routes the zoomed range through the shared preview runtime controller.
     */
    function handleZoomOut(aZoom: number) {
        applyZoomOut(setExtremes, sNavigateState.panelRange, sNavigateState.navigatorRange, aZoom);
    }

    /**
     * Focuses the preview panel on its middle slice.
     * @returns Nothing.
     * Side effect: routes the focused range through the shared preview runtime controller.
     */
    function handleFocusRange() {
        applyFocusedRange(setExtremes, sNavigateState.panelRange, sNavigateState.navigatorRange);
    }

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

    /**
     * Reloads the preview whenever the editor panel config or explicit begin/end range changes.
     * @returns Nothing.
     * Side effect: fetches preview data for the latest editor-controlled panel state.
     */
    function reloadPreviewFromEditorState() {
        void initializePreviewRange();
    }

    useEffect(reloadPreviewFromEditorState, [pPanelInfo, pBgnEndTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div ref={sPanelFormRef} className="panel-form" style={{ border: '0.5px solid #454545' }}>
            <div className="panel-header">
                <div className="title">{sPanelPresentationState.title}</div>
                <div className="time">
                    {sPanelPresentationState.timeText}
                    <span> {!sPanelPresentationState.isRaw && sPanelPresentationState.intervalText && ` ( interval : ${sPanelPresentationState.intervalText} )`}</span>
                </div>
                <Button.Group>
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={!sPanelPresentationState.isRaw ? 'Enable raw data mode' : 'Disable raw data mode'}
                        icon={<MdRawOn size={16} style={{ color: sPanelPresentationState.isRaw ? '#fdb532 ' : '', height: '32px', width: '32px' }} />}
                        onClick={toggleRawMode}
                        style={{ minWidth: '36px' }}
                    />
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Refresh data'}
                        icon={<Refresh size={14} />}
                        onClick={handleRefreshData}
                    />
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Refresh time'}
                        icon={<LuTimerReset size={16} style={{ marginTop: '-1px' }} />}
                        onClick={handleRefreshTime}
                    />
                </Button.Group>
            </div>
            <PanelBody
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
                    onShiftPanelRangeLeft: handleShiftPanelRangeLeft,
                    onShiftPanelRangeRight: handleShiftPanelRangeRight,
                }}
                pTagSet={sPanelData.tag_set}
                pSetIsFFTModal={() => undefined}
                pOnDragSelectStateChange={() => undefined}
            />
            <PanelFooter
                pPanelSummary={{
                    tagCount: sPanelData.tag_set.length,
                    showLegend: sPanelDisplay.show_legend,
                }}
                pVisibleRange={sNavigateState.panelRange}
                pShiftHandlers={{
                    onShiftNavigatorRangeLeft: handleShiftNavigatorRangeLeft,
                    onShiftNavigatorRangeRight: handleShiftNavigatorRangeRight,
                }}
                pZoomHandlers={{
                    onZoomIn: handleZoomIn,
                    onZoomOut: handleZoomOut,
                    onFocus: handleFocusRange,
                }}
            />
        </div>
    );
}

export default PanelEditorPreviewChart;
