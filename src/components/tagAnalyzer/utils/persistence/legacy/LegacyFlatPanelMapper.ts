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
 * @param {LegacyFlatPanelInfo} aPanelInfo The flat legacy panel payload.
 * @returns {PanelInfo} The normalized runtime panel model.
 */
export function createPanelInfoFromLegacyFlatPanelInfo(
    aPanelInfo: LegacyFlatPanelInfo,
): PanelInfo {
    return createNormalizedLegacyPanelInfo(normalizeLegacyFlatPanelInfo(aPanelInfo));
}

/**
 * Converts the runtime panel model into the pre-2.0.0 flat panel shape.
 * Intent: Keep the old flat serializer available only at the dedicated legacy persistence boundary.
 * @param {PanelInfo} aPanelInfo The runtime panel model.
 * @returns {LegacyFlatPanelInfo} The flat legacy panel payload.
 */
export function toLegacyFlatPanelInfo(aPanelInfo: PanelInfo): LegacyFlatPanelInfo {
    const sRangeConfig = resolvePanelTimeRangeConfig(aPanelInfo);

    return {
        index_key: aPanelInfo.meta.index_key,
        chart_title: aPanelInfo.meta.chart_title,
        tag_set: toLegacySeriesConfigs(aPanelInfo.data.tag_set),
        range_bgn: toLegacyTimeValue(sRangeConfig.start),
        range_end: toLegacyTimeValue(sRangeConfig.end),
        raw_keeper: aPanelInfo.data.raw_keeper,
        time_keeper: aPanelInfo.time.time_keeper,
        default_range: aPanelInfo.time.default_range,
        count: aPanelInfo.data.count,
        interval_type: aPanelInfo.data.interval_type,
        show_legend: toLegacyBoolean(aPanelInfo.display.show_legend),
        use_zoom: toLegacyBoolean(aPanelInfo.display.use_zoom),
        use_normalize: toLegacyBoolean(aPanelInfo.use_normalize),
        use_time_keeper: toLegacyBoolean(aPanelInfo.time.use_time_keeper),
        show_x_tickline: toLegacyBoolean(aPanelInfo.axes.x_axis.show_tickline),
        pixels_per_tick_raw: aPanelInfo.axes.x_axis.raw_data_pixels_per_tick,
        pixels_per_tick: aPanelInfo.axes.x_axis.calculated_data_pixels_per_tick,
        use_sampling: aPanelInfo.axes.sampling.enabled,
        sampling_value: aPanelInfo.axes.sampling.sample_count,
        zero_base: toLegacyBoolean(aPanelInfo.axes.left_y_axis.zero_base),
        show_y_tickline: toLegacyBoolean(aPanelInfo.axes.left_y_axis.show_tickline),
        custom_min: aPanelInfo.axes.left_y_axis.value_range.min,
        custom_max: aPanelInfo.axes.left_y_axis.value_range.max,
        custom_drilldown_min: aPanelInfo.axes.left_y_axis.raw_data_value_range.min,
        custom_drilldown_max: aPanelInfo.axes.left_y_axis.raw_data_value_range.max,
        use_ucl: toLegacyBoolean(aPanelInfo.axes.left_y_axis.upper_control_limit.enabled),
        ucl_value: aPanelInfo.axes.left_y_axis.upper_control_limit.value,
        use_lcl: toLegacyBoolean(aPanelInfo.axes.left_y_axis.lower_control_limit.enabled),
        lcl_value: aPanelInfo.axes.left_y_axis.lower_control_limit.value,
        use_right_y2: toLegacyBoolean(aPanelInfo.axes.right_y_axis.enabled),
        zero_base2: toLegacyBoolean(aPanelInfo.axes.right_y_axis.zero_base),
        show_y_tickline2: toLegacyBoolean(aPanelInfo.axes.right_y_axis.show_tickline),
        custom_min2: aPanelInfo.axes.right_y_axis.value_range.min,
        custom_max2: aPanelInfo.axes.right_y_axis.value_range.max,
        custom_drilldown_min2: aPanelInfo.axes.right_y_axis.raw_data_value_range.min,
        custom_drilldown_max2: aPanelInfo.axes.right_y_axis.raw_data_value_range.max,
        use_ucl2: toLegacyBoolean(aPanelInfo.axes.right_y_axis.upper_control_limit.enabled),
        ucl2_value: aPanelInfo.axes.right_y_axis.upper_control_limit.value,
        use_lcl2: toLegacyBoolean(aPanelInfo.axes.right_y_axis.lower_control_limit.enabled),
        lcl2_value: aPanelInfo.axes.right_y_axis.lower_control_limit.value,
        chart_type: aPanelInfo.display.chart_type,
        show_point: toLegacyBoolean(aPanelInfo.display.show_point),
        point_radius: aPanelInfo.display.point_radius,
        fill: aPanelInfo.display.fill,
        stroke: aPanelInfo.display.stroke,
    };
}

