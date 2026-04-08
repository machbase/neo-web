import type { TagAnalyzerRangeValue } from '../panel/TagAnalyzerPanelModelTypes';

const normalizeRelativeTimeValue = (aValue: string) => {
    return aValue.toLowerCase();
};

export const isLastRelativeTimeValue = (aValue: TagAnalyzerRangeValue): aValue is string => {
    return typeof aValue === 'string' && normalizeRelativeTimeValue(aValue).includes('last');
};

export const isNowRelativeTimeValue = (aValue: TagAnalyzerRangeValue): aValue is string => {
    return typeof aValue === 'string' && normalizeRelativeTimeValue(aValue).includes('now');
};

export const isRelativeTimeValue = (aValue: TagAnalyzerRangeValue): aValue is string => {
    return isLastRelativeTimeValue(aValue) || isNowRelativeTimeValue(aValue);
};
