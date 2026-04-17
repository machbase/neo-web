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
    createPanelRangeControlHandlers,
} from '../utils/PanelRangeMath';
import { buildPanelPresentationState } from '../utils/PanelPresentationUtils';
import type {
    PanelChartHandle,
    PanelState,
} from '../panel/PanelModel';
import PanelTimeSummary from '../panel/PanelTimeSummary';
import type {
    PanelInfo,
    TimeRange,
} from '../common/modelTypes';
import { usePanelChartRuntimeController } from '../panel/usePanelController';

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
 * @param pProps The preview inputs from the editor flow.
 * @returns The preview panel card for the current editor state.
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
            isRaw: sPanelData.raw_keeper === undefined ? false : sPanelData.raw_keeper,
            isFFTModal: false,
            isDragSelectActive: false,
        },
    );

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

        boardRange: undefined,
        boardRangeConfig: undefined,
        onPanelRangeApplied: undefined,
    });

    function getPreviewNavigatorRange() {
        if (navigateState.navigatorRange.startTime || navigateState.navigatorRange.endTime) {
            return navigateState.navigatorRange;
        }
        return pFooterRange;
    }

    const loadPreviewRanges = async function loadPreviewRanges() {
        if (!(sPanelFormRef.current && sPanelFormRef.current.clientWidth !== 0)) return;
        await applyLoadedRanges(pPreviewRange, getPreviewNavigatorRange());
    };

    const toggleRawMode = function toggleRawMode() {
        const sNextRaw = !sPanelState.isRaw;
        updatePanelState({ isRaw: sNextRaw });
        void refreshPanelData(navigateState.panelRange, sNextRaw, navigateState.navigatorRange);
    };
    const { shiftHandlers, zoomHandlers } = createPanelRangeControlHandlers(
        setExtremes,
        navigateState.panelRange,
        navigateState.navigatorRange,
    );

    const sPanelPresentationState = buildPanelPresentationState(
        sPanelMeta.chart_title,
        navigateState.panelRange,
        navigateState.rangeOption,
        true,
        sPanelState.isRaw,
        false,
        false,
        false,
        false,
        false,
        false,
        changeUtcToText,
    );

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
