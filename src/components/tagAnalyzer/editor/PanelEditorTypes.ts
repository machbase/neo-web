import type {
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelData,
    TagAnalyzerPanelDisplay,
    TagAnalyzerPanelMeta,
    TagAnalyzerPanelTime,
} from '../panel/TagAnalyzerPanelModelTypes';

export type TagAnalyzerEditorNumericValue = number | '';

export type EditTabPanelType = 'General' | 'Data' | 'Axes' | 'Display' | 'Time';

export type TagAnalyzerPanelGeneralConfig = {
    chart_title: TagAnalyzerPanelMeta['chart_title'];
    use_zoom: TagAnalyzerPanelDisplay['use_zoom'];
    use_time_keeper: TagAnalyzerPanelTime['use_time_keeper'];
    time_keeper?: TagAnalyzerPanelTime['time_keeper'];
};

export type TagAnalyzerPanelDataConfig = {
    index_key: TagAnalyzerPanelMeta['index_key'];
    tag_set: TagAnalyzerPanelData['tag_set'];
};

export type TagAnalyzerPanelTimeConfig = {
    range_bgn: TagAnalyzerPanelTime['range_bgn'];
    range_end: TagAnalyzerPanelTime['range_end'];
};

export type TagAnalyzerPanelAxesDraft = Omit<
    TagAnalyzerPanelAxes,
    | 'pixels_per_tick_raw'
    | 'pixels_per_tick'
    | 'sampling_value'
    | 'custom_min'
    | 'custom_max'
    | 'custom_drilldown_min'
    | 'custom_drilldown_max'
    | 'ucl_value'
    | 'lcl_value'
    | 'custom_min2'
    | 'custom_max2'
    | 'custom_drilldown_min2'
    | 'custom_drilldown_max2'
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

export type TagAnalyzerPanelDisplayDraft = Omit<
    TagAnalyzerPanelDisplay,
    'point_radius' | 'fill' | 'stroke'
> & {
    point_radius: TagAnalyzerEditorNumericValue;
    fill: TagAnalyzerEditorNumericValue;
    stroke: TagAnalyzerEditorNumericValue;
};

export type TagAnalyzerPanelEditorConfig = {
    general: TagAnalyzerPanelGeneralConfig;
    data: TagAnalyzerPanelDataConfig;
    axes: TagAnalyzerPanelAxesDraft;
    display: TagAnalyzerPanelDisplayDraft;
    time: TagAnalyzerPanelTimeConfig;
};
