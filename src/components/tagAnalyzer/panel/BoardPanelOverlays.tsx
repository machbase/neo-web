import { ConfirmModal } from '@/components/modal/ConfirmModal';
import BoardPanelContextMenu from './modal/BoardPanelContextMenu';
import CreateSeriesAnnotationPopover from './modal/CreateSeriesAnnotationPopover';
import EditSeriesAnnotationPopover from './modal/EditSeriesAnnotationPopover';
import HighlightRenamePopover from './modal/HighlightRenamePopover';
import type {
    AnnotationModalBundle,
    CreateAnnotationModalBundle,
    ContextMenuModalBundle,
    DeletePanelModalBundle,
    HighlightRenameModalBundle,
} from './modal/PanelModalTypes';

function BoardPanelOverlays({
    contextMenuModalBundle,
    highlightRenameModalBundle,
    createAnnotationModalBundle,
    annotationModalBundle,
    deletePanelModalBundle,
}: {
    contextMenuModalBundle: ContextMenuModalBundle;
    highlightRenameModalBundle: HighlightRenameModalBundle;
    createAnnotationModalBundle: CreateAnnotationModalBundle;
    annotationModalBundle: AnnotationModalBundle;
    deletePanelModalBundle: DeletePanelModalBundle;
}) {
    return (
        <>
            {contextMenuModalBundle.state.isOpen && (
                <BoardPanelContextMenu
                    position={contextMenuModalBundle.state.position}
                    pPresentationState={contextMenuModalBundle.pPresentationState}
                    pActionHandlers={contextMenuModalBundle.pActionHandlers}
                    pRefreshHandlers={contextMenuModalBundle.pRefreshHandlers}
                    onClose={contextMenuModalBundle.onClose}
                    onOpenDeleteConfirm={contextMenuModalBundle.onOpenDeleteConfirm}
                />
            )}
            {highlightRenameModalBundle.state.isOpen && (
                <HighlightRenamePopover
                    position={highlightRenameModalBundle.state.position}
                    labelText={highlightRenameModalBundle.state.labelText}
                    onLabelTextChange={highlightRenameModalBundle.onLabelTextChange}
                    onApply={highlightRenameModalBundle.onApply}
                    onClose={highlightRenameModalBundle.onClose}
                />
            )}
            {createAnnotationModalBundle.state.isOpen && (
                <CreateSeriesAnnotationPopover
                    position={createAnnotationModalBundle.state.position}
                    seriesOptions={createAnnotationModalBundle.seriesOptions}
                    selectedSeriesValue={
                        createAnnotationModalBundle.state.seriesIndex !== undefined
                            ? String(createAnnotationModalBundle.state.seriesIndex)
                            : ''
                    }
                    yearText={createAnnotationModalBundle.state.yearText}
                    monthText={createAnnotationModalBundle.state.monthText}
                    dayText={createAnnotationModalBundle.state.dayText}
                    labelText={createAnnotationModalBundle.state.labelText}
                    onSeriesValueChange={createAnnotationModalBundle.onSeriesValueChange}
                    onYearTextChange={createAnnotationModalBundle.onYearTextChange}
                    onMonthTextChange={createAnnotationModalBundle.onMonthTextChange}
                    onDayTextChange={createAnnotationModalBundle.onDayTextChange}
                    onLabelTextChange={createAnnotationModalBundle.onLabelTextChange}
                    onApply={createAnnotationModalBundle.onApply}
                    onClose={createAnnotationModalBundle.onClose}
                />
            )}
            {annotationModalBundle.state.isOpen && (
                <EditSeriesAnnotationPopover
                    position={annotationModalBundle.state.position}
                    labelText={annotationModalBundle.state.labelText}
                    onLabelTextChange={annotationModalBundle.onLabelTextChange}
                    onApply={annotationModalBundle.onApply}
                    onDelete={annotationModalBundle.onDelete}
                    onClose={annotationModalBundle.onClose}
                />
            )}
            {deletePanelModalBundle.isOpen && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={deletePanelModalBundle.setIsOpen}
                    pCallback={deletePanelModalBundle.onDelete}
                    pContents={
                        <div className="body-content">Do you want to delete this panel?</div>
                    }
                />
            )}
        </>
    );
}

export default BoardPanelOverlays;
