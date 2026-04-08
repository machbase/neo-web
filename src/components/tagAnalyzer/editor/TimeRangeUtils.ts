import moment from 'moment';
import type { TagAnalyzerRangeValue } from '../panel/TagAnalyzerPanelModelTypes';
import {
    isLastRelativeTimeValue as isLastRelativeRangeValue,
    isNowRelativeTimeValue as isNowRelativeRangeValue,
    isRelativeTimeValue,
} from '../utils/TagAnalyzerRelativeTimeUtils';

export const formatTimeRangeInputValue = (aValue: TagAnalyzerRangeValue): TagAnalyzerRangeValue => {
    if (aValue === '' || typeof aValue === 'string') {
        return aValue;
    }

    return moment.unix(aValue / 1000).format('YYYY-MM-DD HH:mm:ss');
};

export const parseTimeRangeInputValue = (aValue: string): TagAnalyzerRangeValue => {
    if (aValue === '') {
        return '';
    }

    if (isRelativeTimeValue(aValue)) {
        return aValue;
    }

    const sParsedMoment = moment(aValue, ['YYYY-MM-DD HH:mm:ss', moment.ISO_8601], true);
    return sParsedMoment.isValid() ? sParsedMoment.valueOf() : aValue;
};

export { isLastRelativeRangeValue, isNowRelativeRangeValue };
