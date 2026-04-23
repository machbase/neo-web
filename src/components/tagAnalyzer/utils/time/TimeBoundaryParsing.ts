import moment from 'moment';
import {
    AXIS_DAY_TIME_LABEL_SPAN_MS,
    AXIS_MINUTE_LABEL_SPAN_MS,
    AXIS_SECOND_LABEL_SPAN_MS,
    EDITOR_TIME_FORMAT,
    RELATIVE_TIME_PATTERN,
} from './constants/TimeBoundaryConstants';
import type {
    AbsoluteTimeRangeConfig,
    LastRelativeTimeBoundary,
    LastRelativeTimeRangeConfig,
    NowRelativeTimeBoundary,
    NowRelativeTimeRangeConfig,
    RelativeTimeRangeConfig,
    TimeRangeConfigOf,
} from './types/TimeBoundaryParsingTypes';
import type {
    AbsoluteTimeBoundary,
    EmptyTimeBoundary,
    RelativeTimeAnchor,
    RelativeTimeBoundary,
    RelativeTimeUnit,
    ResolvedTimeBounds,
    TimeRangeMs,
    TimeBoundary,
    TimeRangeConfig,
} from './types/TimeTypes';

/**
 * Creates a relative time boundary from its structured parts.
 * Intent: Preserve parsed relative expressions in a canonical boundary object.
 * @param {RelativeTimeAnchor} aAnchor - The relative anchor to use.
 * @param {number} aAmount - The numeric offset amount.
 * @param {RelativeTimeUnit | undefined} aUnit - The unit for the offset.
 * @param {string} aExpression - The original expression string.
 * @returns {RelativeTimeBoundary} The relative boundary object.
 */
export function createRelativeTimeBoundary(
    aAnchor: RelativeTimeAnchor,
    aAmount: number,
    aUnit: RelativeTimeUnit | undefined,
    aExpression = formatRelativeTimeBoundaryExpression(aAnchor, aAmount, aUnit),
): RelativeTimeBoundary {
    return {
        kind: 'relative',
        anchor: aAnchor,
        amount: aAmount,
        unit: aUnit,
        expression: aExpression,
    };
}

/**
 * Parses an editor input string into a structured time boundary.
 * Intent: Allow the editor to accept valid absolute or relative values while typing.
 * @param {string} aValue - The input string to parse.
 * @returns {TimeBoundary | undefined} The parsed boundary, or undefined when the value is invalid.
 */
export function parseTimeRangeInputValue(aValue: string): TimeBoundary | undefined {
    if (aValue === '') {
        return { kind: 'empty' };
    }

    const sRelativeBoundary = parseRelativeTimeBoundary(aValue);
    if (sRelativeBoundary) {
        return sRelativeBoundary;
    }

    const sParsedMoment = moment(aValue, [EDITOR_TIME_FORMAT, moment.ISO_8601], true);

    return sParsedMoment.isValid()
        ? {
              kind: 'absolute',
              timestamp: sParsedMoment.valueOf(),
          }
        : undefined;
}

/**
 * Formats a structured boundary back into the editor input string.
 * Intent: Keep the editor display in sync with the parsed boundary structure.
 * @param {TimeBoundary} aBoundary - The boundary to format.
 * @returns {string} The editor-friendly string representation.
 */
export function formatTimeRangeInputValue(aBoundary: TimeBoundary): string {
    switch (aBoundary.kind) {
        case 'empty':
            return '';
        case 'absolute':
            return moment.unix(aBoundary.timestamp / 1000).format(EDITOR_TIME_FORMAT);
        case 'relative':
            return aBoundary.expression;
        case 'raw':
            return aBoundary.value;
    }
}

/**
 * Formats an axis label based on the currently visible time span.
 * Intent: Show the most useful timestamp detail for the active chart zoom level.
 * @param {number} aValue - The timestamp to format.
 * @param {TimeRangeMs} aRange - The visible time range.
 * @returns {string} The formatted axis label.
 */
export function formatAxisTime(aValue: number, aRange: TimeRangeMs): string {
    const sVisibleSpan = aRange.endTime - aRange.startTime;

    if (sVisibleSpan <= AXIS_SECOND_LABEL_SPAN_MS) {
        return moment.utc(aValue).format('HH:mm:ss');
    }

    if (sVisibleSpan <= AXIS_MINUTE_LABEL_SPAN_MS) {
        return moment.utc(aValue).format('HH:mm');
    }

    if (sVisibleSpan <= AXIS_DAY_TIME_LABEL_SPAN_MS) {
        return moment.utc(aValue).format('MM-DD HH:mm');
    }

    return moment.utc(aValue).format('YYYY-MM-DD');
}

