import {
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './PanelMarkupPopover.module.scss';

export type PanelMarkupPopoverPosition = {
    x: number;
    y: number;
};

const VIEWPORT_MARGIN = 10;

const PanelMarkupPopover = ({
    isOpen,
    position,
    children,
    onClose,
    closeOnOutsideClick = false,
    closeOnEscape = true,
    closeOnScroll = true,
}: {
    isOpen: boolean;
    position: PanelMarkupPopoverPosition;
    children: ReactNode;
    onClose?: () => void;
    closeOnOutsideClick?: boolean;
    closeOnEscape?: boolean;
    closeOnScroll?: boolean;
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    useEffect(() => {
        if (!isOpen || !popoverRef.current) {
            return;
        }

        const popoverRect = popoverRef.current.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        let { x, y } = position;

        if (x + popoverRect.width > windowWidth) {
            x = windowWidth - popoverRect.width - VIEWPORT_MARGIN;
        }

        if (y + popoverRect.height > windowHeight) {
            y = windowHeight - popoverRect.height - VIEWPORT_MARGIN;
        }

        setAdjustedPosition({
            x: Math.max(VIEWPORT_MARGIN, x),
            y: Math.max(VIEWPORT_MARGIN, y),
        });
    }, [isOpen, position]);

    useEffect(() => {
        if (!isOpen || !closeOnOutsideClick) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node)
            ) {
                onClose?.();
            }
        };
        const timeoutId = window.setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [closeOnOutsideClick, isOpen, onClose]);

    useEffect(() => {
        if (!isOpen || !closeOnEscape) {
            return;
        }

        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        document.addEventListener('keydown', handleEscKey);

        return () => document.removeEventListener('keydown', handleEscKey);
    }, [closeOnEscape, isOpen, onClose]);

    useEffect(() => {
        if (!isOpen || !closeOnScroll) {
            return;
        }

        const handleScroll = () => {
            onClose?.();
        };

        window.addEventListener('scroll', handleScroll, true);

        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [closeOnScroll, isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

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
        document.body,
    );
};

export default PanelMarkupPopover;
