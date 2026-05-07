import type { ResolvedTimeRangeMs } from './TimeTypes';

/**
 * Compares two resolved time ranges for exact equality.
 * Intent: Keep time-range equality in the foundational time layer instead of panel code.
 * @param {ResolvedTimeRangeMs} left The first range to compare.
 * @param {ResolvedTimeRangeMs} right The second range to compare.
 * @returns {boolean} True when both ranges have the same start and end times.
 */
export function isSameTimeRange(left: ResolvedTimeRangeMs, right: ResolvedTimeRangeMs): boolean {
    return left.startTime === right.startTime && left.endTime === right.endTime;
}
