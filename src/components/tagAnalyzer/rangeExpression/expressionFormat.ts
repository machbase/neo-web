import moment from 'moment';
import { TimeUnit } from './intervalResolver';

export const DATE_TIME_INPUT_FORMAT = 'YYYY-MM-DD HH:mm:ss.SSS';

export function formatRangeInputValue(
    value: number,
    isNumericAxis: boolean,
): string {
    if (!Number.isFinite(value)) return '';

    if (!isNumericAxis) {
        return moment(value).format(DATE_TIME_INPUT_FORMAT);
    }

    return formatNumericValue(value);
}

export function formatNumericValue(value: number): string {
    if (!Number.isFinite(value)) return '';

    return Number.isInteger(value)
        ? String(value)
        : String(Number(value.toPrecision(12)));
}

export function formatTimeUnitShortCode(unit: TimeUnit): string {
    return TIME_UNIT_SHORT_CODES[unit];
}

// -------------------- Local --------------------

const TIME_UNIT_SHORT_CODES: Record<TimeUnit, string> = {
    [TimeUnit.Millisecond]: 'ms',
    [TimeUnit.Second]: 's',
    [TimeUnit.Minute]: 'm',
    [TimeUnit.Hour]: 'h',
    [TimeUnit.Day]: 'd',
    [TimeUnit.Week]: 'w',
    [TimeUnit.Month]: 'M',
    [TimeUnit.Year]: 'y',
};
