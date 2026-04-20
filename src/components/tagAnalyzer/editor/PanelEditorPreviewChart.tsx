import PanelFooter from '../panel/PanelFooter';
import PanelBody from '../panel/PanelBody';
import '../panel/PanelHeader.scss';
import '../panel/Panel.scss';
import { Refresh, LuTimerReset, MdRawOn } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
import { changeUtcToText } from '@/utils/helpers/date';
import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';
import {
    createPanelRangeControlHandlers,
} from '../utils/time/PanelRangeInteractionUtils';
import type {
    PanelChartHandle,
    PanelPresentationState,
    PanelState,
} from '../utils/panelRuntimeTypes';
import PanelTimeSummary from '../panel/PanelTimeSummary';
import type { PanelInfo } from '../utils/panelModelTypes';
import type { TimeRange } from '../utils/time/timeTypes';
import { usePanelChartRuntimeController } from '../panel/usePanelChartRuntimeController';

// Props for the editor-only preview shell that wraps the shared panel runtime controller.
// Used by PanelEditorPreviewChart to type component props.
type PanelEditorPreviewChartProps = {
    pPanelInfo: PanelInfo;
    pFooterRange: TimeRange;
    pPreviewRange: TimeRange;
};

// Future Refactor Target: this preview controller still shares a large orchestration pattern with PanelContainer.
// Revisit when we can extract a shared controller without widening the current cleanup scope.
/**
 * Renders the editor preview shell and keeps preview-only initialization logic outside the shared runtime controller.
 * Intent: Show an editable preview without mutating the shared panel runtime flow.
 * @param {PanelEditorPreviewChartProps} pProps The preview inputs from the editor flow.
 * @returns {JSX.Element}
 */
