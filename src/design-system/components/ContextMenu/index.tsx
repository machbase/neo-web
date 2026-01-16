import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../Menu/index.module.scss'; // Reuse Menu styles

export interface ContextMenuPosition {
    x: number;
    y: number;
}

export interface ContextMenuProps {
    isOpen: boolean;
    position: ContextMenuPosition;
    children: React.ReactNode;
    onClose?: () => void;
    closeOnOutsideClick?: boolean; // Control whether to close on outside click
}

export interface ContextMenuItemProps {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    disabled?: boolean;
}

/**
 * ContextMenu Component
 *
 * A portal-based context menu that reuses the Menu component's styles.
 * Displays at a specific x,y position (typically from a right-click event).
 */
const ContextMenu = ({ isOpen, position, children, onClose, closeOnOutsideClick = true }: ContextMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    // Adjust position to prevent overflow
    useEffect(() => {
        if (!isOpen || !menuRef.current) return;

        const menuRect = menuRef.current.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let { x, y } = position;

        // Adjust horizontal position
        if (x + menuRect.width > windowWidth) {
            x = windowWidth - menuRect.width - 10; // 10px margin
        }

        // Adjust vertical position
        if (y + menuRect.height > windowHeight) {
            y = windowHeight - menuRect.height - 10; // 10px margin
        }

        // Ensure menu doesn't go off the left or top edge
        x = Math.max(10, x);
        y = Math.max(10, y);

        setAdjustedPosition({ x, y });
    }, [isOpen, position]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen || !closeOnOutsideClick) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

    // Close on ESC key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        document.addEventListener('keydown', handleEscKey);
        return () => document.removeEventListener('keydown', handleEscKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            ref={menuRef}
            className={styles['menu__content']} // Reuse Menu content styles
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

/**
 * ContextMenuItem Component
 *
 * A menu item that reuses the Menu.Item styles.
 */
const ContextMenuItem = ({ children, onClick, disabled = false }: ContextMenuItemProps) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled) return;
        onClick?.(e);
    };

    const itemClasses = [
        styles['menu__item'],
        disabled && styles['menu__item--disabled']
    ].filter(Boolean).join(' ');

    return (
        <button
            type="button"
            className={itemClasses}
            onClick={handleClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

ContextMenu.Item = ContextMenuItem;

export { ContextMenu };
