import type {
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelData,
    TagAnalyzerPanelDisplay,
    TagAnalyzerPanelMeta,
    TagAnalyzerPanelTime,
} from '../panel/PanelModel';

// Used by TagAnalyzer editor code to type editor numeric value.
export type TagAnalyzerEditorNumericValue = number | '';

// Used by TagAnalyzer editor code to type edit tab panel type.
export type EditTabPanelType = 'General' | 'Data' | 'Axes' | 'Display' | 'Time';

// Used by TagAnalyzer editor code to type panel general config.
export type TagAnalyzerPanelGeneralConfig = {
    chart_title: TagAnalyzerPanelMeta['chart_title'];
    use_zoom: TagAnalyzerPanelDisplay['use_zoom'];
    use_time_keeper: TagAnalyzerPanelTime['use_time_keeper'];
    time_keeper: TagAnalyzerPanelTime['time_keeper'] | undefined;
};

// Used by TagAnalyzer editor code to type panel data config.
export type TagAnalyzerPanelDataConfig = {
    index_key: TagAnalyzerPanelMeta['index_key'];
    tag_set: TagAnalyzerPanelData['tag_set'];
};

// Used by TagAnalyzer editor code to type panel time config.
export type TagAnalyzerPanelTimeConfig = {
    range_bgn: TagAnalyzerPanelTime['range_bgn'];
    range_end: TagAnalyzerPanelTime['range_end'];
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
