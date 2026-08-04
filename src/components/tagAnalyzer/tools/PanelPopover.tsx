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
import type { ContextMenuPosition } from '@/design-system/components';
import styles from './PanelPopover.module.scss';

type PanelPopoverSize = 'compact' | 'wide';

const PANEL_POPOVER_MIN_WIDTH: Record<PanelPopoverSize, number> = {
    compact: 280,
    wide: 360,
};
const VIEWPORT_MARGIN = 10;

function clampPopoverPosition(
    position: ContextMenuPosition,
    popoverSize: Pick<DOMRect, 'width' | 'height'>,
): ContextMenuPosition {
    const maxX = Math.max(
        VIEWPORT_MARGIN,
        window.innerWidth - popoverSize.width - VIEWPORT_MARGIN,
    );
    const maxY = Math.max(
        VIEWPORT_MARGIN,
        window.innerHeight - popoverSize.height - VIEWPORT_MARGIN,
    );

    return {
        x: Math.min(Math.max(VIEWPORT_MARGIN, position.x), maxX),
        y: Math.min(Math.max(VIEWPORT_MARGIN, position.y), maxY),
    };
}

export default function PanelPopover({
    title,
    position,
    children,
    actions,
    headerAction,
    onClose,
    outsideCloseIgnoreSelector,
    closeOnScroll = true,
    size,
    'data-testid': dataTestId,
}: {
    title: ReactNode;
    position: ContextMenuPosition;
    children: ReactNode;
    actions?: ReactNode;
    headerAction?: ReactNode;
    onClose: () => void;
    outsideCloseIgnoreSelector?: string;
    closeOnScroll?: boolean;
    size: PanelPopoverSize;
    'data-testid'?: string;
}) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const dragCleanupRef = useRef<(() => void) | undefined>(undefined);
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    useLayoutEffect(() => {
        const popoverElement = popoverRef.current;

        if (!popoverElement) {
            throw new Error('Cannot position an unmounted panel popover.');
        }

        setAdjustedPosition(
            clampPopoverPosition(
                position,
                popoverElement.getBoundingClientRect(),
            ),
        );
    }, [position]);

    function handlePopoverDragStart(event: ReactPointerEvent<HTMLButtonElement>): void {
        event.preventDefault();
        event.stopPropagation();

        const popoverElement = popoverRef.current;

        if (!popoverElement) {
            throw new Error('Cannot drag an unmounted panel popover.');
        }

        const sStartPointer = { x: event.clientX, y: event.clientY };
        const sStartPosition = adjustedPosition;
        const popoverSize = popoverElement.getBoundingClientRect();
        dragCleanupRef.current?.();

        function handlePopoverPointerMove(pointerEvent: PointerEvent): void {
            if (!popoverRef.current) {
                return;
            }

            const nextPosition = {
                x: sStartPosition.x + pointerEvent.clientX - sStartPointer.x,
                y: sStartPosition.y + pointerEvent.clientY - sStartPointer.y,
            };
            setAdjustedPosition(clampPopoverPosition(nextPosition, popoverSize));
        }

        function handlePopoverPointerUp(): void {
            document.removeEventListener('pointermove', handlePopoverPointerMove);
            document.removeEventListener('pointerup', handlePopoverPointerUp);
            document.body.classList.remove(styles['dragging']);
            dragCleanupRef.current = undefined;
        }

        document.body.classList.add(styles['dragging']);
        document.addEventListener('pointermove', handlePopoverPointerMove);
        document.addEventListener('pointerup', handlePopoverPointerUp);
        dragCleanupRef.current = handlePopoverPointerUp;
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
            dragCleanupRef.current?.();
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
            data-testid={dataTestId}
            ref={popoverRef}
            className={styles['popover']}
            style={{
                position: 'fixed',
                top: `${adjustedPosition.y}px`,
                left: `${adjustedPosition.x}px`,
            }}
        >
            <button
                type="button"
                aria-label="Drag markup editor"
                className={styles['dragHandle']}
                onPointerDown={handlePopoverDragStart}
            >
                <MdDragIndicator size={18} />
            </button>
            <div
                className={styles['frame']}
                style={{
                    minWidth: PANEL_POPOVER_MIN_WIDTH[size],
                }}
            >
                <div className={styles['header']}>
                    <div className={styles['title']}>{title}</div>
                    {headerAction !== undefined && (
                        <div className={styles['headerAction']}>
                            {headerAction}
                        </div>
                    )}
                </div>
                <div className={styles['body']}>{children}</div>
                {actions !== undefined && (
                    <div className={styles['actions']}>{actions}</div>
                )}
            </div>
        </div>,
        document.body,
    );
}
