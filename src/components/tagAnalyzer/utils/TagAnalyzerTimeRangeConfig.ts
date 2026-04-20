import moment from 'moment';
import type {
    AbsoluteTimeBoundary,
    EmptyTimeBoundary,
    InputTimeBounds,
    ValueRange,
    RelativeTimeAnchor,
    RelativeTimeBoundary,
    RelativeTimeUnit,
    RawTimeBoundary,
    ResolvedTimeBounds,
    TimeBoundary,
    TimeRangeConfig,
    TimeRange,
} from './ModelTypes';
import type { LegacyTimeRangeInput, LegacyTimeValue } from './legacy/LegacyTypes';

const EDITOR_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const RELATIVE_TIME_PATTERN = /^(now|last)(?:-(\d+)([smhdwMy]))?$/i;

type RelativeTimeRangeConfig = {
    start: RelativeTimeBoundary;
    end: RelativeTimeBoundary;
};
type LastRelativeTimeBoundary = RelativeTimeBoundary & { anchor: 'last' };
type LastRelativeTimeRangeConfig = {
    start: LastRelativeTimeBoundary;
    end: LastRelativeTimeBoundary;
};
type NowRelativeTimeBoundary = RelativeTimeBoundary & { anchor: 'now' };
type NowRelativeTimeRangeConfig = {
    start: NowRelativeTimeBoundary;
    end: NowRelativeTimeBoundary;
};
type AbsoluteTimeRangeConfig = {
    start: AbsoluteTimeBoundary;
    end: AbsoluteTimeBoundary;
};
type TimeRangeConfigOf<TBoundary extends TimeBoundary> = {
    start: TBoundary;
    end: TBoundary;
};

/**
 * Creates the empty boundary used when a panel inherits time from a higher scope.
 */
export function createEmptyTimeBoundary(): EmptyTimeBoundary {
    return { kind: 'empty' };
}

/**
 * Creates one absolute UTC-millisecond boundary.
 */
export function createAbsoluteTimeBoundary(aTimestamp: number): AbsoluteTimeBoundary {
    return {
        kind: 'absolute',
        timestamp: aTimestamp,
    };
}

/**
 * Creates one relative boundary anchored to either now or the latest fetched data time.
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
 * Creates one raw string boundary when persisted data contains an unsupported expression.
 */
export function createRawTimeBoundary(aValue: string): RawTimeBoundary {
    return {
        kind: 'raw',
        value: aValue,
    };
}

/**
 * Creates the structured start/end holder used inside TagAnalyzer.
 */
export function createTimeRangeConfig(
    aStart: TimeBoundary,
    aEnd: TimeBoundary,
): TimeRangeConfig {
    return {
        start: aStart,
        end: aEnd,
    };
}

/**
 * Creates the normalized range/config pair used after legacy time values are parsed.
 */
export function createResolvedTimeBounds(
    aRange: ValueRange,
    aRangeConfig: TimeRangeConfig,
): ResolvedTimeBounds {
    return {
        range: aRange,
        rangeConfig: aRangeConfig,
    };
}

/**
 * Creates the empty input wrapper used at boundaries where no board range exists yet.
 */
export function createEmptyInputTimeBounds(): InputTimeBounds {
    return { kind: 'empty' };
}

/**
 * Normalizes nullable range/config pairs into one explicit input contract.
 */
export function normalizeTimeBoundsInput(
    aRange: ValueRange | undefined,
    aRangeConfig: TimeRangeConfig | undefined,
): InputTimeBounds {
    if (!aRange || !aRangeConfig) {
        return createEmptyInputTimeBounds();
    }

    return {
        kind: 'resolved',
        value: createResolvedTimeBounds(aRange, aRangeConfig),
    };
}

/**
 * Parses one persisted legacy time value into the structured internal boundary model.
 */
