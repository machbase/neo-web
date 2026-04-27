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
 * @param minMillis The minimum timestamp in milliseconds.
 * @param maxMillis The maximum timestamp in milliseconds.
 * @returns The default chart range.
 */
export function buildDefaultRange(minMillis: number, maxMillis: number): {
    min: number;
    max: number;
} {
    if (minMillis === maxMillis) {
        return {
            min: minMillis,
            max: maxMillis + MIN_MAX_PADDING,
        };
    }

    return {
        min: minMillis,
        max: maxMillis,
    };
}

/**
 * Builds the seed object for creating a chart.
 * Intent: Assemble the initial chart payload from the selected tags and time bounds.
 *
 * @param chartType The chart type to seed.
 * @param selectedSeriesDrafts The selected series drafts to convert.
 * @param minMillis The minimum timestamp in milliseconds.
 * @param maxMillis The maximum timestamp in milliseconds.
 * @returns The chart creation seed.
 */
export function buildCreateChartSeed(
    chartType: PanelEChartType,
    selectedSeriesDrafts: TagSelectionDraftItem[],
    minMillis: number,
    maxMillis: number,
): CreateChartSeed {
    return {
        chartType: chartType,
        tagSet: normalizeSourceTagNames(
            createRuntimeSeriesDrafts(selectedSeriesDrafts),
        ) as PanelSeriesConfig[],
        defaultRange: buildDefaultRange(minMillis, maxMillis),
    };
}

/**
 * Builds the current persisted TagAnalyzer panel shape for one new chart.
 * Intent: Keep create-chart output aligned with the only supported `.taz` panel version.
 *
 * @param chartType The chart type to seed.
 * @param selectedSeriesDrafts The selected series drafts to convert.
 * @param minMillis The minimum timestamp in milliseconds.
 * @param maxMillis The maximum timestamp in milliseconds.
 * @returns The persisted current-format panel that can be appended to the board tab.
 */
export function buildCreateChartPanel(
    chartType: PanelEChartType,
    selectedSeriesDrafts: TagSelectionDraftItem[],
    minMillis: number,
    maxMillis: number,
): PersistedPanelInfoV200 {
    const sChartSeed = buildCreateChartSeed(
        chartType,
        selectedSeriesDrafts,
        minMillis,
        maxMillis,
    );

    return createPersistedPanelInfo(createRuntimePanelInfoFromSeed(sChartSeed));
}

/**
 * Merges selected tag drafts into an existing tag set.
 * Intent: Rebuild the series config list after the user changes the selected tags.
 *
 * @param originSeriesConfigs The current series configs.
 * @param selectedSeriesDrafts The selected series drafts to merge in.
 * @returns The merged series configs.
 */
export function mergeSelectedTagsIntoTagSet(
    originSeriesConfigs: PanelSeriesConfig[],
    selectedSeriesDrafts: TagSelectionDraftItem[],
): PanelSeriesConfig[] {
    const sNewSeriesConfigs = createLegacyChartSeriesDefaults(selectedSeriesDrafts);

    return normalizeSourceTagNames(
        [...originSeriesConfigs, ...sNewSeriesConfigs],
    ) as PanelSeriesConfig[];
}

function createRuntimeSeriesDrafts(
    seriesDrafts: TagSelectionDraftItem[],
): Array<TagSelectionDraftItem & RuntimeSeriesColorDefault> {
    return seriesDrafts.map((seriesDraft) => ({
        ...seriesDraft,
        color: undefined,
    }));
}

function createLegacyChartSeriesDefaults(
    seriesDrafts: TagSelectionDraftItem[],
): Array<TagSelectionDraftItem & LegacyChartSeriesDefaults> {
    return seriesDrafts.map((seriesDraft) => ({
        ...seriesDraft,
        max: 0,
        min: 0,
        use_y2: 'N',
        color: undefined,
    }));
}

function createRuntimePanelInfoFromSeed(chartSeed: CreateChartSeed): PanelInfo {
    const sRangeConfig = createAbsoluteTimeRangeConfig(
        chartSeed.defaultRange.min,
        chartSeed.defaultRange.max,
    );
    const sDisplay = createPanelDisplayForChartType(chartSeed.chartType);

    return {
        meta: {
            index_key: createPanelKey(),
            chart_title: DEFAULT_NEW_PANEL_TITLE,
        },
        data: {
            tag_set: chartSeed.tagSet,
            count: DEFAULT_PANEL_ROW_LIMIT,
            interval_type: DEFAULT_PANEL_INTERVAL_TYPE,
        },
        toolbar: {
            isRaw: false,
        },
        time: {
            range_bgn: chartSeed.defaultRange.min,
            range_end: chartSeed.defaultRange.max,
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
            chart_type: chartSeed.chartType,
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
    startMillis: number,
    endMillis: number,
): TimeRangeConfig {
    return {
        start: {
            kind: 'absolute',
            timestamp: startMillis,
        },
        end: {
            kind: 'absolute',
            timestamp: endMillis,
        },
    };
}

function createPanelDisplayForChartType(
    chartType: PanelEChartType,
): Pick<PanelInfo['display'], 'show_point' | 'point_radius' | 'fill' | 'stroke'> {
    switch (chartType) {
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
