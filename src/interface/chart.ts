import { YorN, CalculationMode, ChartMode, ShowLegend } from './constants';
export type ChartType =
    | 'line'
    | 'areaLine'
    | 'pointLine'
    | 'point'
    | 'stock'
    | 'bar'
    | 'grid'
    | 'stackedBar'
    | 'pie'
    | 'gradientPie'
    | 'semiCircleDonut'
    | 'gauge'
    | 'text'
    | 'group'
    | '';

export type startTimeToendTimeType = { startTime: string | number; endTime: string | number };
export interface RangeData {
    max: string;
    min: string;
}
export interface GaugeColorset {
    color: string;
    to: number;
    from: number;
    min?: number;
}

export interface TextColorset {
    color: string;
    max: number;
    min: number;
}
export interface TagSet {
    weight: number;
    offset: number;
    min: number;
    max: number;
    alias: string;
    use_y2: YorN;
    colName: { name: string; time: string; value: string };
    tag_names: string;
    onRollup: boolean;
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
export interface LinePanel extends PanelInfo {
    isStock?: YorN;
}
export interface BarPanel extends PanelInfo {
    percent?: YorN;
    stacked?: YorN; // for bar chart}PanelInfo;
}
export interface PanelInfo {
    default_range: any;
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

    use_right_y2: YorN;
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
    chart_width: number | string;

    timeout: number;
    x_axis_type: string;
    chart_type: string;
    ////////////////////////////////////////// not used yet(Planned for future use), for storing Rollup table exists.
    sec_rollup?: SecRollup;

    ////////////////////////////////////////// not used(Removed feature), for right side legend("show_legend" = "R")
    legend_width: number;
    show_legend_value: LegendValue;
    name_legend_value: CalculationMode[];
    ////////////////////////////////////////// not used(Removed feature), for display detail grid
    use_detail: number;
    detail_count: number;
    detail_rows: number;

    i?: number;
    panel_title?: string;
    panel_type?: ChartType;
    select_count_type?: string;
    font_size?: number;
    connect_info?: any;
    inner_radius?: number; // for pie chart
    outer_radius?: number; // for pie chart
    min_value?: number;
    background_color?: number;
    min_width?: number; // for bar chart
    bar_width?: number; // for bar chart
    total_width?: number; // for bar chart
    percent_text_annotation?: string; // for bar chart
    usage?: any; // for 1.4 All panels in the dashboard have a parameter usage keyW
    url?: string; // url store for path 2.3 information panel
    timezone_key?: string;
    timezone_value?: string;
}
export interface BoardInfo {
    board_id: string;
    range_end: string;
    refresh: string;
    board_name: string;
    range_bgn: string;
    panels: PanelInfo[][];
    type: string;
    value?: any;
    old_id?: string;
}
export interface LineDataset {
    datasets: HighchartsDataset[];
}

export interface HighchartsDataset {
    name: string;
    data: number[][];
    marker: { symbol: string; lineColor: null; lineWidth: number };
    yAxis?: number;
}
export interface ChartData {
    Quality: number;
    TimeStamp: string;
    Value: number;
}
export interface ReturnTagData {
    CalculationMode: string;
    DataType: string;
    error_code: number;
    Query: string;
    Samples: ChartData[];
    TagName: string;
}
export interface TimeInfo {
    startTime: string | number;
    endTime: string | number;
}

export interface FetchTagDataArg {
    Table: string;
    TagNames: string;
    Start: string;
    End: string;
    Count: number;
    CalculationMode?: string;
    IntervalType?: string;
    IntervalValue?: number;
    Direction?: number;
}
