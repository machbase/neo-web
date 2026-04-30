import type { IntervalOption } from '../time/TimeTypes';

/**
 * Returns whether an interval option represents a concrete non-zero interval.
 * Intent: Keep empty interval sentinels from being rendered or reused as real chart intervals.
 * @param {IntervalOption | undefined} intervalOption - The interval option to inspect.
 * @returns {boolean} True when the interval has both a unit and a positive value.
 */
export function hasResolvedIntervalOption(
    intervalOption: IntervalOption | undefined,
): boolean {
    if (!intervalOption) {
        return false;
    }

    return intervalOption.IntervalType !== '' && intervalOption.IntervalValue > 0;
}
