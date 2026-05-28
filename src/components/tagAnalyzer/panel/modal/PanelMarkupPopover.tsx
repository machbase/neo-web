import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './PanelMarkupPopover.module.scss';

type PanelMarkupPopoverPosition = {
    x: number;
    y: number;
};

const VIEWPORT_MARGIN = 10;

const PanelMarkupPopover = ({
    position,
    children,
    onClose,
}: {
    position: PanelMarkupPopoverPosition;
    children: ReactNode;
    onClose: () => void;
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
        const handleClickOutside = (event: MouseEvent): void => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };
        const handleEscKey = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        const timeoutId = window.setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);
        document.addEventListener('keydown', handleEscKey);
        window.addEventListener('scroll', onClose, true);

        return () => {
            window.clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscKey);
            window.removeEventListener('scroll', onClose, true);
        };
    }, [onClose]);

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
