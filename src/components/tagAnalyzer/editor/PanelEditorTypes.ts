import type {
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelDisplay,
    TagAnalyzerPanelTimeKeeper,
    TagAnalyzerSeriesConfig,
    TagAnalyzerTimeRangeConfig,
} from '../common/CommonTypes';

// Used by TagAnalyzer editor code to type editor numeric value.
export type TagAnalyzerEditorNumericValue = number | '';

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

export const parseEditorNumber = (aValue: string): TagAnalyzerEditorNumericValue => {
    return aValue === '' ? '' : Number(aValue);
};

// Used by TagAnalyzer editor code to type edit tab panel type.
export type EditTabPanelType = 'General' | 'Data' | 'Axes' | 'Display' | 'Time';

// Used by TagAnalyzer editor code to type panel general config.
export type TagAnalyzerPanelGeneralConfig = {
    chart_title: string;
    use_zoom: boolean;
    use_time_keeper: boolean;
    time_keeper: Partial<TagAnalyzerPanelTimeKeeper> | undefined;
};

// Used by TagAnalyzer editor code to type panel data config.
export type TagAnalyzerPanelDataConfig = {
    index_key: string;
    tag_set: TagAnalyzerSeriesConfig[];
};

// Used by TagAnalyzer editor code to type panel time config.
export type TagAnalyzerPanelTimeConfig = {
    range_bgn: number;
    range_end: number;
    range_config: TagAnalyzerTimeRangeConfig;
};

// Used by TagAnalyzer editor code to type panel axes draft.
export type TagAnalyzerPanelAxesDraft = Omit<
    TagAnalyzerPanelAxes,
    | 'pixels_per_tick_raw'
    | 'pixels_per_tick'
    | 'sampling_value'
    | 'primaryRange'
    | 'primaryDrilldownRange'
    | 'ucl_value'
    | 'lcl_value'
    | 'secondaryRange'
    | 'secondaryDrilldownRange'
    | 'ucl2_value'
    | 'lcl2_value'
> & {
    pixels_per_tick_raw: TagAnalyzerEditorNumericValue;
    pixels_per_tick: TagAnalyzerEditorNumericValue;
    sampling_value: TagAnalyzerEditorNumericValue;
    custom_min: TagAnalyzerEditorNumericValue;
    custom_max: TagAnalyzerEditorNumericValue;
    custom_drilldown_min: TagAnalyzerEditorNumericValue;
    custom_drilldown_max: TagAnalyzerEditorNumericValue;
    ucl_value: TagAnalyzerEditorNumericValue;
    lcl_value: TagAnalyzerEditorNumericValue;
    custom_min2: TagAnalyzerEditorNumericValue;
    custom_max2: TagAnalyzerEditorNumericValue;
    custom_drilldown_min2: TagAnalyzerEditorNumericValue;
    custom_drilldown_max2: TagAnalyzerEditorNumericValue;
    ucl2_value: TagAnalyzerEditorNumericValue;
    lcl2_value: TagAnalyzerEditorNumericValue;
};

// Used by TagAnalyzer editor code to type panel display draft.
export type TagAnalyzerPanelDisplayDraft = Omit<
    TagAnalyzerPanelDisplay,
    'point_radius' | 'fill' | 'stroke'
> & {
    point_radius: TagAnalyzerEditorNumericValue;
    fill: TagAnalyzerEditorNumericValue;
    stroke: TagAnalyzerEditorNumericValue;
};

// Used by TagAnalyzer editor code to type panel editor config.
export type TagAnalyzerPanelEditorConfig = {
    general: TagAnalyzerPanelGeneralConfig;
    data: TagAnalyzerPanelDataConfig;
    axes: TagAnalyzerPanelAxesDraft;
    display: TagAnalyzerPanelDisplayDraft;
    time: TagAnalyzerPanelTimeConfig;
};
