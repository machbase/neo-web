import type {
    PanelAxisThreshold,
    PanelDisplay,
    PanelSampling,
    PanelRightYAxis,
    PanelXAxis,
    PanelYAxis,
} from '../utils/panelModelTypes';
import type { SeriesConfig } from '../utils/series/seriesTypes';
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

// Used by TagAnalyzer editor code to type panel general config.
export type TagAnalyzerPanelGeneralConfig = {
    chart_title: string;
    use_zoom: boolean;
    use_time_keeper: boolean;
    time_keeper: Partial<TimeRangePair> | undefined;
};

// Used by TagAnalyzer editor code to type panel data config.
export type TagAnalyzerPanelDataConfig = {
    index_key: string;
    tag_set: SeriesConfig[];
};

// Used by TagAnalyzer editor code to type panel time config.
export type TagAnalyzerPanelTimeConfig = {
    range_bgn: number;
    range_end: number;
    range_config: TimeRangeConfig;
};

export type TagAnalyzerPanelAxisThresholdDraft = Omit<PanelAxisThreshold, 'value'> & {
    value: number | '';
};

export type TagAnalyzerPanelYAxisDraft = Omit<
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
    upper_control_limit: TagAnalyzerPanelAxisThresholdDraft;
    lower_control_limit: TagAnalyzerPanelAxisThresholdDraft;
};

export type TagAnalyzerPanelRightYAxisDraft = Omit<
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
    upper_control_limit: TagAnalyzerPanelAxisThresholdDraft;
    lower_control_limit: TagAnalyzerPanelAxisThresholdDraft;
};

export type TagAnalyzerPanelXAxisDraft = Omit<
    PanelXAxis,
    'raw_data_pixels_per_tick' | 'calculated_data_pixels_per_tick'
> & {
    raw_data_pixels_per_tick: number | '';
    calculated_data_pixels_per_tick: number | '';
};

export type TagAnalyzerPanelSamplingDraft = Omit<PanelSampling, 'sample_count'> & {
    sample_count: number | '';
};

// Used by TagAnalyzer editor code to type panel axes draft.
export type TagAnalyzerPanelAxesDraft = {
    x_axis: TagAnalyzerPanelXAxisDraft;
    sampling: TagAnalyzerPanelSamplingDraft;
    left_y_axis: TagAnalyzerPanelYAxisDraft;
    right_y_axis: TagAnalyzerPanelRightYAxisDraft;
};

// Used by TagAnalyzer editor code to type panel display draft.
export type TagAnalyzerPanelDisplayDraft = Omit<
    PanelDisplay,
    'point_radius' | 'fill' | 'stroke'
> & {
    point_radius: number | '';
    fill: number | '';
    stroke: number | '';
};

// Used by TagAnalyzer editor code to type panel editor config.
export type TagAnalyzerPanelEditorConfig = {
    general: TagAnalyzerPanelGeneralConfig;
    data: TagAnalyzerPanelDataConfig;
    axes: TagAnalyzerPanelAxesDraft;
    display: TagAnalyzerPanelDisplayDraft;
    time: TagAnalyzerPanelTimeConfig;
};

