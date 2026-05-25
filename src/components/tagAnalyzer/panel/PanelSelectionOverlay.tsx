import { FFTModal } from '../boardModal/FFTModal';
import type { FFTSelectionPayload } from '../domain/ChartDomain';
import { SelectionSummaryPopover } from './modal/SelectionSummaryPopover';
import type { PanelSelectionSummary } from './PanelBrushSelection';

function PanelSelectionOverlay({
    fftSelection,
    onCloseFft,
    selectionSummary,
    isNumericXAxis,
    onCloseSelection,
}: {
    fftSelection: FFTSelectionPayload | undefined;
    onCloseFft: () => void;
    selectionSummary: PanelSelectionSummary | undefined;
    isNumericXAxis: boolean;
    onCloseSelection: () => void;
}) {
    return (
        <>
            {fftSelection && (
                <FFTModal
                    pSeriesSummaries={fftSelection.seriesSummaries}
                    pStartTime={fftSelection.startTime}
                    pEndTime={fftSelection.endTime}
                    pIsNumericXAxis={isNumericXAxis}
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            onCloseFft();
                        }
                    }}
                />
            )}
            {selectionSummary && (
                <SelectionSummaryPopover
                    selection={selectionSummary.selection}
                    position={selectionSummary.popoverPosition}
                    isNumericXAxis={isNumericXAxis}
                    onClose={onCloseSelection}
                />
            )}
        </>
    );
}

export default PanelSelectionOverlay;
