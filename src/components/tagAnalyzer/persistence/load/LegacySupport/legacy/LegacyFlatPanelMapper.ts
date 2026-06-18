import {
    normalizePanelEChartType,
    type PanelInfo,
    type ValueRange,
} from '../../../../domain/PanelDomain';
import {
    fromLegacyBoolean,
    toLegacyBoolean,
    normalizeLegacySeriesConfigs,
    toLegacySeriesConfigs,
} from './LegacySeriesPersistenceAdapter';
import {
    shouldUseNumericPanelRangeConfig,
} from '../../../../domain/SeriesDomain';
import type {
    PanelNavigatorRangePair,
    PanelRangeConfig,
    TimestampRangeBoundary,
    NumericRangeBoundary,
    TimeRangeConfig,
} from '../../../../domain/time/model/TimeTypes';
import { parseTimeRangeConfigFromBoundaryValues } from '../../../../domain/time/boundary/TimeBoundaryInput';
import { normalizePanelNavigatorRangePair } from '../../../../domain/time/boundary/TimeBoundaryValidate';
import { normalizeStoredTimeUnit } from '../../../../domain/time/interval/TimeIntervalUtils';
import {
    createNumericRangeBoundary,
    createNumericRangeConfig,
    createTimestampRangeBoundary,
    createTimestampRangeConfig,
} from '../../../../domain/time/range/PanelRangeConfigUtils';
import { normalizePersistedPanelRangeConfig } from '../../normalizePersistedPanelRangeConfig';
import type { LegacyFlatPanelInfo } from './LegacyFlatPanelTypes';
export function createPanelInfoFromLegacyFlatPanelInfo(
    panelInfo: LegacyFlatPanelInfo,
): PanelInfo {
    return createNormalizedLegacyPanelInfo(normalizeLegacyFlatPanelInfo(panelInfo));
}
export function toLegacyFlatPanelInfo(panelInfo: PanelInfo): LegacyFlatPanelInfo {
    const sRangeConfig = panelInfo.time.range_config;

    return {
        index_key: panelInfo.data.index_key,
        chart_title: panelInfo.general.chart_title,
        tag_set: toLegacySeriesConfigs(panelInfo.data.tag_set),
        range_bgn: serializeLegacyRangeBoundaryValue(sRangeConfig.start),
        range_end: serializeLegacyRangeBoundaryValue(sRangeConfig.end),
        raw_keeper: panelInfo.general.is_raw,
        time_keeper: panelInfo.general.last_viewed_range,
        default_range: createLegacyDefaultRange(panelInfo.time.range_config),
        count: panelInfo.data.count,
        interval_type: panelInfo.data.interval_type,
        interval_value: 1,
        show_legend: toLegacyBoolean(panelInfo.display.show_legend),
        use_zoom: toLegacyBoolean(panelInfo.general.use_zoom),
        connect_nulls: toLegacyBoolean(panelInfo.display.connect_nulls),
        use_normalize: toLegacyBoolean(panelInfo.general.use_normalize),
        use_time_keeper: toLegacyBoolean(panelInfo.general.use_last_viewed_range),
        show_x_tickline: toLegacyBoolean(panelInfo.axes.x_axis.show_tickline),
        pixels_per_tick_raw: toLegacyNumberValue(panelInfo.axes.x_axis.raw_data_pixels_per_tick),
        pixels_per_tick: toLegacyNumberValue(panelInfo.axes.x_axis.calculated_data_pixels_per_tick),
        use_sampling: panelInfo.axes.sampling.enabled,
        sampling_value: toLegacyNumberValue(panelInfo.axes.sampling.sample_count),
        zero_base: toLegacyBoolean(panelInfo.axes.left_y_axis.zero_base),
        show_y_tickline: toLegacyBoolean(panelInfo.axes.left_y_axis.show_tickline),
        custom_min: toLegacyNumberValue(panelInfo.axes.left_y_axis.value_range.min),
        custom_max: toLegacyNumberValue(panelInfo.axes.left_y_axis.value_range.max),
        custom_drilldown_min: toLegacyNumberValue(panelInfo.axes.left_y_axis.raw_data_value_range.min),
        custom_drilldown_max: toLegacyNumberValue(panelInfo.axes.left_y_axis.raw_data_value_range.max),
        use_ucl: toLegacyBoolean(panelInfo.axes.left_y_axis.upper_control_limit.enabled),
        ucl_value: toLegacyNumberValue(panelInfo.axes.left_y_axis.upper_control_limit.value),
        use_lcl: toLegacyBoolean(panelInfo.axes.left_y_axis.lower_control_limit.enabled),
        lcl_value: toLegacyNumberValue(panelInfo.axes.left_y_axis.lower_control_limit.value),
        use_right_y2: toLegacyBoolean(panelInfo.axes.right_y_axis_enabled),
        zero_base2: toLegacyBoolean(panelInfo.axes.right_y_axis.zero_base),
        show_y_tickline2: toLegacyBoolean(panelInfo.axes.right_y_axis.show_tickline),
        custom_min2: toLegacyNumberValue(panelInfo.axes.right_y_axis.value_range.min),
        custom_max2: toLegacyNumberValue(panelInfo.axes.right_y_axis.value_range.max),
        custom_drilldown_min2: toLegacyNumberValue(panelInfo.axes.right_y_axis.raw_data_value_range.min),
        custom_drilldown_max2: toLegacyNumberValue(panelInfo.axes.right_y_axis.raw_data_value_range.max),
        use_ucl2: toLegacyBoolean(panelInfo.axes.right_y_axis.upper_control_limit.enabled),
        ucl2_value: toLegacyNumberValue(panelInfo.axes.right_y_axis.upper_control_limit.value),
        use_lcl2: toLegacyBoolean(panelInfo.axes.right_y_axis.lower_control_limit.enabled),
        lcl2_value: toLegacyNumberValue(panelInfo.axes.right_y_axis.lower_control_limit.value),
        chart_type: panelInfo.display.chart_type,
        show_point: toLegacyBoolean(panelInfo.display.show_point),
        point_radius: toLegacyNumberValue(panelInfo.display.point_radius),
        fill: toLegacyNumberValue(panelInfo.display.fill),
        stroke: toLegacyNumberValue(panelInfo.display.stroke),
    };
}

