import { formatAbsoluteTime } from '../format/timeFormat';

/** Storage must round-trip the number, unlike rounded chart labels. */
export function formatStoredNumericValue(value: number): string {
    return Number.isFinite(value) ? String(value) : '';
}

/** Keep the legacy whole-second spelling, preserving milliseconds when present. */
export function formatStoredTimeValue(value: number): string {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return value % 1000 === 0 ? formatAbsoluteTime(value) : date.toISOString();
}
