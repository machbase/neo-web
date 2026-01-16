import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './index.module.scss';

export interface DrawerRootProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    position?: 'left' | 'right';
    width?: string | number;
    overlay?: boolean;
    overlayColor?: 'dark' | 'none';
    usePortal?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export interface DrawerHeaderProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export interface DrawerBodyProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export interface DrawerCloseProps {
    onClick?: () => void;
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const DrawerRoot = ({ isOpen, onClose, children, position = 'left', width = 400, overlay = true, overlayColor = 'dark', usePortal = true, className, style }: DrawerRootProps) => {
    // ESC key handler
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const widthValue = typeof width === 'number' ? `${width}px` : width;

    // Close on overlay click
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const overlayClasses = [
        styles.drawer__overlay,
        overlay && overlayColor === 'dark' && styles['drawer__overlay--dark'],
        overlay && overlayColor === 'none' && styles['drawer__overlay--none'],
        !usePortal && styles['drawer__overlay--absolute'],
    ]
        .filter(Boolean)
        .join(' ');

    const content = (
        <div className={overlayClasses} onClick={handleOverlayClick}>
            <div
                className={`${styles.drawer} ${styles[`drawer--${position}`]} ${!usePortal ? styles['drawer--absolute'] : ''} ${className ?? ''}`}
                style={{ ...style, width: widthValue }}
            >
                {children}
            </div>
        </div>
    );

    if (usePortal) {
        return createPortal(content, document.body);
    }

    return content;
};

const DrawerHeader = ({ children, className, style }: DrawerHeaderProps) => {
    return (
        <div className={`${styles.drawer__header} ${className ?? ''}`} style={style}>
            {children}
        </div>
    );
};

const DrawerBody = ({ children, className, style }: DrawerBodyProps) => {
    return (
        <div className={`${styles.drawer__body} scrollbar-dark ${className ?? ''}`} style={style}>
            {children}
        </div>
    );
};

const DrawerClose = ({ onClick, children, className, style }: DrawerCloseProps) => {
    return (
        <button className={`${styles.drawer__close} ${className ?? ''}`} onClick={onClick} style={style} aria-label="Close drawer">
            {children ?? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </button>
    );
};

export const Drawer = {
    Root: DrawerRoot,
    Header: DrawerHeader,
    Body: DrawerBody,
    Close: DrawerClose,
};
