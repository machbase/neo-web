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
import styles from './PanelPopover.module.scss';

type PanelPopoverPosition = {
    x: number;
    y: number;
};

type PanelPopoverSize = 'compact' | 'default' | 'wide';

const PANEL_POPOVER_MIN_WIDTH: Record<PanelPopoverSize, number> = {
    compact: 280,
    default: 320,
    wide: 360,
};
const VIEWPORT_MARGIN = 10;

function clampPopoverPosition(
    position: PanelPopoverPosition,
    popoverElement: HTMLDivElement | null,
): PanelPopoverPosition {
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

const PanelPopover = ({
    title,
    position,
    children,
    actions,
    headerAction,
    onClose,
    draggable = false,
    outsideCloseIgnoreSelector,
    closeOnScroll = true,
    size = 'default',
}: {
    title?: ReactNode;
    position: PanelPopoverPosition;
    children: ReactNode;
    actions?: ReactNode;
    headerAction?: ReactNode;
    onClose: () => void;
    draggable?: boolean;
    outsideCloseIgnoreSelector?: string;
    closeOnScroll?: boolean;
    size?: PanelPopoverSize;
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    useLayoutEffect(() => {
        if (!popoverRef.current) {
            return;
        }

        setAdjustedPosition(clampPopoverPosition(position, popoverRef.current));
    }, [position]);

    function handlePopoverDragStart(event: ReactPointerEvent<HTMLButtonElement>): void {
        if (!draggable) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const sStartPointer = { x: event.clientX, y: event.clientY };
        const sStartPosition = adjustedPosition;

        function handlePopoverPointerMove(pointerEvent: PointerEvent): void {
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

        function handlePopoverPointerUp(): void {
            document.removeEventListener('pointermove', handlePopoverPointerMove);
            document.removeEventListener('pointerup', handlePopoverPointerUp);
            document.body.classList.remove(styles['dragging']);
        }

        document.body.classList.add(styles['dragging']);
        document.addEventListener('pointermove', handlePopoverPointerMove);
        document.addEventListener('pointerup', handlePopoverPointerUp);
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            const eventTarget = event.target;

            if (
                outsideCloseIgnoreSelector &&
                eventTarget instanceof Element &&
                eventTarget.closest(outsideCloseIgnoreSelector)
            ) {
                return;
            }

            if (
                popoverRef.current &&
                eventTarget instanceof Node &&
                !popoverRef.current.contains(eventTarget)
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
        if (closeOnScroll) {
            window.addEventListener('scroll', onClose, true);
        }

        return () => {
            window.clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscKey);
            if (closeOnScroll) {
                window.removeEventListener('scroll', onClose, true);
            }
        };
    }, [closeOnScroll, onClose, outsideCloseIgnoreSelector]);

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
                    aria-label="Drag markup editor"
                    className={styles['dragHandle']}
                    onPointerDown={handlePopoverDragStart}
                >
                    <MdDragIndicator size={18} />
                </button>
            )}
            <div
                className={`${styles['frame']} ${draggable ? styles['frame--draggable'] : ''}`}
                style={{
                    minWidth: PANEL_POPOVER_MIN_WIDTH[size],
                }}
            >
                {(title !== undefined || headerAction !== undefined) && (
                    <div className={styles['header']}>
                        {title !== undefined && (
                            <div className={styles['title']}>{title}</div>
                        )}
                        {headerAction !== undefined && (
                            <div className={styles['headerAction']}>
                                {headerAction}
                            </div>
                        )}
                    </div>
                )}
                <div className={styles['body']}>{children}</div>
                {actions !== undefined && (
                    <div className={styles['actions']}>{actions}</div>
                )}
            </div>
        </div>,
        document.body,
    );
};

export default PanelPopover;
