import moment from 'moment';
import type { TimeBoundary } from './TimeTypes';
import { DATE_TIME_INPUT_FORMAT } from './TimeInputFormatters';
import { formatTimeUnitShortCode } from './TimeUnitUtils';

export function formatTimeRangeInputValue(boundary: TimeBoundary): string {
    if (boundary.kind === 'empty') {
        return '';
    }

    if (boundary.kind === 'absolute') {
        return moment.unix(boundary.timestamp / 1000).format(DATE_TIME_INPUT_FORMAT);
    }

    if (boundary.amount <= 0) {
        return boundary.kind;
    }

    return `${boundary.kind}-${boundary.amount}${formatTimeUnitShortCode(boundary.unit)}`;
}
