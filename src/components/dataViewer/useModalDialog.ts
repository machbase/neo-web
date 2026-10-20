import { useEffect, useRef } from 'react';

/**
 * Makes a `<Modal>` behave like a dialog: named, focused on open, Tab kept inside, focus handed
 * back on close.
 *
 * The shared `Modal` renders a plain `<div class="modal">` with no role and no accessible name, and
 * a scrim that covers the page does nothing to the tab order — every button behind it stays
 * reachable, and pressing one that cannot be seen is worse than not having it. This was written
 * once inside the row inspector; the picker and the detail view need the same thing, so it lives
 * here rather than three times over.
 *
 * Attach the returned ref to any element inside the modal — the dialog node is found from it with
 * `closest('.modal')`, which is what keeps this working through the portal.
 */

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const focusableWithin = (root: HTMLElement) =>
    Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => element.getClientRects().length > 0);

export const useModalDialog = <T extends HTMLElement>(label: string) => {
    const anchorRef = useRef<T>(null);
    // Read through a ref so a changing label — the detail view's title follows the picked key —
    // does not re-run the effect and steal focus back mid-read.
    const labelRef = useRef(label);
    labelRef.current = label;

    useEffect(() => {
        const dialog = anchorRef.current?.closest('.modal') as HTMLElement | null;
        if (!dialog) return undefined;
        const opener = document.activeElement as HTMLElement | null;

        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', labelRef.current);
        // The dialog itself, not the first button: focusing a control would let one Enter act
        // before anything inside had been read.
        if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
        if (!dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });

        // Captured, so the trap holds even if something below swallows Tab first. The list is
        // rebuilt on every press rather than cached because controls inside disable themselves as
        // state changes — a pager at its first page, a primary with nothing picked — which moves
        // which element is first and which is last.
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;
            const items = focusableWithin(dialog);
            const active = document.activeElement;
            if (items.length === 0) {
                event.preventDefault();
                dialog.focus({ preventScroll: true });
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            if (!dialog.contains(active)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            } else if (event.shiftKey && (active === first || active === dialog)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            // Anywhere but `<body>`: dropping focus there restarts Tab at the top of the page.
            if (opener?.isConnected && opener !== document.body) opener.focus({ preventScroll: true });
        };
    }, []);

    return anchorRef;
};

export default useModalDialog;
