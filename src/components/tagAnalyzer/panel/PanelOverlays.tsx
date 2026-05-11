import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import PanelContextMenu from './modal/PanelContextMenu';
import EditAnnotationModal from './modal/EditAnnotationModal';
import EditHighlightModal from './modal/EditHighlightModal';
import {
    SelectionSummaryPopover,
    type SelectionSummaryPopoverState,
} from './modal/SelectionSummaryPopover';
import { FFTModal } from '../boardModal/FFTModal';
import type { MutableRefObject } from 'react';
import type { ChartSeriesData } from '../chart/ChartTypes';
import type { FFTSelectionPayload } from '../boardModal/BoardModalTypes';
import type {
    PanelChartHandle,
    PanelHeaderActions,
    PanelHeaderState,
    PanelOverlayModeActions,
    PanelOverlayModeState,
} from './PanelTypes';
import type {
    ActiveAnnotationEditor,
} from './modal/EditAnnotationModal';
import type {
    PanelAnnotationEditorStateAndActions,
    PanelHighlightEditorStateAndActions,
} from './usePanelOverlayEditors';

type DeletePanelModalStateAndActions = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

type ExportCsvModalStateAndActions = {
    isOpen: boolean;
    chartData: ChartSeriesData[];
    chartRef: MutableRefObject<PanelChartHandle | null>;
    onClose: () => void;
};

type SelectionSummaryOverlay = {
    selection: FFTSelectionPayload | undefined;
    popoverState: SelectionSummaryPopoverState;
    onClose: () => void;
};

function getAnnotationEditorKey(activeEditor: ActiveAnnotationEditor) {
    return [
        activeEditor.seriesIndex ?? 'new',
        activeEditor.annotationIndex ?? 'new',
        activeEditor.timestamp ?? 'existing',
        activeEditor.position.x,
        activeEditor.position.y,
    ].join(':');
}

function PanelOverlays({
    headerState,
    headerActions,
    overlayModeState,
    overlayModeActions,
    onCloseContextMenu,
    fftSelection,
    selectionSummary,
    highlightEditor,
    editAnnotation,
    deletePanel,
    exportCsv,
}: {
    headerState: PanelHeaderState;
    headerActions: PanelHeaderActions;
    overlayModeState: PanelOverlayModeState;
    overlayModeActions: PanelOverlayModeActions;
    onCloseContextMenu: () => void;
    fftSelection: FFTSelectionPayload | undefined;
    selectionSummary: SelectionSummaryOverlay;
    highlightEditor: PanelHighlightEditorStateAndActions;
    editAnnotation: PanelAnnotationEditorStateAndActions;
    deletePanel: DeletePanelModalStateAndActions;
    exportCsv: ExportCsvModalStateAndActions;
}) {
    function handleDeleteModalOpenChange(isOpen: boolean) {
        if (!isOpen) {
            deletePanel.onClose();
        }
    }

    return (
        <>
            {headerState.contextMenu.isOpen && (
                <PanelContextMenu
                    position={headerState.contextMenu.position}
                    pHeaderState={headerState}
                    pHeaderActions={headerActions}
                    pOverlayModeState={overlayModeState}
                    pOverlayModeActions={overlayModeActions}
                    onClose={onCloseContextMenu}
                />
            )}
            {overlayModeState.isFFTModal && fftSelection && (
                <FFTModal
                    pSeriesSummaries={fftSelection.seriesSummaries}
                    pStartTime={fftSelection.startTime}
                    pEndTime={fftSelection.endTime}
                    setIsOpen={overlayModeActions.onSetFftModalOpen}
                />
            )}
            {selectionSummary.selection && (
                <SelectionSummaryPopover
                    selection={selectionSummary.selection}
                    popoverState={selectionSummary.popoverState}
                    onClose={selectionSummary.onClose}
                />
            )}
            {highlightEditor.activeEditor && (
                <EditHighlightModal
                    activeHighlightEditor={highlightEditor.activeEditor}
                    highlight={highlightEditor.highlight}
                    onApplyHighlightChange={highlightEditor.onApplyHighlightChange}
                    onCancel={highlightEditor.onCancel}
                    onApplied={highlightEditor.onApplied}
                />
            )}
            {editAnnotation.activeEditor && (
                <EditAnnotationModal
                    key={getAnnotationEditorKey(editAnnotation.activeEditor)}
                    activeAnnotationEditor={editAnnotation.activeEditor}
                    annotation={editAnnotation.annotation}
                    seriesOptions={editAnnotation.seriesOptions}
                    onApplyAnnotationChange={editAnnotation.onApplyAnnotationChange}
                    onDeleteAnnotation={editAnnotation.onDeleteAnnotation}
                    onCancel={editAnnotation.onCancel}
                    onApplied={editAnnotation.onApplied}
                />
            )}
            {deletePanel.isOpen && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={handleDeleteModalOpenChange}
                    pCallback={deletePanel.onConfirm}
                    pContents={
                        <div className="body-content">Do you want to delete this panel?</div>
                    }
                />
            )}
            {exportCsv.isOpen && (
                <SavedToLocalModal
                    pPanelInfo={exportCsv.chartData}
                    pChartRef={exportCsv.chartRef}
                    pIsDarkMode
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            exportCsv.onClose();
                        }
                    }}
                />
            )}
        </>
    );
}

export default PanelOverlays;
