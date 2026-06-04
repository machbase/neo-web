import { Toast } from '@/design-system/components';

/**
 * Shows `message` as an error toast and reports whether the caller should stop.
 * Returns true (after toasting) when a message is present; false otherwise.
 */
export function rejectWithToast(message: string | undefined): boolean {
    if (message) {
        Toast.error(message, undefined);
        return true;
    }

    return false;
}