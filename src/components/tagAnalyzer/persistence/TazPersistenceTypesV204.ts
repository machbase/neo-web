import type { TazVersion } from './TazVersion';
import type {
    PanelAxisThreshold,
    PanelEChartType,
    ValueRange,
} from '../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import type {
    PanelViewRange,
    PanelRangeInput,
} from '../domain/time/model/TimeTypes';
import type {
    PersistedBoardTimeRange,
    PersistedPanelAnnotationInput,
} from './TazPersistenceTypesV200';

export type PersistedPanelInfoV204 = {
    general: {
        chart_title: string;
        use_zoom: boolean;
        use_last_viewed_range: boolean;
        last_viewed_range?: PanelViewRange | undefined;
        is_raw: boolean;
        is_order_by?: boolean | undefined;
        use_normalize: boolean;
    };
    data: {
        index_key: string;
        tag_set: PanelSeriesDefinition[];
        count: number | undefined;
        interval_type: string | undefined;
    };
    time: {
        range_config: PanelRangeInput;
    };
    axes: {
        x_axis: {
            show_tickline: boolean;
            raw_data_pixels_per_tick: number | undefined;
            calculated_data_pixels_per_tick: number | undefined;
            calculated_navigator_pixels_per_tick?: number | undefined;
        };
        sampling?: {
            enabled: boolean;
            sample_count: number | undefined;
        };
        main_chart_sampling?: {
            enabled: boolean;
            sample_count: number | undefined;
        };
        left_y_axis: {
            zero_base: boolean;
            show_tickline: boolean;
            value_range: ValueRange;
            raw_data_value_range: ValueRange;
            upper_control_limit: PanelAxisThreshold;
            lower_control_limit: PanelAxisThreshold;
        };
        right_y_axis_enabled?: boolean | undefined;
        right_y_axis: {
            zero_base: boolean;
            show_tickline: boolean;
            value_range: ValueRange;
            raw_data_value_range: ValueRange;
            upper_control_limit: PanelAxisThreshold;
            lower_control_limit: PanelAxisThreshold;
        };
    };
    display: {
        show_legend: boolean;
        chart_type: PanelEChartType;
        connect_nulls?: boolean | undefined;
        show_point: boolean;
        point_radius: number | undefined;
        fill: number | undefined;
        stroke: number | undefined;
    };
    highlights?: PanelInfoV204Highlight[] | undefined;
    annotations?: PersistedPanelAnnotationInput[] | undefined;
};

export type PanelInfoV204Highlight = {
    text: string;
    timeRange: {
        startTime: number;
        endTime: number;
    };
    fillColor?: string | undefined;
    textColor?: string | undefined;
};

export type PersistedTazBoardInfoV204 = {
    id: string;
    type: string;
    version: TazVersion.V204;
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV204[];
};
