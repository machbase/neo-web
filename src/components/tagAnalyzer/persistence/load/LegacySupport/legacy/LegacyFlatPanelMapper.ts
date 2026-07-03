import {
    AUTO_VALUE_RANGE,
    DEFAULT_RAW_NAVIGATOR_SAMPLING,
    normalizePanelQueryCount,
    normalizePanelEChartType,
    type PanelInfo,
    type ValueRange,
} from '../../../../domain/panel/PanelConfig';
import {
    fromLegacyBoolean,
    normalizeLegacySeriesConfigs,
} from './LegacySeriesPersistenceAdapter';
import {
    shouldUseNumericPanelRangeInput,
} from '../../../../domain/SeriesDomain';
import type {
    PanelRangeInput,
    TimeRangeInput,
} from '../../../../domain/time/TimeTypes';
import { createTimeRangeInputFromStoredValues } from '../../normalizePersistedTimeRangeInput';
import { normalizePanelViewRange } from '../../../../domain/panelRange/PanelRangeResolver';
import { normalizeStoredTimeUnit } from '../../../../domain/time/TimeIntervalUtils';
import { formatNumericValue } from '../../../../domain/panelRange/PanelRangeInput';
import { formatAbsoluteTimeExpression } from '../../../../domain/time/TimeRangeInputResolver';
import { normalizePersistedPanelRangeInput } from '../../normalizePersistedPanelRangeInput';
import { normalizePersistedValueRange } from '../../normalizePersistedValueRange';
import type { LegacyFlatPanelInfo } from './LegacyFlatPanelTypes';
export function createPanelInfoFromLegacyFlatPanelInfo(
    panelInfo: LegacyFlatPanelInfo,
): PanelInfo {
    return createNormalizedLegacyPanelInfo(normalizeLegacyFlatPanelInfo(panelInfo));
}
function normalizeLegacyFlatPanelInfo(panelInfo: LegacyFlatPanelInfo) {
    const sTagSet = normalizeLegacySeriesConfigs(panelInfo.tag_set || []);
    const sTimeRange = createTimeRangeInputFromStoredValues(
        panelInfo.range_bgn ?? '',
        panelInfo.range_end ?? '',
    );
    const sRangeConfig = resolveLegacyRangeConfig(
        panelInfo,
        sTimeRange,
        shouldUseNumericPanelRangeInput(sTagSet),
    );

    return {
        index_key: panelInfo.index_key,
        chart_title: panelInfo.chart_title,
        tag_set: sTagSet,
        range_config: sRangeConfig,
        raw_keeper: panelInfo.raw_keeper ?? false,
        time_keeper: normalizePanelViewRange(panelInfo.time_keeper),
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
        time: {
            rangeInput: panelInfo.range_config,
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
                valueRange: normalizeLegacyValueRange(
                    panelInfo.custom_min,
                    panelInfo.custom_max,
                ),
                rawValueRange: normalizeLegacyValueRange(
                    panelInfo.custom_drilldown_min,
                    panelInfo.custom_drilldown_max,
                ),
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
                valueRange: normalizeLegacyValueRange(
                    panelInfo.custom_min2,
                    panelInfo.custom_max2,
                ),
                rawValueRange: normalizeLegacyValueRange(
                    panelInfo.custom_drilldown_min2,
                    panelInfo.custom_drilldown_max2,
                ),
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
            rawNavigatorSampling: { ...DEFAULT_RAW_NAVIGATOR_SAMPLING },
        },
        highlights: [],
        annotations: [],
    };
}

function normalizeLegacyValueRange(
    min: number,
    max: number,
): ValueRange {
    return normalizePersistedValueRange({ min, max }) ?? { ...AUTO_VALUE_RANGE };
}
function normalizeNumericValue(value: number | string | undefined): number {
    if (value === undefined || value === '') {
        return 0;
    }

    return typeof value === 'number' ? value : Number(value);
}

function resolveLegacyRangeConfig(
    panelInfo: LegacyFlatPanelInfo,
    storedRangeConfig: TimeRangeInput,
    isNumericAxis: boolean,
): PanelRangeInput {
    if (hasLegacyStoredRange(panelInfo)) {
        return normalizePersistedPanelRangeInput(
            storedRangeConfig,
            isNumericAxis,
        ) ?? { start: '', end: '' };
    }

    return createAbsoluteRangeConfigFromValueRange(
        panelInfo.default_range,
        isNumericAxis,
    ) ?? { start: '', end: '' };
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
): PanelRangeInput | undefined {
    if (
        !valueRange ||
        valueRange.min === undefined ||
        valueRange.max === undefined
    ) {
        return undefined;
    }

    return isNumericAxis
        ? {
              start: formatNumericValue(valueRange.min),
              end: formatNumericValue(valueRange.max),
          }
        : {
              start: formatAbsoluteTimeExpression(valueRange.min),
              end: formatAbsoluteTimeExpression(valueRange.max),
          };
}
