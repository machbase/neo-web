import moment from 'moment';
import type { TimeBoundary } from '../../time/TimeTypes';
import { formatTimeUnitShortCode } from '../../time/TimeUnitUtils';

const EDITOR_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export function formatTimeRangeInputValue(boundary: TimeBoundary): string {
    if (boundary.kind === 'empty') {
        return '';
    }

    if (boundary.kind === 'absolute') {
        return moment.unix(boundary.timestamp / 1000).format(EDITOR_TIME_FORMAT);
    }

    if (boundary.amount <= 0) {
        return boundary.kind;
    }

    return `${boundary.kind}-${boundary.amount}${formatTimeUnitShortCode(boundary.unit)}`;
}

