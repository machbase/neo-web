import moment from 'moment';
import {
    DAY_IN_MS,
    HOUR_IN_MS,
    INTERVAL_RULES,
    MINUTE_IN_MS,
    SECOND_IN_MS,
    WEEK_IN_MS,
} from './constants/IntervalConstants';
import type { IntervalSpec } from './types/IntervalTypes';
import type { IntervalOption } from './types/TimeTypes';
import { TimeUnit } from './types/TimeTypes';

/**
 * Normalizes a user-facing time unit string into the internal enum value.
 * Intent: Keep interval parsing tolerant of shorthand and canonical unit names.
 * @param {string} aUnit - The unit string to normalize.
 * @returns {TimeUnit | undefined} The normalized time unit, or undefined when the input is not recognized.
 */
export function normalizeTimeUnit(aUnit: string): TimeUnit | undefined {
    switch (aUnit.toLowerCase()) {
        case 'ms':
            return TimeUnit.Millisecond;
        case 's':
        case TimeUnit.Second:
            return TimeUnit.Second;
        case 'm':
        case TimeUnit.Minute:
            return TimeUnit.Minute;
        case 'h':
        case TimeUnit.Hour:
            return TimeUnit.Hour;
        case 'd':
        case TimeUnit.Day:
            return TimeUnit.Day;
        case TimeUnit.Week:
            return TimeUnit.Week;
        default:
            return undefined;
    }
}

/**
 * Converts a time unit string into the normalized interval unit name.
 * Intent: Preserve existing interval values while aligning known units to the shared internal form.
 * @param {string} aUnit - The unit string to convert.
 * @returns {string} The normalized unit string, or the original value when no mapping exists.
 */
export function convertIntervalUnit(aUnit: string): string {
    return normalizeTimeUnit(aUnit) ?? aUnit;
}

/**
 * Converts a time unit value into milliseconds.
 * Intent: Provide a shared conversion helper for interval and duration calculations.
 * @param {TimeUnit} aType - The unit type to convert.
 * @param {number} aValue - The numeric unit count to convert.
 * @returns {number} The number of milliseconds represented by the input unit.
 */
export function getTimeUnitMilliseconds(
    aType: TimeUnit,
    aValue: number,
): number {
    switch (aType) {
        case TimeUnit.Millisecond:
            return aValue;
        case TimeUnit.Second:
            return aValue * SECOND_IN_MS;
        case TimeUnit.Minute:
            return aValue * MINUTE_IN_MS;
        case TimeUnit.Hour:
            return aValue * HOUR_IN_MS;
        case TimeUnit.Day:
            return aValue * DAY_IN_MS;
        case TimeUnit.Week:
            return aValue * WEEK_IN_MS;
        default:
            return 0;
    }
}

/**
 * Converts a string unit and value into milliseconds when the unit is supported.
 * Intent: Normalize interval values before they are used by chart interval calculations.
 * @param {string} aType - The unit name to convert.
 * @param {number} aValue - The unit count to convert.
 * @returns {number} The converted millisecond value, or 0 when the unit is unsupported.
 */
export function getIntervalMs(aType: string, aValue: number): number {
    const sNormalizedType = normalizeTimeUnit(aType);

    if (
        !sNormalizedType ||
        sNormalizedType === TimeUnit.Millisecond ||
        sNormalizedType === TimeUnit.Week
    ) {
        return 0;
    }

    return getTimeUnitMilliseconds(sNormalizedType, aValue);
}

/**
 * Calculates the interval type and value for a chart time span.
 * Intent: Keep tick selection consistent across raw, navigator, and regular chart modes.
 * @param {number} aStartTime - The start timestamp of the visible range.
 * @param {number} aEndTime - The end timestamp of the visible range.
 * @param {number} aWidth - The visible chart width in pixels.
 * @param {boolean} aIsRaw - Whether the chart is rendering raw values.
 * @param {number} aPixelsPerTick - The standard pixels-per-tick value.
 * @param {number} aPixelsPerTickRaw - The raw-mode pixels-per-tick value.
 * @param {boolean | undefined} aIsNavigator - Whether the chart is the navigator view.
 * @returns {IntervalOption} The resolved interval configuration for the chart.
 */
export function calculateInterval(
    aStartTime: number,
    aEndTime: number,
    aWidth: number,
    aIsRaw: boolean,
    aPixelsPerTick: number,
    aPixelsPerTickRaw: number,
    aIsNavigator: boolean | undefined,
): IntervalOption {
    const sDiff = aEndTime - aStartTime;
    const sSeconds = Math.floor(sDiff / 1000);
    const sPixelsPerTick = aIsRaw && !aIsNavigator ? aPixelsPerTickRaw : aPixelsPerTick;
    const sCalc = sSeconds / (aWidth / sPixelsPerTick);
    const sInterval = resolveInterval(sCalc);

    return {
        IntervalType: sInterval.type,
        IntervalValue: sInterval.value < 1 ? 1 : sInterval.value,
    };
}

/**
 * Selects the interval specification that best matches the requested scale.
 * Intent: Centralize the chart tick-resolution rules in one place.
 * @param {number} aCalc - The calculated seconds-per-tick estimate.
 * @returns {IntervalSpec} The interval specification to apply.
 */
function resolveInterval(aCalc: number): IntervalSpec {
    const sRule = INTERVAL_RULES.find(({ limit }) => aCalc > limit);
    if (sRule) {
        return sRule.buildIntervalSpec(aCalc);
    }

    return {
        type: TimeUnit.Second,
        value: Math.ceil(aCalc),
    };
}

/**
 * Formats a time span into a compact duration label.
 * Intent: Present elapsed time in a short, human-readable form for chart labels and tooltips.
 * @param {number} aStartTime - The start timestamp of the duration.
 * @param {number} aEndTime - The end timestamp of the duration.
 * @returns {string} The formatted duration label.
 */
export function formatDurationLabel(aStartTime: number, aEndTime: number): string {
    const sDuration = moment.duration(aEndTime - aStartTime);
    const sDays = Math.floor(sDuration.asDays());

    return `${formatDurationPart(sDays, 'd')}${formatDurationPart(sDuration.hours(), 'h')}${formatDurationPart(sDuration.minutes(), 'm')}${formatDurationPart(
        sDuration.seconds(),
        's',
    )}${sDuration.milliseconds() === 0 ? '' : ` ${sDuration.milliseconds()}ms`}`;
}

/**
 * Formats a single duration component with its suffix.
 * Intent: Reuse the same compact rendering logic across days, hours, minutes, and seconds.
 * @param {number} aValue - The numeric value for the duration component.
 * @param {string} aSuffix - The suffix to append to the component.
 * @returns {string} The formatted component, or an empty string when the value is zero.
 */
function formatDurationPart(aValue: number, aSuffix: string): string {
    return aValue === 0 ? '' : `${aValue}${aSuffix} `;
}
