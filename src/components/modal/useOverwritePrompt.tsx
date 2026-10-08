import { useRef, useState } from 'react';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { cloneReplaceMessage, overwriteMessage } from '@/utils/fileExistence';

/**
 * Promise-based name question backed by ConfirmModal. `ask(name)` resolves true on OK, false on Cancel/close.
 * Render `prompt` inside the caller's Modal.Root (or, for a legacy Modal / no modal, next to it).
 */
const useNamePrompt = (aMessage: (aName: string) => string, aTestId: string) => {
    const [sPending, setPending] = useState<{ name: string } | null>(null);
    const sResolveRef = useRef<((aOk: boolean) => void) | null>(null);

    const ask = (aName: string) =>
        new Promise<boolean>((resolve) => {
            sResolveRef.current = resolve;
            setPending({ name: aName });
        });

    const close = (aOk: boolean) => {
        const sResolve = sResolveRef.current;
        sResolveRef.current = null;
        setPending(null);
        sResolve?.(aOk);
    };

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
