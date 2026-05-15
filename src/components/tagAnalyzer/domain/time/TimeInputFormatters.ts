export const DATE_TIME_INPUT_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const LOCAL_DATE_TIME_INPUT_FORMAT = `${DATE_TIME_INPUT_FORMAT}.SSS`;

const LOCAL_DATE_TIME_PATTERN =
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?)?$/;
const INTEGER_TIMESTAMP_PATTERN = /^\d+$/;

function padTimePart(value: number, length: number) {
    return String(value).padStart(length, '0');
}

export function formatLocalTimestampInput(timestamp: number): string {
    const date = new Date(timestamp);

    return [
        [
            padTimePart(date.getFullYear(), 4),
            padTimePart(date.getMonth() + 1, 2),
            padTimePart(date.getDate(), 2),
        ].join('-'),
        [
            padTimePart(date.getHours(), 2),
            padTimePart(date.getMinutes(), 2),
            padTimePart(date.getSeconds(), 2),
        ].join(':') + `.${padTimePart(date.getMilliseconds(), 3)}`,
    ].join(' ');
}

export function parseLocalTimestampInput(value: string): number | undefined {
    const text = value.trim();

    if (text === '') {
        return undefined;
    }

    if (INTEGER_TIMESTAMP_PATTERN.test(text)) {
        const timestamp = Number(text);
        return Number.isSafeInteger(timestamp) ? timestamp : undefined;
    }

    const match = LOCAL_DATE_TIME_PATTERN.exec(text);

    if (!match) {
        return undefined;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4] ?? 0);
    const minute = Number(match[5] ?? 0);
    const second = Number(match[6] ?? 0);
    const millisecond = Number((match[7] ?? '0').padEnd(3, '0'));

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
