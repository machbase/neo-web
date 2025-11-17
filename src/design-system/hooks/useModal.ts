import { useEffect, useCallback, useRef } from 'react';

export interface UseModalProps {
    isOpen: boolean;
    onClose: () => void;
    closeOnEscape?: boolean;
    closeOnOutsideClick?: boolean;
}

export interface UseModalReturn {
    isOpen: boolean;
    close: () => void;
    getOverlayProps: () => {
        onClick: (e: React.MouseEvent) => void;
        className: string;
    };
    getContentProps: () => {
        onClick: (e: React.MouseEvent) => void;
        ref: React.RefObject<HTMLDivElement>;
        role: string;
        'aria-modal': boolean;
    };
    getCloseButtonProps: () => {
        onClick: () => void;
        'aria-label': string;
        type: 'button';
    };
}

export const useModal = ({ isOpen, onClose, closeOnEscape = true, closeOnOutsideClick = true }: UseModalProps): UseModalReturn => {
    const contentRef = useRef<HTMLDivElement>(null);
    const mouseDownInsideRef = useRef(false);

    // Handle escape key
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape, onClose]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    // Track mouse down inside modal content
    useEffect(() => {
        if (!isOpen || !closeOnOutsideClick) return;

        const handleMouseDown = (event: MouseEvent) => {
            if (contentRef.current) {
                mouseDownInsideRef.current = contentRef.current.contains(event.target as Node);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [isOpen, closeOnOutsideClick]);

    const close = useCallback(() => {
        onClose();
    }, [onClose]);

    const handleOverlayClick = useCallback(
        (e: React.MouseEvent) => {
            if (!closeOnOutsideClick) return;

            // Only close if mouse was pressed outside and released outside
            if (contentRef.current && !contentRef.current.contains(e.target as Node) && !mouseDownInsideRef.current) {
                close();
            }
            mouseDownInsideRef.current = false;
        },
        [closeOnOutsideClick, close]
    );

    const handleContentClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    const getOverlayProps = useCallback(
        () => ({
            onClick: handleOverlayClick,
            className: 'modal__overlay',
        }),
        [handleOverlayClick]
    );

    const getContentProps = useCallback(
        () => ({
            onClick: handleContentClick,
            ref: contentRef,
            role: 'dialog',
            'aria-modal': true as boolean,
        }),
        [handleContentClick]
    );

    const getCloseButtonProps = useCallback(
        () => ({
            onClick: close,
            'aria-label': 'Close modal',
            type: 'button' as const,
        }),
        [close]
    );

    return {
        isOpen,
        close,
        getOverlayProps,
        getContentProps,
        getCloseButtonProps,
    };
};
