import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import EditAnnotationModal from './modal/EditAnnotationModal';
import EditHighlightModal from './modal/EditHighlightModal';
import {
    SelectionSummaryPopover,
} from './modal/SelectionSummaryPopover';
import { FFTModal } from '../boardModal/FFTModal';
import type { MutableRefObject } from 'react';
import type { ChartSeriesData } from '../domain/ChartDataModel';
import type {
    PanelActiveDialog,
    PanelChartHandle,
} from './PanelTypes';
import type {
    ActiveAnnotationEditor,
} from './modal/EditAnnotationModal';
import type {
    PanelAnnotationEditorStateAndActions,
    PanelHighlightEditorStateAndActions,
} from './usePanelOverlayEditors';
import type {
    PanelSelectionSummary,
} from './chartBody/usePanelBrushSelection';

function getAnnotationEditorKey(activeEditor: ActiveAnnotationEditor) {
    return [
        activeEditor.seriesIndex ?? 'new',
        activeEditor.annotationIndex ?? 'new',
        activeEditor.timestamp ?? 'existing',
        activeEditor.position.x,
        activeEditor.position.y,
    ].join(':');
}

function getHighlightEditorKey(activeEditor: NonNullable<PanelHighlightEditorStateAndActions['activeEditor']>) {
    return [
        activeEditor.highlightIndex,
        activeEditor.position.x,
        activeEditor.position.y,
    ].join(':');
}

function PanelOverlays({
    activeDialog,
    selectionSummary,
    onCloseDialog,
    onCloseSelection,
    onConfirmDeletePanel,
    exportCsvChartData,
    exportCsvChartRef,
    highlightEditor,
    editAnnotation,
}: {
    activeDialog: PanelActiveDialog | undefined;
    selectionSummary: PanelSelectionSummary | undefined;
    onCloseDialog: () => void;
    onCloseSelection: () => void;
    onConfirmDeletePanel: () => void;
    exportCsvChartData: ChartSeriesData[];
    exportCsvChartRef: MutableRefObject<PanelChartHandle | null>;
    highlightEditor: PanelHighlightEditorStateAndActions;
    editAnnotation: PanelAnnotationEditorStateAndActions;
}) {
    function handleDeleteModalOpenChange(isOpen: boolean) {
        if (!isOpen) {
            onCloseDialog();
        }
    }

    return (
        <>
            {activeDialog?.type === 'fft' && (
                <FFTModal
                    pSeriesSummaries={activeDialog.selection.seriesSummaries}
                    pStartTime={activeDialog.selection.startTime}
                    pEndTime={activeDialog.selection.endTime}
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            onCloseDialog();
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
            {highlightEditor.activeEditor && (
                <EditHighlightModal
                    key={getHighlightEditorKey(highlightEditor.activeEditor)}
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
            {activeDialog?.type === 'deletePanel' && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={handleDeleteModalOpenChange}
                    pCallback={onConfirmDeletePanel}
                    pContents={
                        <div className="body-content">Do you want to delete this panel?</div>
                    }
                />
            )}
            {activeDialog?.type === 'exportCsv' && (
                <SavedToLocalModal
                    pPanelInfo={exportCsvChartData}
                    pChartRef={exportCsvChartRef}
                    pIsDarkMode
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            onCloseDialog();
                        }
                    }}
                />
            )}
        </>
    );
}

export default PanelOverlays;
