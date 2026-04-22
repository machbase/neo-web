import { ContextMenu } from '@/design-system/components';
import type { ContextMenuPosition } from '@/design-system/components';
import type {
    PanelActionHandlers,
    PanelRefreshHandlers,
} from '../utils/panelRuntimeTypes';

type PanelContextMenuProps = {
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

/**
 * Renders the right-click action menu for a TagAnalyzer panel.
 * Intent: Keep the menu layout and close-then-run behavior separate from PanelContainer.
 * @param props The current panel state, enabled flags, and action handlers.
 * @returns The portal-based panel context menu.
 */
const PanelContextMenu = ({
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
}: PanelContextMenuProps) => {
    const overlapContextMenuLabel = isSelectedForOverlap
        ? 'Disable overlap mode'
        : 'Enable overlap mode';
    const rawContextMenuLabel = isRaw
        ? 'Disable raw data mode'
        : 'Enable raw data mode';
    const dragSelectContextMenuLabel = isDragSelectActive
        ? 'Disable range selection'
        : 'Enable range selection';

    /**
     * Closes the menu first, then runs the chosen action.
     * Intent: Keep each menu item focused on a single panel command.
     * @param aAction The panel action to run after the menu closes.
     * @returns Nothing.
     */
    function runActionAfterClose(aAction: () => void | Promise<void>) {
        onClose();
        void aAction();
    }

    /**
     * Closes the menu first, then opens the delete confirmation flow.
     * Intent: Keep destructive actions behind confirmation while removing the menu from view.
     * @returns Nothing.
     */
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

export default PanelContextMenu;
