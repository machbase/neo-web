import type { MouseEvent } from 'react';
import { FFTModal } from '../boardModal/FFTModal';
import PanelChartRenderer from '../chart/PanelChartRenderer';
import type {
    PanelChartHandlers,
    PanelChartRefs,
    PanelChartState,
    PanelNavigateState,
    PanelState,
    PanelShiftHandlers,
} from '../utils/panelRuntimeTypes';
import type { PanelSeriesConfig } from '../utils/series/PanelSeriesTypes';
import { SelectionSummaryPopover } from '../panelModal/SelectionSummaryPopover';
import { PanelRangeStepButton } from './PanelRangeStepButton';
import { usePanelRangeSelectionState } from './usePanelRangeSelectionState';

const PanelChartBody = ({
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
    const { selectionState, handleCloseSelection, handleSelection } = usePanelRangeSelectionState({
        chartRefs: pChartRefs,
        panelState: pPanelState,
        navigateState: pNavigateState,
        tagSet: pTagSet,
        onDragSelectStateChange: pOnDragSelectStateChange,
        onHighlightSelection: pOnHighlightSelection,
    });

    function handleChartMouseDownCapture(event: MouseEvent<HTMLDivElement>) {
        if (event.button === 2) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    return (
        <>
            <div className="chart">
                <PanelRangeStepButton
                    direction="left"
                    iconSize={16}
                    onClick={pShiftHandlers.onShiftPanelRangeLeft}
                    size="md"
                    toolTipContent="Move range backward"
                    variant="secondary"
                />
                <div
                    className="chart-body"
                    ref={pChartRefs.areaChart}
                    onMouseDownCapture={handleChartMouseDownCapture}
                >
                    <PanelChartRenderer
                        pChartRefs={pChartRefs}
                        pChartState={pChartState}
                        pPanelState={pPanelState}
                        pNavigateState={pNavigateState}
                        pChartHandlers={{
                            ...pChartHandlers,
                            onSelection: handleSelection,
                        }}
                    />
                </div>
                <PanelRangeStepButton
                    direction="right"
                    iconSize={16}
                    onClick={pShiftHandlers.onShiftPanelRangeRight}
                    size="md"
                    toolTipContent="Move range forward"
                    variant="secondary"
                />
            </div>
            {pPanelState.isFFTModal && (
                <FFTModal
                    pSeriesSummaries={selectionState.seriesSummaries}
                    setIsOpen={pSetIsFFTModal}
                    pStartTime={selectionState.startTime}
                    pEndTime={selectionState.endTime}
                />
            )}
            <SelectionSummaryPopover
                selectionState={selectionState}
                onClose={handleCloseSelection}
            />
        </>
    );
};

export default PanelChartBody;
