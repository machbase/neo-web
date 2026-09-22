import { useEffect, useLayoutEffect, useRef } from 'react';

export function useLatestAsyncRequest<Result>(
    request: LatestAsyncRequest<Result>,
): void {
    const requestRef = useRef(request);
    requestRef.current = request;
    const committedRequestRef = useRef<
        { enabled: boolean; requestKey: string } | undefined
    >();

    useLayoutEffect(() => {
        const committedRequest = {
            enabled: request.enabled,
            requestKey: request.requestKey,
        };
        committedRequestRef.current = committedRequest;

        return () => {
            if (committedRequestRef.current === committedRequest) {
                committedRequestRef.current = undefined;
            }
        };
    }, [request.enabled, request.requestKey]);

    useEffect(() => {
        const currentRequest = requestRef.current;
        const abortController = new AbortController();
        let timerId: number | undefined;

        function isCurrentRequest(): boolean {
            const committedRequest = committedRequestRef.current;
            return !abortController.signal.aborted &&
                committedRequest?.enabled === true &&
                committedRequest.requestKey === currentRequest.requestKey;
        }

        if (currentRequest.enabled) {
            const execute = () => {
                currentRequest.onStart?.();
                void currentRequest.fetch(abortController.signal).then(
                    (result) => {
                        if (isCurrentRequest()) {
                            requestRef.current.onSuccess(result);
                        }
                    },
                    (error: unknown) => {
                        if (isCurrentRequest()) {
                            requestRef.current.onError(error);
                        }
                    },
                );
            };

            if (currentRequest.delay && currentRequest.delay > 0) {
                timerId = window.setTimeout(execute, currentRequest.delay);
            } else {
                execute();
            }
        }

        return () => {
            if (timerId !== undefined) window.clearTimeout(timerId);
            abortController.abort();
        };
    }, [request.enabled, request.requestKey]);
}

export function getAsyncRequestErrorMessage(
    error: unknown,
    fallback: string,
): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

// -------------------- Local --------------------

type LatestAsyncRequest<Result> = {
    enabled: boolean;
    requestKey: string;
    delay?: number;
    fetch: (signal: AbortSignal) => Promise<Result>;
    onStart?: () => void;
    onSuccess: (result: Result) => void;
    onError: (error: unknown) => void;
};
