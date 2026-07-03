import moment from 'moment';
import type { TimeRangeInput, TimeRangeMs } from '../domain/time/TimeTypes';
import { getTimeRangeWidth } from '../domain/time/TimeRangeUtils';

const AXIS_SECOND_LABEL_SPAN_MS = 60 * 60 * 1000;
const AXIS_MINUTE_LABEL_SPAN_MS = 24 * 60 * 60 * 1000;
const AXIS_DAY_TIME_LABEL_SPAN_MS = 30 * 24 * 60 * 60 * 1000;
const COMPACT_NUMBER_UNITS = [
    { value: 1_000_000_000_000, suffix: 'T' },
    { value: 1_000_000_000, suffix: 'B' },
    { value: 1_000_000, suffix: 'M' },
    { value: 1_000, suffix: 'K' },
] as const;
const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
});
const STANDARD_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4,
});
const NUMERIC_COMPACT_VISIBLE_SPAN_THRESHOLD = 10_000;
const NUMERIC_MAX_FRACTION_DIGITS = 8;
const STANDARD_NUMBER_FORMATTERS_BY_FRACTION_DIGITS = new Map<
    number,
    Intl.NumberFormat
>([[4, STANDARD_NUMBER_FORMATTER]]);

function formatNumericAxisLabel(
    value: number | string,
    visibleRange?: TimeRangeMs,
): string {
    const sNumericValue = Number(value);

    if (!Number.isFinite(sNumericValue)) {
        return String(value);
    }

    const sNormalizedValue = Object.is(sNumericValue, -0) ? 0 : sNumericValue;
    const sAbsoluteValue = Math.abs(sNormalizedValue);
    const sUnitIndex = COMPACT_NUMBER_UNITS.findIndex(
        (unit) => sAbsoluteValue >= unit.value,
    );
    const sRawVisibleSpan = visibleRange
        ? getTimeRangeWidth(visibleRange)
        : undefined;
    const sVisibleSpan =
        typeof sRawVisibleSpan === 'number' &&
        Number.isFinite(sRawVisibleSpan) &&
        sRawVisibleSpan > 0
            ? sRawVisibleSpan
            : undefined;

    if (
        sUnitIndex === -1 ||
        (
            sVisibleSpan !== undefined &&
            sVisibleSpan < NUMERIC_COMPACT_VISIBLE_SPAN_THRESHOLD
        )
    ) {
        const sFractionDigits = getNumericAxisFractionDigits(sVisibleSpan);
        return getStandardNumberFormatter(sFractionDigits).format(sNormalizedValue);
    }

    const sUnit = COMPACT_NUMBER_UNITS[
        shouldUseNextLargerNumericUnit(sAbsoluteValue, sUnitIndex)
            ? sUnitIndex - 1
            : sUnitIndex
    ];

    return `${COMPACT_NUMBER_FORMATTER.format(
        sNormalizedValue / sUnit.value,
    )}${sUnit.suffix}`;
}

// Compact K/M/B/T label for axis values with no visible-range context (e.g. Y axes).
export function formatCompactNumericLabel(value: number | string): string {
    return formatNumericAxisLabel(value);
}

export function formatRangeEndpointLabel(
    value: number,
    isNumericAxis: boolean,
    visibleRange?: TimeRangeMs,
): string {
    return isNumericAxis
        ? formatNumericAxisLabel(value, visibleRange)
        : moment(value).format('YYYY-MM-DD HH:mm:ss');
}

function formatLocalTimestampWithMilliseconds(value: number): string {
    const sBaseTimestamp = Math.trunc(value);
    const sFractionalPart = String(value).split('.')[1];
    const sFormatted = moment(sBaseTimestamp).format('YYYY-MM-DD HH:mm:ss.SSS');

    return sFractionalPart ? `${sFormatted}.${sFractionalPart}` : sFormatted;
}

