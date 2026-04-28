import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Input, Popover } from '@/design-system/components';
import type { ContextMenuPosition } from '@/design-system/components';

/**
 * Renders the inline annotation editor used for creating and editing one saved series annotation.
 * Intent: Keep annotation text entry close to the chart click that opened it.
 * @param props The popup state and annotation editor callbacks.
 * @returns The portal-based annotation editor popover.
 */
const EditSeriesAnnotationPopover = ({
    position,
    labelText,
    onLabelTextChange,
    onApply,
    onDelete,
    onClose,
}: {
    position: ContextMenuPosition;
    labelText: string;
    onLabelTextChange: (value: string) => void;
    onApply: () => void;
    onDelete: () => void;
    onClose: () => void;
}) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    /**
     * Applies or cancels the editor with keyboard shortcuts.
     * Intent: Keep annotation editing quick when the user is placing multiple notes.
     * @param event The keyboard event from the annotation input.
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
                    minWidth: '300px',
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
                    Edit series annotation
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
                    <Button size="sm" variant="ghost" onClick={onDelete}>
                        Delete
                    </Button>
                    <Button size="sm" onClick={onApply}>
                        Apply
                    </Button>
                </div>
            </div>
        </Popover>
    );
};

export default EditSeriesAnnotationPopover;
