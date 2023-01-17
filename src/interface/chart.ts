import { YorN, CalculationMode, ChartMode, ShowLegend } from './constants';

export interface TagSet {
    weight: number;
    offset: number;
    min: number;
    max: number;
    alias: string;
    use_y2: YorN;
    tag_names: string;
    table: string;
    calculation_mode: CalculationMode;
}
export interface LegendValue {
    max: string;
    sum: string;
    avg: string;
    min: string;
}
export interface SecRollup {
    TAG: string;
    MYTAG: string;
}
export interface PanelInfo {
    chart_id: string;
    tag_set: TagSet[];
    range_bgn: string;
    range_end: string;
    count: number;
    interval_type: string;
    interval_value: number;
    refresh: string;
    csstype: ChartMode;
    show_legend: ShowLegend;
    start_with_vport: YorN;
    raw_chart_limit: number;
    raw_chart_threshold: number;
    fill: number;
    stroke: number;
    show_point: YorN;
    point_radius: number;
    pixels_per_tick: number;
    use_zoom: YorN;
    drilldown_zoom: YorN;
    use_normalize: YorN;
    border_color: string;
    chart_title: string;

    zero_base: YorN;
    use_custom_max: YorN;
    custom_max: number;
    use_custom_min: YorN;
    custom_min: number;
    use_custom_drilldown_max: YorN;
    custom_drilldown_max: number;
    use_custom_drilldown_min: YorN;
    custom_drilldown_min: number;

    use_right_y2: string;
    zero_base2: YorN;
    use_custom_max2: YorN;
    custom_max2: number;
    use_custom_min2: YorN;
    custom_min2: number;
    use_custom_drilldown_max2: YorN;
    custom_drilldown_max2: number;
    use_custom_drilldown_min2: YorN;
    custom_drilldown_min2: number;

    show_x_tickline: YorN;
    show_y_tickline: YorN;
    show_y_tickline2: YorN;

    use_custom_color: YorN;
    color_set: string;
    chart_height: number;
    chart_width: number;

    timeout: number;
    x_axis_type: string;
    chart_type: string;
    ////////////////////////////////////////// not used yet(Planned for future use), for storing Rollup table exists.
    sec_rollup: SecRollup;

    ////////////////////////////////////////// not used(Removed feature), for right side legend("show_legend" = "R")
    legend_width: number;
    show_legend_value: LegendValue;
    name_legend_value: CalculationMode[];
    ////////////////////////////////////////// not used(Removed feature), for display detail grid
    use_detail: number;
    detail_count: number;
    detail_rows: number;
}
export interface BoardInfo {
    board_id: string;
    range_end: string;
    refresh: string;
    board_name: string;
    range_bgn: string;
    panels: PanelInfo[][];
}
