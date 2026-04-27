import TimeSeriesChart from './TimeSeriesChart';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
import type { MouseEvent } from 'react';
import { FFTModal } from '../boardModal/FFTModal';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
    PanelState,
    PanelShiftHandlers,
} from '../utils/panelRuntimeTypes';
import type { PanelSeriesConfig } from '../utils/series/PanelSeriesTypes';
import { ChartSelectionSummaryPopover } from './ChartSelectionSummaryPopover';
import { useChartSelectionPopupState } from './useChartSelectionPopupState';

/**
 * Combines the chart view with the local popup UI around it.
 * Intent: Keep the chart controls and selection popup close to the shared panel chart.
 * @param props The panel body props and chart interaction handlers.
 * @returns The rendered panel body around the shared chart component.
 */
const ChartBody = ({
    pChartRefs,
    pChartState,
    pPanelState,
    pNavigateState,
    pChartHandlers,
    pShiftHandlers,
    pTagSet,
    pSetIsFFTModal,
    pOnDragSelectStateChange,
    pOnHighlightSelection,
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: PanelState;
    pNavigateState: PanelNavigateState;
    pChartHandlers: PanelChartHandlers;
    pShiftHandlers: PanelShiftHandlers;
    pTagSet: PanelSeriesConfig[];
    pSetIsFFTModal: (value: boolean | ((prev: boolean) => boolean)) => void;
    pOnDragSelectStateChange: (isDragSelectActive: boolean, canOpenFft: boolean) => void;
    pOnHighlightSelection: (startTime: number, endTime: number) => void;
}) => {
    const {
        dragSelectState,
        handleCloseDragSelect,
        handleSelection,
    } = useChartSelectionPopupState({
        chartRefs: pChartRefs,
        panelState: pPanelState,
        navigateState: pNavigateState,
        tagSet: pTagSet,
        onDragSelectStateChange: pOnDragSelectStateChange,
        onHighlightSelection: pOnHighlightSelection,
    });
    const chartHandlers: PanelChartHandlers = {
        ...pChartHandlers,
        onSelection: handleSelection,
    };

    /**
     * Stops right-button presses from reaching the chart surface.
     * Intent: Let the panel context menu open without ECharts treating right click as a drag gesture.
     * @param event The mouse-down event from the chart wrapper.
     * @returns Nothing.
     */
    function handleChartMouseDownCapture(event: MouseEvent<HTMLDivElement>) {
        if (event.button !== 2) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
    }

    return (
        <>
            <div className="chart">
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range backward"
                    icon={<VscChevronLeft size={16} />}
                    onClick={pShiftHandlers.onShiftPanelRangeLeft}
                />
                <div
                    className="chart-body"
                    ref={pChartRefs.areaChart}
                    onMouseDownCapture={handleChartMouseDownCapture}
                >
                    <TimeSeriesChart
                        pChartRefs={pChartRefs}
                        pChartState={pChartState}
                        pPanelState={pPanelState}
                        pNavigateState={pNavigateState}
                        pChartHandlers={chartHandlers}
                    />
                </div>
                <Button
                    size="md"
                    variant="secondary"
                    isToolTip
                    toolTipContent="Move range forward"
                    icon={<VscChevronRight size={16} />}
                    onClick={pShiftHandlers.onShiftPanelRangeRight}
                />
            </div>
            {pPanelState.isFFTModal && (
                <FFTModal
                    pSeriesSummaries={dragSelectState.seriesSummaries}
                    setIsOpen={pSetIsFFTModal}
                    pStartTime={dragSelectState.startTime}
                    pEndTime={dragSelectState.endTime}
                />
            )}
            <ChartSelectionSummaryPopover
                dragSelectState={dragSelectState}
                onClose={handleCloseDragSelect}
            />
        </>
    );
};
export default ChartBody;
