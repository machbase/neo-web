export const DATE_TIME_INPUT_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const UTC_DATE_TIME_INPUT_FORMAT = `${DATE_TIME_INPUT_FORMAT}.SSS`;

const UTC_DATE_TIME_PATTERN =
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?)?$/;
const INTEGER_TIMESTAMP_PATTERN = /^\d+$/;

function padTimePart(value: number, length: number) {
    return String(value).padStart(length, '0');
}

export function formatUtcTimestampInput(timestamp: number): string {
    const date = new Date(timestamp);

    return [
        [
            padTimePart(date.getUTCFullYear(), 4),
            padTimePart(date.getUTCMonth() + 1, 2),
            padTimePart(date.getUTCDate(), 2),
        ].join('-'),
        [
            padTimePart(date.getUTCHours(), 2),
            padTimePart(date.getUTCMinutes(), 2),
            padTimePart(date.getUTCSeconds(), 2),
        ].join(':') + `.${padTimePart(date.getUTCMilliseconds(), 3)}`,
    ].join(' ');
}

export function parseUtcTimestampInput(value: string): number | undefined {
    const text = value.trim();

    if (text === '') {
        return undefined;
    }

    if (INTEGER_TIMESTAMP_PATTERN.test(text)) {
        const timestamp = Number(text);
        return Number.isSafeInteger(timestamp) ? timestamp : undefined;
    }

    const match = UTC_DATE_TIME_PATTERN.exec(text);

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

    const timestamp = Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
        millisecond,
    );
    const date = new Date(timestamp);

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day ||
        date.getUTCHours() !== hour ||
        date.getUTCMinutes() !== minute ||
        date.getUTCSeconds() !== second ||
        date.getUTCMilliseconds() !== millisecond
    ) {
        return undefined;
    }

    return timestamp;
}
