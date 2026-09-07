import {
    ContextMenu,
    type ContextMenuPosition,
} from '@/design-system/components';
import {
    buildPanelActions,
    type PanelActionKey,
    type PanelActionState,
} from './panelActions';

export function PanelContextMenu({
    actionState,
    position,
    onClose,
    onAction,
}: PanelContextMenuProps) {
    return (
        <ContextMenu isOpen position={position} onClose={onClose} data-testid="tag-analyzer-panel-context-menu">
            {buildPanelActions(actionState)
                .filter((action) => action.showInContextMenu)
                .map((sAction) => (
                    <ContextMenu.Item
                        key={sAction.key}
                        data-testid={`action-${sAction.key}`}
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

// -------------------- Local --------------------

type PanelContextMenuProps = {
    actionState: PanelActionState;
    position: ContextMenuPosition;
    onClose: () => void;
    onAction: (actionKey: PanelActionKey) => void;
};
