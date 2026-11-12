import type { HostErrorCode, HostResult, ApplicationHostContext } from './types';

export const success = <T,>(value: T): HostResult<T> => ({ ok: true, value });
export const failure = <T = never,>(code: HostErrorCode, message: string): HostResult<T> => ({ ok: false, error: { code, message } });

export function callHostAdapter<T>(context: ApplicationHostContext, operation: (() => T | Promise<T>) | undefined): Promise<HostResult<T>> {
    const guard = context.checkActive();
    if (!guard.ok) return Promise.resolve(guard);
    if (!operation) return Promise.resolve(failure('UNSUPPORTED', 'This operation is unavailable.'));
    // Invoke synchronously to preserve the browser's user activation.
    try {
        return Promise.resolve(operation()).then((result) => {
            const stillActive = context.checkActive();
            return stillActive.ok ? success(result) : stillActive;
        }, () => failure('ADAPTER_ERROR', 'The requested operation failed.'));
    } catch { return Promise.resolve(failure('ADAPTER_ERROR', 'The requested operation failed.')); }
}
