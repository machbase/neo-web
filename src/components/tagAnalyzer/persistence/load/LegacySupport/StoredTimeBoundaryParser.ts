import type { ResolvedTimeBounds, TimeBoundaryInputValue } from '../../../time/TimeTypes';
import { normalizeTimeBoundaryInputValues } from '../../../time/TimeBoundaryParsing';

/**
 * Parses stored TagAnalyzer time boundary values into the canonical structured runtime shape.
 * Intent: Keep legacy persisted boundary normalization at the load boundary instead of the time domain.
 * @param {TimeBoundaryInputValue | undefined} startValue The stored start boundary value.
 * @param {TimeBoundaryInputValue | undefined} endValue The stored end boundary value.
 * @returns {ResolvedTimeBounds} The parsed structured time bounds.
 */
export function parseStoredTimeRangeBoundary(
    startValue: TimeBoundaryInputValue | undefined,
    endValue: TimeBoundaryInputValue | undefined,
): ResolvedTimeBounds {
    return normalizeTimeBoundaryInputValues(startValue, endValue);
}
