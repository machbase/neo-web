import { ContextMenu } from '@/design-system/components';
import type { ContextMenuPosition } from '@/design-system/components';
import type {
    PanelActionHandlers,
    PanelRefreshHandlers,
} from '../utils/panelRuntimeTypes';

type BoardPanelContextMenuProps = {
    isOpen: boolean;
    position: ContextMenuPosition;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    isDragSelectActive: boolean;
    canToggleOverlap: boolean;
    canOpenFft: boolean;
    isSetGlobalTimeDisabled: boolean;
    actionHandlers: Pick<
        PanelActionHandlers,
        | 'onToggleOverlap'
        | 'onToggleRaw'
        | 'onToggleDragSelect'
        | 'onOpenFft'
        | 'onSetGlobalTime'
        | 'onOpenEdit'
    >;
    refreshHandlers: PanelRefreshHandlers;
    onClose: () => void;
    onOpenDeleteConfirm: () => void;
};

const BoardPanelContextMenu = ({
    isOpen,
    position,
    isRaw,
    isSelectedForOverlap,
    isDragSelectActive,
    canToggleOverlap,
    canOpenFft,
    isSetGlobalTimeDisabled,
    actionHandlers,
    refreshHandlers,
    onClose,
    onOpenDeleteConfirm,
}: BoardPanelContextMenuProps) => {
    const overlapContextMenuLabel = isSelectedForOverlap
        ? 'Disable overlap mode'
        : 'Enable overlap mode';
    const rawContextMenuLabel = isRaw
        ? 'Disable raw data mode'
        : 'Enable raw data mode';
    const dragSelectContextMenuLabel = isDragSelectActive
        ? 'Disable range selection'
        : 'Enable range selection';

    function runActionAfterClose(action: () => void | Promise<void>) {
        onClose();
        void action();
    }

    function handleDeleteConfirmOpen() {
        onClose();
        onOpenDeleteConfirm();
    }

    return (
        <ContextMenu isOpen={isOpen} position={position} onClose={onClose}>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(actionHandlers.onToggleOverlap)}
                disabled={!canToggleOverlap}
            >
                {overlapContextMenuLabel}
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(actionHandlers.onToggleRaw)}
            >
                {rawContextMenuLabel}
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(actionHandlers.onToggleDragSelect)}
            >
                {dragSelectContextMenuLabel}
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(actionHandlers.onOpenFft)}
                disabled={!canOpenFft}
            >
                Open FFT chart
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(actionHandlers.onSetGlobalTime)}
                disabled={isSetGlobalTimeDisabled}
            >
                Set global time
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(refreshHandlers.onRefreshData)}
            >
                Refresh data
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(refreshHandlers.onRefreshTime)}
            >
                Refresh time
            </ContextMenu.Item>
            <ContextMenu.Item
                onClick={() => runActionAfterClose(actionHandlers.onOpenEdit)}
            >
                Edit panel
            </ContextMenu.Item>
            <ContextMenu.Item onClick={handleDeleteConfirmOpen}>
                Delete panel
            </ContextMenu.Item>
        </ContextMenu>
    );
};

export default BoardPanelContextMenu;