function PanelEditorPreviewChart({
    pPanelInfo,
    pFooterRange,
    pPreviewRange,
}: PanelEditorPreviewChartProps) {
    const sAreaChart = useRef<HTMLDivElement | null>(null);
    const sChartRef = useRef<PanelChartHandle | null>(null);
    const sPanelFormRef = useRef<HTMLDivElement | null>(null);
    const sPanelMeta = pPanelInfo.meta;
    const sPanelData = pPanelInfo.data;
    const sPanelAxes = pPanelInfo.axes;
    const sPanelDisplay = pPanelInfo.display;
    const sRollupTableList = useRecoilValue(gRollupTableList);
    const [sPanelState, setPanelState] = useState<PanelState>(
        {
            isRaw: sPanelData.raw_keeper,
            isFFTModal: false,
            isDragSelectActive: false,
        },
    );

    const {
        navigateState,
        refreshPanelData,
        handlePanelRangeChange,
        handleNavigatorRangeChange,
        setExtremes,
        applyLoadedRanges,
    } = usePanelChartRuntimeController({
        panelInfo: pPanelInfo,
        areaChartRef: sAreaChart,
        chartRef: sChartRef,
        rollupTableList: sRollupTableList,
        isRaw: sPanelState.isRaw,
        boardTime: { kind: 'empty' },
        onPanelRangeApplied: undefined,
    });

    /**
     * Resolves the navigator range to use for the preview shell.
     * Intent: Prefer the live navigator bounds when they are available, then fall back to the editor input.
     * @returns {TimeRange}
     */
    function getPreviewNavigatorRange() {
        if (navigateState.navigatorRange.startTime || navigateState.navigatorRange.endTime) {
            return navigateState.navigatorRange;
        }
        return pFooterRange;
    }

    /**
     * Loads the preview chart ranges into the editor shell.
     * Intent: Keep the preview chart synchronized with the current editor inputs and container size.
     * @returns {Promise<void>}
     */
    const loadPreviewRanges = async function loadPreviewRanges() {
        if (!(sPanelFormRef.current && sPanelFormRef.current.clientWidth !== 0)) return;
        await applyLoadedRanges(pPreviewRange, getPreviewNavigatorRange());
    };

    /**
     * Toggles the preview shell between raw and aggregated data.
     * Intent: Let the user validate how the edited panel behaves in both data modes.
     * @returns {void}
     */
    const toggleRawMode = function toggleRawMode() {
        const sNextRaw = !sPanelState.isRaw;
        setPanelState((aPrev) => ({ ...aPrev, isRaw: sNextRaw }));
        void refreshPanelData(navigateState.panelRange, sNextRaw, navigateState.navigatorRange);
    };
    const { shiftHandlers, zoomHandlers } = createPanelRangeControlHandlers(
        setExtremes,
        navigateState.panelRange,
        navigateState.navigatorRange,
    );

    const sTimeText = navigateState.panelRange.startTime
        ? `${changeUtcToText(navigateState.panelRange.startTime)} ~ ${changeUtcToText(navigateState.panelRange.endTime)}`
        : '';
    const sIntervalText =
        !sPanelState.isRaw && navigateState.rangeOption
            ? `${navigateState.rangeOption.IntervalValue}${navigateState.rangeOption.IntervalType}`
            : '';
    const sPanelPresentationState: PanelPresentationState = {
        title: sPanelMeta.chart_title,
        timeText: sTimeText,
        intervalText: sIntervalText,
        isEdit: true,
        isRaw: sPanelState.isRaw,
        isSelectedForOverlap: false,
        isOverlapAnchor: false,
        canToggleOverlap: false,
        isDragSelectActive: false,
        canOpenFft: false,
        canSaveLocal: false,
    };

    useEffect(() => {
        void loadPreviewRanges();
    }, [pPanelInfo, pPreviewRange]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div ref={sPanelFormRef} className="panel-form" style={{ border: '0.5px solid #454545' }}>
            <div className="panel-header">
                <div className="title">{sPanelPresentationState.title}</div>
                <PanelTimeSummary pPresentationState={sPanelPresentationState} />
                <Button.Group
                    className={undefined}
                    style={undefined}
                    fullWidth={undefined}
                    label={undefined}
                    labelPosition={undefined}
                >
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={
                            !sPanelPresentationState.isRaw
                                ? 'Enable raw data mode'
                                : 'Disable raw data mode'
                        }
                        icon={
                            <MdRawOn
                                size={16}
                                style={{
                                    color: sPanelPresentationState.isRaw ? '#fdb532 ' : '',
                                    height: '32px',
                                    width: '32px',
                                }}
                            />
                        }
                        onClick={toggleRawMode}
                        style={{ minWidth: '36px' }}
                        loading={undefined}
                        active={undefined}
                        iconPosition={undefined}
                        fullWidth={undefined}
                        children={undefined}
                        toolTipPlace={undefined}
                        toolTipMaxWidth={undefined}
                        forceOpacity={undefined}
                        shadow={undefined}
                        label={undefined}
                        labelPosition={undefined}
                    />
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Refresh data'}
                        icon={<Refresh size={14} />}
                        onClick={() =>
                            void refreshPanelData(
                                navigateState.panelRange,
                                sPanelState.isRaw,
                                navigateState.navigatorRange,
                            )
                        }
                        loading={undefined}
                        active={undefined}
                        iconPosition={undefined}
                        fullWidth={undefined}
                        children={undefined}
                        toolTipPlace={undefined}
                        toolTipMaxWidth={undefined}
                        forceOpacity={undefined}
                        shadow={undefined}
                        label={undefined}
                        labelPosition={undefined}
                    />
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Refresh time'}
                        icon={<LuTimerReset size={16} style={{ marginTop: '-1px' }} />}
                        onClick={() => void loadPreviewRanges()}
                        loading={undefined}
                        active={undefined}
                        iconPosition={undefined}
                        fullWidth={undefined}
                        children={undefined}
                        toolTipPlace={undefined}
                        toolTipMaxWidth={undefined}
                        forceOpacity={undefined}
                        shadow={undefined}
                        label={undefined}
                        labelPosition={undefined}
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
                pNavigateState={navigateState}
                pChartHandlers={{
                    onSetExtremes: handlePanelRangeChange,
                    onSetNavigatorExtremes: handleNavigatorRangeChange,
                    onSelection: () => undefined,
                }}
                pShiftHandlers={shiftHandlers}
                pTagSet={sPanelData.tag_set}
                pSetIsFFTModal={() => undefined}
                pOnDragSelectStateChange={() => undefined}
            />
            <PanelFooter
                pPanelSummary={{
                    tagCount: sPanelData.tag_set.length,
                    showLegend: sPanelDisplay.show_legend,
                }}
                pVisibleRange={navigateState.panelRange}
                pShiftHandlers={shiftHandlers}
                pZoomHandlers={zoomHandlers}
            />
        </div>
    );
}

export default PanelEditorPreviewChart;
