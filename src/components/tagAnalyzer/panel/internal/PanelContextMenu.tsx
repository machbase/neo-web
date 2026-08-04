import {
    ContextMenu,
    type ContextMenuPosition,
} from '@/design-system/components';
import {
    buildPanelActions,
    type PanelActionKey,
    type PanelActionState,
} from './panelActions';

type PanelContextMenuProps = {
    actionState: PanelActionState;
    position: ContextMenuPosition;
    onClose: () => void;
    onAction: (actionKey: PanelActionKey) => void;
};

export function PanelContextMenu({
    actionState,
    position,
    onClose,
    onAction,
}: PanelContextMenuProps) {
    const sActions = buildPanelActions(actionState);

    return (
        <ContextMenu isOpen position={position} onClose={onClose}>
            {sActions
                .filter((action) => action.showInContextMenu)
                .map((sAction) => (
                    <ContextMenu.Item
                        key={sAction.key}
                        onClick={() => {
                            onClose();
                            onAction(sAction.key);
                        }}
                        disabled={sAction.disabled}
                    >
                        {sAction.contextLabel ?? sAction.label}
                    </ContextMenu.Item>
                ))}
        </ContextMenu>
    );
}
