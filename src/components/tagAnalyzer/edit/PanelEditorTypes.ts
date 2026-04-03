import type {
    TagAnalyzerPanelTimeKeeper,
    TagAnalyzerRangeValue,
    TagAnalyzerTagItem,
    TagAnalyzerYN,
} from '../panel/TagAnalyzerPanelTypes';

export type PanelEditTab = 'General' | 'Data' | 'Axes' | 'Display' | 'Time';

export type PanelGeneralConfig = {
    chart_title: string;
    use_zoom: TagAnalyzerYN;
    use_time_keeper: TagAnalyzerYN;
    time_keeper?: Partial<TagAnalyzerPanelTimeKeeper>;
};

export type TagAnalyzerPanelDataConfig = {
    index_key: string;
    tag_set: TagAnalyzerTagItem[];
};

export type TagAnalyzerPanelTimeConfig = {
    range_bgn: TagAnalyzerRangeValue;
    range_end: TagAnalyzerRangeValue;
};

export type TagAnalyzerPanelDisplayConfig = {
    chart_type: string;
    show_legend: TagAnalyzerYN;
    show_point: TagAnalyzerYN;
    point_radius: number | string;
    fill: number | string;
    stroke: number | string;
};

export type TagAnalyzerPanelAxesConfig = {
    show_x_tickline: TagAnalyzerYN;
    pixels_per_tick_raw: number | string;
    pixels_per_tick: number | string;
    use_sampling: boolean;
    sampling_value: number | string;
    zero_base: TagAnalyzerYN;
    show_y_tickline: TagAnalyzerYN;
    custom_min: number | string;
    custom_max: number | string;
    custom_drilldown_min: number | string;
    custom_drilldown_max: number | string;
    use_ucl: TagAnalyzerYN;
    ucl_value: number | string;
    use_lcl: TagAnalyzerYN;
    lcl_value: number | string;
    use_right_y2: TagAnalyzerYN;
    zero_base2: TagAnalyzerYN;
    show_y_tickline2: TagAnalyzerYN;
    custom_min2: number | string;
    custom_max2: number | string;
    custom_drilldown_min2: number | string;
    custom_drilldown_max2: number | string;
    use_ucl2: TagAnalyzerYN;
    ucl2_value: number | string;
    use_lcl2: TagAnalyzerYN;
    lcl2_value: number | string;
};

export type TagAnalyzerPanelEditorConfig = {
    general: PanelGeneralConfig;
    data: TagAnalyzerPanelDataConfig;
    axes: TagAnalyzerPanelAxesConfig;
    display: TagAnalyzerPanelDisplayConfig;
    time: TagAnalyzerPanelTimeConfig;
};
