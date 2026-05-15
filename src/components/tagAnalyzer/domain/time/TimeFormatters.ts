import moment from 'moment';
import type { TimeRangeMs } from './TimeTypes';
import {
    HOUR_IN_MS,
    MINUTE_IN_MS,
    SECOND_IN_MS,
} from './TimeConstants';

const AXIS_SECOND_LABEL_SPAN_MS = 60 * 60 * 1000;
const AXIS_MINUTE_LABEL_SPAN_MS = 24 * 60 * 60 * 1000;
const AXIS_DAY_TIME_LABEL_SPAN_MS = 30 * 24 * 60 * 60 * 1000;

export function formatLocalRangeLabel(value: number): string {
    return moment(value).format('YYYY-MM-DD HH:mm:ss');
}

export function formatLocalTimestampWithMilliseconds(value: number): string {
    const sBaseTimestamp = Math.trunc(value);
    const sFractionalPart = String(value).split('.')[1];
    const sFormatted = moment(sBaseTimestamp).format('YYYY-MM-DD HH:mm:ss.SSS');

    return sFractionalPart ? `${sFormatted}.${sFractionalPart}` : sFormatted;
}

export function formatAxisTime(value: number, range: TimeRangeMs): string {
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

export function formatDurationLabel(startTime: number, endTime: number): string {
    const sDuration = moment.duration(endTime - startTime);
    const sDays = Math.floor(sDuration.asDays());

    return `${formatDurationPart(sDays, 'd')}${formatDurationPart(sDuration.hours(), 'h')}${formatDurationPart(sDuration.minutes(), 'm')}${formatDurationPart(
        sDuration.seconds(),
        's',
    )}${sDuration.milliseconds() === 0 ? '' : ` ${sDuration.milliseconds()}ms`}`;
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

function padTimePart(value: number, size = 2): string {
    return String(value).padStart(size, '0');
}
