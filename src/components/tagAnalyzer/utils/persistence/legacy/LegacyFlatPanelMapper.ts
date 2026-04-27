import type { PanelInfo } from '../../panelModelTypes';
import { normalizePanelEChartType } from '../../panelModelTypes';
import {
    fromLegacyBoolean,
    toLegacyBoolean,
    normalizeLegacySeriesConfigs,
    toLegacySeriesConfigs,
} from '../../legacy/LegacySeriesAdapter';
import {
    normalizeLegacyTimeRangeBoundary,
    toLegacyTimeValue,
} from '../../legacy/LegacyTimeAdapter';
import type { TimeRangeConfig, TimeRangePair } from '../../time/types/TimeTypes';
import type { LegacyFlatPanelInfo } from './LegacyFlatPanelTypes';

/**
 * Converts a pre-2.0.0 flat panel into the runtime panel model.
 * Intent: Keep flat legacy `.taz` support isolated from normal versioned persistence code.
 * @param {LegacyFlatPanelInfo} panelInfo The flat legacy panel payload.
 * @returns {PanelInfo} The normalized runtime panel model.
 */
export function createPanelInfoFromLegacyFlatPanelInfo(
    panelInfo: LegacyFlatPanelInfo,
): PanelInfo {
    return createNormalizedLegacyPanelInfo(normalizeLegacyFlatPanelInfo(panelInfo));
}

/**
 * Converts the runtime panel model into the pre-2.0.0 flat panel shape.
 * Intent: Keep the old flat serializer available only at the dedicated legacy persistence boundary.
 * @param {PanelInfo} panelInfo The runtime panel model.
 * @returns {LegacyFlatPanelInfo} The flat legacy panel payload.
 */
export function toLegacyFlatPanelInfo(panelInfo: PanelInfo): LegacyFlatPanelInfo {
    const sRangeConfig = resolvePanelTimeRangeConfig(panelInfo);

    return {
        index_key: panelInfo.meta.index_key,
        chart_title: panelInfo.meta.chart_title,
        tag_set: toLegacySeriesConfigs(panelInfo.data.tag_set),
        range_bgn: toLegacyTimeValue(sRangeConfig.start),
        range_end: toLegacyTimeValue(sRangeConfig.end),
        raw_keeper: panelInfo.toolbar.isRaw,
        time_keeper: panelInfo.time.time_keeper,
        default_range: panelInfo.time.default_range,
        count: panelInfo.data.count,
        interval_type: panelInfo.data.interval_type,
        show_legend: toLegacyBoolean(panelInfo.display.show_legend),
        use_zoom: toLegacyBoolean(panelInfo.display.use_zoom),
        use_normalize: toLegacyBoolean(panelInfo.use_normalize),
        use_time_keeper: toLegacyBoolean(panelInfo.time.use_time_keeper),
        show_x_tickline: toLegacyBoolean(panelInfo.axes.x_axis.show_tickline),
        pixels_per_tick_raw: panelInfo.axes.x_axis.raw_data_pixels_per_tick,
        pixels_per_tick: panelInfo.axes.x_axis.calculated_data_pixels_per_tick,
        use_sampling: panelInfo.axes.sampling.enabled,
        sampling_value: panelInfo.axes.sampling.sample_count,
        zero_base: toLegacyBoolean(panelInfo.axes.left_y_axis.zero_base),
        show_y_tickline: toLegacyBoolean(panelInfo.axes.left_y_axis.show_tickline),
        custom_min: panelInfo.axes.left_y_axis.value_range.min,
        custom_max: panelInfo.axes.left_y_axis.value_range.max,
        custom_drilldown_min: panelInfo.axes.left_y_axis.raw_data_value_range.min,
        custom_drilldown_max: panelInfo.axes.left_y_axis.raw_data_value_range.max,
        use_ucl: toLegacyBoolean(panelInfo.axes.left_y_axis.upper_control_limit.enabled),
        ucl_value: panelInfo.axes.left_y_axis.upper_control_limit.value,
        use_lcl: toLegacyBoolean(panelInfo.axes.left_y_axis.lower_control_limit.enabled),
        lcl_value: panelInfo.axes.left_y_axis.lower_control_limit.value,
        use_right_y2: toLegacyBoolean(panelInfo.axes.right_y_axis.enabled),
        zero_base2: toLegacyBoolean(panelInfo.axes.right_y_axis.zero_base),
        show_y_tickline2: toLegacyBoolean(panelInfo.axes.right_y_axis.show_tickline),
        custom_min2: panelInfo.axes.right_y_axis.value_range.min,
        custom_max2: panelInfo.axes.right_y_axis.value_range.max,
        custom_drilldown_min2: panelInfo.axes.right_y_axis.raw_data_value_range.min,
        custom_drilldown_max2: panelInfo.axes.right_y_axis.raw_data_value_range.max,
        use_ucl2: toLegacyBoolean(panelInfo.axes.right_y_axis.upper_control_limit.enabled),
        ucl2_value: panelInfo.axes.right_y_axis.upper_control_limit.value,
        use_lcl2: toLegacyBoolean(panelInfo.axes.right_y_axis.lower_control_limit.enabled),
        lcl2_value: panelInfo.axes.right_y_axis.lower_control_limit.value,
        chart_type: panelInfo.display.chart_type,
        show_point: toLegacyBoolean(panelInfo.display.show_point),
        point_radius: panelInfo.display.point_radius,
        fill: panelInfo.display.fill,
        stroke: panelInfo.display.stroke,
    };
}

