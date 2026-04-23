import type { TagSelectionDraftItem } from '../../tagSelection/TagSelectionTypes';
import { normalizeSourceTagNames } from '../legacy/LegacySeriesAdapter';
import type { PanelEChartType } from '../panelModelTypes';
import type { PanelSeriesConfig } from './PanelSeriesTypes';

const MIN_MAX_PADDING = 10;

type LegacyChartSeriesDefaults = {
    max: number;
    min: number;
    use_y2: 'N';
    color: string | undefined;
};

type RuntimeSeriesColorDefault = {
    color: string | undefined;
};

/**
 * Builds a default range for a new chart.
 * Intent: Ensure equal min and max values still produce a visible chart window.
 *
 * @param aMinMillis The minimum timestamp in milliseconds.
 * @param aMaxMillis The maximum timestamp in milliseconds.
 * @returns The default chart range.
 */
export function buildDefaultRange(aMinMillis: number, aMaxMillis: number): {
    min: number;
    max: number;
} {
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
}

/**
 * Builds the seed object for creating a chart.
 * Intent: Assemble the initial chart payload from the selected tags and time bounds.
 *
 * @param aChartType The chart type to seed.
 * @param aSelectedSeriesDrafts The selected series drafts to convert.
 * @param aMinMillis The minimum timestamp in milliseconds.
 * @param aMaxMillis The maximum timestamp in milliseconds.
 * @returns The chart creation seed.
 */
export function buildCreateChartSeed(
    aChartType: PanelEChartType,
    aSelectedSeriesDrafts: TagSelectionDraftItem[],
    aMinMillis: number,
    aMaxMillis: number,
): {
    chartType: PanelEChartType;
    tagSet: PanelSeriesConfig[];
    defaultRange: { min: number; max: number };
} {
    return {
        chartType: aChartType,
        tagSet: normalizeSourceTagNames(
            createRuntimeSeriesDrafts(aSelectedSeriesDrafts),
        ) as PanelSeriesConfig[],
        defaultRange: buildDefaultRange(aMinMillis, aMaxMillis),
    };
}

/**
 * Merges selected tag drafts into an existing tag set.
 * Intent: Rebuild the series config list after the user changes the selected tags.
 *
 * @param aOriginSeriesConfigs The current series configs.
 * @param aSelectedSeriesDrafts The selected series drafts to merge in.
 * @returns The merged series configs.
 */
export function mergeSelectedTagsIntoTagSet(
    aOriginSeriesConfigs: PanelSeriesConfig[],
    aSelectedSeriesDrafts: TagSelectionDraftItem[],
): PanelSeriesConfig[] {
    const sNewSeriesConfigs = createLegacyChartSeriesDefaults(aSelectedSeriesDrafts);

    return normalizeSourceTagNames(
        [...aOriginSeriesConfigs, ...sNewSeriesConfigs],
    ) as PanelSeriesConfig[];
}

function createRuntimeSeriesDrafts(
    aSeriesDrafts: TagSelectionDraftItem[],
): Array<TagSelectionDraftItem & RuntimeSeriesColorDefault> {
    return aSeriesDrafts.map((aSeriesDraft) => ({
        ...aSeriesDraft,
        color: undefined,
    }));
}

function createLegacyChartSeriesDefaults(
    aSeriesDrafts: TagSelectionDraftItem[],
): Array<TagSelectionDraftItem & LegacyChartSeriesDefaults> {
    return aSeriesDrafts.map((aSeriesDraft) => ({
        ...aSeriesDraft,
        max: 0,
        min: 0,
        use_y2: 'N',
        color: undefined,
    }));
}
