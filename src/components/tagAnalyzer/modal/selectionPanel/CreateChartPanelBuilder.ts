import type { TagSelectionDraftItem } from '../seriesSelection/TagSelectionTypes';
import {
    DEFAULT_VALUE_RANGE,
    type PanelEChartType,
    type PanelInfo,
} from '../../domain/PanelDomain';
import {
    hasNumericBaseTimeSeries,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';
import { buildSeriesDefinitionsFromDrafts } from '../seriesSelection/buildSelectedSeriesDefinitions';
import {
    createEmptyTimeRangeConfig,
} from '../../domain/time/TimeRangeUtils';
import {
    toLegacyFlatPanelInfo,
} from '../../persistence/load/LegacySupport/legacy/LegacyFlatPanelMapper';
import type { LegacyFlatPanelInfo } from '../../persistence/load/LegacySupport/legacy/LegacyFlatPanelTypes';

const DEFAULT_NEW_PANEL_TITLE = 'New chart';
const DEFAULT_PANEL_ROW_LIMIT = -1;
const DEFAULT_PANEL_INTERVAL_TYPE = '';
const DEFAULT_RAW_PIXELS_PER_TICK = 0.1;
const DEFAULT_CALCULATED_PIXELS_PER_TICK = 3;
const DEFAULT_SAMPLING_VALUE = 0.01;

export function buildCreateChartPanel(
    chartType: PanelEChartType,
    selectedSeriesDrafts: TagSelectionDraftItem[],
): LegacyFlatPanelInfo {
    return toLegacyFlatPanelInfo(createRuntimePanelInfo(
        chartType,
        buildSeriesDefinitionsFromDrafts(selectedSeriesDrafts),
    ));
}

function createRuntimePanelInfo(
    chartType: PanelEChartType,
    tagSet: PanelSeriesDefinition[],
): PanelInfo {
    const sDisplay = createPanelDisplayForChartType(chartType);

    return {
        meta: {
            index_key: createPanelKey(),
            chart_title: DEFAULT_NEW_PANEL_TITLE,
        },
        data: {
            tag_set: tagSet,
            count: DEFAULT_PANEL_ROW_LIMIT,
            interval_type: DEFAULT_PANEL_INTERVAL_TYPE,
        },
        toolbar: {
            isRaw: hasNumericBaseTimeSeries(tagSet),
        },
        time: {
            rangeConfig: createEmptyTimeRangeConfig(),
            useLastViewedRange: false,
            lastViewedRange: undefined,
        },
        axes: {
            x_axis: {
                show_tickline: true,
                raw_data_pixels_per_tick: DEFAULT_RAW_PIXELS_PER_TICK,
                calculated_data_pixels_per_tick: DEFAULT_CALCULATED_PIXELS_PER_TICK,
            },
            sampling: {
                enabled: true,
                sample_count: DEFAULT_SAMPLING_VALUE,
            },
            main_chart_sampling: {
                enabled: false,
                sample_count: DEFAULT_SAMPLING_VALUE,
            },
            left_y_axis: createDefaultLeftYAxisConfig(),
            right_y_axis_enabled: false,
            right_y_axis: createDefaultRightYAxisConfig(),
        },
        display: {
            show_legend: true,
            use_zoom: true,
            chart_type: chartType,
            connect_nulls: false,
            show_point: sDisplay.show_point,
            point_radius: sDisplay.point_radius,
            fill: sDisplay.fill,
            stroke: sDisplay.stroke,
        },
        use_normalize: false,
        highlights: [],
        annotations: [],
    };
}

function createPanelDisplayForChartType(
    chartType: PanelEChartType,
): Pick<PanelInfo['display'], 'show_point' | 'point_radius' | 'fill' | 'stroke'> {
    switch (chartType) {
        case 'Zone':
            return {
                show_point: false,
                point_radius: 0,
                fill: 0.15,
                stroke: 1,
            };
        case 'Dot':
            return {
                show_point: true,
                point_radius: 2,
                fill: 0,
                stroke: 0,
            };
        case 'Line':
        case 'Custom':
            return {
                show_point: true,
                point_radius: 0,
                fill: 0,
                stroke: 1,
            };
    }

    throw new Error(`Unsupported chart type: ${chartType}`);
}

function createDefaultLeftYAxisConfig(): PanelInfo['axes']['left_y_axis'] {
    return createBaseYAxisConfig(false);
}

function createDefaultRightYAxisConfig(): PanelInfo['axes']['right_y_axis'] {
    return createBaseYAxisConfig(true);
}

function createBaseYAxisConfig(zeroBase: boolean): PanelInfo['axes']['left_y_axis'] {
    return {
        zero_base: zeroBase,
        show_tickline: true,
        value_range: { ...DEFAULT_VALUE_RANGE },
        raw_data_value_range: { ...DEFAULT_VALUE_RANGE },
        upper_control_limit: {
            enabled: false,
            value: 0,
        },
        lower_control_limit: {
            enabled: false,
            value: 0,
        },
    };
}

function createPanelKey(): string {
    return String(Date.now() + Math.round(Math.random() * 1000));
}
