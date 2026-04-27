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
 * @param {RelativeTimeAnchor} anchor - The relative anchor to use.
 * @param {number} amount - The numeric offset amount.
 * @param {RelativeTimeUnit | undefined} unit - The unit for the offset.
 * @param {string} expression - The original expression string.
 * @returns {RelativeTimeBoundary} The relative boundary object.
 */
export function createRelativeTimeBoundary(
    anchor: RelativeTimeAnchor,
    amount: number,
    unit: RelativeTimeUnit | undefined,
    expression = formatRelativeTimeBoundaryExpression(anchor, amount, unit),
): RelativeTimeBoundary {
    return {
        kind: 'relative',
        anchor: anchor,
        amount: amount,
        unit: unit,
        expression: expression,
    };
}

/**
 * Parses an editor input string into a structured time boundary.
 * Intent: Allow the editor to accept valid absolute or relative values while typing.
 * @param {string} value - The input string to parse.
 * @returns {TimeBoundary | undefined} The parsed boundary, or undefined when the value is invalid.
 */
export function parseTimeRangeInputValue(value: string): TimeBoundary | undefined {
    if (value === '') {
        return { kind: 'empty' };
    }

    const sRelativeBoundary = parseRelativeTimeBoundary(value);
    if (sRelativeBoundary) {
        return sRelativeBoundary;
    }

    const sParsedMoment = moment(value, [EDITOR_TIME_FORMAT, moment.ISO_8601], true);

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
 * @param {TimeBoundary} boundary - The boundary to format.
 * @returns {string} The editor-friendly string representation.
 */
export function formatTimeRangeInputValue(boundary: TimeBoundary): string {
    switch (boundary.kind) {
        case 'empty':
            return '';
        case 'absolute':
            return moment.unix(boundary.timestamp / 1000).format(EDITOR_TIME_FORMAT);
        case 'relative':
            return boundary.expression;
        case 'raw':
            return boundary.value;
    }
}

/**
 * Formats an axis label based on the currently visible time span.
 * Intent: Show the most useful timestamp detail for the active chart zoom level.
 * @param {number} value - The timestamp to format.
 * @param {TimeRangeMs} range - The visible time range.
 * @returns {string} The formatted axis label.
 */
export function formatAxisTime(value: number, range: TimeRangeMs): string {
    const sVisibleSpan = range.endTime - range.startTime;

    if (sVisibleSpan <= AXIS_SECOND_LABEL_SPAN_MS) {
        return moment.utc(value).format('HH:mm:ss');
    }

    if (sVisibleSpan <= AXIS_MINUTE_LABEL_SPAN_MS) {
        return moment.utc(value).format('HH:mm');
    }

    if (sVisibleSpan <= AXIS_DAY_TIME_LABEL_SPAN_MS) {
        return moment.utc(value).format('MM-DD HH:mm');
    }

    return moment.utc(value).format('YYYY-MM-DD');
}

/**
 * Checks whether a boundary is empty.
 * Intent: Provide a type guard for branches that treat missing boundaries specially.
 * @param {TimeBoundary} boundary - The boundary to inspect.
 * @returns {aBoundary is EmptyTimeBoundary} True when the boundary is empty.
 */
export function isEmptyTimeBoundary(
    boundary: TimeBoundary,
): boundary is EmptyTimeBoundary {
    return boundary.kind === 'empty';
}

/**
 * Checks whether a boundary is absolute.
 * Intent: Provide a type guard for concrete timestamp boundaries.
 * @param {TimeBoundary} boundary - The boundary to inspect.
 * @returns {aBoundary is AbsoluteTimeBoundary} True when the boundary is absolute.
 */
export function isAbsoluteTimeBoundary(
    boundary: TimeBoundary,
): boundary is AbsoluteTimeBoundary {
    return boundary.kind === 'absolute';
}

/**
 * Checks whether a boundary is relative.
 * Intent: Provide a type guard for expressions that resolve against the current time.
 * @param {TimeBoundary} boundary - The boundary to inspect.
 * @returns {aBoundary is RelativeTimeBoundary} True when the boundary is relative.
 */
export function isRelativeTimeBoundary(
    boundary: TimeBoundary,
): boundary is RelativeTimeBoundary {
    return boundary.kind === 'relative';
}

/**
 * Checks whether a boundary is a last-relative boundary.
 * Intent: Distinguish last-based ranges from other relative time expressions.
 * @param {TimeBoundary} boundary - The boundary to inspect.
 * @returns {aBoundary is LastRelativeTimeBoundary} True when the boundary uses the last anchor.
 */
export function isLastRelativeTimeBoundary(
    boundary: TimeBoundary,
): boundary is LastRelativeTimeBoundary {
    return isRelativeTimeBoundary(boundary) && boundary.anchor === 'last';
}

/**
 * Checks whether a boundary is a now-relative boundary.
 * Intent: Distinguish now-based ranges from other relative time expressions.
 * @param {TimeBoundary} boundary - The boundary to inspect.
 * @returns {aBoundary is NowRelativeTimeBoundary} True when the boundary uses the now anchor.
 */
export function isNowRelativeTimeBoundary(
    boundary: TimeBoundary,
): boundary is NowRelativeTimeBoundary {
    return isRelativeTimeBoundary(boundary) && boundary.anchor === 'now';
}

/**
 * Checks whether both boundaries in a range config are relative.
 * Intent: Gate the last/now range resolution paths on a fully relative config.
 * @param {TimeRangeConfig | undefined} rangeConfig - The range config to inspect.
 * @returns {aRangeConfig is RelativeTimeRangeConfig} True when both boundaries are relative.
 */
export function isRelativeTimeRangeConfig(
    rangeConfig: TimeRangeConfig | undefined,
): rangeConfig is RelativeTimeRangeConfig {
    return hasTimeRangeConfigBoundaries(rangeConfig, isRelativeTimeBoundary);
}

/**
 * Checks whether both boundaries in a range config are last-relative.
 * Intent: Identify range configs that should resolve from the end of the board window.
 * @param {TimeRangeConfig | undefined} rangeConfig - The range config to inspect.
 * @returns {aRangeConfig is LastRelativeTimeRangeConfig} True when both boundaries are last-relative.
 */
export function isLastRelativeTimeRangeConfig(
    rangeConfig: TimeRangeConfig | undefined,
): rangeConfig is LastRelativeTimeRangeConfig {
    return hasTimeRangeConfigBoundaries(rangeConfig, isLastRelativeTimeBoundary);
}

/**
 * Checks whether both boundaries in a range config are now-relative.
 * Intent: Identify range configs that should resolve against the current time.
 * @param {TimeRangeConfig | undefined} rangeConfig - The range config to inspect.
 * @returns {aRangeConfig is NowRelativeTimeRangeConfig} True when both boundaries are now-relative.
 */
export function isNowRelativeTimeRangeConfig(
    rangeConfig: TimeRangeConfig | undefined,
): rangeConfig is NowRelativeTimeRangeConfig {
    return hasTimeRangeConfigBoundaries(rangeConfig, isNowRelativeTimeBoundary);
}

/**
 * Checks whether both boundaries in a range config are absolute.
 * Intent: Detect range configs that can be used without time-relative resolution.
 * @param {TimeRangeConfig | undefined} rangeConfig - The range config to inspect.
 * @returns {aRangeConfig is AbsoluteTimeRangeConfig} True when both boundaries are absolute.
 */
export function isAbsoluteTimeRangeConfig(
    rangeConfig: TimeRangeConfig | undefined,
): rangeConfig is AbsoluteTimeRangeConfig {
    return hasTimeRangeConfigBoundaries(rangeConfig, isAbsoluteTimeBoundary);
}

/**
 * Resolves a structured boundary into a concrete timestamp.
 * Intent: Turn parsed boundaries into numeric values for chart range calculations.
 * @param {TimeBoundary} boundary - The boundary to resolve.
 * @returns {number} The resolved timestamp in milliseconds.
 */
export function resolveTimeBoundaryValue(boundary: TimeBoundary): number {
    switch (boundary.kind) {
        case 'empty':
        case 'raw':
            return 0;
        case 'absolute':
            return boundary.timestamp;
        case 'relative':
            if (boundary.anchor === 'last') {
                return 0;
            }

            if (boundary.amount <= 0 || !boundary.unit) {
                return moment().valueOf();
            }

            return moment()
                .subtract(boundary.amount, boundary.unit as moment.unitOfTime.DurationConstructor)
                .valueOf();
    }
}

/**
 * Converts a time-range config into resolved bounds.
 * Intent: Resolve the config boundaries into numeric min/max values once.
 * @param {TimeRangeConfig} rangeConfig - The range configuration to normalize.
 * @returns {ResolvedTimeBounds} The normalized resolved bounds.
 */
export function normalizeTimeRangeConfig(rangeConfig: TimeRangeConfig): ResolvedTimeBounds {
    return {
        range: {
            min: resolveTimeBoundaryValue(rangeConfig.start),
            max: resolveTimeBoundaryValue(rangeConfig.end),
        },
        rangeConfig: rangeConfig,
    };
}

/**
 * Checks whether a time range is concrete enough for chart work.
 * Intent: Reuse one shared guard for fetch and range workflows that need an ordered time range.
 * @param {TimeRangeMs | undefined} timeRange - The time range candidate to validate.
 * @returns {aTimeRange is TimeRangeMs} True when the range is concrete and ordered.
 */
export function isConcreteTimeRange(timeRange: TimeRangeMs | undefined): timeRange is TimeRangeMs {
    if (!timeRange) {
        return false;
    }

    const { startTime, endTime } = timeRange;
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
 * @param {TimeRangeConfig | undefined} rangeConfig - The range config to inspect.
 * @param {(aBoundary: TimeBoundary) => aBoundary is TBoundary} isBoundary - The boundary predicate to apply.
 * @returns {aRangeConfig is TimeRangeConfigOf<TBoundary>} True when both boundaries match the predicate.
 */
function hasTimeRangeConfigBoundaries<TBoundary extends TimeBoundary>(
    rangeConfig: TimeRangeConfig | undefined,
    isBoundary: (boundary: TimeBoundary) => boundary is TBoundary,
): rangeConfig is TimeRangeConfigOf<TBoundary> {
    if (!rangeConfig) {
        return false;
    }

    return isBoundary(rangeConfig.start) && isBoundary(rangeConfig.end);
}

/**
 * Parses a relative time expression into a boundary.
 * Intent: Support the shared now/last expression format used by the time editor.
 * @param {string} value - The relative expression to parse.
 * @returns {RelativeTimeBoundary | undefined} The parsed relative boundary, or undefined when the pattern does not match.
 */
function parseRelativeTimeBoundary(value: string): RelativeTimeBoundary | undefined {
    const sMatch = value.match(RELATIVE_TIME_PATTERN);
    if (!sMatch) {
        return undefined;
    }

    return createRelativeTimeBoundary(
        sMatch[1].toLowerCase() as RelativeTimeAnchor,
        sMatch[2] ? Number.parseInt(sMatch[2], 10) : 0,
        (sMatch[3] as RelativeTimeUnit | undefined) ?? undefined,
        value,
    );
}

/**
 * Formats a relative boundary expression from its structured parts.
 * Intent: Rebuild the original editor string from parsed relative boundary fields.
 * @param {RelativeTimeAnchor} anchor - The relative anchor to format.
 * @param {number} amount - The numeric offset amount.
 * @param {RelativeTimeUnit | undefined} unit - The unit for the offset.
 * @returns {string} The formatted relative expression.
 */
function formatRelativeTimeBoundaryExpression(
    anchor: RelativeTimeAnchor,
    amount: number,
    unit: RelativeTimeUnit | undefined,
): string {
    if (amount <= 0 || !unit) {
        return anchor;
    }

    return `${anchor}-${amount}${unit}`;
}