export function formatAxisPointerLabel(
    value: number,
    isNumericAxis: boolean,
    visibleRange?: TimeRangeMs,
): string {
    return isNumericAxis
        ? formatNumericAxisLabel(value, visibleRange)
        : formatLocalTimestampWithMilliseconds(value);
}

function formatAxisTime(value: number, range: TimeRangeMs): string {
    const sVisibleSpan = getTimeRangeWidth(range);

    if (sVisibleSpan <= AXIS_SECOND_LABEL_SPAN_MS) {
        return moment(value).format('HH:mm:ss');
    }

    if (sVisibleSpan <= AXIS_MINUTE_LABEL_SPAN_MS) {
        return moment(value).format('HH:mm');
    }

    if (sVisibleSpan <= AXIS_DAY_TIME_LABEL_SPAN_MS) {
        return moment(value).format('MM-DD HH:mm');
    }

    return moment(value).format('YYYY-MM-DD');
}

export function formatAxisValue(
    value: number,
    range: TimeRangeMs,
    isNumericAxis: boolean,
): string {
    return isNumericAxis
        ? formatNumericAxisLabel(value, range)
        : formatAxisTime(value, range);
}

function formatDurationLabel(startTime: number, endTime: number): string {
    const sDuration = moment.duration(endTime - startTime);
    const sDays = Math.floor(sDuration.asDays());
    const sDayText = sDays === 0 ? '' : `${sDays}d `;
    const sHourText = sDuration.hours() === 0 ? '' : `${sDuration.hours()}h `;
    const sMinuteText = sDuration.minutes() === 0 ? '' : `${sDuration.minutes()}m `;
    const sSecondText = sDuration.seconds() === 0 ? '' : `${sDuration.seconds()}s `;
    const sMillisecondText =
        sDuration.milliseconds() === 0 ? '' : ` ${sDuration.milliseconds()}ms`;

    return `${sDayText}${sHourText}${sMinuteText}${sSecondText}${sMillisecondText}`;
}

export function formatRangeSpanLabel(
    startTime: number,
    endTime: number,
    isNumericAxis: boolean,
): string {
    return isNumericAxis
        ? formatNumericAxisLabel(endTime - startTime)
        : formatDurationLabel(startTime, endTime);
}

// The board time range is stored as raw expression strings, so display text is
// just the two expressions joined (empty when either side is unset).
export function formatBoardRangeText(rangeInput: TimeRangeInput): string {
    if (rangeInput.start.trim() === '' || rangeInput.end.trim() === '') {
        return '';
    }

    return `${rangeInput.start}~${rangeInput.end}`;
}

function shouldUseNextLargerNumericUnit(
    absoluteValue: number,
    unitIndex: number,
): boolean {
    if (unitIndex <= 0) {
        return false;
    }

    const sRoundedScaledValue =
        Math.round((absoluteValue / COMPACT_NUMBER_UNITS[unitIndex].value) * 10) / 10;

    return sRoundedScaledValue >= 1000;
}

function getStandardNumberFormatter(fractionDigits: number): Intl.NumberFormat {
    const sExistingFormatter =
        STANDARD_NUMBER_FORMATTERS_BY_FRACTION_DIGITS.get(fractionDigits);

    if (sExistingFormatter) {
        return sExistingFormatter;
    }

    const sFormatter = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: fractionDigits,
    });
    STANDARD_NUMBER_FORMATTERS_BY_FRACTION_DIGITS.set(
        fractionDigits,
        sFormatter,
    );

    return sFormatter;
}

function getNumericAxisFractionDigits(
    visibleSpan: number | undefined,
): number {
    if (visibleSpan === undefined) {
        return 4;
    }

    if (visibleSpan >= 100) {
        return 0;
    }

    if (visibleSpan >= 10) {
        return 1;
    }

    if (visibleSpan >= 1) {
        return 2;
    }

    const sFractionDigits = Math.ceil(Math.abs(Math.log10(visibleSpan))) + 2;
    return Math.min(sFractionDigits, NUMERIC_MAX_FRACTION_DIGITS);
}
