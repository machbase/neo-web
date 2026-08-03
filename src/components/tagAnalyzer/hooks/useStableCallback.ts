import { useCallback, useLayoutEffect, useRef } from 'react';


export function useStableCallback<Arguments extends unknown[], ReturnValue>(
    callback: (...args: Arguments) => ReturnValue,
): (...args: Arguments) => ReturnValue {
    const callbackRef = useRef(callback);

    useLayoutEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useCallback(
        (...args: Arguments) => callbackRef.current(...args),
        [],
    );
}
