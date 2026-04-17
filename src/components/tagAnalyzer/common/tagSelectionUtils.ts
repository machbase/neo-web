import { concatTagSet } from '@/utils/helpers/tags';
import { convertTagChartType } from '@/utils/utils';
import type { SeriesConfig } from './modelTypes';
import type { TagSelectionDraftItem } from './useTagSearchModalState';
import { normalizeSourceTagNames } from '../utils/legacy/LegacyUtils';

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

export const getTagSelectionCountColor = (
    aSelectedCount: number,
    aMaxSelectedCount: number,
): string => {
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
    aSelectedSeriesDrafts: TagSelectionDraftItem[],
    aMinMillis: number,
    aMaxMillis: number,
): {
    chartType: string;
    tagSet: SeriesConfig[];
    defaultRange: { min: number; max: number };
} => {
    return {
        chartType: aChartType,
        tagSet: normalizeSourceTagNames(
            concatTagSet([], aSelectedSeriesDrafts),
        ) as SeriesConfig[],
        defaultRange: buildDefaultRange(aMinMillis, aMaxMillis),
    };
};

export const mergeSelectedTagsIntoTagSet = (
    aOriginSeriesConfigs: SeriesConfig[],
    aSelectedSeriesDrafts: TagSelectionDraftItem[],
): SeriesConfig[] => {
    return normalizeSourceTagNames(
        concatTagSet(aOriginSeriesConfigs, convertTagChartType(aSelectedSeriesDrafts)),
    ) as SeriesConfig[];
};
