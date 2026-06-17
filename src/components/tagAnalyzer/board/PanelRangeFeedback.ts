import { Toast } from '@/design-system/components';

export const PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE =
    'Cannot resolve panel range because no valid data range was found.';

export function showPanelFullRangeUnavailableToast(): void {
    Toast.error(PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE);
}
