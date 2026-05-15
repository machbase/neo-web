import type {
    PanelAxisThreshold,
    PanelDisplay,
    PanelEChartType,
    PanelSampling,
    PanelXAxis,
    PanelYAxis,
} from '../../domain/PanelModel';
import type { PanelSeriesDefinition } from '../../domain/SeriesModel';
import type {
    PanelNavigatorRangePair,
    TimeRangeConfig,
} from '../../domain/time/TimeTypes';

export type EditorChartType = PanelEChartType;

export type EditorCheckboxInputEvent = {
    target: {
        checked: boolean;
    };
};

export type EditorInputEvent = {
    target: {
        value: string;
    };
};

export type EditTabPanelType = 'General' | 'Data' | 'Axes' | 'Display' | 'Time';

export type PanelGeneralConfig = {
    chart_title: string;
    use_zoom: boolean;
    use_time_keeper: boolean;
    time_keeper: Partial<PanelNavigatorRangePair> | undefined;
};

export type PanelDataConfig = {
    index_key: string;
    tag_set: PanelSeriesDefinition[];
};

export type PanelTimeConfig = {
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

export type PanelAxesDraft = {
    x_axis: PanelXAxisDraft;
    sampling: PanelSamplingDraft;
    main_chart_sampling: PanelSamplingDraft;
    left_y_axis: PanelYAxisDraft;
    right_y_axis: PanelYAxisDraft;
    right_y_axis_enabled: boolean;
};

export type PanelDisplayDraft = Omit<
    PanelDisplay,
    'point_radius' | 'fill' | 'stroke'
> & {
    point_radius: number | '';
    fill: number | '';
    stroke: number | '';
};

export type PanelEditorConfig = {
    general: PanelGeneralConfig;
    data: PanelDataConfig;
    axes: PanelAxesDraft;
    display: PanelDisplayDraft;
    time: PanelTimeConfig;
};

export type AxisRangeKey = 'value_range' | 'raw_data_value_range';
export type AxisThresholdKey = 'upper_control_limit' | 'lower_control_limit';

export type AxisRangeRow = {
    label: string;
    rangeKey: AxisRangeKey;
    disabled?: boolean;
    labelMinWidth?: string;
};

export type AxisThresholdRow = {
    thresholdKey: AxisThresholdKey;
    label: string;
    disabled?: boolean;
};

export type EditorYAxisToggleConfig = {
    checked: boolean;
    label: string;
    onChange: (checked: boolean) => void;
};

export type EditableTagField = 'calculationMode' | 'alias' | 'color';

export type ChartTypeOption = {
    type: EditorChartType;
    src: string;
    alt: string;
};

export type GeneralFlagField = 'use_zoom' | 'use_time_keeper';

export type TimeInputField = 'start' | 'end';

export type TimeInputEvent = {
    target: {
        value: string;
    };
};

export type UseEditorTimeTabStateArgs = {
    timeConfig: PanelTimeConfig;
    onChangeTimeConfig: (config: PanelTimeConfig) => void;
};

export type TimeInputValues = {
    startTime: string;
    endTime: string;
};

