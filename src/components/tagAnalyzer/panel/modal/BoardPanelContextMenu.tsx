import { ContextMenu } from '@/design-system/components';
import type { ContextMenuPosition } from '@/design-system/components';
import type {
    PanelActionHandlers,
    PanelPresentationState,
    PanelRefreshHandlers,
} from '../PanelTypes';

const BoardPanelContextMenu = ({
    position,
    pPresentationState,
    pActionHandlers,
    pRefreshHandlers,
    onClose,
    onOpenDeleteConfirm,
}: {
    position: ContextMenuPosition;
    pPresentationState: Pick<
        PanelPresentationState,
        | 'isEdit'
        | 'isRaw'
        | 'isSelectedForOverlap'
        | 'isDragSelectActive'
        | 'canToggleOverlap'
        | 'canOpenFft'
        | 'canSetGlobalTime'
    >;
    pActionHandlers: Pick<
        PanelActionHandlers,
        | 'onToggleOverlap'
        | 'onToggleRaw'
        | 'onToggleDragSelect'
        | 'onToggleEdit'
        | 'onOpenFft'
        | 'onSetGlobalTime'
    >;
    pRefreshHandlers: PanelRefreshHandlers;
    onClose: () => void;
    onOpenDeleteConfirm: () => void;
}) => {
    const overlapContextMenuLabel = pPresentationState.isSelectedForOverlap
        ? 'Disable overlap mode'
        : 'Enable overlap mode';
    const rawContextMenuLabel = pPresentationState.isRaw
        ? 'Disable raw data mode'
        : 'Enable raw data mode';
    const dragSelectContextMenuLabel = pPresentationState.isDragSelectActive
        ? 'Disable range selection'
        : 'Enable range selection';
    const editContextMenuLabel = pPresentationState.isEdit ? 'Close editor' : 'Edit panel';

    function runActionAfterClose(action: () => void | Promise<void>) {
        onClose();
        void action();
    }

    function handleDeleteConfirmOpen() {
        onClose();
        onOpenDeleteConfirm();
    }

    return (
        <ContextMenu isOpen position={position} onClose={onClose}>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(pActionHandlers.onToggleOverlap)}
                disabled={!pPresentationState.canToggleOverlap}
            >
                {overlapContextMenuLabel}
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(pActionHandlers.onToggleRaw)}
            >
                {rawContextMenuLabel}
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(pActionHandlers.onToggleDragSelect)}
            >
                {dragSelectContextMenuLabel}
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(pActionHandlers.onOpenFft)}
                disabled={!pPresentationState.canOpenFft}
            >
                Open FFT chart
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(pActionHandlers.onSetGlobalTime)}
                disabled={!pPresentationState.canSetGlobalTime}
            >
                Set global time
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(pRefreshHandlers.onRefreshData)}
            >
                Refresh data
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(pRefreshHandlers.onRefreshTime)}
            >
                Refresh time
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(pActionHandlers.onToggleEdit)}
            >
                {editContextMenuLabel}
            </ContextMenu.Item>
            <ContextMenu.Item onClick={handleDeleteConfirmOpen}>
                Delete panel
            </ContextMenu.Item>
        </ContextMenu>
    );
};

export default BoardPanelContextMenu;
