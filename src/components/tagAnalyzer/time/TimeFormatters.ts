import moment from 'moment';
import type { ResolvedTimeRangeMs } from './TimeTypes';

const AXIS_SECOND_LABEL_SPAN_MS = 60 * 60 * 1000;
const AXIS_MINUTE_LABEL_SPAN_MS = 24 * 60 * 60 * 1000;
const AXIS_DAY_TIME_LABEL_SPAN_MS = 30 * 24 * 60 * 60 * 1000;

export function formatAxisTime(value: number, range: ResolvedTimeRangeMs): string {
    const sVisibleSpan = range.endTime - range.startTime;

    if (sVisibleSpan <= AXIS_SECOND_LABEL_SPAN_MS) {
        return moment.utc(value).format('HH:mm:ss');
    }

    if (sVisibleSpan <= AXIS_MINUTE_LABEL_SPAN_MS) {
        return moment.utc(value).format('HH:mm');
    }

    if (sVisibleSpan <= AXIS_DAY_TIME_LABEL_SPAN_MS) {
        return moment.utc(value).format('MM-DD HH:mm');
    }

    return moment.utc(value).format('YYYY-MM-DD');
}

export function formatDurationLabel(startTime: number, endTime: number): string {
    const sDuration = moment.duration(endTime - startTime);
    const sDays = Math.floor(sDuration.asDays());

    return `${formatDurationPart(sDays, 'd')}${formatDurationPart(sDuration.hours(), 'h')}${formatDurationPart(sDuration.minutes(), 'm')}${formatDurationPart(
        sDuration.seconds(),
        's',
    )}${sDuration.milliseconds() === 0 ? '' : ` ${sDuration.milliseconds()}ms`}`;
}

function formatDurationPart(value: number, suffix: string): string {
    return value === 0 ? '' : `${value}${suffix} `;
}
