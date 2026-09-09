import moment from 'moment';
import type { IntervalOption } from '../rangeExpression/intervalResolver';

export function formatTimeInterval(interval: IntervalOption): string {
    return `${interval.IntervalValue}${interval.IntervalType}`;
}

export function formatAbsoluteTime(timestamp: number): string {
    return moment(timestamp).format(DATE_TIME_FORMAT);
}

// -------------------- Local --------------------

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