function resolvePanelTimeRangeConfig(aPanelInfo: PanelInfo): TimeRangeConfig {
    return (
        aPanelInfo.time.range_config ??
        normalizeLegacyTimeRangeBoundary(aPanelInfo.time.range_bgn, aPanelInfo.time.range_end)
            .rangeConfig
    );
}

function normalizeLegacyFlatPanelInfo(aPanelInfo: LegacyFlatPanelInfo) {
    const sTimeRange = normalizeLegacyTimeRangeBoundary(aPanelInfo.range_bgn, aPanelInfo.range_end);

    return {
        index_key: aPanelInfo.index_key,
        chart_title: aPanelInfo.chart_title,
        tag_set: normalizeLegacySeriesConfigs(aPanelInfo.tag_set || []),
        range_bgn: sTimeRange.range.min,
        range_end: sTimeRange.range.max,
        range_config: sTimeRange.rangeConfig,
        raw_keeper: aPanelInfo.raw_keeper ?? false,
        time_keeper: normalizeLegacyTimeKeeper(aPanelInfo.time_keeper),
        default_range: aPanelInfo.default_range,
        count: aPanelInfo.count ?? -1,
        interval_type: aPanelInfo.interval_type,
        show_legend: fromLegacyBoolean(aPanelInfo.show_legend),
        use_zoom: fromLegacyBoolean(aPanelInfo.use_zoom),
        use_normalize: fromLegacyBoolean(aPanelInfo.use_normalize),
        use_time_keeper: fromLegacyBoolean(aPanelInfo.use_time_keeper),
        show_x_tickline: fromLegacyBoolean(aPanelInfo.show_x_tickline),
        pixels_per_tick_raw: normalizeNumericValue(aPanelInfo.pixels_per_tick_raw),
        pixels_per_tick: normalizeNumericValue(aPanelInfo.pixels_per_tick),
        use_sampling: aPanelInfo.use_sampling,
        sampling_value: normalizeNumericValue(aPanelInfo.sampling_value),
        zero_base: fromLegacyBoolean(aPanelInfo.zero_base),
        show_y_tickline: fromLegacyBoolean(aPanelInfo.show_y_tickline),
        custom_min: normalizeNumericValue(aPanelInfo.custom_min),
        custom_max: normalizeNumericValue(aPanelInfo.custom_max),
        custom_drilldown_min: normalizeNumericValue(aPanelInfo.custom_drilldown_min),
        custom_drilldown_max: normalizeNumericValue(aPanelInfo.custom_drilldown_max),
        use_ucl: fromLegacyBoolean(aPanelInfo.use_ucl),
        ucl_value: normalizeNumericValue(aPanelInfo.ucl_value),
        use_lcl: fromLegacyBoolean(aPanelInfo.use_lcl),
        lcl_value: normalizeNumericValue(aPanelInfo.lcl_value),
        use_right_y2: fromLegacyBoolean(aPanelInfo.use_right_y2),
        zero_base2: fromLegacyBoolean(aPanelInfo.zero_base2),
        show_y_tickline2: fromLegacyBoolean(aPanelInfo.show_y_tickline2),
        custom_min2: normalizeNumericValue(aPanelInfo.custom_min2),
        custom_max2: normalizeNumericValue(aPanelInfo.custom_max2),
        custom_drilldown_min2: normalizeNumericValue(aPanelInfo.custom_drilldown_min2),
        custom_drilldown_max2: normalizeNumericValue(aPanelInfo.custom_drilldown_max2),
        use_ucl2: fromLegacyBoolean(aPanelInfo.use_ucl2),
        ucl2_value: normalizeNumericValue(aPanelInfo.ucl2_value),
        use_lcl2: fromLegacyBoolean(aPanelInfo.use_lcl2),
        lcl2_value: normalizeNumericValue(aPanelInfo.lcl2_value),
        chart_type: normalizePanelEChartType(aPanelInfo.chart_type),
        show_point: fromLegacyBoolean(aPanelInfo.show_point),
        point_radius: normalizeNumericValue(aPanelInfo.point_radius),
        fill: normalizeNumericValue(aPanelInfo.fill),
        stroke: normalizeNumericValue(aPanelInfo.stroke),
    };
}

