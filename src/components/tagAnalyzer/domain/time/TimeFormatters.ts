import moment from 'moment';
import type { TimeRangeConfig, TimeRangeMs } from './TimeTypes';
import {
    HOUR_IN_MS,
    MINUTE_IN_MS,
    SECOND_IN_MS,
} from './TimeConstants';
import { formatTimeRangeInputValue } from './TimeBoundaryInput';

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

function formatLocalRangeLabel(value: number): string {
    return moment(value).format('YYYY-MM-DD HH:mm:ss');
}

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
    const sVisibleSpan = getVisibleNumericSpan(visibleRange);

    if (
        sUnitIndex === -1 ||
        (
            sVisibleSpan !== undefined &&
            sVisibleSpan < NUMERIC_COMPACT_VISIBLE_SPAN_THRESHOLD
        )
    ) {
        return formatStandardNumericAxisLabel(sNormalizedValue, sVisibleSpan);
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

export function formatRangeBoundaryLabel(
    value: number,
    isNumericAxis: boolean,
    visibleRange?: TimeRangeMs,
): string {
    return isNumericAxis
        ? formatNumericAxisLabel(value, visibleRange)
        : formatLocalRangeLabel(value);
}

export function formatLocalTimestampWithMilliseconds(value: number): string {
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
    const sVisibleSpan = range.endTime - range.startTime;

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

    return `${formatDurationPart(sDays, 'd')}${formatDurationPart(sDuration.hours(), 'h')}${formatDurationPart(sDuration.minutes(), 'm')}${formatDurationPart(
        sDuration.seconds(),
        's',
    )}${sDuration.milliseconds() === 0 ? '' : ` ${sDuration.milliseconds()}ms`}`;
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

export function formatBoardRangeText(rangeConfig: TimeRangeConfig): string {
    if (
        rangeConfig.start.kind === 'empty' ||
        rangeConfig.end.kind === 'empty'
    ) {
        return '';
    }

    if (
        rangeConfig.start.kind === 'absolute' &&
        rangeConfig.end.kind === 'absolute'
    ) {
        if (
            rangeConfig.start.timestamp <= 0 ||
            rangeConfig.end.timestamp <= 0 ||
            rangeConfig.end.timestamp < rangeConfig.start.timestamp
        ) {
            return '';
        }

        return `${formatLocalRangeLabel(rangeConfig.start.timestamp)}~${formatLocalRangeLabel(rangeConfig.end.timestamp)}`;
    }

    return `${formatTimeRangeInputValue(rangeConfig.start)}~${formatTimeRangeInputValue(rangeConfig.end)}`;
}

export function formatElapsedTimeLabel(
    elapsedMs: number | string,
    tickInterval?: number,
): string {
    const sElapsedMs = Number(elapsedMs);
    if (!Number.isFinite(sElapsedMs)) return String(elapsedMs);

    const sSign = sElapsedMs < 0 ? '-' : '';
    const sAbsMs = Math.floor(Math.abs(sElapsedMs));
    const sHours = Math.floor(sAbsMs / HOUR_IN_MS);
    const sMinutes = Math.floor((sAbsMs % HOUR_IN_MS) / MINUTE_IN_MS);
    const sSeconds = Math.floor((sAbsMs % MINUTE_IN_MS) / SECOND_IN_MS);
    const sMilliseconds = sAbsMs % SECOND_IN_MS;
    const sBase = `${sSign}${padTimePart(sHours)}:${padTimePart(sMinutes)}`;

    if (tickInterval !== undefined && tickInterval < SECOND_IN_MS) {
        return `${sBase}:${padTimePart(sSeconds)}.${padTimePart(sMilliseconds, 3)}`;
    }

    if (tickInterval !== undefined && tickInterval < MINUTE_IN_MS) {
        return `${sBase}:${padTimePart(sSeconds)}`;
    }

    return sBase;
}

function formatDurationPart(value: number, suffix: string): string {
    return value === 0 ? '' : `${value}${suffix} `;
}

export function padTimePart(value: number, size = 2): string {
    return String(value).padStart(size, '0');
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

function formatStandardNumericAxisLabel(
    value: number,
    visibleSpan: number | undefined,
): string {
    const sFractionDigits = getNumericAxisFractionDigits(visibleSpan);
    return getStandardNumberFormatter(sFractionDigits).format(value);
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

function getVisibleNumericSpan(
    visibleRange: TimeRangeMs | undefined,
): number | undefined {
    if (!visibleRange) {
        return undefined;
    }

    const sVisibleSpan = visibleRange.endTime - visibleRange.startTime;

    return Number.isFinite(sVisibleSpan) && sVisibleSpan > 0
        ? sVisibleSpan
        : undefined;
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
