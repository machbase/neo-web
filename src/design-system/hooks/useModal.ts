import { useEffect, useCallback, useRef, useId } from 'react';
import { focusables, isShown } from './focusable';

// Global modal stack to track open modals
const modalStack: string[] = [];

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
    /** Props for the spot inside the dialog that takes focus when it opens and no field of it already has. */
    getFocusStartProps: () => {
        ref: React.RefObject<HTMLSpanElement>;
        tabIndex: number;
        'data-modal-focus-start': boolean;
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
    const focusStartRef = useRef<HTMLSpanElement>(null);
    const modalId = useId();

    // What had focus when the dialog opened, read while it first renders: by the time effects run
    // an autoFocus field inside it has already taken focus.
    const openerRef = useRef<HTMLElement | null>(null);
    if (!isOpen) openerRef.current = null;
    else if (!openerRef.current) openerRef.current = (document.activeElement as HTMLElement | null) ?? document.body;

    // Track modal in stack
    useEffect(() => {
        if (!isOpen) return;

        // Add modal to stack when opened
        modalStack.push(modalId);

        return () => {
            // Remove modal from stack when closed
            const index = modalStack.indexOf(modalId);
            if (index > -1) {
                modalStack.splice(index, 1);
            }
        };
    }, [isOpen, modalId]);

    // Handle escape key - only close if this is the topmost modal
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                // Only close if this is the topmost modal in the stack
                const topModalId = modalStack[modalStack.length - 1];
                if (topModalId === modalId) {
                    onClose();
                }
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape, onClose, modalId]);

    // Focus belongs to the dialog while it is open. Without this, keys typed right after it opened
    // (from a shortcut such as Cmd+S) went to the editor behind it, Tab never reached it, and closing
    // it dropped focus on the page.
    useEffect(() => {
        if (!isOpen) return;
        const sOpener = openerRef.current;

        // Into the dialog unless one of its fields already took focus (autoFocus).
        if (contentRef.current && !contentRef.current.contains(document.activeElement)) focusStartRef.current?.focus({ preventScroll: true });

        const isTopmost = () => modalStack[modalStack.length - 1] === modalId;
        // Focus left on the page behind the dialog (the overlay was clicked, or nothing took it yet).
        // Lists and menus a dialog control opens are portaled next to the page, not inside it, so they are left alone.
        const isBehind = (aEl: Element | null) => !aEl || aEl === document.body || !!document.getElementById('root')?.contains(aEl);

        // Capture: Tab from behind the dialog comes back to it before the page (an editor there) takes the key.
        const handleTabFromBehind = (event: KeyboardEvent) => {
            if (event.key !== 'Tab' || !isTopmost() || !contentRef.current || !isBehind(document.activeElement)) return;
            const sItems = focusables(contentRef.current);
            event.preventDefault();
            (event.shiftKey ? sItems[sItems.length - 1] : sItems[0])?.focus();
        };
        // Bubble: Tab past either end of the dialog wraps around, unless a control inside used the key itself.
        const handleTabAtEdge = (event: KeyboardEvent) => {
            if (event.key !== 'Tab' || event.defaultPrevented || !isTopmost() || !contentRef.current) return;
            const sActive = document.activeElement as HTMLElement | null;
            if (!sActive || !contentRef.current.contains(sActive)) return;
            const sItems = focusables(contentRef.current);
            if (!sItems.length) {
                event.preventDefault();
                return;
            }
            if (event.shiftKey && (sActive === sItems[0] || !sItems.includes(sActive))) {
                event.preventDefault();
                sItems[sItems.length - 1].focus();
            } else if (!event.shiftKey && sActive === sItems[sItems.length - 1]) {
                event.preventDefault();
                sItems[0].focus();
            }
        };
        document.addEventListener('keydown', handleTabFromBehind, true);
        document.addEventListener('keydown', handleTabAtEdge);
        return () => {
            document.removeEventListener('keydown', handleTabFromBehind, true);
            document.removeEventListener('keydown', handleTabAtEdge);
            // Back to where it was before the dialog — only when focus would otherwise be lost, so a
            // dialog that hands focus somewhere on close (or opens the next dialog) keeps that.
            requestAnimationFrame(() => {
                const sNow = document.activeElement;
                if (sNow && sNow !== document.body) return;
                if (sOpener && sOpener !== document.body && isShown(sOpener)) sOpener.focus({ preventScroll: true });
            });
        };
    }, [isOpen, modalId]);

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
        // A drag on a range input (the distance slider) starts as a *pointer* press; on touch and
        // pen there is no mouse event at all. Without this, releasing such a drag past the dialog
        // delivers the click to the overlay and throws the dialog away mid-gesture.
        document.addEventListener('pointerdown', handleMouseDown as EventListener);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('pointerdown', handleMouseDown as EventListener);
        };
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

    const getFocusStartProps = useCallback(
        () => ({
            ref: focusStartRef,
            tabIndex: -1,
            'data-modal-focus-start': true as boolean,
        }),
        []
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
        getFocusStartProps,
        getCloseButtonProps,
    };
};