function createNormalizedLegacyPanelInfo(
    aPanelInfo: ReturnType<typeof normalizeLegacyFlatPanelInfo>,
): PanelInfo {
    return {
        meta: {
            index_key: aPanelInfo.index_key,
            chart_title: aPanelInfo.chart_title,
        },
        data: {
            tag_set: aPanelInfo.tag_set,
            raw_keeper: aPanelInfo.raw_keeper,
            count: aPanelInfo.count,
            interval_type: aPanelInfo.interval_type,
        },
        time: {
            range_bgn: aPanelInfo.range_bgn,
            range_end: aPanelInfo.range_end,
            range_config: aPanelInfo.range_config,
            use_time_keeper: aPanelInfo.use_time_keeper,
            time_keeper: aPanelInfo.time_keeper,
            default_range: aPanelInfo.default_range,
        },
        axes: {
            x_axis: {
                show_tickline: aPanelInfo.show_x_tickline,
                raw_data_pixels_per_tick: aPanelInfo.pixels_per_tick_raw,
                calculated_data_pixels_per_tick: aPanelInfo.pixels_per_tick,
            },
            sampling: {
                enabled: aPanelInfo.use_sampling,
                sample_count: aPanelInfo.sampling_value,
            },
            left_y_axis: {
                zero_base: aPanelInfo.zero_base,
                show_tickline: aPanelInfo.show_y_tickline,
                value_range: {
                    min: aPanelInfo.custom_min,
                    max: aPanelInfo.custom_max,
                },
                raw_data_value_range: {
                    min: aPanelInfo.custom_drilldown_min,
                    max: aPanelInfo.custom_drilldown_max,
                },
                upper_control_limit: {
                    enabled: aPanelInfo.use_ucl,
                    value: aPanelInfo.ucl_value,
                },
                lower_control_limit: {
                    enabled: aPanelInfo.use_lcl,
                    value: aPanelInfo.lcl_value,
                },
            },
            right_y_axis: {
                enabled: aPanelInfo.use_right_y2,
                zero_base: aPanelInfo.zero_base2,
                show_tickline: aPanelInfo.show_y_tickline2,
                value_range: {
                    min: aPanelInfo.custom_min2,
                    max: aPanelInfo.custom_max2,
                },
                raw_data_value_range: {
                    min: aPanelInfo.custom_drilldown_min2,
                    max: aPanelInfo.custom_drilldown_max2,
                },
                upper_control_limit: {
                    enabled: aPanelInfo.use_ucl2,
                    value: aPanelInfo.ucl2_value,
                },
                lower_control_limit: {
                    enabled: aPanelInfo.use_lcl2,
                    value: aPanelInfo.lcl2_value,
                },
            },
        },
        display: {
            show_legend: aPanelInfo.show_legend,
            use_zoom: aPanelInfo.use_zoom,
            chart_type: aPanelInfo.chart_type,
            show_point: aPanelInfo.show_point,
            point_radius: aPanelInfo.point_radius,
            fill: aPanelInfo.fill,
            stroke: aPanelInfo.stroke,
        },
        use_normalize: aPanelInfo.use_normalize,
        highlights: [],
    };
}

function normalizeNumericValue(aValue: number | string | undefined): number {
    if (aValue === undefined || aValue === '') {
        return 0;
    }

    return typeof aValue === 'number' ? aValue : Number(aValue);
}

function normalizeLegacyTimeKeeper(
    aTimeKeeper: Partial<TimeRangePair> | '' | undefined,
): Partial<TimeRangePair> | undefined {
    return aTimeKeeper === '' ? undefined : aTimeKeeper;
}

