import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { MdDragIndicator } from 'react-icons/md';
import styles from './PanelMarkupPopover.module.scss';

type PanelMarkupPopoverPosition = {
    x: number;
    y: number;
};

const VIEWPORT_MARGIN = 10;

function clampPopoverPosition(
    position: PanelMarkupPopoverPosition,
    popoverElement: HTMLDivElement | null,
): PanelMarkupPopoverPosition {
    const popoverRect = popoverElement?.getBoundingClientRect();
    const popoverWidth = popoverRect?.width ?? 0;
    const popoverHeight = popoverRect?.height ?? 0;
    const maxX = Math.max(
        VIEWPORT_MARGIN,
        window.innerWidth - popoverWidth - VIEWPORT_MARGIN,
    );
    const maxY = Math.max(
        VIEWPORT_MARGIN,
        window.innerHeight - popoverHeight - VIEWPORT_MARGIN,
    );

    return {
        x: Math.min(Math.max(VIEWPORT_MARGIN, position.x), maxX),
        y: Math.min(Math.max(VIEWPORT_MARGIN, position.y), maxY),
    };
}

const PanelMarkupPopover = ({
    position,
    children,
    onClose,
    draggable = false,
}: {
    position: PanelMarkupPopoverPosition;
    children: ReactNode;
    onClose: () => void;
    draggable?: boolean;
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    useLayoutEffect(() => {
        if (!popoverRef.current) {
            return;
        }

        setAdjustedPosition(clampPopoverPosition(position, popoverRef.current));
    }, [position]);

    function handleDragStart(event: ReactPointerEvent<HTMLButtonElement>): void {
        if (!draggable) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const sStartPointer = { x: event.clientX, y: event.clientY };
        const sStartPosition = adjustedPosition;

        function handlePointerMove(pointerEvent: PointerEvent): void {
            setAdjustedPosition(
                clampPopoverPosition(
                    {
                        x:
                            sStartPosition.x +
                            pointerEvent.clientX -
                            sStartPointer.x,
                        y:
                            sStartPosition.y +
                            pointerEvent.clientY -
                            sStartPointer.y,
                    },
                    popoverRef.current,
                ),
            );
        }

        function handlePointerUp(): void {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.body.classList.remove(styles['dragging']);
        }

        document.body.classList.add(styles['dragging']);
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
    }

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
            className={`${styles['popover']} ${draggable ? styles['popover--draggable'] : ''}`}
            style={{
                position: 'fixed',
                top: `${adjustedPosition.y}px`,
                left: `${adjustedPosition.x}px`,
            }}
        >
            {draggable && (
                <button
                    type="button"
                    aria-label="Drag annotation editor"
                    className={styles['dragHandle']}
                    onPointerDown={handleDragStart}
                >
                    <MdDragIndicator size={18} />
                </button>
            )}
            {children}
        </div>,
        document.body,
    );
};

export default PanelMarkupPopover;
