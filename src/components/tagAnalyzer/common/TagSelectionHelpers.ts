import { concatTagSet } from '@/utils/helpers/tags';
import { convertTagChartType } from '@/utils/utils';
import type { TagAnalyzerTagItem } from '../panel/TagAnalyzerPanelModelTypes';
import type { TagSearchSelectionItem } from './useTagSearchModalState';

const MIN_MAX_PADDING = 10;
const EMPTY_SELECTION_ERROR = 'please select tag.';
const buildSelectionLimitError = (aMaxSelectedCount: number) => {
    return `The maximum number of tags in a chart is ${aMaxSelectedCount}.`;
};

export const buildDefaultRange = (aMinMillis: number, aMaxMillis: number) => {
    if (aMinMillis === aMaxMillis) {
        return {
            min: aMinMillis,
            max: aMaxMillis + MIN_MAX_PADDING,
        };
    }

    return {
        min: aMinMillis,
        max: aMaxMillis,
    };
};

export const getTagSelectionErrorMessage = (
    aSelectedCount: number,
    aMaxSelectedCount: number,
): string | undefined => {
    if (aSelectedCount === 0) {
        return EMPTY_SELECTION_ERROR;
    }

    if (aSelectedCount > aMaxSelectedCount) {
        return buildSelectionLimitError(aMaxSelectedCount);
    }

    return undefined;
};

export const getTagSelectionCountColor = (aSelectedCount: number, aMaxSelectedCount: number): string => {
    return aSelectedCount === aMaxSelectedCount ? '#ef6e6e' : 'inherit';
};

export const buildTagSelectionCountLabel = (
    aSelectedCount: number,
    aMaxSelectedCount: number,
): string => {
    return `Select: ${aSelectedCount} / ${aMaxSelectedCount}`;
};

export const buildCreateChartSeed = (
    aChartType: string,
    aSelectedTags: TagSearchSelectionItem[],
    aMinMillis: number,
    aMaxMillis: number,
) => {
    return {
        chartType: aChartType,
        tagSet: concatTagSet([], aSelectedTags),
        defaultRange: buildDefaultRange(aMinMillis, aMaxMillis),
    };
};

export const mergeSelectedTagsIntoTagSet = (
    aOriginTagSet: TagAnalyzerTagItem[],
    aSelectedTags: TagSearchSelectionItem[],
) => {
    return concatTagSet(aOriginTagSet, convertTagChartType(aSelectedTags));
};
