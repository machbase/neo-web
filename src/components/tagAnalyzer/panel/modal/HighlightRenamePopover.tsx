import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Input, Popover } from '@/design-system/components';
import type { ContextMenuPosition } from '@/design-system/components';

/**
 * Renders the small highlight rename popup with an input and apply action.
 * Intent: Use ordinary HTML form controls for highlight editing instead of trying to edit inside the chart canvas.
 * @param props The popup state and rename action handlers.
 * @returns The portal-based highlight rename popup.
 */
const HighlightRenamePopover = ({
    position,
    labelText,
    onLabelTextChange,
    onApply,
    onClose,
}: {
    position: ContextMenuPosition;
    labelText: string;
    onLabelTextChange: (value: string) => void;
    onApply: () => void;
    onClose: () => void;
}) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    /**
     * Applies the rename when the user presses Enter and closes on Escape.
     * Intent: Support quick keyboard-based highlight renaming.
     * @param event The keyboard event from the rename input.
     * @returns Nothing.
     */
    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            onApply();
            return;
        }

        if (event.key === 'Escape') {
            onClose();
        }
    }

    return (
        <Popover
            isOpen
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
                        onChange={(event) => onLabelTextChange(event.target.value)}
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
