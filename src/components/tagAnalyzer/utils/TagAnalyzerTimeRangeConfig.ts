import moment from 'moment';
import type {
    TagAnalyzerAbsoluteTimeRangeConfig,
    TagAnalyzerDefaultRange,
    TagAnalyzerLastRelativeTimeRangeConfig,
    TagAnalyzerNowRelativeTimeRangeConfig,
    TagAnalyzerRelativeTimeAnchor,
    TagAnalyzerRelativeTimeBoundary,
    TagAnalyzerRelativeTimeRangeConfig,
    TagAnalyzerRelativeTimeUnit,
    TagAnalyzerTimeBoundary,
    TagAnalyzerTimeRangeConfig,
    TimeRange,
} from '../common/CommonTypes';
import type { LegacyTimeRangeInput, LegacyTimeValue } from './legacy/LegacyTypes';

const EDITOR_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const RELATIVE_TIME_PATTERN = /^(now|last)(?:-(\d+)([smhdwMy]))?$/i;

type BoundaryRange = TagAnalyzerDefaultRange | TimeRange;

/**
 * Creates the empty boundary used when a panel inherits time from a higher scope.
 */
export function createEmptyTimeBoundary(): TagAnalyzerTimeBoundary {
    return { kind: 'empty' };
}

/**
 * Creates one absolute UTC-millisecond boundary.
 */
export function createAbsoluteTimeBoundary(aTimestamp: number): TagAnalyzerTimeBoundary {
    return {
        kind: 'absolute',
        timestamp: aTimestamp,
    };
}

/**
 * Creates one relative boundary anchored to either now or the latest fetched data time.
 */
export function createRelativeTimeBoundary(
    aAnchor: TagAnalyzerRelativeTimeAnchor,
    aAmount: number,
    aUnit: TagAnalyzerRelativeTimeUnit | undefined,
    aExpression = formatRelativeTimeBoundaryExpression(aAnchor, aAmount, aUnit),
): TagAnalyzerRelativeTimeBoundary {
    return {
        kind: 'relative',
        anchor: aAnchor,
        amount: aAmount,
        unit: aUnit,
        expression: aExpression,
    };
}

/**
 * Creates one raw string boundary when persisted data contains an unsupported expression.
 */
export function createRawTimeBoundary(aValue: string): TagAnalyzerTimeBoundary {
    return {
        kind: 'raw',
        value: aValue,
    };
}

/**
 * Creates the structured start/end holder used inside TagAnalyzer.
 */
export function createTimeRangeConfig(
    aStart: TagAnalyzerTimeBoundary,
    aEnd: TagAnalyzerTimeBoundary,
): TagAnalyzerTimeRangeConfig {
    return {
        start: aStart,
        end: aEnd,
    };
}

/**
 * Parses one persisted legacy time value into the structured internal boundary model.
 */
export function parseLegacyTimeBoundary(aValue: LegacyTimeValue | undefined): TagAnalyzerTimeBoundary {
    if (aValue === '' || aValue === undefined) {
        return createEmptyTimeBoundary();
    }

    if (typeof aValue === 'number') {
        return createAbsoluteTimeBoundary(aValue);
    }

    const sRelativeBoundary = parseRelativeTimeBoundary(aValue);
    if (sRelativeBoundary) {
        return sRelativeBoundary;
    }

    const sParsedMoment = moment(aValue, [EDITOR_TIME_FORMAT, moment.ISO_8601], true);
    if (sParsedMoment.isValid()) {
        return createAbsoluteTimeBoundary(sParsedMoment.valueOf());
    }

    return createRawTimeBoundary(aValue);
}

/**
 * Parses one editor input string into the structured boundary model.
 * Returns `undefined` when the user is still typing an invalid value.
 */
export function parseTimeRangeInputValue(aValue: string): TagAnalyzerTimeBoundary | undefined {
    if (aValue === '') {
        return createEmptyTimeBoundary();
    }

    const sRelativeBoundary = parseRelativeTimeBoundary(aValue);
    if (sRelativeBoundary) {
        return sRelativeBoundary;
    }

    const sParsedMoment = moment(aValue, [EDITOR_TIME_FORMAT, moment.ISO_8601], true);
    return sParsedMoment.isValid()
        ? createAbsoluteTimeBoundary(sParsedMoment.valueOf())
        : undefined;
}

/**
 * Parses one persisted legacy start/end pair into the structured internal holder.
 */
export function parseLegacyTimeRangeConfig(
    aStartValue: LegacyTimeValue | undefined,
    aEndValue: LegacyTimeValue | undefined,
): TagAnalyzerTimeRangeConfig {
    return createTimeRangeConfig(
        parseLegacyTimeBoundary(aStartValue),
        parseLegacyTimeBoundary(aEndValue),
    );
}

/**
 * Formats one structured boundary for the editor text input.
 */
