import type {
    PanelAxisThreshold,
    PanelDisplay,
    PanelSampling,
    PanelRightYAxis,
    PanelXAxis,
    PanelYAxis,
} from '../utils/panelModelTypes';
import type { PanelSeriesConfig } from '../utils/series/seriesTypes';
import type { TimeRangeConfig, TimeRangePair } from '../utils/time/timeTypes';

// Shared checkbox input event type used across editor section components.
export type EditorCheckboxInputEvent = {
    target: {
        checked: boolean;
    };
};

// Shared text/number input event type used across editor section components.
export type EditorInputEvent = {
    target: {
        value: string;
    };
};

/**
 * Parses one editor field into either a number or an empty draft value.
 * Intent: Preserve blank numeric inputs while still converting entered text into numbers.
 * @param {string} aValue The raw editor input value.
 * @returns {number | ''} The parsed numeric draft value.
 */
export const parseEditorNumber = (aValue: string): number | '' => {
    return aValue === '' ? '' : Number(aValue);
};

// Used by TagAnalyzer editor code to type edit tab panel type.
export type EditTabPanelType = 'General' | 'Data' | 'Axes' | 'Display' | 'Time';

// Used by panel editor code to type panel general config.
export type PanelGeneralConfig = {
    chart_title: string;
    use_zoom: boolean;
    use_time_keeper: boolean;
    time_keeper: Partial<TimeRangePair> | undefined;
};

// Used by panel editor code to type panel data config.
export type PanelDataConfig = {
    index_key: string;
    tag_set: PanelSeriesConfig[];
};

// Used by panel editor code to type panel time config.
export type PanelTimeConfig = {
    range_bgn: number;
    range_end: number;
    range_config: TimeRangeConfig;
};

export type PanelAxisThresholdDraft = Omit<PanelAxisThreshold, 'value'> & {
    value: number | '';
};

export type PanelYAxisDraft = Omit<
    PanelYAxis,
    'value_range' | 'raw_data_value_range' | 'upper_control_limit' | 'lower_control_limit'
> & {
    value_range: {
        min: number | '';
        max: number | '';
    };
    raw_data_value_range: {
        min: number | '';
        max: number | '';
    };
    upper_control_limit: PanelAxisThresholdDraft;
    lower_control_limit: PanelAxisThresholdDraft;
};

export type PanelRightYAxisDraft = Omit<
    PanelRightYAxis,
    'value_range' | 'raw_data_value_range' | 'upper_control_limit' | 'lower_control_limit'
> & {
    value_range: {
        min: number | '';
        max: number | '';
    };
    raw_data_value_range: {
        min: number | '';
        max: number | '';
    };
    upper_control_limit: PanelAxisThresholdDraft;
    lower_control_limit: PanelAxisThresholdDraft;
};

export type PanelXAxisDraft = Omit<
    PanelXAxis,
    'raw_data_pixels_per_tick' | 'calculated_data_pixels_per_tick'
> & {
    raw_data_pixels_per_tick: number | '';
    calculated_data_pixels_per_tick: number | '';
};

export type PanelSamplingDraft = Omit<PanelSampling, 'sample_count'> & {
    sample_count: number | '';
};

// Used by panel editor code to type panel axes draft.
export type PanelAxesDraft = {
    x_axis: PanelXAxisDraft;
    sampling: PanelSamplingDraft;
    left_y_axis: PanelYAxisDraft;
    right_y_axis: PanelRightYAxisDraft;
};

// Used by panel editor code to type panel display draft.
export type PanelDisplayDraft = Omit<
    PanelDisplay,
    'point_radius' | 'fill' | 'stroke'
> & {
    point_radius: number | '';
    fill: number | '';
    stroke: number | '';
};

// Used by panel editor code to type panel editor config.
export type PanelEditorConfig = {
    general: PanelGeneralConfig;
    data: PanelDataConfig;
    axes: PanelAxesDraft;
    display: PanelDisplayDraft;
    time: PanelTimeConfig;
};

