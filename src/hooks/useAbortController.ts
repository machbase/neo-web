import { useRef, useCallback, useEffect } from 'react';

const DEFAULT_REQUEST_KEY = '';

export const useAbortController = () => {
    const controllersRef = useRef(new Map<string, AbortController>());

    // A new request supersedes only the previous request for the same owner.
    // Callers without a key retain the original single-request behavior.
    const createSignal = useCallback((key = DEFAULT_REQUEST_KEY) => {
        controllersRef.current.get(key)?.abort();
        const controller = new AbortController();
        controllersRef.current.set(key, controller);
        return controller.signal;
    }, []);

    const releaseSignal = useCallback((signal: AbortSignal, key = DEFAULT_REQUEST_KEY) => {
        if (controllersRef.current.get(key)?.signal === signal) {
            controllersRef.current.delete(key);
        }
    }, []);

    const abort = useCallback(() => {
        for (const controller of controllersRef.current.values()) controller.abort();
        controllersRef.current.clear();
    }, []);

    useEffect(() => abort, [abort]);

    return { createSignal, releaseSignal, abort };
};