/**
 * Checks whether a boundary is empty.
 * Intent: Provide a type guard for branches that treat missing boundaries specially.
 * @param {TimeBoundary} aBoundary - The boundary to inspect.
 * @returns {aBoundary is EmptyTimeBoundary} True when the boundary is empty.
 */
export function isEmptyTimeBoundary(
    aBoundary: TimeBoundary,
): aBoundary is EmptyTimeBoundary {
    return aBoundary.kind === 'empty';
}

/**
 * Checks whether a boundary is absolute.
 * Intent: Provide a type guard for concrete timestamp boundaries.
 * @param {TimeBoundary} aBoundary - The boundary to inspect.
 * @returns {aBoundary is AbsoluteTimeBoundary} True when the boundary is absolute.
 */
export function isAbsoluteTimeBoundary(
    aBoundary: TimeBoundary,
): aBoundary is AbsoluteTimeBoundary {
    return aBoundary.kind === 'absolute';
}

/**
 * Checks whether a boundary is relative.
 * Intent: Provide a type guard for expressions that resolve against the current time.
 * @param {TimeBoundary} aBoundary - The boundary to inspect.
 * @returns {aBoundary is RelativeTimeBoundary} True when the boundary is relative.
 */
export function isRelativeTimeBoundary(
    aBoundary: TimeBoundary,
): aBoundary is RelativeTimeBoundary {
    return aBoundary.kind === 'relative';
}

/**
 * Checks whether a boundary is a last-relative boundary.
 * Intent: Distinguish last-based ranges from other relative time expressions.
 * @param {TimeBoundary} aBoundary - The boundary to inspect.
 * @returns {aBoundary is LastRelativeTimeBoundary} True when the boundary uses the last anchor.
 */
export function isLastRelativeTimeBoundary(
    aBoundary: TimeBoundary,
): aBoundary is LastRelativeTimeBoundary {
    return isRelativeTimeBoundary(aBoundary) && aBoundary.anchor === 'last';
}

/**
 * Checks whether a boundary is a now-relative boundary.
 * Intent: Distinguish now-based ranges from other relative time expressions.
 * @param {TimeBoundary} aBoundary - The boundary to inspect.
 * @returns {aBoundary is NowRelativeTimeBoundary} True when the boundary uses the now anchor.
 */
export function isNowRelativeTimeBoundary(
    aBoundary: TimeBoundary,
): aBoundary is NowRelativeTimeBoundary {
    return isRelativeTimeBoundary(aBoundary) && aBoundary.anchor === 'now';
}

/**
 * Checks whether both boundaries in a range config are relative.
 * Intent: Gate the last/now range resolution paths on a fully relative config.
 * @param {TimeRangeConfig | undefined} aRangeConfig - The range config to inspect.
 * @returns {aRangeConfig is RelativeTimeRangeConfig} True when both boundaries are relative.
 */
export function isRelativeTimeRangeConfig(
    aRangeConfig: TimeRangeConfig | undefined,
): aRangeConfig is RelativeTimeRangeConfig {
    return hasTimeRangeConfigBoundaries(aRangeConfig, isRelativeTimeBoundary);
}

/**
 * Checks whether both boundaries in a range config are last-relative.
 * Intent: Identify range configs that should resolve from the end of the board window.
 * @param {TimeRangeConfig | undefined} aRangeConfig - The range config to inspect.
 * @returns {aRangeConfig is LastRelativeTimeRangeConfig} True when both boundaries are last-relative.
 */
export function isLastRelativeTimeRangeConfig(
    aRangeConfig: TimeRangeConfig | undefined,
): aRangeConfig is LastRelativeTimeRangeConfig {
    return hasTimeRangeConfigBoundaries(aRangeConfig, isLastRelativeTimeBoundary);
}

/**
 * Checks whether both boundaries in a range config are now-relative.
 * Intent: Identify range configs that should resolve against the current time.
 * @param {TimeRangeConfig | undefined} aRangeConfig - The range config to inspect.
 * @returns {aRangeConfig is NowRelativeTimeRangeConfig} True when both boundaries are now-relative.
 */
export function isNowRelativeTimeRangeConfig(
    aRangeConfig: TimeRangeConfig | undefined,
): aRangeConfig is NowRelativeTimeRangeConfig {
    return hasTimeRangeConfigBoundaries(aRangeConfig, isNowRelativeTimeBoundary);
}

/**
 * Checks whether both boundaries in a range config are absolute.
 * Intent: Detect range configs that can be used without time-relative resolution.
 * @param {TimeRangeConfig | undefined} aRangeConfig - The range config to inspect.
 * @returns {aRangeConfig is AbsoluteTimeRangeConfig} True when both boundaries are absolute.
 */
export function isAbsoluteTimeRangeConfig(
    aRangeConfig: TimeRangeConfig | undefined,
): aRangeConfig is AbsoluteTimeRangeConfig {
    return hasTimeRangeConfigBoundaries(aRangeConfig, isAbsoluteTimeBoundary);
}

