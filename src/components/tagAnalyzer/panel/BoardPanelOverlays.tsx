import type { Dispatch, SetStateAction } from 'react';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import BoardPanelContextMenu from '../panelModal/BoardPanelContextMenu';
import CreateSeriesAnnotationPopover from '../panelModal/CreateSeriesAnnotationPopover';
import HighlightRenamePopover from '../panelModal/HighlightRenamePopover';
import SeriesAnnotationPopover from '../panelModal/SeriesAnnotationPopover';
import type {
    CreateSeriesAnnotationPopoverState,
    HighlightRenameState,
    SeriesAnnotationPopoverState,
} from '../panelModal/PanelModalTypes';
import type {
    PanelActionHandlers,
    PanelRefreshHandlers,
} from '../utils/panelRuntimeTypes';

type BoardPanelOverlaysProps = {
    contextMenuState: {
        isOpen: boolean;
        position: {
            x: number;
            y: number;
        };
    };
    highlightRenameState: HighlightRenameState;
    createAnnotationPopoverState: CreateSeriesAnnotationPopoverState;
    annotationPopoverState: SeriesAnnotationPopoverState;
    createAnnotationSeriesOptions: Array<{
        label: string;
        value: string;
    }>;
    isDeleteModalOpen: boolean;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    isDragSelectActive: boolean;
    canToggleOverlap: boolean;
    canOpenFft: boolean;
    isSetGlobalTimeDisabled: boolean;
    actionHandlers: PanelActionHandlers;
    refreshHandlers: PanelRefreshHandlers;
    setIsDeleteModalOpen: Dispatch<SetStateAction<boolean>>;
    setHighlightRenameState: Dispatch<SetStateAction<HighlightRenameState>>;
    setCreateAnnotationPopoverState: Dispatch<SetStateAction<CreateSeriesAnnotationPopoverState>>;
    setAnnotationPopoverState: Dispatch<SetStateAction<SeriesAnnotationPopoverState>>;
    onCloseContextMenu: () => void;
    onOpenDeleteConfirm: () => void;
    onApplyHighlightRename: () => void;
    onCloseHighlightRename: () => void;
    onApplyCreateAnnotation: () => void;
    onCloseCreateAnnotation: () => void;
    onApplyAnnotation: () => void;
    onDeleteAnnotation: () => void;
    onCloseAnnotation: () => void;
};

const BoardPanelOverlays = ({
    contextMenuState,
    highlightRenameState,
    createAnnotationPopoverState,
    annotationPopoverState,
    createAnnotationSeriesOptions,
    isDeleteModalOpen,
    isRaw,
    isSelectedForOverlap,
    isDragSelectActive,
    canToggleOverlap,
    canOpenFft,
    isSetGlobalTimeDisabled,
    actionHandlers,
    refreshHandlers,
    setIsDeleteModalOpen,
    setHighlightRenameState,
    setCreateAnnotationPopoverState,
    setAnnotationPopoverState,
    onCloseContextMenu,
    onOpenDeleteConfirm,
    onApplyHighlightRename,
    onCloseHighlightRename,
    onApplyCreateAnnotation,
    onCloseCreateAnnotation,
    onApplyAnnotation,
    onDeleteAnnotation,
    onCloseAnnotation,
}: BoardPanelOverlaysProps) => {
    return (
        <>
            <BoardPanelContextMenu
                isOpen={contextMenuState.isOpen}
                position={contextMenuState.position}
                isRaw={isRaw}
                isSelectedForOverlap={isSelectedForOverlap}
                isDragSelectActive={isDragSelectActive}
                canToggleOverlap={canToggleOverlap}
                canOpenFft={canOpenFft}
                isSetGlobalTimeDisabled={isSetGlobalTimeDisabled}
                actionHandlers={actionHandlers}
                refreshHandlers={refreshHandlers}
                onClose={onCloseContextMenu}
                onOpenDeleteConfirm={onOpenDeleteConfirm}
            />
            <HighlightRenamePopover
                isOpen={highlightRenameState.isOpen}
                position={highlightRenameState.position}
                labelText={highlightRenameState.labelText}
                onLabelTextChange={(value) =>
                    setHighlightRenameState((prev) => ({
                        ...prev,
                        labelText: value,
                    }))
                }
                onApply={onApplyHighlightRename}
                onClose={onCloseHighlightRename}
            />
            <CreateSeriesAnnotationPopover
                isOpen={createAnnotationPopoverState.isOpen}
                position={createAnnotationPopoverState.position}
                seriesOptions={createAnnotationSeriesOptions}
                selectedSeriesValue={
                    createAnnotationPopoverState.seriesIndex !== undefined
                        ? String(createAnnotationPopoverState.seriesIndex)
                        : ''
                }
                yearText={createAnnotationPopoverState.yearText}
                monthText={createAnnotationPopoverState.monthText}
                dayText={createAnnotationPopoverState.dayText}
                labelText={createAnnotationPopoverState.labelText}
                onSeriesValueChange={(value) =>
                    setCreateAnnotationPopoverState((prev) => ({
                        ...prev,
                        seriesIndex: Number.isInteger(Number(value)) ? Number(value) : undefined,
                    }))
                }
                onYearTextChange={(value) =>
                    setCreateAnnotationPopoverState((prev) => ({
                        ...prev,
                        yearText: value,
                    }))
                }
                onMonthTextChange={(value) =>
                    setCreateAnnotationPopoverState((prev) => ({
                        ...prev,
                        monthText: value,
                    }))
                }
                onDayTextChange={(value) =>
                    setCreateAnnotationPopoverState((prev) => ({
                        ...prev,
                        dayText: value,
                    }))
                }
                onLabelTextChange={(value) =>
                    setCreateAnnotationPopoverState((prev) => ({
                        ...prev,
                        labelText: value,
                    }))
                }
                onApply={onApplyCreateAnnotation}
                onClose={onCloseCreateAnnotation}
            />
            <SeriesAnnotationPopover
                isOpen={annotationPopoverState.isOpen}
                position={annotationPopoverState.position}
                labelText={annotationPopoverState.labelText}
                onLabelTextChange={(value) =>
                    setAnnotationPopoverState((prev) => ({
                        ...prev,
                        labelText: value,
                    }))
                }
                onApply={onApplyAnnotation}
                onDelete={onDeleteAnnotation}
                onClose={onCloseAnnotation}
            />
            {isDeleteModalOpen && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModalOpen}
                    pCallback={actionHandlers.onDelete}
                    pContents={<div className="body-content">Do you want to delete this panel?</div>}
                />
            )}
        </>
    );
};

export default BoardPanelOverlays;
