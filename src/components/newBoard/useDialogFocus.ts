import { useEffect, useState } from 'react';
import { focusables, isShown } from '@/design-system/hooks/focusable';

/**
 * Where focus goes back to: what had it when the dialog opened, or, when that was an item of a "⋯"
 * menu (gone or hidden once the menu closed), that menu's own button.
 */
const returnTargets = (aOpener: HTMLElement | null): HTMLElement[] => {
    if (!aOpener || aOpener === document.body) return [];
    const sMenuButton = aOpener.closest('.nb-ctl-more, .nb-group-more')?.querySelector<HTMLElement>(':scope > button');
    return sMenuButton && sMenuButton !== aOpener ? [aOpener, sMenuButton] : [aOpener];
};

/**
 * The New tab's open dialog (found by its test id) takes focus when it opens, keeps Tab inside it,
 * and once it closes gives focus back to the control that opened it. Without this Tab left the
 * dialog for the browser's address bar, focus could stay on a button behind the dialog, and closing
 * it dropped focus on the page. The shared Modal now does this for every dialog; on top of it the
 * New tab's dialogs start on their first field and hand focus back to a "⋯" menu's button.
 */
export const useDialogFocus = (aTestId: string) => {
    // Read while the dialog first renders: by the time effects run, its autoFocus field has focus,
    // and a menu item that opened it may already be gone.
    const [sReturnTo] = useState(() => returnTargets(document.activeElement as HTMLElement | null));
    useEffect(() => {
        const dialog = () => document.querySelector<HTMLElement>(`[data-testid="${aTestId}"]`);
        // Into the dialog unless one of its fields already took focus (autoFocus). The spot the shared
        // Modal parks focus on when it opens is not a field: go on to the first one from there.
        const sOpened = dialog();
        if (sOpened && (!sOpened.contains(document.activeElement) || document.activeElement?.hasAttribute('data-modal-focus-start'))) (focusables(sOpened).find((aEl) => !aEl.matches('[aria-label="Close modal"]')) ?? sOpened).focus();

        const onKeyDown = (aEvent: KeyboardEvent) => {
            if (aEvent.key !== 'Tab') return;
            const sDialog = dialog();
            if (!sDialog) return;
            const sItems = focusables(sDialog);
            if (!sItems.length) return;
            const sFirst = sItems[0];
            const sLast = sItems[sItems.length - 1];
            const sActive = document.activeElement as HTMLElement | null;
            const sInside = !!sActive && sDialog.contains(sActive);
            if (aEvent.shiftKey && (!sInside || sActive === sFirst)) {
                aEvent.preventDefault();
                sLast.focus();
            } else if (!aEvent.shiftKey && (!sInside || sActive === sLast)) {
                aEvent.preventDefault();
                sFirst.focus();
            }
        };
        // A control removed while it had focus (a shortcut's Remove, a folder opened in the picker)
        // leaves focus on the page: keep it in the dialog.
        const onFocusOut = () =>
            requestAnimationFrame(() => {
                const sDialog = dialog();
                if (sDialog && (!document.activeElement || document.activeElement === document.body)) (focusables(sDialog)[0] ?? sDialog).focus();
            });
        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('focusout', onFocusOut, true);
        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            document.removeEventListener('focusout', onFocusOut, true);
            // Only when focus would otherwise be lost: the dialog's own buttons are gone with it.
            requestAnimationFrame(() => {
                const sNow = document.activeElement;
                if (sNow && sNow !== document.body) return;
                sReturnTo.find(isShown)?.focus();
            });
        };
    }, [aTestId, sReturnTo]);
};
