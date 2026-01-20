import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './index.module.scss';

export interface PopoverPosition {
    x: number;
    y: number;
}

export interface PopoverProps {
    isOpen: boolean;
    position: PopoverPosition;
    children: React.ReactNode;
    onClose?: () => void;
    closeOnOutsideClick?: boolean; // Default: false for Popover
    closeOnEscape?: boolean; // Default: true
    closeOnScroll?: boolean; // Default: true - close when page scrolls
}

/**
 * Popover Component
 *
 * A portal-based popover that displays custom content at a specific position.
 * Unlike ContextMenu, it doesn't close on outside click by default.
 * Useful for displaying data tables, charts, or other interactive content.
 */
const Popover = ({
    isOpen,
    position,
    children,
    onClose,
    closeOnOutsideClick = false,
    closeOnEscape = true,
    closeOnScroll = true
}: PopoverProps) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    // Adjust position to prevent overflow
    useEffect(() => {
        if (!isOpen || !popoverRef.current) return;

        const popoverRect = popoverRef.current.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let { x, y } = position;

        // Adjust horizontal position
        if (x + popoverRect.width > windowWidth) {
            x = windowWidth - popoverRect.width - 10; // 10px margin
        }

        // Adjust vertical position
        if (y + popoverRect.height > windowHeight) {
            y = windowHeight - popoverRect.height - 10; // 10px margin
        }

        // Ensure popover doesn't go off the left or top edge
        x = Math.max(10, x);
        y = Math.max(10, y);

        setAdjustedPosition({ x, y });
    }, [isOpen, position]);

    // Close on outside click (optional)
    useEffect(() => {
        if (!isOpen || !closeOnOutsideClick) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose?.();
            }
        };

        // Add listener after a small delay to avoid immediate closing
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, closeOnOutsideClick]);

    // Close on ESC key (optional)
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        document.addEventListener('keydown', handleEscKey);
        return () => document.removeEventListener('keydown', handleEscKey);
    }, [isOpen, onClose, closeOnEscape]);

    // Close on scroll (optional)
    useEffect(() => {
        if (!isOpen || !closeOnScroll) return;

        const handleScroll = () => {
            onClose?.();
        };

        // Listen to scroll events on window and all scrollable containers
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen, onClose, closeOnScroll]);

    if (!isOpen) return null;

    return createPortal(
        <div
            ref={popoverRef}
            className={styles['popover']}
            style={{
                position: 'fixed',
                top: `${adjustedPosition.y}px`,
                left: `${adjustedPosition.x}px`,
            }}
        >
            {children}
        </div>,
        document.body
    );
};

export { Popover };
