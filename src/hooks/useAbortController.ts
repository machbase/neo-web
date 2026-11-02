import { useRef, useCallback, useEffect } from 'react';

const DEFAULT_REQUEST_KEY = '';

export const useAbortController = () => {
    const controllersRef = useRef(new Map<string, AbortController>());
    const lifetimeRef = useRef(0);
    const requestLifetimesRef = useRef(new WeakMap<AbortSignal, number>());

    // A new request supersedes only the previous request for the same owner.
    // Callers without a key retain the original single-request behavior.
    const createSignal = useCallback((key = DEFAULT_REQUEST_KEY) => {
        controllersRef.current.get(key)?.abort();
        const controller = new AbortController();
        controllersRef.current.set(key, controller);
        requestLifetimesRef.current.set(controller.signal, lifetimeRef.current);
        return controller.signal;
    }, []);

    const releaseSignal = useCallback((signal: AbortSignal, key = DEFAULT_REQUEST_KEY) => {
        requestLifetimesRef.current.delete(signal);
        if (controllersRef.current.get(key)?.signal === signal) {
            controllersRef.current.delete(key);
        }
    }, []);

    const hasPendingRequest = useCallback((key = DEFAULT_REQUEST_KEY) => controllersRef.current.has(key), []);

    // Superseding a tab action must not discard an already successful write.
    // Explicit abort/unmount still invalidates every request, including older ones.
    const isCurrentLifetime = useCallback((signal: AbortSignal) =>
        requestLifetimesRef.current.get(signal) === lifetimeRef.current, []);

    const abort = useCallback(() => {
        lifetimeRef.current++;
        for (const controller of controllersRef.current.values()) controller.abort();
        controllersRef.current.clear();
    }, []);

    useEffect(() => abort, [abort]);

    return { createSignal, releaseSignal, hasPendingRequest, isCurrentLifetime, abort };
};
