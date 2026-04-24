import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Input, Popover } from '@/design-system/components';
import type { HighlightRenamePopoverProps } from './PanelModalTypes';

/**
 * Renders the small highlight rename popup with an input and apply action.
 * Intent: Use ordinary HTML form controls for highlight editing instead of trying to edit inside the chart canvas.
 * @param props The popup state and rename action handlers.
 * @returns The portal-based highlight rename popup.
 */
const HighlightRenamePopover = ({
    isOpen,
    position,
    labelText,
    onLabelTextChange,
    onApply,
    onClose,
}: HighlightRenamePopoverProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        inputRef.current?.focus();
        inputRef.current?.select();
    }, [isOpen]);

    /**
     * Applies the rename when the user presses Enter and closes on Escape.
     * Intent: Support quick keyboard-based highlight renaming.
     * @param aEvent The keyboard event from the rename input.
     * @returns Nothing.
     */
    function handleKeyDown(aEvent: KeyboardEvent<HTMLInputElement>) {
        if (aEvent.key === 'Enter') {
            onApply();
            return;
        }

        if (aEvent.key === 'Escape') {
            onClose();
        }
    }

    return (
        <Popover
            isOpen={isOpen}
            position={position}
            onClose={onClose}
            closeOnOutsideClick
        >
            <div
                style={{
                    minWidth: '280px',
                    padding: '12px',
                    backgroundColor: '#1e1e1e',
                    border: '0.5px solid #454545',
                    borderRadius: '4px',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
                }}
            >
                <div
                    style={{
                        marginBottom: '8px',
                        fontSize: '12px',
                        color: '#afb5bc',
                    }}
                >
                    Rename highlight label
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
                    <Input
                        ref={inputRef}
                        value={labelText}
                        onChange={(aEvent) => onLabelTextChange(aEvent.target.value)}
                        onKeyDown={handleKeyDown}
                        fullWidth
                        size="sm"
                    />
                    <Button size="sm" onClick={onApply}>
                        Apply
                    </Button>
                </div>
            </div>
        </Popover>
    );
};

export default HighlightRenamePopover;
