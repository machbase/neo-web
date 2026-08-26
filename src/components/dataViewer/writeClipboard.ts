/**
 * Put the value on the clipboard, and say whether it got there.
 *
 * `navigator.clipboard` exists only in a secure context and refuses even then when the document is
 * not focused — `NotAllowedError: Document is not focused`. Swallowing that rejection is what makes
 * the button look like it does nothing, which is exactly what it did. The deprecated path is tried
 * next, and a failure is reported rather than hidden.
 */
export const writeClipboard = async (text: string, host: HTMLElement | null): Promise<boolean> => {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            /* not focused, or permission denied — fall through */
        }
    }
    try {
        const area = document.createElement('textarea');
        area.value = text;
        // Pushed off screen rather than hidden: `display: none` cannot be selected, and an
        // unselectable textarea cannot be copied from.
        area.setAttribute('readonly', '');
        area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        const parent = host ?? document.body;
        const restore = document.activeElement as HTMLElement | null;
        parent.appendChild(area);
        let ok = false;
        try {
            area.select();
            ok = document.execCommand('copy');
        } finally {
            // Removed in `finally`: `execCommand` is deprecated and throws outright in some
            // environments, and a textarea left behind holds focus inside the dialog.
            area.remove();
            if (restore?.isConnected) restore.focus({ preventScroll: true });
        }
        return ok;
    } catch {
        return false;
    }
};
