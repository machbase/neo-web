import { ContextMenu } from '@/design-system/components';
import type { ContextMenuPosition } from '@/design-system/components';
import type {
    PanelContextMenuActions,
    PanelContextMenuViewState,
} from '../PanelTypes';

const PanelContextMenu = ({
    position,
    pViewState,
    pContextMenuActions,
    onClose,
}: {
    position: ContextMenuPosition;
    pViewState: PanelContextMenuViewState;
    pContextMenuActions: PanelContextMenuActions;
    onClose: () => void;
}) => {
    const overlapContextMenuLabel = pViewState.isSelectedForOverlap
        ? 'Disable overlap mode'
        : 'Enable overlap mode';
    const rawContextMenuLabel = pViewState.isRaw
        ? 'Disable raw data mode'
        : 'Enable raw data mode';
    const dragSelectContextMenuLabel = pViewState.isDragSelectActive
        ? 'Disable range selection'
        : 'Enable range selection';
    const editContextMenuLabel = pViewState.isEditing ? 'Close editor' : 'Edit panel';
    const contextMenuItems = [
        {
            label: overlapContextMenuLabel,
            action: pContextMenuActions.onToggleOverlap,
            disabled: !pViewState.isOverlapToggleAvailable,
        },
        { label: rawContextMenuLabel, action: pContextMenuActions.onToggleRaw },
        {
            label: dragSelectContextMenuLabel,
            action: pContextMenuActions.onToggleDragSelect,
        },
        {
            label: 'Open FFT chart',
            action: pContextMenuActions.onOpenFft,
            disabled: !pViewState.canOpenFft,
        },
        {
            label: 'Set global time',
            action: pContextMenuActions.onSetGlobalTime,
            disabled: !pViewState.canSetGlobalTime,
        },
        { label: 'Refresh data', action: pContextMenuActions.onRefreshData },
        { label: 'Refresh time', action: pContextMenuActions.onRefreshTime },
        { label: editContextMenuLabel, action: pContextMenuActions.onToggleEdit },
        { label: 'Delete panel', action: pContextMenuActions.onOpenDeleteConfirm },
    ];

    function runActionAfterClose(action: () => void) {
        onClose();
        action();
    }

    return (
        <ContextMenu isOpen position={position} onClose={onClose}>
            {contextMenuItems.map((item) => (
                <ContextMenu.Item
                    key={item.label}
                    onClick={() => runActionAfterClose(item.action)}
                    disabled={item.disabled}
                >
                    {item.label}
                </ContextMenu.Item>
            ))}
        </ContextMenu>
    );
};

export default PanelContextMenu;
