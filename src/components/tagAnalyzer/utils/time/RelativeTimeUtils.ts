import moment from 'moment';
import type { LastRelativeTimeRangeConfig } from './types/TimeBoundaryParsingTypes';
import type { RelativeTimeBoundary, TimeRangeMs } from './types/TimeTypes';

/**
 * Subtracts a numeric offset from a base timestamp.
 * Intent: Keep tag analyzer relative-time subtraction local and string-free.
 * @param {number} aTime - The base timestamp in milliseconds.
 * @param {number} aOffsetMilliseconds - The offset to subtract in milliseconds.
 * @returns {number} The shifted timestamp.
 */
export function subtractTimeOffset(aTime: number, aOffsetMilliseconds: number): number {
    return aTime - aOffsetMilliseconds;
}

/**
 * Converts a parsed relative boundary into the numeric offset from its anchor time.
 * Intent: Preserve calendar-aware relative-unit handling without parsing legacy strings again.
 * @param {number} aAnchorTime - The anchor timestamp in milliseconds.
 * @param {RelativeTimeBoundary} aBoundary - The parsed relative boundary to resolve.
 * @returns {number} The numeric offset from the anchor in milliseconds.
 */
export function getRelativeTimeOffsetMilliseconds(
    aAnchorTime: number,
    aBoundary: RelativeTimeBoundary,
): number {
    if (aBoundary.amount <= 0 || !aBoundary.unit) {
        return 0;
    }

    return (
        aAnchorTime -
        moment(aAnchorTime)
            .subtract(
                aBoundary.amount,
                aBoundary.unit as moment.unitOfTime.DurationConstructor,
            )
            .valueOf()
    );
}

/**
 * Resolves a last-relative boundary into a concrete timestamp.
 * Intent: Reuse the local numeric subtraction helper for parsed last-relative boundaries.
 * @param {number} aAnchorTime - The resolved end timestamp that anchors the range.
 * @param {RelativeTimeBoundary} aBoundary - The last-relative boundary to resolve.
 * @returns {number} The concrete boundary timestamp.
 */
export function resolveLastRelativeBoundaryTime(
    aAnchorTime: number,
    aBoundary: RelativeTimeBoundary,
): number {
    return subtractTimeOffset(
        aAnchorTime,
        getRelativeTimeOffsetMilliseconds(aAnchorTime, aBoundary),
    );
}

/**
 * Resolves a parsed last-relative range into a concrete time range.
 * Intent: Centralize tag analyzer last-range timestamp resolution away from shared legacy helpers.
 * @param {number} aAnchorTime - The resolved end timestamp that anchors the range.
 * @param {LastRelativeTimeRangeConfig} aRangeConfig - The parsed last-relative range config.
 * @returns {TimeRangeMs} The concrete resolved time range.
 */
export function resolveLastRelativeTimeRange(
    aAnchorTime: number,
    aRangeConfig: LastRelativeTimeRangeConfig,
): TimeRangeMs {
    return {
        startTime: resolveLastRelativeBoundaryTime(aAnchorTime, aRangeConfig.start),
        endTime: resolveLastRelativeBoundaryTime(aAnchorTime, aRangeConfig.end),
    };
}
