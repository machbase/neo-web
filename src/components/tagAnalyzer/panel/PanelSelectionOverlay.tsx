import { FFTModal } from '../boardModal/FFTModal';
import type { FFTSelectionPayload } from '../domain/ChartDataModel';
import { SelectionSummaryPopover } from './modal/SelectionSummaryPopover';
import type { PanelSelectionSummary } from './PanelBrushSelection';

function PanelSelectionOverlay({
    fftSelection,
    onCloseFft,
    selectionSummary,
    onCloseSelection,
}: {
    fftSelection: FFTSelectionPayload | undefined;
    onCloseFft: () => void;
    selectionSummary: PanelSelectionSummary | undefined;
    onCloseSelection: () => void;
}) {
    return (
        <>
            {fftSelection && (
                <FFTModal
                    pSeriesSummaries={fftSelection.seriesSummaries}
                    pStartTime={fftSelection.startTime}
                    pEndTime={fftSelection.endTime}
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
                    onClose={onCloseSelection}
                />
            )}
        </>
    );
}

export default PanelSelectionOverlay;
