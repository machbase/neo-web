import type {
    PanelDisplay,
    PanelEChartType,
} from '../../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
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

export type PanelDataConfig = {
    index_key: string;
    tag_set: PanelSeriesDefinition[];
};

export type EditorNumberInputValue = number | '';

export type PanelAxisRangeDraft = {
    min: EditorNumberInputValue;
    max: EditorNumberInputValue;
};

export type PanelAxisThresholdDraft = {
    enabled: boolean;
    value: EditorNumberInputValue;
};

export type PanelYAxisDraft = {
    zero_base: boolean;
    show_tickline: boolean;
    value_range: PanelAxisRangeDraft;
    raw_data_value_range: PanelAxisRangeDraft;
    upper_control_limit: PanelAxisThresholdDraft;
    lower_control_limit: PanelAxisThresholdDraft;
};

export type PanelXAxisDraft = {
    show_tickline: boolean;
    raw_data_pixels_per_tick: EditorNumberInputValue;
    calculated_data_pixels_per_tick: EditorNumberInputValue;
};

export type PanelSamplingDraft = {
    enabled: boolean;
    sample_count: EditorNumberInputValue;
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
    point_radius: EditorNumberInputValue;
    fill: EditorNumberInputValue;
    stroke: EditorNumberInputValue;
};

export type PanelEditorConfig = {
    general: {
        chart_title: string;
        use_zoom: boolean;
        use_last_viewed_range: boolean;
        last_viewed_range: Partial<PanelNavigatorRangePair> | undefined;
    };
    data: PanelDataConfig;
    axes: PanelAxesDraft;
    display: PanelDisplayDraft;
    time: {
        range_config: TimeRangeConfig;
    };
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

export type GeneralFlagField = 'use_zoom' | 'use_last_viewed_range';

export type TimeInputField = 'start' | 'end';

export type TimeInputEvent = {
    target: {
        value: string;
    };
};

export type UseEditorTimeTabStateArgs = {
    timeConfig: PanelEditorConfig['time'];
    onChangeTimeConfig: (config: PanelEditorConfig['time']) => void;
};

export type TimeInputValues = {
    startTime: string;
    endTime: string;
};

