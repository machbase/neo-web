import { ContextMenu } from '@/design-system/components';
import type { PanelOverlapSelection } from '../PanelContainer';
import type {
    PanelHeaderCommandDispatch,
    PanelHeaderState,
    PanelOverlayModeDispatch,
    PanelOverlayModeState,
} from '../PanelTypes';

const PanelContextMenu = ({
    headerState: pHeaderState,
    overlayModeState: pOverlayModeState,
    dispatchHeaderCommand: pHeaderCommandDispatch,
    dispatchOverlayModeCommand: pOverlayModeDispatch,
    overlapSelection,
    position,
    onClose,
}: {
    headerState: PanelHeaderState;
    overlayModeState: PanelOverlayModeState;
    dispatchHeaderCommand: PanelHeaderCommandDispatch;
    dispatchOverlayModeCommand: PanelOverlayModeDispatch;
    overlapSelection: PanelOverlapSelection;
    position: { x: number; y: number };
    onClose: () => void;
}) => {
    const overlapContextMenuLabel = overlapSelection.isSelected
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
            action: () => pHeaderCommandDispatch({ type: 'toggle-overlap' }),
            disabled: !overlapSelection.canToggle,
        },
        {
            label: rawContextMenuLabel,
            action: () => pHeaderCommandDispatch({ type: 'toggle-raw' }),
        },
        {
            label: dragSelectContextMenuLabel,
            action: () => pOverlayModeDispatch({ type: 'toggle-drag-select' }),
        },
        {
            label: 'Open FFT chart',
            action: () => pOverlayModeDispatch({ type: 'open-fft' }),
            disabled: !pHeaderState.canOpenFft,
        },
        {
            label: 'Set global time',
            action: () => pHeaderCommandDispatch({ type: 'set-global-time' }),
            disabled: !pHeaderState.canSetGlobalTime,
        },
        {
            label: 'Refresh data',
            action: () => pHeaderCommandDispatch({ type: 'refresh-data' }),
        },
        {
            label: 'Refresh time',
            action: () => pHeaderCommandDispatch({ type: 'refresh-time' }),
        },
        {
            label: editContextMenuLabel,
            action: () => pOverlayModeDispatch({ type: 'toggle-edit' }),
        },
        {
            label: 'Delete panel',
            action: () => pHeaderCommandDispatch({ type: 'open-delete-confirm' }),
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