function resolvePanelTimeRangeConfig(panelInfo: PanelInfo): TimeRangeConfig {
    return (
        panelInfo.time.range_config ??
        normalizeLegacyTimeRangeBoundary(panelInfo.time.range_bgn, panelInfo.time.range_end)
            .rangeConfig
    );
}

function normalizeLegacyFlatPanelInfo(panelInfo: LegacyFlatPanelInfo) {
    const sTimeRange = normalizeLegacyTimeRangeBoundary(panelInfo.range_bgn, panelInfo.range_end);

    return {
        index_key: panelInfo.index_key,
        chart_title: panelInfo.chart_title,
        tag_set: normalizeLegacySeriesConfigs(panelInfo.tag_set || []),
        range_bgn: sTimeRange.range.min,
        range_end: sTimeRange.range.max,
        range_config: sTimeRange.rangeConfig,
        raw_keeper: panelInfo.raw_keeper ?? false,
        time_keeper: normalizeLegacyTimeKeeper(panelInfo.time_keeper),
        default_range: panelInfo.default_range,
        count: panelInfo.count ?? -1,
        interval_type: panelInfo.interval_type,
        show_legend: fromLegacyBoolean(panelInfo.show_legend),
        use_zoom: fromLegacyBoolean(panelInfo.use_zoom),
        use_normalize: fromLegacyBoolean(panelInfo.use_normalize),
        use_time_keeper: fromLegacyBoolean(panelInfo.use_time_keeper),
        show_x_tickline: fromLegacyBoolean(panelInfo.show_x_tickline),
        pixels_per_tick_raw: normalizeNumericValue(panelInfo.pixels_per_tick_raw),
        pixels_per_tick: normalizeNumericValue(panelInfo.pixels_per_tick),
        use_sampling: panelInfo.use_sampling,
        sampling_value: normalizeNumericValue(panelInfo.sampling_value),
        zero_base: fromLegacyBoolean(panelInfo.zero_base),
        show_y_tickline: fromLegacyBoolean(panelInfo.show_y_tickline),
        custom_min: normalizeNumericValue(panelInfo.custom_min),
        custom_max: normalizeNumericValue(panelInfo.custom_max),
        custom_drilldown_min: normalizeNumericValue(panelInfo.custom_drilldown_min),
        custom_drilldown_max: normalizeNumericValue(panelInfo.custom_drilldown_max),
        use_ucl: fromLegacyBoolean(panelInfo.use_ucl),
        ucl_value: normalizeNumericValue(panelInfo.ucl_value),
        use_lcl: fromLegacyBoolean(panelInfo.use_lcl),
        lcl_value: normalizeNumericValue(panelInfo.lcl_value),
        use_right_y2: fromLegacyBoolean(panelInfo.use_right_y2),
        zero_base2: fromLegacyBoolean(panelInfo.zero_base2),
        show_y_tickline2: fromLegacyBoolean(panelInfo.show_y_tickline2),
        custom_min2: normalizeNumericValue(panelInfo.custom_min2),
        custom_max2: normalizeNumericValue(panelInfo.custom_max2),
        custom_drilldown_min2: normalizeNumericValue(panelInfo.custom_drilldown_min2),
        custom_drilldown_max2: normalizeNumericValue(panelInfo.custom_drilldown_max2),
        use_ucl2: fromLegacyBoolean(panelInfo.use_ucl2),
        ucl2_value: normalizeNumericValue(panelInfo.ucl2_value),
        use_lcl2: fromLegacyBoolean(panelInfo.use_lcl2),
        lcl2_value: normalizeNumericValue(panelInfo.lcl2_value),
        chart_type: normalizePanelEChartType(panelInfo.chart_type),
        show_point: fromLegacyBoolean(panelInfo.show_point),
        point_radius: normalizeNumericValue(panelInfo.point_radius),
        fill: normalizeNumericValue(panelInfo.fill),
        stroke: normalizeNumericValue(panelInfo.stroke),
    };
}