function normalizeLegacyFlatPanelInfo(panelInfo: LegacyFlatPanelInfo) {
    const sTagSet = normalizeLegacySeriesConfigs(panelInfo.tag_set || []);
    const sTimeRange = parseTimeRangeConfigFromBoundaryValues(
        panelInfo.range_bgn ?? '',
        panelInfo.range_end ?? '',
    );
    const sRangeConfig = resolveLegacyRangeConfig(
        panelInfo,
        sTimeRange,
        shouldUseNumericPanelRangeConfig(sTagSet),
    );

    return {
        index_key: panelInfo.index_key,
        chart_title: panelInfo.chart_title,
        tag_set: sTagSet,
        range_config: sRangeConfig,
        raw_keeper: panelInfo.raw_keeper ?? false,
        time_keeper: normalizeLegacyLastViewedRange(panelInfo.time_keeper),
        count: panelInfo.count ?? -1,
        interval_type:
            normalizeStoredTimeUnit(panelInfo.interval_type ?? '') ??
            panelInfo.interval_type,
        show_legend: fromLegacyBoolean(panelInfo.show_legend),
        use_zoom: fromLegacyBoolean(panelInfo.use_zoom),
        connect_nulls: fromLegacyBoolean(panelInfo.connect_nulls),
        use_normalize: fromLegacyBoolean(panelInfo.use_normalize),
        use_time_keeper: fromLegacyBoolean(panelInfo.use_time_keeper),
        show_x_tickline: fromLegacyBoolean(panelInfo.show_x_tickline),
        pixels_per_tick_raw: normalizeNumericValue(panelInfo.pixels_per_tick_raw),
        pixels_per_tick: normalizeNumericValue(panelInfo.pixels_per_tick),
        use_sampling: panelInfo.use_sampling ?? true,
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
        general: {
            chart_title: panelInfo.chart_title,
            use_zoom: panelInfo.use_zoom,
            use_last_viewed_range: panelInfo.use_time_keeper,
            last_viewed_range: panelInfo.time_keeper,
            is_raw: panelInfo.raw_keeper,
            is_order_by: true,
            use_normalize: panelInfo.use_normalize,
        },
        data: {
            index_key: panelInfo.index_key,
            tag_set: panelInfo.tag_set,
            count: panelInfo.count,
            interval_type: panelInfo.interval_type,
        },
        time: {
            range_config: panelInfo.range_config,
        },
        axes: {
            x_axis: {
                show_tickline: panelInfo.show_x_tickline,
                raw_data_pixels_per_tick: panelInfo.pixels_per_tick_raw,
                calculated_data_pixels_per_tick: panelInfo.pixels_per_tick,
                calculated_navigator_pixels_per_tick: panelInfo.pixels_per_tick,
            },
            sampling: {
                enabled: panelInfo.use_sampling,
                sample_count: panelInfo.sampling_value,
            },
            main_chart_sampling: {
                enabled: false,
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
            right_y_axis_enabled: panelInfo.use_right_y2,
            right_y_axis: {
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
            chart_type: panelInfo.chart_type,
            connect_nulls: panelInfo.connect_nulls,
            show_point: panelInfo.show_point,
            point_radius: panelInfo.point_radius,
            fill: panelInfo.fill,
            stroke: panelInfo.stroke,
        },
        highlights: [],
        annotations: [],
    };
}

function normalizeNumericValue(value: number | string | undefined): number {
    if (value === undefined || value === '') {
        return 0;
    }

    return typeof value === 'number' ? value : Number(value);
}

function toLegacyNumberValue(value: number | undefined): number {
    return value ?? 0;
}

function normalizeLegacyLastViewedRange(
    lastViewedRange: unknown,
): PanelNavigatorRangePair | undefined {
    return normalizePanelNavigatorRangePair(lastViewedRange);
}

function resolveLegacyRangeConfig(
    panelInfo: LegacyFlatPanelInfo,
    storedRangeConfig: TimeRangeConfig,
    isNumericAxis: boolean,
): PanelRangeConfig {
    if (hasLegacyStoredRange(panelInfo)) {
        return normalizePersistedPanelRangeConfig(
            storedRangeConfig,
            isNumericAxis,
        ) ?? createEmptyRangeConfigForAxis(isNumericAxis);
    }

    return createAbsoluteRangeConfigFromValueRange(
        panelInfo.default_range,
        isNumericAxis,
    ) ?? createEmptyRangeConfigForAxis(isNumericAxis);
}

function createEmptyRangeConfigForAxis(isNumericAxis: boolean): PanelRangeConfig {
    return isNumericAxis
        ? createNumericRangeConfig(
              createNumericRangeBoundary('numeric_empty'),
              createNumericRangeBoundary('numeric_empty'),
          )
        : createTimestampRangeConfig(
              createTimestampRangeBoundary('timestamp_empty'),
              createTimestampRangeBoundary('timestamp_empty'),
          );
}

function hasLegacyStoredRange(panelInfo: LegacyFlatPanelInfo): boolean {
    return (
        panelInfo.range_bgn !== '' &&
        panelInfo.range_bgn !== undefined &&
        panelInfo.range_end !== '' &&
        panelInfo.range_end !== undefined
    );
}

function createAbsoluteRangeConfigFromValueRange(
    valueRange: ValueRange | undefined,
    isNumericAxis: boolean,
): PanelRangeConfig | undefined {
    if (
        !valueRange ||
        valueRange.min === undefined ||
        valueRange.max === undefined
    ) {
        return undefined;
    }

    return isNumericAxis
        ? createNumericRangeConfig(
              createNumericRangeBoundary('numeric_value', valueRange.min),
              createNumericRangeBoundary('numeric_value', valueRange.max),
          )
        : createTimestampRangeConfig(
              createTimestampRangeBoundary('timestamp_absolute', valueRange.min),
              createTimestampRangeBoundary('timestamp_absolute', valueRange.max),
          );
}

function createLegacyDefaultRange(
    rangeConfig: PanelRangeConfig,
): ValueRange | undefined {
    const sStartBoundary = rangeConfig.start;
    const sEndBoundary = rangeConfig.end;

    if (
        sStartBoundary.kind !== 'timestamp_absolute' &&
        sStartBoundary.kind !== 'numeric_value'
    ) {
        return undefined;
    }

    if (
        sEndBoundary.kind !== 'timestamp_absolute' &&
        sEndBoundary.kind !== 'numeric_value'
    ) {
        return undefined;
    }

    return {
        min: sStartBoundary.value,
        max: sEndBoundary.value,
    };
}

function serializeLegacyRangeBoundaryValue(
    boundary: TimestampRangeBoundary | NumericRangeBoundary,
): string | number | '' {
    switch (boundary.kind) {
        case 'timestamp_empty':
        case 'numeric_empty':
            return '';
        case 'timestamp_absolute':
        case 'numeric_value':
            return boundary.value;
        case 'timestamp_now':
            return serializeLegacyTimestampOffset('now', boundary.value);
        case 'timestamp_data_end':
            return serializeLegacyTimestampOffset('last', boundary.value);
        case 'numeric_data_start':
        case 'numeric_data_end':
            return '';
    }
}

function serializeLegacyTimestampOffset(
    anchor: 'now' | 'last',
    offsetMilliseconds: number,
): string {
    if (offsetMilliseconds === 0) {
        return anchor;
    }

    if (offsetMilliseconds < 0) {
        return `${anchor}-${Math.abs(offsetMilliseconds)}ms`;
    }

    return anchor;
}



