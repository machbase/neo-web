import moment from 'moment';
import type { TagAnalyzerInputRangeValue } from '../panel/TagAnalyzerPanelModelTypes';
import {
    isLastRelativeTimeValue as isLastRelativeRangeValue,
    isNowRelativeTimeValue as isNowRelativeRangeValue,
    isRelativeTimeValue,
} from '../utils/TagAnalyzerRelativeTimeUtils';

/**
 * Formats stored panel range values for the editor text inputs.
 * @param aValue The stored range value.
 * @returns The formatted input value for the editor.
 */
export function formatTimeRangeInputValue(aValue: TagAnalyzerInputRangeValue): string {
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
export function parseTimeRangeInputValue(aValue: string): TagAnalyzerInputRangeValue {
    if (aValue === '') {
        return '';
    }

    if (isRelativeTimeValue(aValue)) {
        return aValue;
    }

    const sParsedMoment = moment(aValue, ['YYYY-MM-DD HH:mm:ss', moment.ISO_8601], true);
    return sParsedMoment.isValid() ? sParsedMoment.valueOf() : aValue;
}

export { isLastRelativeRangeValue, isNowRelativeRangeValue };
