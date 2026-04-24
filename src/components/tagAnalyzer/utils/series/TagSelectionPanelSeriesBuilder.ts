import type { TagSelectionDraftItem } from '../../modal/seriesSelection/TagSelectionTypes';
import { DEFAULT_VALUE_RANGE } from '../../TagAnalyzerCommonConstants';
import { normalizeSourceTagNames } from '../legacy/LegacySeriesAdapter';
import type { PanelEChartType, PanelInfo } from '../panelModelTypes';
import { createPersistedPanelInfo } from '../persistence/save/TazPanelSaveMapper';
import type { PersistedPanelInfoV200 } from '../persistence/TazPanelPersistenceTypes';
import type { PanelSeriesConfig } from './PanelSeriesTypes';
import type { TimeRangeConfig } from '../time/types/TimeTypes';

const MIN_MAX_PADDING = 10;
const DEFAULT_NEW_PANEL_TITLE = 'New chart';
const DEFAULT_PANEL_ROW_LIMIT = -1;
const DEFAULT_PANEL_INTERVAL_TYPE = '';
const DEFAULT_RAW_PIXELS_PER_TICK = 0.1;
const DEFAULT_CALCULATED_PIXELS_PER_TICK = 3;
const DEFAULT_SAMPLING_VALUE = 0.01;

type LegacyChartSeriesDefaults = {
    max: number;
    min: number;
    use_y2: 'N';
    color: string | undefined;
};

type RuntimeSeriesColorDefault = {
    color: string | undefined;
};

type CreateChartSeed = {
    chartType: PanelEChartType;
    tagSet: PanelSeriesConfig[];
    defaultRange: { min: number; max: number };
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
): CreateChartSeed {
    return {
        chartType: aChartType,
        tagSet: normalizeSourceTagNames(
            createRuntimeSeriesDrafts(aSelectedSeriesDrafts),
        ) as PanelSeriesConfig[],
        defaultRange: buildDefaultRange(aMinMillis, aMaxMillis),
    };
}

/**
 * Builds the current persisted TagAnalyzer panel shape for one new chart.
 * Intent: Keep create-chart output aligned with the only supported `.taz` panel version.
 *
 * @param aChartType The chart type to seed.
 * @param aSelectedSeriesDrafts The selected series drafts to convert.
 * @param aMinMillis The minimum timestamp in milliseconds.
 * @param aMaxMillis The maximum timestamp in milliseconds.
 * @returns The persisted current-format panel that can be appended to the board tab.
 */
export function buildCreateChartPanel(
    aChartType: PanelEChartType,
    aSelectedSeriesDrafts: TagSelectionDraftItem[],
    aMinMillis: number,
    aMaxMillis: number,
): PersistedPanelInfoV200 {
    const sChartSeed = buildCreateChartSeed(
        aChartType,
        aSelectedSeriesDrafts,
        aMinMillis,
        aMaxMillis,
    );

    return createPersistedPanelInfo(createRuntimePanelInfoFromSeed(sChartSeed));
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

function createRuntimePanelInfoFromSeed(aChartSeed: CreateChartSeed): PanelInfo {
    const sRangeConfig = createAbsoluteTimeRangeConfig(
        aChartSeed.defaultRange.min,
        aChartSeed.defaultRange.max,
    );
    const sDisplay = createPanelDisplayForChartType(aChartSeed.chartType);

    return {
        meta: {
            index_key: createPanelKey(),
            chart_title: DEFAULT_NEW_PANEL_TITLE,
        },
        data: {
            tag_set: aChartSeed.tagSet,
            count: DEFAULT_PANEL_ROW_LIMIT,
            interval_type: DEFAULT_PANEL_INTERVAL_TYPE,
        },
        toolbar: {
            isRaw: false,
        },
        time: {
            range_bgn: aChartSeed.defaultRange.min,
            range_end: aChartSeed.defaultRange.max,
            range_config: sRangeConfig,
            use_time_keeper: false,
            time_keeper: undefined,
            default_range: undefined,
        },
        axes: {
            x_axis: {
                show_tickline: true,
                raw_data_pixels_per_tick: DEFAULT_RAW_PIXELS_PER_TICK,
                calculated_data_pixels_per_tick: DEFAULT_CALCULATED_PIXELS_PER_TICK,
            },
            sampling: {
                enabled: false,
                sample_count: DEFAULT_SAMPLING_VALUE,
            },
            left_y_axis: {
                zero_base: false,
                show_tickline: true,
                value_range: { ...DEFAULT_VALUE_RANGE },
                raw_data_value_range: { ...DEFAULT_VALUE_RANGE },
                upper_control_limit: {
                    enabled: false,
                    value: 0,
                },
                lower_control_limit: {
                    enabled: false,
                    value: 0,
                },
            },
            right_y_axis: {
                enabled: false,
                zero_base: true,
                show_tickline: true,
                value_range: { ...DEFAULT_VALUE_RANGE },
                raw_data_value_range: { ...DEFAULT_VALUE_RANGE },
                upper_control_limit: {
                    enabled: false,
                    value: 0,
                },
                lower_control_limit: {
                    enabled: false,
                    value: 0,
                },
            },
        },
        display: {
            show_legend: true,
            use_zoom: true,
            chart_type: aChartSeed.chartType,
            show_point: sDisplay.show_point,
            point_radius: sDisplay.point_radius,
            fill: sDisplay.fill,
            stroke: sDisplay.stroke,
        },
        use_normalize: false,
        highlights: [],
    };
}

function createAbsoluteTimeRangeConfig(
    aStartMillis: number,
    aEndMillis: number,
): TimeRangeConfig {
    return {
        start: {
            kind: 'absolute',
            timestamp: aStartMillis,
        },
        end: {
            kind: 'absolute',
            timestamp: aEndMillis,
        },
    };
}

function createPanelDisplayForChartType(
    aChartType: PanelEChartType,
): Pick<PanelInfo['display'], 'show_point' | 'point_radius' | 'fill' | 'stroke'> {
    switch (aChartType) {
        case 'Zone':
            return {
                show_point: false,
                point_radius: 0,
                fill: 0.15,
                stroke: 1,
            };
        case 'Dot':
            return {
                show_point: true,
                point_radius: 2,
                fill: 0,
                stroke: 0,
            };
        case 'Line':
        default:
            return {
                show_point: true,
                point_radius: 0,
                fill: 0,
                stroke: 1,
            };
    }
}

function createPanelKey(): string {
    return String(Date.now() + Math.round(Math.random() * 1000));
}
