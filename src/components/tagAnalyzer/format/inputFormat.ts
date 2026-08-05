import moment from 'moment';
import type { AxisKind } from '../range/rangeModel';

const DATE_TIME_INPUT_FORMAT = 'YYYY-MM-DD HH:mm:ss.SSS';
const LOCAL_DATE_TIME_PATTERN =
    /^(\d{4})(?:-(\d{0,2})(?:-(\d{0,2})(?:[ T](\d{0,2})(?::(\d{0,2})(?::(\d{0,2})(?:\.(\d{0,3}))?)?)?)?)?)?$/;
const INTEGER_TIMESTAMP_PATTERN = /^\d+$/;

export function formatRangeInputValue(
    value: number,
    isNumericAxis: boolean,
): string {
    if (!Number.isFinite(value)) return '';

    if (!isNumericAxis) {
        return moment(value).format(DATE_TIME_INPUT_FORMAT);
    }

    return Number.isInteger(value)
        ? String(value)
        : String(Number(value.toPrecision(12)));
}

export function parseRangeInputValue(
    value: string,
    axisKind: AxisKind,
): number | undefined {
    const text = value.trim();
    if (text === '') return undefined;

    if (axisKind === 'numeric') {
        const numericValue = Number(text);
        return Number.isFinite(numericValue) ? numericValue : undefined;
    }

    const localDateMatch = LOCAL_DATE_TIME_PATTERN.exec(text);
    if (localDateMatch) {
        const parts = [
            Number(localDateMatch[1]),
            localDateMatch[2] ? Number(localDateMatch[2]) : 1,
            localDateMatch[3] ? Number(localDateMatch[3]) : 1,
            localDateMatch[4] ? Number(localDateMatch[4]) : 0,
            localDateMatch[5] ? Number(localDateMatch[5]) : 0,
            localDateMatch[6] ? Number(localDateMatch[6]) : 0,
            Number((localDateMatch[7] || '0').padEnd(3, '0')),
        ] as const;
        const [year, month, day, hour, minute, second, millisecond] = parts;
        if (
            parts.every(Number.isInteger) &&
            month >= 1 &&
            month <= 12 &&
            hour >= 0 &&
            hour <= 23 &&
            minute >= 0 &&
            minute <= 59 &&
            second >= 0 &&
            second <= 59 &&
            millisecond >= 0 &&
            millisecond <= 999
        ) {
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
            const resolvedParts = [
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate(),
                date.getHours(),
                date.getMinutes(),
                date.getSeconds(),
                date.getMilliseconds(),
            ];

            if (resolvedParts.every((part, index) => part === parts[index])) {
                return timestamp;
            }
        }

        return undefined;
    }

    if (INTEGER_TIMESTAMP_PATTERN.test(text)) {
        const timestamp = Number(text);
        return Number.isSafeInteger(timestamp) ? timestamp : undefined;
    }

    const timestamp = moment(text, moment.ISO_8601, true);
    return timestamp.isValid() ? timestamp.valueOf() : undefined;
}
