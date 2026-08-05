import moment from 'moment';
import { getRangeWidth } from '../range/rangeArithmetic';
import type { AxisRange } from '../range/rangeModel';
import { formatCompactNumber } from './numericFormat';

export type FormattedAxisRange = {
    start: string;
    end: string;
};

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const SECOND_LABEL_SPAN = 60 * 60 * 1000;
const MINUTE_LABEL_SPAN = 24 * 60 * 60 * 1000;
const DAY_TIME_LABEL_SPAN = 30 * 24 * 60 * 60 * 1000;

export function formatAxisRange(
    range: AxisRange,
    isNumericAxis: boolean,
): FormattedAxisRange {
    return isNumericAxis
        ? {
              start: formatCompactNumber(range.start, range),
              end: formatCompactNumber(range.end, range),
          }
        : {
              start: moment(range.start).format(DATE_TIME_FORMAT),
              end: moment(range.end).format(DATE_TIME_FORMAT),
          };
}

export function formatAxisPointer(
    value: number,
    isNumericAxis: boolean,
    visibleRange?: AxisRange,
): string {
    if (isNumericAxis) return formatCompactNumber(value, visibleRange);

    const wholeTimestamp = Math.trunc(value);
    const fraction = String(value).split('.')[1];
    const formatted = moment(wholeTimestamp).format(
        'YYYY-MM-DD HH:mm:ss.SSS',
    );
    return fraction ? `${formatted}${fraction}` : formatted;
}

export function formatAxisTick(
    value: number,
    range: AxisRange,
    isNumericAxis: boolean,
): string {
    if (isNumericAxis) return formatCompactNumber(value, range);

    const span = getRangeWidth(range);
    if (span <= SECOND_LABEL_SPAN) return moment(value).format('HH:mm:ss');
    if (span <= MINUTE_LABEL_SPAN) return moment(value).format('HH:mm');
    if (span <= DAY_TIME_LABEL_SPAN) return moment(value).format('MM-DD HH:mm');
    return moment(value).format('YYYY-MM-DD');
}

export function formatAxisSpan(
    start: number,
    end: number,
    isNumericAxis: boolean,
): string {
    if (isNumericAxis) return formatCompactNumber(end - start);

    const duration = moment.duration(end - start);
    const days = Math.floor(duration.asDays());
    return [
        days === 0 ? '' : `${days}d`,
        duration.hours() === 0 ? '' : `${duration.hours()}h`,
        duration.minutes() === 0 ? '' : `${duration.minutes()}m`,
        duration.seconds() === 0 ? '' : `${duration.seconds()}s`,
        duration.milliseconds() === 0
            ? ''
            : `${duration.milliseconds()}ms`,
    ]
        .filter(Boolean)
        .join(' ');
}