export function parseLegacyTimeBoundary(aValue: LegacyTimeValue | undefined): TimeBoundary {
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
export function parseTimeRangeInputValue(aValue: string): TimeBoundary | undefined {
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
): TimeRangeConfig {
    return createTimeRangeConfig(
        parseLegacyTimeBoundary(aStartValue),
        parseLegacyTimeBoundary(aEndValue),
    );
}

/**
 * Formats one structured boundary for the editor text input.
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
 * Converts the structured time-range holder into the current legacy input payload.
 */
export type LegacyTimeRangeSource =
    | {
          range: ValueRange | TimeRange;
      }
    | {
          range: ValueRange | TimeRange;
          rangeConfig: TimeRangeConfig;
      };

export function toLegacyTimeRangeInput(aSource: LegacyTimeRangeSource): LegacyTimeRangeInput {
    const sRange = aSource.range;
    const sRangeConfig = 'rangeConfig' in aSource ? aSource.rangeConfig : undefined;

    return 'startTime' in sRange
        ? {
              bgn: sRangeConfig ? toLegacyTimeValue(sRangeConfig.start) : sRange.startTime,
              end: sRangeConfig ? toLegacyTimeValue(sRangeConfig.end) : sRange.endTime,
          }
        : {
              bgn: sRangeConfig ? toLegacyTimeValue(sRangeConfig.start) : sRange.min,
              end: sRangeConfig ? toLegacyTimeValue(sRangeConfig.end) : sRange.max,
          };
}

/**
 * Converts one structured boundary back into the persisted legacy scalar value.
 */
export function toLegacyTimeValue(aBoundary: TimeBoundary): LegacyTimeValue {
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
export function normalizeTimeRangeConfig(aRangeConfig: TimeRangeConfig): {
    range: ValueRange;
    rangeConfig: TimeRangeConfig;
} {
    return createResolvedTimeBounds(
        {
            min: resolveTimeBoundaryValue(aRangeConfig.start),
            max: resolveTimeBoundaryValue(aRangeConfig.end),
        },
        aRangeConfig,
    );
}

/**
 * Returns whether one boundary is empty.
 */
export function isEmptyTimeBoundary(
    aBoundary: TimeBoundary,
): aBoundary is EmptyTimeBoundary {
    return aBoundary.kind === 'empty';
}

/**
 * Returns whether one boundary is absolute.
 */
export function isAbsoluteTimeBoundary(
    aBoundary: TimeBoundary,
): aBoundary is AbsoluteTimeBoundary {
    return aBoundary.kind === 'absolute';
}

/**
 * Returns whether one boundary is relative.
 */
export function isRelativeTimeBoundary(
    aBoundary: TimeBoundary,
): aBoundary is RelativeTimeBoundary {
    return aBoundary.kind === 'relative';
}

/**
 * Returns whether one boundary is a `last`-anchored relative expression.
 */
export function isLastRelativeTimeBoundary(
    aBoundary: TimeBoundary,
): aBoundary is LastRelativeTimeBoundary {
    return isRelativeTimeBoundary(aBoundary) && aBoundary.anchor === 'last';
}

/**
 * Returns whether one boundary is a `now`-anchored relative expression.
 */
export function isNowRelativeTimeBoundary(
    aBoundary: TimeBoundary,
): aBoundary is NowRelativeTimeBoundary {
    return isRelativeTimeBoundary(aBoundary) && aBoundary.anchor === 'now';
}

/**
 * Returns whether both boundaries in one range config satisfy the same boundary guard.
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
 * Returns whether both boundaries are relative expressions.
 */
export function isRelativeTimeRangeConfig(
    aRangeConfig: TimeRangeConfig | undefined,
): aRangeConfig is RelativeTimeRangeConfig {
    return hasTimeRangeConfigBoundaries(aRangeConfig, isRelativeTimeBoundary);
}

/**
 * Returns whether both boundaries are `last`-anchored relative expressions.
 */
export function isLastRelativeTimeRangeConfig(
    aRangeConfig: TimeRangeConfig | undefined,
): aRangeConfig is LastRelativeTimeRangeConfig {
    return hasTimeRangeConfigBoundaries(aRangeConfig, isLastRelativeTimeBoundary);
}

/**
 * Returns whether both boundaries are `now`-anchored relative expressions.
 */
export function isNowRelativeTimeRangeConfig(
    aRangeConfig: TimeRangeConfig | undefined,
): aRangeConfig is NowRelativeTimeRangeConfig {
    return hasTimeRangeConfigBoundaries(aRangeConfig, isNowRelativeTimeBoundary);
}

/**
 * Returns whether both boundaries are concrete absolute timestamps.
 */
export function isAbsoluteTimeRangeConfig(
    aRangeConfig: TimeRangeConfig | undefined,
): aRangeConfig is AbsoluteTimeRangeConfig {
    return hasTimeRangeConfigBoundaries(aRangeConfig, isAbsoluteTimeBoundary);
}

/**
 * Resolves one structured boundary into an absolute UTC millisecond timestamp when possible.
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
