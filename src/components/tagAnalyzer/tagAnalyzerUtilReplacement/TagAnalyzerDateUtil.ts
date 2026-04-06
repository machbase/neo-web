import moment from 'moment';
import { createTagAnalyzerTimeRange } from '../panel/PanelModelUtil';
import type {
    TagAnalyzerDefaultRange,
    TagAnalyzerRangeValue,
    TagAnalyzerTimeRange,
} from '../panel/TagAnalyzerPanelModelTypes';

const hasRangeValue = (aValue: TagAnalyzerRangeValue | undefined): aValue is string | number => {
    return aValue !== '' && aValue !== undefined;
};

export const convertTimeToFullDate = (aTime: TagAnalyzerRangeValue | undefined): number => {
    if (typeof aTime !== 'string') {
        return aTime ?? 0;
    }

    const sRelativeTime = aTime.split('-')[1];
    if (!sRelativeTime) {
        return moment().unix() * 1000;
    }

    const sTimeNumber = Number.parseInt(sRelativeTime, 10);
    const sTimeUnit = sRelativeTime.match(/[a-zA-Z]/g)?.join('');
    if (!sTimeUnit) {
        return moment().unix() * 1000;
    }

    return moment().subtract(sTimeNumber, sTimeUnit as moment.unitOfTime.DurationConstructor).unix() * 1000;
};

export const setTimeRange = (
    aPanelTime: {
        range_bgn?: TagAnalyzerRangeValue;
        range_end?: TagAnalyzerRangeValue;
        default_range?: TagAnalyzerDefaultRange;
    },
    aBoardRange?: {
        range_bgn?: TagAnalyzerRangeValue;
        range_end?: TagAnalyzerRangeValue;
    },
): TagAnalyzerTimeRange => {
    const sDefaultRange = createTagAnalyzerTimeRange(
        aPanelTime.default_range?.min ?? 0,
        aPanelTime.default_range?.max ?? 0,
    );

    const sStartTimeSource = hasRangeValue(aPanelTime.range_bgn)
        ? aPanelTime.range_bgn
        : hasRangeValue(aBoardRange?.range_bgn)
          ? aBoardRange.range_bgn
          : sDefaultRange.startTime;
    const sEndTimeSource = hasRangeValue(aPanelTime.range_end)
        ? aPanelTime.range_end
        : hasRangeValue(aBoardRange?.range_end)
          ? aBoardRange.range_end
          : sDefaultRange.endTime;

    return createTagAnalyzerTimeRange(
        convertTimeToFullDate(sStartTimeSource),
        convertTimeToFullDate(sEndTimeSource),
    );
};

export const getDateRange = (
    aPanelTime: {
        range_bgn?: TagAnalyzerRangeValue;
        range_end?: TagAnalyzerRangeValue;
        default_range?: TagAnalyzerDefaultRange;
    },
    aBoardRange?: {
        range_bgn?: TagAnalyzerRangeValue;
        range_end?: TagAnalyzerRangeValue;
    },
    aCustomRange?: TagAnalyzerTimeRange,
): TagAnalyzerTimeRange => {
    if (aCustomRange) {
        return aCustomRange;
    }

    return setTimeRange(aPanelTime, aBoardRange);
};