function createNormalizedLegacyPanelInfo(
    panelInfo: ReturnType<typeof normalizeLegacyFlatPanelInfo>,
): PanelInfo {
    return {
        meta: {
            index_key: panelInfo.index_key,
            chart_title: panelInfo.chart_title,
        },
        data: {
            tag_set: panelInfo.tag_set,
            count: panelInfo.count,
            interval_type: panelInfo.interval_type,
        },
        toolbar: {
            isRaw: panelInfo.raw_keeper,
        },
        time: {
            range_bgn: panelInfo.range_bgn,
            range_end: panelInfo.range_end,
            range_config: panelInfo.range_config,
            use_time_keeper: panelInfo.use_time_keeper,
            time_keeper: panelInfo.time_keeper,
            default_range: panelInfo.default_range,
        },
        axes: {
            x_axis: {
                show_tickline: panelInfo.show_x_tickline,
                raw_data_pixels_per_tick: panelInfo.pixels_per_tick_raw,
                calculated_data_pixels_per_tick: panelInfo.pixels_per_tick,
            },
            sampling: {
                enabled: panelInfo.use_sampling,
                sample_count: panelInfo.sampling_value,
            },
            left_y_axis: {
                zero_base: panelInfo.zero_base,
                show_tickline: panelInfo.show_y_tickline,
                value_range: {
                    min: panelInfo.custom_min,
                    max: panelInfo.custom_max,
                },
                raw_data_value_range: {
                    min: panelInfo.custom_drilldown_min,
                    max: panelInfo.custom_drilldown_max,
                },
                upper_control_limit: {
                    enabled: panelInfo.use_ucl,
                    value: panelInfo.ucl_value,
                },
                lower_control_limit: {
                    enabled: panelInfo.use_lcl,
                    value: panelInfo.lcl_value,
                },
            },
            right_y_axis: {
                enabled: panelInfo.use_right_y2,
                zero_base: panelInfo.zero_base2,
                show_tickline: panelInfo.show_y_tickline2,
                value_range: {
                    min: panelInfo.custom_min2,
                    max: panelInfo.custom_max2,
                },
                raw_data_value_range: {
                    min: panelInfo.custom_drilldown_min2,
                    max: panelInfo.custom_drilldown_max2,
                },
                upper_control_limit: {
                    enabled: panelInfo.use_ucl2,
                    value: panelInfo.ucl2_value,
                },
                lower_control_limit: {
                    enabled: panelInfo.use_lcl2,
                    value: panelInfo.lcl2_value,
                },
            },
        },
        display: {
            show_legend: panelInfo.show_legend,
            use_zoom: panelInfo.use_zoom,
            chart_type: panelInfo.chart_type,
            show_point: panelInfo.show_point,
            point_radius: panelInfo.point_radius,
            fill: panelInfo.fill,
            stroke: panelInfo.stroke,
        },
        use_normalize: panelInfo.use_normalize,
        highlights: [],
    };
}

function normalizeNumericValue(value: number | string | undefined): number {
    if (value === undefined || value === '') {
        return 0;
    }

    return typeof value === 'number' ? value : Number(value);
}

function normalizeLegacyTimeKeeper(
    timeKeeper: Partial<TimeRangePair> | '' | undefined,
): Partial<TimeRangePair> | undefined {
    return timeKeeper === '' ? undefined : timeKeeper;
}

