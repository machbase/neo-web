import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import PanelContextMenu from './modal/PanelContextMenu';
import CreateSeriesAnnotationPopover from './modal/CreateSeriesAnnotationPopover';
import EditSeriesAnnotationPopover from './modal/EditSeriesAnnotationPopover';
import HighlightRenamePopover from './modal/HighlightRenamePopover';
import type {
    ContextMenuOverlay,
    CreateAnnotationOverlay,
    DeletePanelOverlay,
    EditAnnotationOverlay,
    ExportCsvOverlay,
    HighlightRenameOverlay,
} from './modal/PanelModalTypes';

function PanelOverlays({
    contextMenu,
    highlightRename,
    createAnnotation,
    editAnnotation,
    deletePanel,
    exportCsv,
}: {
    contextMenu: ContextMenuOverlay;
    highlightRename: HighlightRenameOverlay;
    createAnnotation: CreateAnnotationOverlay;
    editAnnotation: EditAnnotationOverlay;
    deletePanel: DeletePanelOverlay;
    exportCsv: ExportCsvOverlay;
}) {
    function handleDeleteModalOpenChange(isOpen: boolean) {
        if (!isOpen) {
            deletePanel.onClose();
        }
    }

    return (
        <>
            {contextMenu.state.isOpen && (
                <PanelContextMenu
                    position={contextMenu.state.position}
                    pViewState={contextMenu.viewState}
                    pContextMenuActions={contextMenu.actions}
                    onClose={contextMenu.onClose}
                />
            )}
            {highlightRename.state.isOpen && (
                <HighlightRenamePopover
                    position={highlightRename.state.position}
                    labelText={highlightRename.state.labelText}
                    fillColor={highlightRename.state.fillColor}
                    textColor={highlightRename.state.textColor}
                    onLabelTextChange={highlightRename.actions.updateLabelText}
                    onFillColorChange={highlightRename.actions.updateFillColor}
                    onTextColorChange={highlightRename.actions.updateTextColor}
                    onApply={highlightRename.actions.apply}
                    onClose={highlightRename.actions.close}
                />
            )}
            {createAnnotation.state.isOpen && (
                <CreateSeriesAnnotationPopover
                    position={createAnnotation.state.position}
                    seriesOptions={createAnnotation.seriesOptions}
                    selectedSeriesValue={
                        createAnnotation.state.seriesIndex !== undefined
                            ? String(createAnnotation.state.seriesIndex)
                            : ''
                    }
                    yearText={createAnnotation.state.yearText}
                    monthText={createAnnotation.state.monthText}
                    dayText={createAnnotation.state.dayText}
                    labelText={createAnnotation.state.labelText}
                    onSeriesValueChange={createAnnotation.actions.updateSeriesValue}
                    onYearTextChange={createAnnotation.actions.updateYearText}
                    onMonthTextChange={createAnnotation.actions.updateMonthText}
                    onDayTextChange={createAnnotation.actions.updateDayText}
                    onLabelTextChange={createAnnotation.actions.updateLabelText}
                    onApply={createAnnotation.actions.apply}
                    onClose={createAnnotation.actions.close}
                />
            )}
            {editAnnotation.state.isOpen && (
                <EditSeriesAnnotationPopover
                    position={editAnnotation.state.position}
                    labelText={editAnnotation.state.labelText}
                    onLabelTextChange={editAnnotation.actions.updateLabelText}
                    onApply={editAnnotation.actions.apply}
                    onDelete={editAnnotation.actions.deleteAnnotation}
                    onClose={editAnnotation.actions.close}
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
