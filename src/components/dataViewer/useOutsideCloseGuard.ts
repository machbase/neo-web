import { useCallback, useEffect, useRef } from 'react';
import { DATA_VIEWER_PORTAL_CLASS } from './DataViewerModalPortal';

/**
 * A close that only fires for a gesture that actually began outside the dialog.
 *
 * `click` lands on the nearest common ancestor of press and release, so a drag that starts on the
 * chart and finishes past the dialog's edge arrives as a click on the overlay — and closes the
 * dialog mid-gesture. The shared `Modal` guards against exactly this, but its guard is a
 * bubble-phase `mousedown` listener and the chart stops that event propagating so its drag is not
 * also read as a click. Watching the press in the *capture* phase at the document is the one place
 * nothing inside the dialog can cut short.
 */
export const useOutsideCloseGuard = (onClose: () => void) => {
    const startedInside = useRef(false);

    useEffect(() => {
        /**
         * Escape is not a click, and must not be swallowed by this guard.
         *
         * The shared `Modal` routes Escape through the same `onOutSideClose` prop, so a latched
         * press would eat the first Escape after any click inside the dialog — two presses to
         * close. Clearing the latch here in the capture phase runs before `useEsc`'s own
         * bubble-phase listener, so the close it triggers passes straight through.
         */
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') startedInside.current = false;
        };
        document.addEventListener('keydown', onKeyDown, true);

        const onPointerDown = (event: MouseEvent) => {
            // The dialog box, not the portal wrapper: the scrim lives inside that wrapper too, so
            // testing against it counted a press on the scrim as a press inside the dialog and
            // swallowed the very click this is meant to let through.
            const target = event.target as Element | null;
            startedInside.current = Boolean(target?.closest?.(`.${DATA_VIEWER_PORTAL_CLASS} .modal`));
        };
        document.addEventListener('mousedown', onPointerDown, true);
        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            document.removeEventListener('mousedown', onPointerDown, true);
        };
    }, []);

    return useCallback(() => {
        if (startedInside.current) {
            startedInside.current = false;
            return;
        }
        onClose();
    }, [onClose]);
};

export default useOutsideCloseGuard;
