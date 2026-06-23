// Handles direct chart-axis editor input. It intentionally supports numeric axes
// and partial local timestamps, unlike persisted boundary expressions.
export const DATE_TIME_INPUT_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const LOCAL_DATE_TIME_INPUT_FORMAT = `${DATE_TIME_INPUT_FORMAT}.SSS`;
export const NUMERIC_AXIS_INPUT_FORMAT = 'Numeric value';

const LOCAL_DATE_TIME_PATTERN =
    /^(\d{4})(?:-(\d{0,2})(?:-(\d{0,2})(?:[ T](\d{0,2})(?::(\d{0,2})(?::(\d{0,2})(?:\.(\d{0,3}))?)?)?)?)?)?$/;
const INTEGER_TIMESTAMP_PATTERN = /^\d+$/;

function formatLocalTimestampInput(timestamp: number): string {
    const date = new Date(timestamp);

    return [
        [
            String(date.getFullYear()).padStart(4, '0'),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0'),
        ].join('-'),
        [
            String(date.getHours()).padStart(2, '0'),
            String(date.getMinutes()).padStart(2, '0'),
            String(date.getSeconds()).padStart(2, '0'),
        ].join(':') + `.${String(date.getMilliseconds()).padStart(3, '0')}`,
    ].join(' ');
}

export function formatAxisInputValue(
    value: number,
    isNumericAxis: boolean,
): string {
    if (!isNumericAxis) {
        return formatLocalTimestampInput(value);
    }

    if (!Number.isFinite(value)) {
        return '';
    }

    return Number.isInteger(value)
        ? String(value)
        : String(Number(value.toPrecision(12)));
}

function parseLocalTimestampInput(value: string): number | undefined {
    const text = value.trim();

    if (text === '') {
        return undefined;
    }

    const match = LOCAL_DATE_TIME_PATTERN.exec(text);

    if (!match) {
        if (INTEGER_TIMESTAMP_PATTERN.test(text)) {
            const timestamp = Number(text);
            return Number.isSafeInteger(timestamp) ? timestamp : undefined;
        }

        return undefined;
    }

    const year = Number(match[1]);
    const month = match[2] ? Number(match[2]) : 1;
    const day = match[3] ? Number(match[3]) : 1;
    const hour = match[4] ? Number(match[4]) : 0;
    const minute = match[5] ? Number(match[5]) : 0;
    const second = match[6] ? Number(match[6]) : 0;
    const millisecond = Number((match[7] || '0').padEnd(3, '0'));

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day) ||
        !Number.isInteger(hour) ||
        !Number.isInteger(minute) ||
        !Number.isInteger(second) ||
        !Number.isInteger(millisecond) ||
        month < 1 ||
        month > 12 ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59 ||
        second < 0 ||
        second > 59 ||
        millisecond < 0 ||
        millisecond > 999
    ) {
        return undefined;
    }

    const timestamp = new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
        millisecond,
    ).getTime();
    const date = new Date(timestamp);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day ||
        date.getHours() !== hour ||
        date.getMinutes() !== minute ||
        date.getSeconds() !== second ||
        date.getMilliseconds() !== millisecond
    ) {
        return undefined;
    }

    return timestamp;
}

export function parseAxisInputValue(
    value: string,
    isNumericAxis: boolean,
): number | undefined {
    if (!isNumericAxis) {
        return parseLocalTimestampInput(value);
    }

    const text = value.trim();
    if (text === '') {
        return undefined;
    }

    const sValue = Number(text);
    return Number.isFinite(sValue) ? sValue : undefined;
}
