import { useState, type KeyboardEvent } from 'react';

// Shared form-state plumbing for the highlight/annotation edit popovers.

export function useEditFormState<T>(initializer: () => T): {
    state: T;
    setState: React.Dispatch<React.SetStateAction<T>>;
    setField: <K extends keyof T>(field: K, value: T[K]) => void;
} {
    const [state, setState] = useState<T>(initializer);

    function setField<K extends keyof T>(field: K, value: T[K]): void {
        setState((currentState) => ({ ...currentState, [field]: value }));
    }

    return { state, setState, setField };
}

export function handleEditFormKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    actions: { onApply: () => void; onCancel: () => void },
): void {
    if (event.key === 'Enter') {
        actions.onApply();
    }

    if (event.key === 'Escape') {
        actions.onCancel();
    }
}
