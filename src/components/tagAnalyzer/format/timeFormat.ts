import moment from 'moment';
import {
    TimeUnit,
    type IntervalOption,
} from '../range/intervalResolver';

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

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

export function formatTimeUnitShortCode(unit: TimeUnit): string {
    return TIME_UNIT_SHORT_CODES[unit];
}

export function formatTimeInterval(interval: IntervalOption): string {
    return `${interval.IntervalValue}${interval.IntervalType}`;
}

export function formatAbsoluteTime(timestamp: number): string {
    return moment(timestamp).format(DATE_TIME_FORMAT);
}
