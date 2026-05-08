import { ContextMenu } from '@/design-system/components';
import type {
    PanelHeaderActions,
    PanelHeaderState,
    PanelOverlayModeActions,
    PanelOverlayModeState,
} from '../PanelTypes';

const PanelContextMenu = ({
    position,
    pHeaderState,
    pHeaderActions,
    pOverlayModeState,
    pOverlayModeActions,
    onClose,
}: {
    position: PanelHeaderState['contextMenu']['position'];
    pHeaderState: PanelHeaderState;
    pHeaderActions: PanelHeaderActions;
    pOverlayModeState: PanelOverlayModeState;
    pOverlayModeActions: PanelOverlayModeActions;
    onClose: () => void;
}) => {
    const overlapContextMenuLabel = pHeaderState.isSelectedForOverlap
        ? 'Disable overlap mode'
        : 'Enable overlap mode';
    const rawContextMenuLabel = pHeaderState.isRaw
        ? 'Disable raw data mode'
        : 'Enable raw data mode';
    const dragSelectContextMenuLabel = pOverlayModeState.isDragSelectActive
        ? 'Disable range selection'
        : 'Enable range selection';
    const editContextMenuLabel = pOverlayModeState.isEditing
        ? 'Close editor'
        : 'Edit panel';
    const contextMenuItems = [
        {
            label: overlapContextMenuLabel,
            action: pHeaderActions.onToggleOverlap,
            disabled: !pHeaderState.contextMenu.isOverlapToggleAvailable,
        },
        { label: rawContextMenuLabel, action: pHeaderActions.onToggleRaw },
        {
            label: dragSelectContextMenuLabel,
            action: pOverlayModeActions.onToggleDragSelect,
        },
        {
            label: 'Open FFT chart',
            action: pOverlayModeActions.onOpenFft,
            disabled: !pHeaderState.canOpenFft,
        },
        {
            label: 'Set global time',
            action: pHeaderActions.onSetGlobalTime,
            disabled: !pHeaderState.canSetGlobalTime,
        },
        { label: 'Refresh data', action: pHeaderActions.onRefreshData },
        { label: 'Refresh time', action: pHeaderActions.onRefreshTime },
        { label: editContextMenuLabel, action: pOverlayModeActions.onToggleEdit },
        { label: 'Delete panel', action: pHeaderActions.onOpenDeleteConfirm },
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
