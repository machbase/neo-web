import { useEffect, useRef, useState } from 'react';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { cloneReplaceMessage, overwriteMessage } from '@/utils/fileExistence';

/**
 * Promise-based name question backed by ConfirmModal. `ask(name)` resolves true on OK, false on Cancel/close.
 * Render `prompt` inside the caller's Modal.Root (or, for a legacy Modal / no modal, next to it).
 * - Only one question at a time (r20 L3): an `ask` while one is pending resolves false at once, so a double
 *   OK/Enter on the dialog behind it cannot start a second save.
 * - Focus goes back to the element focused before the question (r20 L4) when it closes.
 */
const useNamePrompt = (aMessage: (aName: string) => string, aTestId: string) => {
    const [sPending, setPending] = useState<{ name: string } | null>(null);
    const sResolveRef = useRef<((aOk: boolean) => void) | null>(null);
    const sReturnFocusRef = useRef<HTMLElement | null>(null);
    const sRestoreFocusRef = useRef(false);

    const ask = (aName: string) => {
        if (sResolveRef.current) return Promise.resolve(false);
        return new Promise<boolean>((resolve) => {
            sResolveRef.current = resolve;
            const sActive = typeof document !== 'undefined' ? document.activeElement : null;
            sReturnFocusRef.current = sActive instanceof HTMLElement && sActive !== document.body ? sActive : null;
            setPending({ name: aName });
        });
    };

    const close = (aOk: boolean) => {
        const sResolve = sResolveRef.current;
        if (!sResolve) return;
        sResolveRef.current = null;
        sRestoreFocusRef.current = true;
        setPending(null);
        sResolve(aOk);
    };

    useEffect(() => {
        if (sPending || !sRestoreFocusRef.current) return;
        sRestoreFocusRef.current = false;
        const sTarget = sReturnFocusRef.current;
        sReturnFocusRef.current = null;
        if (sTarget && sTarget.isConnected) sTarget.focus();
    }, [sPending]);

    const prompt = sPending ? (
        <ConfirmModal
            data-testid={aTestId}
            setIsOpen={() => close(false)}
            pContents={<div className="body-content">{aMessage(sPending.name)}</div>}
            pCallback={() => close(true)}
        />
    ) : null;

    return { ask, prompt };
};

/** The overwrite question of every file save/create dialog (`data-testid="file-overwrite-dialog"`). */
export const useOverwritePrompt = () => useNamePrompt(overwriteMessage, 'file-overwrite-dialog');

/** The clone-replaces-folder question of every clone entry point (`data-testid="clone-replace-dialog"`, r14). */
export const useClonePrompt = () => useNamePrompt(cloneReplaceMessage, 'clone-replace-dialog');
