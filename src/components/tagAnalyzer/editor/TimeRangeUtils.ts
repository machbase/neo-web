import moment from 'moment';
import { isRelativeTimeValue } from '../utils/TagAnalyzerDateUtils';
import type { LegacyTimeRangeValue } from '../utils/legacy/LegacyTimeRangeTypes';

/**
 * Formats stored panel range values for the editor text inputs.
 * @param aValue The stored range value.
 * @returns The formatted input value for the editor.
 */
export function formatTimeRangeInputValue(aValue: LegacyTimeRangeValue): string {
    if (aValue === '' || typeof aValue === 'string') {
        return aValue;
    }

    return moment.unix(aValue / 1000).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Parses one editor time input back into TagAnalyzer's stored range format.
 * @param aValue The raw editor input string.
 * @returns The parsed relative string, timestamp, or original value.
 */
export function parseTimeRangeInputValue(aValue: string): LegacyTimeRangeValue {
    if (aValue === '') {
        return '';
    }

    if (isRelativeTimeValue(aValue)) {
        return aValue;
    }

    const sParsedMoment = moment(aValue, ['YYYY-MM-DD HH:mm:ss', moment.ISO_8601], true);
    return sParsedMoment.isValid() ? sParsedMoment.valueOf() : aValue;
}
