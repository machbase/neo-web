import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import PanelContextMenu from './modal/PanelContextMenu';
import EditAnnotationModal from './modal/EditAnnotationModal';
import EditHighlightModal from './modal/EditHighlightModal';
import type { MutableRefObject } from 'react';
import type { ChartSeriesData } from '../chart/ChartTypes';
import type { PanelHighlight } from '../domain/PanelModel';
import type { SeriesAnnotation } from '../domain/SeriesModel';
import type {
    PanelChartHandle,
    PanelHeaderActions,
    PanelHeaderState,
    PanelOverlayModeActions,
    PanelOverlayModeState,
} from './PanelTypes';
import type {
    ActiveAnnotationEditor,
    ApplyAnnotationChangeRequest,
} from './modal/EditAnnotationModal';
import type {
    ActiveHighlightEditor,
    ApplyHighlightChangeRequest,
} from './modal/EditHighlightModal';

type AnnotationEditorStateAndActions = {
    activeEditor: ActiveAnnotationEditor | undefined;
    annotation: SeriesAnnotation | undefined;
    seriesOptions: Array<{
        label: string;
        value: string;
    }>;
    onApplyAnnotationChange: (request: ApplyAnnotationChangeRequest) => boolean;
    onDeleteAnnotation: (activeEditor: ActiveAnnotationEditor | undefined) => void;
    onCancel: () => void;
    onApplied: () => void;
};

type HighlightEditorStateAndActions = {
    activeEditor: ActiveHighlightEditor | undefined;
    highlight: PanelHighlight | undefined;
    onApplyHighlightChange: (request: ApplyHighlightChangeRequest) => boolean;
    onCancel: () => void;
    onApplied: () => void;
};

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
    highlightEditor: HighlightEditorStateAndActions;
    editAnnotation: AnnotationEditorStateAndActions;
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
