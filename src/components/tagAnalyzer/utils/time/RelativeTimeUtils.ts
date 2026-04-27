import moment from 'moment';
import type { LastRelativeTimeRangeConfig } from './types/TimeBoundaryParsingTypes';
import type { RelativeTimeBoundary, TimeRangeMs } from './types/TimeTypes';

/**
 * Subtracts a numeric offset from a base timestamp.
 * Intent: Keep tag analyzer relative-time subtraction local and string-free.
 * @param {number} time - The base timestamp in milliseconds.
 * @param {number} offsetMilliseconds - The offset to subtract in milliseconds.
 * @returns {number} The shifted timestamp.
 */
export function subtractTimeOffset(time: number, offsetMilliseconds: number): number {
    return time - offsetMilliseconds;
}

/**
 * Converts a parsed relative boundary into the numeric offset from its anchor time.
 * Intent: Preserve calendar-aware relative-unit handling without parsing legacy strings again.
 * @param {number} anchorTime - The anchor timestamp in milliseconds.
 * @param {RelativeTimeBoundary} boundary - The parsed relative boundary to resolve.
 * @returns {number} The numeric offset from the anchor in milliseconds.
 */
export function getRelativeTimeOffsetMilliseconds(
    anchorTime: number,
    boundary: RelativeTimeBoundary,
): number {
    if (boundary.amount <= 0 || !boundary.unit) {
        return 0;
    }

    return (
        anchorTime -
        moment(anchorTime)
            .subtract(
                boundary.amount,
                boundary.unit as moment.unitOfTime.DurationConstructor,
            )
            .valueOf()
    );
}

/**
 * Resolves a last-relative boundary into a concrete timestamp.
 * Intent: Reuse the local numeric subtraction helper for parsed last-relative boundaries.
 * @param {number} anchorTime - The resolved end timestamp that anchors the range.
 * @param {RelativeTimeBoundary} boundary - The last-relative boundary to resolve.
 * @returns {number} The concrete boundary timestamp.
 */
export function resolveLastRelativeBoundaryTime(
    anchorTime: number,
    boundary: RelativeTimeBoundary,
): number {
    return subtractTimeOffset(
        anchorTime,
        getRelativeTimeOffsetMilliseconds(anchorTime, boundary),
    );
}

/**
 * Resolves a parsed last-relative range into a concrete time range.
 * Intent: Centralize tag analyzer last-range timestamp resolution away from shared legacy helpers.
 * @param {number} anchorTime - The resolved end timestamp that anchors the range.
 * @param {LastRelativeTimeRangeConfig} rangeConfig - The parsed last-relative range config.
 * @returns {TimeRangeMs} The concrete resolved time range.
 */
export function resolveLastRelativeTimeRange(
    anchorTime: number,
    rangeConfig: LastRelativeTimeRangeConfig,
): TimeRangeMs {
    return {
        startTime: resolveLastRelativeBoundaryTime(anchorTime, rangeConfig.start),
        endTime: resolveLastRelativeBoundaryTime(anchorTime, rangeConfig.end),
    };
}
