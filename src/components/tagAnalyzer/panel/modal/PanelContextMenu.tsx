import { ContextMenu } from '@/design-system/components';
import type { PanelOverlayMode } from '../../domain/PanelChartModel';

const PanelContextMenu = ({
    headerState: pHeaderState,
    overlayMode,
    isEditing,
    isRaw,
    onToggleOverlap,
    onToggleRaw,
    onToggleDragSelect,
    onOpenFft,
    onSetGlobalTime,
    onRefreshData,
    onRefreshTime,
    onToggleEdit,
    onOpenDeleteConfirm,
    isOverlap,
    position,
    onClose,
}: {
    headerState: {
        canSetGlobalTime: boolean;
    };
    overlayMode: PanelOverlayMode;
    isEditing: boolean;
    isRaw: boolean;
    onToggleOverlap: () => void;
    onToggleRaw: () => void;
    onToggleDragSelect: () => void;
    onOpenFft: (() => void) | undefined;
    onSetGlobalTime: () => void;
    onRefreshData: () => void;
    onRefreshTime: () => void;
    onToggleEdit: () => void;
    onOpenDeleteConfirm: () => void;
    isOverlap: boolean;
    position: { x: number; y: number };
    onClose: () => void;
}) => {
    const overlapContextMenuLabel = isOverlap
        ? 'Disable overlap mode'
        : 'Enable overlap mode';
    const rawContextMenuLabel = isRaw
        ? 'Disable raw data mode'
        : 'Enable raw data mode';
    const dragSelectContextMenuLabel = overlayMode === 'dragSelect'
        ? 'Disable range selection'
        : 'Enable range selection';
    const editContextMenuLabel = isEditing
        ? 'Close editor'
        : 'Edit panel';
    const contextMenuItems = [
        {
            label: overlapContextMenuLabel,
            action: onToggleOverlap,
        },
        {
            label: rawContextMenuLabel,
            action: onToggleRaw,
        },
        {
            label: dragSelectContextMenuLabel,
            action: onToggleDragSelect,
        },
        {
            label: 'Open FFT chart',
            action: onOpenFft ?? (() => undefined),
            disabled: !onOpenFft,
        },
        {
            label: 'Set global time',
            action: onSetGlobalTime,
            disabled: !pHeaderState.canSetGlobalTime,
        },
        {
            label: 'Refresh data',
            action: onRefreshData,
        },
        {
            label: 'Refresh time',
            action: onRefreshTime,
        },
        {
            label: editContextMenuLabel,
            action: onToggleEdit,
        },
        {
            label: 'Delete panel',
            action: onOpenDeleteConfirm,
        },
    ];

    function runActionAfterClose(action: () => void) {
        onClose();
        action();
    }

    return (
        <ContextMenu
            isOpen
            position={position}
            onClose={onClose}
        >
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