/**
 * Resolves a structured boundary into a concrete timestamp.
 * Intent: Turn parsed boundaries into numeric values for chart range calculations.
 * @param {TimeBoundary} aBoundary - The boundary to resolve.
 * @returns {number} The resolved timestamp in milliseconds.
 */
export function resolveTimeBoundaryValue(aBoundary: TimeBoundary): number {
    switch (aBoundary.kind) {
        case 'empty':
        case 'raw':
            return 0;
        case 'absolute':
            return aBoundary.timestamp;
        case 'relative':
            if (aBoundary.anchor === 'last') {
                return 0;
            }

            if (aBoundary.amount <= 0 || !aBoundary.unit) {
                return moment().valueOf();
            }

            return moment()
                .subtract(aBoundary.amount, aBoundary.unit as moment.unitOfTime.DurationConstructor)
                .valueOf();
    }
}

/**
 * Converts a time-range config into resolved bounds.
 * Intent: Resolve the config boundaries into numeric min/max values once.
 * @param {TimeRangeConfig} aRangeConfig - The range configuration to normalize.
 * @returns {ResolvedTimeBounds} The normalized resolved bounds.
 */
export function normalizeTimeRangeConfig(aRangeConfig: TimeRangeConfig): ResolvedTimeBounds {
    return {
        range: {
            min: resolveTimeBoundaryValue(aRangeConfig.start),
            max: resolveTimeBoundaryValue(aRangeConfig.end),
        },
        rangeConfig: aRangeConfig,
    };
}

/**
 * Checks whether a time range is concrete enough for chart work.
 * Intent: Reuse one shared guard for fetch and range workflows that need an ordered time range.
 * @param {TimeRangeMs | undefined} aTimeRange - The time range candidate to validate.
 * @returns {aTimeRange is TimeRangeMs} True when the range is concrete and ordered.
 */
export function isConcreteTimeRange(aTimeRange: TimeRangeMs | undefined): aTimeRange is TimeRangeMs {
    if (!aTimeRange) {
        return false;
    }

    const { startTime, endTime } = aTimeRange;
    return (
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        startTime > 0 &&
        endTime > 0 &&
        endTime > startTime
    );
}

/**
 * Checks whether a range config has both boundaries of the requested boundary type.
 * Intent: Share the type-guard logic for the relative and absolute range predicates.
 * @param {TimeRangeConfig | undefined} aRangeConfig - The range config to inspect.
 * @param {(aBoundary: TimeBoundary) => aBoundary is TBoundary} aIsBoundary - The boundary predicate to apply.
 * @returns {aRangeConfig is TimeRangeConfigOf<TBoundary>} True when both boundaries match the predicate.
 */
function hasTimeRangeConfigBoundaries<TBoundary extends TimeBoundary>(
    aRangeConfig: TimeRangeConfig | undefined,
    aIsBoundary: (aBoundary: TimeBoundary) => aBoundary is TBoundary,
): aRangeConfig is TimeRangeConfigOf<TBoundary> {
    if (!aRangeConfig) {
        return false;
    }

    return aIsBoundary(aRangeConfig.start) && aIsBoundary(aRangeConfig.end);
}

/**
 * Parses a relative time expression into a boundary.
 * Intent: Support the shared now/last expression format used by the time editor.
 * @param {string} aValue - The relative expression to parse.
 * @returns {RelativeTimeBoundary | undefined} The parsed relative boundary, or undefined when the pattern does not match.
 */
function parseRelativeTimeBoundary(aValue: string): RelativeTimeBoundary | undefined {
    const sMatch = aValue.match(RELATIVE_TIME_PATTERN);
    if (!sMatch) {
        return undefined;
    }

    return createRelativeTimeBoundary(
        sMatch[1].toLowerCase() as RelativeTimeAnchor,
        sMatch[2] ? Number.parseInt(sMatch[2], 10) : 0,
        (sMatch[3] as RelativeTimeUnit | undefined) ?? undefined,
        aValue,
    );
}

/**
 * Formats a relative boundary expression from its structured parts.
 * Intent: Rebuild the original editor string from parsed relative boundary fields.
 * @param {RelativeTimeAnchor} aAnchor - The relative anchor to format.
 * @param {number} aAmount - The numeric offset amount.
 * @param {RelativeTimeUnit | undefined} aUnit - The unit for the offset.
 * @returns {string} The formatted relative expression.
 */
function formatRelativeTimeBoundaryExpression(
    aAnchor: RelativeTimeAnchor,
    aAmount: number,
    aUnit: RelativeTimeUnit | undefined,
): string {
    if (aAmount <= 0 || !aUnit) {
        return aAnchor;
    }

    return `${aAnchor}-${aAmount}${aUnit}`;
}
