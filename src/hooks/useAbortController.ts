import { useRef, useCallback, useEffect } from 'react';

export const useAbortController = () => {
    const controllerRef = useRef<AbortController | null>(null);

    const createSignal = useCallback(() => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        return controller.signal;
    }, []);

    const abort = useCallback(() => {
        controllerRef.current?.abort();
        controllerRef.current = null;
    }, []);

    useEffect(() => {
        return () => controllerRef.current?.abort();
    }, []);

    return { createSignal, abort };
};
