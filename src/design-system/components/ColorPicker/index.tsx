import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CompactPicker, ColorResult } from 'react-color';
import { Button } from '../Button';
import styles from './index.module.scss';

export interface ColorPickerProps {
    /**
     * Current color value
     */
    color: string;
    /**
     * Callback when color changes
     */
    onChange: (color: string) => void;
    /**
     * Whether the color picker is disabled
     */
    disabled?: boolean;
    /**
     * Tooltip ID for the button
     */
    tooltipId?: string;
    /**
     * Tooltip content for the button
     */
    tooltipContent?: string;
    /**
     * Additional className for the wrapper
     */
    className?: string;
}

export const ColorPicker = ({ color, onChange, disabled = false, tooltipId, tooltipContent = 'Color', className }: ColorPickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0, showAbove: false });
    const buttonRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Calculate picker position based on button position
    const updatePosition = useCallback(() => {
        if (!buttonRef.current) {
            return;
        }

        const buttonRect = buttonRef.current.getBoundingClientRect();
        const pickerWidth = 240; // Approximate width of CompactPicker
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        const gap = 4;

        // Determine if picker should show above button
        const shouldShowAbove = spaceBelow < 250 && spaceAbove > spaceBelow;

        let top: number;
        let left = buttonRect.left;

        if (shouldShowAbove) {
            // Show above: position picker bottom at button top
            top = buttonRect.top - gap;
        } else {
            // Show below: position picker top at button bottom
            top = buttonRect.bottom + gap;
        }

        // Check if picker would overflow viewport on the right
        if (left + pickerWidth > window.innerWidth) {
            left = buttonRect.right - pickerWidth;
        }

        setPosition({ top, left, showAbove: shouldShowAbove });
    }, []);

    // Update position when picker opens
    useEffect(() => {
        if (isOpen) {
            updatePosition();
        }
    }, [isOpen]);

    // Update position on scroll and resize
    useEffect(() => {
        if (!isOpen) return;

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, updatePosition]);

    // Handle clicks outside to close the picker
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && pickerRef.current && buttonRef.current && !pickerRef.current.contains(event.target as Node) && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Handle ESC key to close the picker
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (isOpen && event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscKey);
        return () => {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [isOpen]);

    const handleColorChange = (colorResult: ColorResult) => {
        onChange(colorResult.hex);
    };

    // Handle click events on the picker portal to detect swatch clicks
    const handlePickerClick = (event: React.MouseEvent) => {
        const target = event.target as HTMLElement;
        // Check if clicked element is a color swatch (has specific structure)
        const isSwatch = target.style?.backgroundColor || target.parentElement?.style?.backgroundColor;
        const isInput = target.tagName === 'INPUT' || target.closest('input');

        if (isSwatch && !isInput) {
            setIsOpen(false);
        }
    };

    return (
        <div ref={buttonRef} className={`${styles.colorPicker} ${className || ''}`}>
            <Button
                size="side"
                variant="secondary"
                disabled={disabled}
                icon={
                    <div
                        className={styles.colorSwatch}
                        style={{
                            backgroundColor: color,
                        }}
                    />
                }
                onClick={() => setIsOpen(!isOpen)}
                data-tooltip-id={tooltipId}
                data-tooltip-content={tooltipContent}
            />

            {isOpen &&
                createPortal(
                    <div
                        ref={pickerRef}
                        className={styles.colorPickerPortal}
                        style={{
                            position: 'fixed',
                            ...(position.showAbove
                                ? {
                                      bottom: `${window.innerHeight - position.top}px`,
                                      top: 'auto',
                                  }
                                : {
                                      top: `${position.top}px`,
                                  }),
                            left: `${position.left}px`,
                            zIndex: 9999,
                        }}
                        onClick={handlePickerClick}
                    >
                        <CompactPicker color={color} onChangeComplete={handleColorChange} />
                    </div>,
                    document.body
                )}
        </div>
    );
};
