import {
    normalizePanelQueryCount,
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
    const sRangeConfig = panelInfo.timeRange;

    return {
        index_key: panelInfo.key,
        chart_title: panelInfo.title,
        tag_set: toLegacySeriesConfigs(panelInfo.query.tagSet),
        range_bgn: serializeLegacyRangeBoundaryValue(sRangeConfig.start),
        range_end: serializeLegacyRangeBoundaryValue(sRangeConfig.end),
        raw_keeper: panelInfo.mode.isRaw,
        time_keeper: panelInfo.timeRange.lastViewedRange,
        default_range: createLegacyDefaultRange(panelInfo.timeRange),
        count: panelInfo.query.count,
        interval_type: panelInfo.query.intervalType,
        interval_value: 1,
        show_legend: toLegacyBoolean(panelInfo.display.showLegend),
        use_zoom: toLegacyBoolean(panelInfo.display.useZoom),
        connect_nulls: toLegacyBoolean(panelInfo.display.connectNulls),
        use_normalize: toLegacyBoolean(panelInfo.mode.useNormalize),
        use_time_keeper: toLegacyBoolean(panelInfo.timeRange.useLastViewedRange),
        show_x_tickline: toLegacyBoolean(panelInfo.axes.x.showTickline),
        pixels_per_tick_raw: toLegacyNumberValue(panelInfo.display.pixelsPerTick.raw),
        pixels_per_tick: toLegacyNumberValue(panelInfo.display.pixelsPerTick.calculated),
        use_sampling: panelInfo.display.mainChartSampling.enabled,
        sampling_value: toLegacyNumberValue(panelInfo.display.mainChartSampling.sampleCount),
        zero_base: toLegacyBoolean(panelInfo.axes.leftY.zeroBase),
        show_y_tickline: toLegacyBoolean(panelInfo.axes.leftY.showTickline),
        custom_min: toLegacyNumberValue(panelInfo.axes.leftY.valueRange.min),
        custom_max: toLegacyNumberValue(panelInfo.axes.leftY.valueRange.max),
        custom_drilldown_min: toLegacyNumberValue(panelInfo.axes.leftY.rawValueRange.min),
        custom_drilldown_max: toLegacyNumberValue(panelInfo.axes.leftY.rawValueRange.max),
        use_ucl: toLegacyBoolean(panelInfo.axes.leftY.upperControlLimit.enabled),
        ucl_value: toLegacyNumberValue(panelInfo.axes.leftY.upperControlLimit.value),
        use_lcl: toLegacyBoolean(panelInfo.axes.leftY.lowerControlLimit.enabled),
        lcl_value: toLegacyNumberValue(panelInfo.axes.leftY.lowerControlLimit.value),
        use_right_y2: toLegacyBoolean(panelInfo.axes.rightY.enabled),
        zero_base2: toLegacyBoolean(panelInfo.axes.rightY.zeroBase),
        show_y_tickline2: toLegacyBoolean(panelInfo.axes.rightY.showTickline),
        custom_min2: toLegacyNumberValue(panelInfo.axes.rightY.valueRange.min),
        custom_max2: toLegacyNumberValue(panelInfo.axes.rightY.valueRange.max),
        custom_drilldown_min2: toLegacyNumberValue(panelInfo.axes.rightY.rawValueRange.min),
        custom_drilldown_max2: toLegacyNumberValue(panelInfo.axes.rightY.rawValueRange.max),
        use_ucl2: toLegacyBoolean(panelInfo.axes.rightY.upperControlLimit.enabled),
        ucl2_value: toLegacyNumberValue(panelInfo.axes.rightY.upperControlLimit.value),
        use_lcl2: toLegacyBoolean(panelInfo.axes.rightY.lowerControlLimit.enabled),
        lcl2_value: toLegacyNumberValue(panelInfo.axes.rightY.lowerControlLimit.value),
        chart_type: panelInfo.display.chartType,
        show_point: toLegacyBoolean(panelInfo.display.showPoint),
        point_radius: toLegacyNumberValue(panelInfo.display.pointRadius),
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
        count: normalizePanelQueryCount(panelInfo.count),
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
        key: panelInfo.index_key,
        title: panelInfo.chart_title,
        query: {
            tagSet: panelInfo.tag_set,
            count: panelInfo.count,
            intervalType: panelInfo.interval_type,
        },
        mode: {
            isRaw: panelInfo.raw_keeper,
            isOrderBy: true,
            useNormalize: panelInfo.use_normalize,
        },
        timeRange: {
            ...panelInfo.range_config,
            useLastViewedRange: panelInfo.use_time_keeper,
            lastViewedRange: panelInfo.time_keeper,
        },
        axes: {
            x: {
                showTickline: panelInfo.show_x_tickline,
            },
            leftY: {
                zeroBase: panelInfo.zero_base,
                showTickline: panelInfo.show_y_tickline,
                valueRange: {
                    min: panelInfo.custom_min,
                    max: panelInfo.custom_max,
                },
                rawValueRange: {
                    min: panelInfo.custom_drilldown_min,
                    max: panelInfo.custom_drilldown_max,
                },
                upperControlLimit: {
                    enabled: panelInfo.use_ucl,
                    value: panelInfo.ucl_value,
                },
                lowerControlLimit: {
                    enabled: panelInfo.use_lcl,
                    value: panelInfo.lcl_value,
                },
            },
            rightY: {
                enabled: panelInfo.use_right_y2,
                zeroBase: panelInfo.zero_base2,
                showTickline: panelInfo.show_y_tickline2,
                valueRange: {
                    min: panelInfo.custom_min2,
                    max: panelInfo.custom_max2,
                },
                rawValueRange: {
                    min: panelInfo.custom_drilldown_min2,
                    max: panelInfo.custom_drilldown_max2,
                },
                upperControlLimit: {
                    enabled: panelInfo.use_ucl2,
                    value: panelInfo.ucl2_value,
                },
                lowerControlLimit: {
                    enabled: panelInfo.use_lcl2,
                    value: panelInfo.lcl2_value,
                },
            },
        },
        display: {
            chartType: panelInfo.chart_type,
            showLegend: panelInfo.show_legend,
            showPoint: panelInfo.show_point,
            pointRadius: panelInfo.point_radius,
            fill: panelInfo.fill,
            stroke: panelInfo.stroke,
            connectNulls: panelInfo.connect_nulls,
            useZoom: panelInfo.use_zoom,
            pixelsPerTick: {
                raw: panelInfo.pixels_per_tick_raw,
                calculated: panelInfo.pixels_per_tick,
                calculatedNavigator: panelInfo.pixels_per_tick,
            },
            mainChartSampling: {
                enabled: false,
                sampleCount: panelInfo.sampling_value,
            },
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



