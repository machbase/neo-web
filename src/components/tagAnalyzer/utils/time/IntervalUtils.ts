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
 * @param {string} unit - The unit string to normalize.
 * @returns {TimeUnit | undefined} The normalized time unit, or undefined when the input is not recognized.
 */
export function normalizeTimeUnit(unit: string): TimeUnit | undefined {
    switch (unit.toLowerCase()) {
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
 * @param {string} unit - The unit string to convert.
 * @returns {string} The normalized unit string, or the original value when no mapping exists.
 */
export function convertIntervalUnit(unit: string): string {
    return normalizeTimeUnit(unit) ?? unit;
}

/**
 * Converts a time unit value into milliseconds.
 * Intent: Provide a shared conversion helper for interval and duration calculations.
 * @param {TimeUnit} type - The unit type to convert.
 * @param {number} value - The numeric unit count to convert.
 * @returns {number} The number of milliseconds represented by the input unit.
 */
export function getTimeUnitMilliseconds(
    type: TimeUnit,
    value: number,
): number {
    switch (type) {
        case TimeUnit.Millisecond:
            return value;
        case TimeUnit.Second:
            return value * SECOND_IN_MS;
        case TimeUnit.Minute:
            return value * MINUTE_IN_MS;
        case TimeUnit.Hour:
            return value * HOUR_IN_MS;
        case TimeUnit.Day:
            return value * DAY_IN_MS;
        case TimeUnit.Week:
            return value * WEEK_IN_MS;
        default:
            return 0;
    }
}

/**
 * Converts a string unit and value into milliseconds when the unit is supported.
 * Intent: Normalize interval values before they are used by chart interval calculations.
 * @param {string} type - The unit name to convert.
 * @param {number} value - The unit count to convert.
 * @returns {number} The converted millisecond value, or 0 when the unit is unsupported.
 */
export function getIntervalMs(type: string, value: number): number {
    const sNormalizedType = normalizeTimeUnit(type);

    if (
        !sNormalizedType ||
        sNormalizedType === TimeUnit.Millisecond ||
        sNormalizedType === TimeUnit.Week
    ) {
        return 0;
    }

    return getTimeUnitMilliseconds(sNormalizedType, value);
}

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

/**
 * Calculates the interval type and value for a chart time span.
 * Intent: Keep tick selection consistent across raw, navigator, and regular chart modes.
 * @param {number} startTime - The start timestamp of the visible range.
 * @param {number} endTime - The end timestamp of the visible range.
 * @param {number} width - The visible chart width in pixels.
 * @param {boolean} isRaw - Whether the chart is rendering raw values.
 * @param {number} pixelsPerTick - The standard pixels-per-tick value.
 * @param {number} pixelsPerTickRaw - The raw-mode pixels-per-tick value.
 * @param {boolean | undefined} isNavigator - Whether the chart is the navigator view.
 * @returns {IntervalOption} The resolved interval configuration for the chart.
 */
export function calculateInterval(
    startTime: number,
    endTime: number,
    width: number,
    isRaw: boolean,
    pixelsPerTick: number,
    pixelsPerTickRaw: number,
    isNavigator: boolean | undefined,
): IntervalOption {
    const sDiff = endTime - startTime;
    const sSeconds = Math.floor(sDiff / 1000);
    const sPixelsPerTick = isRaw && !isNavigator ? pixelsPerTickRaw : pixelsPerTick;
    const sCalc = sSeconds / (width / sPixelsPerTick);
    const sInterval = resolveInterval(sCalc);

    return {
        IntervalType: sInterval.type,
        IntervalValue: sInterval.value < 1 ? 1 : sInterval.value,
    };
}

/**
 * Selects the interval specification that best matches the requested scale.
 * Intent: Centralize the chart tick-resolution rules in one place.
 * @param {number} calc - The calculated seconds-per-tick estimate.
 * @returns {IntervalSpec} The interval specification to apply.
 */
function resolveInterval(calc: number): IntervalSpec {
    const sRule = INTERVAL_RULES.find(({ limit }) => calc > limit);
    if (sRule) {
        return sRule.buildIntervalSpec(calc);
    }

    return {
        type: TimeUnit.Second,
        value: Math.ceil(calc),
    };
}

/**
 * Formats a time span into a compact duration label.
 * Intent: Present elapsed time in a short, human-readable form for chart labels and tooltips.
 * @param {number} startTime - The start timestamp of the duration.
 * @param {number} endTime - The end timestamp of the duration.
 * @returns {string} The formatted duration label.
 */
export function formatDurationLabel(startTime: number, endTime: number): string {
    const sDuration = moment.duration(endTime - startTime);
    const sDays = Math.floor(sDuration.asDays());

    return `${formatDurationPart(sDays, 'd')}${formatDurationPart(sDuration.hours(), 'h')}${formatDurationPart(sDuration.minutes(), 'm')}${formatDurationPart(
        sDuration.seconds(),
        's',
    )}${sDuration.milliseconds() === 0 ? '' : ` ${sDuration.milliseconds()}ms`}`;
}

/**
 * Formats a single duration component with its suffix.
 * Intent: Reuse the same compact rendering logic across days, hours, minutes, and seconds.
 * @param {number} value - The numeric value for the duration component.
 * @param {string} suffix - The suffix to append to the component.
 * @returns {string} The formatted component, or an empty string when the value is zero.
 */
function formatDurationPart(value: number, suffix: string): string {
    return value === 0 ? '' : `${value}${suffix} `;
}