export function formatTimeRangeInputValue(aBoundary: TagAnalyzerTimeBoundary): string {
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
 * Converts the structured time-range holder into the current legacy input payload.
 */
export function toLegacyTimeRangeInput(
    aRange: BoundaryRange,
    aRangeConfig: TagAnalyzerTimeRangeConfig | undefined,
): LegacyTimeRangeInput {
    return 'startTime' in aRange
        ? {
              bgn: aRangeConfig ? toLegacyTimeValue(aRangeConfig.start) : aRange.startTime,
              end: aRangeConfig ? toLegacyTimeValue(aRangeConfig.end) : aRange.endTime,
          }
        : {
              bgn: aRangeConfig ? toLegacyTimeValue(aRangeConfig.start) : aRange.min,
              end: aRangeConfig ? toLegacyTimeValue(aRangeConfig.end) : aRange.max,
          };
}

/**
 * Converts one structured boundary back into the persisted legacy scalar value.
 */
export function toLegacyTimeValue(aBoundary: TagAnalyzerTimeBoundary): LegacyTimeValue {
    switch (aBoundary.kind) {
        case 'empty':
            return '';
        case 'absolute':
            return aBoundary.timestamp;
        case 'relative':
            return aBoundary.expression;
        case 'raw':
            return aBoundary.value;
    }
}

/**
 * Resolves the numeric range used by TagAnalyzer runtime code from the structured holder.
 * `last`-anchored boundaries intentionally stay at `0` until a fetched end bound is available.
 */
export function normalizeTimeRangeConfig(aRangeConfig: TagAnalyzerTimeRangeConfig): {
    range: TagAnalyzerDefaultRange;
    rangeConfig: TagAnalyzerTimeRangeConfig;
} {
    return {
        range: {
            min: resolveTimeBoundaryValue(aRangeConfig.start),
            max: resolveTimeBoundaryValue(aRangeConfig.end),
        },
        rangeConfig: aRangeConfig,
    };
}

/**
 * Returns whether one boundary is empty.
 */
export function isEmptyTimeBoundary(
    aBoundary: TagAnalyzerTimeBoundary | undefined,
): aBoundary is { kind: 'empty' } {
    return aBoundary?.kind === 'empty';
}

/**
 * Returns whether one boundary is absolute.
 */
export function isAbsoluteTimeBoundary(
    aBoundary: TagAnalyzerTimeBoundary | undefined,
): aBoundary is { kind: 'absolute'; timestamp: number } {
    return aBoundary?.kind === 'absolute';
}

/**
 * Returns whether one boundary is relative.
 */
export function isRelativeTimeBoundary(
    aBoundary: TagAnalyzerTimeBoundary | undefined,
): aBoundary is TagAnalyzerRelativeTimeBoundary {
    return aBoundary?.kind === 'relative';
}

/**
 * Returns whether one boundary is a `last`-anchored relative expression.
 */
export function isLastRelativeTimeBoundary(
    aBoundary: TagAnalyzerTimeBoundary | undefined,
): aBoundary is TagAnalyzerRelativeTimeBoundary & { anchor: 'last' } {
    return isRelativeTimeBoundary(aBoundary) && aBoundary.anchor === 'last';
}

/**
 * Returns whether one boundary is a `now`-anchored relative expression.
 */
export function isNowRelativeTimeBoundary(
    aBoundary: TagAnalyzerTimeBoundary | undefined,
): aBoundary is TagAnalyzerRelativeTimeBoundary & { anchor: 'now' } {
    return isRelativeTimeBoundary(aBoundary) && aBoundary.anchor === 'now';
}

/**
 * Returns whether both boundaries are relative expressions.
 */
export function isRelativeTimeRangeConfig(
    aRangeConfig: TagAnalyzerTimeRangeConfig | undefined,
): aRangeConfig is TagAnalyzerRelativeTimeRangeConfig {
    return (
        isRelativeTimeBoundary(aRangeConfig?.start) &&
        isRelativeTimeBoundary(aRangeConfig.end)
    );
}

/**
 * Returns whether both boundaries are `last`-anchored relative expressions.
 */
export function isLastRelativeTimeRangeConfig(
    aRangeConfig: TagAnalyzerTimeRangeConfig | undefined,
): aRangeConfig is TagAnalyzerLastRelativeTimeRangeConfig {
    return (
        isLastRelativeTimeBoundary(aRangeConfig?.start) &&
        isLastRelativeTimeBoundary(aRangeConfig.end)
    );
}

/**
 * Returns whether both boundaries are `now`-anchored relative expressions.
 */
export function isNowRelativeTimeRangeConfig(
    aRangeConfig: TagAnalyzerTimeRangeConfig | undefined,
): aRangeConfig is TagAnalyzerNowRelativeTimeRangeConfig {
    return (
        isNowRelativeTimeBoundary(aRangeConfig?.start) &&
        isNowRelativeTimeBoundary(aRangeConfig.end)
    );
}

/**
 * Returns whether both boundaries are concrete absolute timestamps.
 */
export function isAbsoluteTimeRangeConfig(
    aRangeConfig: TagAnalyzerTimeRangeConfig | undefined,
): aRangeConfig is TagAnalyzerAbsoluteTimeRangeConfig {
    return (
        isAbsoluteTimeBoundary(aRangeConfig?.start) &&
        isAbsoluteTimeBoundary(aRangeConfig.end)
    );
}

/**
 * Resolves one structured boundary into an absolute UTC millisecond timestamp when possible.
 */
export function resolveTimeBoundaryValue(aBoundary: TagAnalyzerTimeBoundary): number {
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

function parseRelativeTimeBoundary(aValue: string): TagAnalyzerRelativeTimeBoundary | undefined {
    const sMatch = aValue.match(RELATIVE_TIME_PATTERN);
    if (!sMatch) {
        return undefined;
    }

    return createRelativeTimeBoundary(
        sMatch[1].toLowerCase() as TagAnalyzerRelativeTimeAnchor,
        sMatch[2] ? Number.parseInt(sMatch[2], 10) : 0,
        (sMatch[3] as TagAnalyzerRelativeTimeUnit | undefined) ?? undefined,
        aValue,
    );
}

function formatRelativeTimeBoundaryExpression(
    aAnchor: TagAnalyzerRelativeTimeAnchor,
    aAmount: number,
    aUnit: TagAnalyzerRelativeTimeUnit | undefined,
): string {
    if (aAmount <= 0 || !aUnit) {
        return aAnchor;
    }

    return `${aAnchor}-${aAmount}${aUnit}`;
}
