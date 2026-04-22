import type { TimeRange } from '../time/timeTypes';

/**
 * Normalizes requested fetch bounds into the nanosecond range expected by the backend.
 * Intent: Keep raw and calculated fetches aligned with the backend timestamp precision rules.
 * @param {number} aStartTime - The requested start timestamp.
 * @param {number} aEndTime - The requested end timestamp.
 * @returns {TimeRange} The normalized fetch time range.
 */
export function resolveFetchTimeBounds(aStartTime: number, aEndTime: number): TimeRange {
    const sNanoSec = 1000000;
    let sNormalizedStartTime = aStartTime;
    let sNormalizedEndTime = aEndTime;
    const sHasDecimalStartTime = aStartTime.toString().includes('.');
    const sHasDecimalEndTime = aEndTime.toString().includes('.');
    const sHalfTimeRange = (aEndTime - aStartTime) / 2;

    if (sHasDecimalStartTime) {
        sNormalizedStartTime = aStartTime * sNanoSec;
    }
    if (sHasDecimalEndTime) {
        sNormalizedEndTime = aEndTime * sNanoSec;
    }
    if (aStartTime.toString().length === 13) {
        sNormalizedStartTime = aStartTime * sNanoSec - sHalfTimeRange;
    }
    if (aEndTime.toString().length === 13) {
        sNormalizedEndTime = aEndTime * sNanoSec + sHalfTimeRange;
    }

    return {
        startTime: sNormalizedStartTime,
        endTime: sNormalizedEndTime,
    };
}
