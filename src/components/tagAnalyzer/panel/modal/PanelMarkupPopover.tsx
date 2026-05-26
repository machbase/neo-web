import {
    useEffect,
    useLayoutEffect,
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
    position,
    children,
    onClose,
    closeOnOutsideClick = false,
    closeOnEscape = true,
    closeOnScroll = true,
}: {
    position: PanelMarkupPopoverPosition;
    children: ReactNode;
    onClose: () => void;
    closeOnOutsideClick?: boolean;
    closeOnEscape?: boolean;
    closeOnScroll?: boolean;
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    useLayoutEffect(() => {
        if (!popoverRef.current) {
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
    }, [position]);

    useEffect(() => {
        const cleanupHandlers: Array<() => void> = [];

        if (closeOnOutsideClick) {
            const handleClickOutside = (event: MouseEvent): void => {
                if (
                    popoverRef.current &&
                    !popoverRef.current.contains(event.target as Node)
                ) {
                    onClose();
                }
            };
            const timeoutId = window.setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 0);

            cleanupHandlers.push(() => {
                window.clearTimeout(timeoutId);
                document.removeEventListener('mousedown', handleClickOutside);
            });
        }

        if (closeOnEscape) {
            const handleEscKey = (event: KeyboardEvent): void => {
                if (event.key === 'Escape') {
                    onClose();
                }
            };

            document.addEventListener('keydown', handleEscKey);
            cleanupHandlers.push(() =>
                document.removeEventListener('keydown', handleEscKey),
            );
        }

        if (closeOnScroll) {
            window.addEventListener('scroll', onClose, true);
            cleanupHandlers.push(() =>
                window.removeEventListener('scroll', onClose, true),
            );
        }

        return () => {
            for (const cleanupHandler of cleanupHandlers) {
                cleanupHandler();
            }
        };
    }, [closeOnEscape, closeOnOutsideClick, closeOnScroll, onClose]);

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
