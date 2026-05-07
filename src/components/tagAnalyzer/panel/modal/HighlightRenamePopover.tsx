import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Input, Popover } from '@/design-system/components';
import type { ContextMenuPosition } from '@/design-system/components';

const HighlightRenamePopover = ({
    position,
    labelText,
    fillColor,
    textColor,
    onLabelTextChange,
    onFillColorChange,
    onTextColorChange,
    onApply,
    onClose,
}: {
    position: ContextMenuPosition;
    labelText: string;
    fillColor: string;
    textColor: string;
    onLabelTextChange: (value: string) => void;
    onFillColorChange: (value: string) => void;
    onTextColorChange: (value: string) => void;
    onApply: () => void;
    onClose: () => void;
}) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

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
                    Edit highlight
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                    <label style={{ display: 'grid', gap: '4px', fontSize: '12px', color: '#afb5bc' }}>
                        Label
                        <Input
                            ref={inputRef}
                            aria-label="Highlight label"
                            value={labelText}
                            onChange={(event) => onLabelTextChange(event.target.value)}
                            onKeyDown={handleKeyDown}
                            fullWidth
                            size="sm"
                        />
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <label style={{ display: 'grid', gap: '4px', fontSize: '12px', color: '#afb5bc' }}>
                            Fill color
                            <input
                                aria-label="Highlight fill color"
                                type="color"
                                value={fillColor}
                                onChange={(event) => onFillColorChange(event.target.value)}
                                style={{
                                    width: '100%',
                                    height: '32px',
                                    borderRadius: '4px',
                                    border: '0.5px solid #454545',
                                    backgroundColor: '#252525',
                                    padding: '2px 4px',
                                }}
                            />
                        </label>
                        <label style={{ display: 'grid', gap: '4px', fontSize: '12px', color: '#afb5bc' }}>
                            Text color
                            <input
                                aria-label="Highlight text color"
                                type="color"
                                value={textColor}
                                onChange={(event) => onTextColorChange(event.target.value)}
                                style={{
                                    width: '100%',
                                    height: '32px',
                                    borderRadius: '4px',
                                    border: '0.5px solid #454545',
                                    backgroundColor: '#252525',
                                    padding: '2px 4px',
                                }}
                            />
                        </label>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '4px',
                            backgroundColor: `${fillColor}29`,
                            color: textColor,
                            border: `0.5px solid ${fillColor}`,
                            fontSize: '12px',
                        }}
                    >
                        {labelText.trim() || 'unnamed'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button size="sm" onClick={onApply}>
                            Apply
                        </Button>
                    </div>
                </div>
            </div>
        </Popover>
    );
};

export default HighlightRenamePopover;
