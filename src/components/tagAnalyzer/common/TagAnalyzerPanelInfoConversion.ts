import {
    normalizeLegacySeriesConfigs,
    toLegacySeriesConfigs,
    normalizeLegacyTimeRangeBoundary,
    fromLegacyBoolean,
    toLegacyBoolean,
} from '../utils/legacy/LegacyUtils';
import { toLegacyTimeValue } from '../utils/TagAnalyzerTimeRangeConfig';
import type {
    PanelInfo,
    TimeRangeConfig,
    TimeRangePair,
} from './modelTypes';
import type { BoardInfo, BoardSourceInfo } from '../TagAnalyzerTypes';
import type { LegacyFlatPanelInfo } from '../utils/legacy/LegacyTypes';

export function normalizeBoardInfo(
    aBoardInfo: BoardSourceInfo,
): BoardInfo {
    const sBoardTime = normalizeLegacyTimeRangeBoundary(
        aBoardInfo.range_bgn,
        aBoardInfo.range_end,
    );

    return {
        ...aBoardInfo,
        panels: aBoardInfo.panels.map((aPanel) => normalizeLegacyPanelInfo(aPanel)),
        range: sBoardTime.range,
        rangeConfig: sBoardTime.rangeConfig,
    };
}

export function normalizeLegacyPanelInfo(
    aPanelInfo: LegacyFlatPanelInfo,
): PanelInfo {
    return normalizePanelInfo(normalizeLegacyFlatPanelInfo(aPanelInfo));
}

export function toLegacyFlatPanelInfo(
    aPanelInfo: PanelInfo,
): LegacyFlatPanelInfo {
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
        show_x_tickline: toLegacyBoolean(aPanelInfo.axes.show_x_tickline),
        pixels_per_tick_raw: aPanelInfo.axes.pixels_per_tick_raw,
        pixels_per_tick: aPanelInfo.axes.pixels_per_tick,
        use_sampling: aPanelInfo.axes.use_sampling,
        sampling_value: aPanelInfo.axes.sampling_value,
        zero_base: toLegacyBoolean(aPanelInfo.axes.zero_base),
        show_y_tickline: toLegacyBoolean(aPanelInfo.axes.show_y_tickline),
        custom_min: aPanelInfo.axes.primaryRange.min,
        custom_max: aPanelInfo.axes.primaryRange.max,
        custom_drilldown_min: aPanelInfo.axes.primaryDrilldownRange.min,
        custom_drilldown_max: aPanelInfo.axes.primaryDrilldownRange.max,
        use_ucl: toLegacyBoolean(aPanelInfo.axes.use_ucl),
        ucl_value: aPanelInfo.axes.ucl_value,
        use_lcl: toLegacyBoolean(aPanelInfo.axes.use_lcl),
        lcl_value: aPanelInfo.axes.lcl_value,
        use_right_y2: toLegacyBoolean(aPanelInfo.axes.use_right_y2),
        zero_base2: toLegacyBoolean(aPanelInfo.axes.zero_base2),
        show_y_tickline2: toLegacyBoolean(aPanelInfo.axes.show_y_tickline2),
        custom_min2: aPanelInfo.axes.secondaryRange.min,
        custom_max2: aPanelInfo.axes.secondaryRange.max,
        custom_drilldown_min2: aPanelInfo.axes.secondaryDrilldownRange.min,
        custom_drilldown_max2: aPanelInfo.axes.secondaryDrilldownRange.max,
        use_ucl2: toLegacyBoolean(aPanelInfo.axes.use_ucl2),
        ucl2_value: aPanelInfo.axes.ucl2_value,
        use_lcl2: toLegacyBoolean(aPanelInfo.axes.use_lcl2),
        lcl2_value: aPanelInfo.axes.lcl2_value,
        chart_type: aPanelInfo.display.chart_type,
        show_point: toLegacyBoolean(aPanelInfo.display.show_point),
        point_radius: aPanelInfo.display.point_radius,
        fill: aPanelInfo.display.fill,
        stroke: aPanelInfo.display.stroke,
    };
}

function normalizeRawKeeper(aRawKeeper: boolean | undefined): boolean {
    return aRawKeeper ?? false;
}

function normalizePanelCount(aCount: number | undefined): number {
    return aCount ?? -1;
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
        raw_keeper: normalizeRawKeeper(aPanelInfo.raw_keeper),
        time_keeper: normalizeTimeRangePair(aPanelInfo.time_keeper),
        default_range: aPanelInfo.default_range,
        count: normalizePanelCount(aPanelInfo.count),
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
        chart_type: aPanelInfo.chart_type,
        show_point: fromLegacyBoolean(aPanelInfo.show_point),
        point_radius: normalizeNumericValue(aPanelInfo.point_radius),
        fill: normalizeNumericValue(aPanelInfo.fill),
        stroke: normalizeNumericValue(aPanelInfo.stroke),
    };
}

function normalizePanelInfo(
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
            show_x_tickline: aPanelInfo.show_x_tickline,
            pixels_per_tick_raw: aPanelInfo.pixels_per_tick_raw,
            pixels_per_tick: aPanelInfo.pixels_per_tick,
            use_sampling: aPanelInfo.use_sampling,
            sampling_value: aPanelInfo.sampling_value,
            zero_base: aPanelInfo.zero_base,
            show_y_tickline: aPanelInfo.show_y_tickline,
            primaryRange: {
                min: aPanelInfo.custom_min,
                max: aPanelInfo.custom_max,
            },
            primaryDrilldownRange: {
                min: aPanelInfo.custom_drilldown_min,
                max: aPanelInfo.custom_drilldown_max,
            },
            use_ucl: aPanelInfo.use_ucl,
            ucl_value: aPanelInfo.ucl_value,
            use_lcl: aPanelInfo.use_lcl,
            lcl_value: aPanelInfo.lcl_value,
            use_right_y2: aPanelInfo.use_right_y2,
            zero_base2: aPanelInfo.zero_base2,
            show_y_tickline2: aPanelInfo.show_y_tickline2,
            secondaryRange: {
                min: aPanelInfo.custom_min2,
                max: aPanelInfo.custom_max2,
            },
            secondaryDrilldownRange: {
                min: aPanelInfo.custom_drilldown_min2,
                max: aPanelInfo.custom_drilldown_max2,
            },
            use_ucl2: aPanelInfo.use_ucl2,
            ucl2_value: aPanelInfo.ucl2_value,
            use_lcl2: aPanelInfo.use_lcl2,
            lcl2_value: aPanelInfo.lcl2_value,
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
    };
}

function resolvePanelTimeRangeConfig(aPanelInfo: PanelInfo): TimeRangeConfig {
    return (
        aPanelInfo.time.range_config ??
        normalizeLegacyTimeRangeBoundary(aPanelInfo.time.range_bgn, aPanelInfo.time.range_end)
            .rangeConfig
    );
}

function normalizeNumericValue(aValue: number | string | undefined): number {
    if (aValue === undefined || aValue === '') {
        return 0;
    }

    return typeof aValue === 'number' ? aValue : Number(aValue);
}

function normalizeTimeRangePair(
    aTimeKeeper: Partial<TimeRangePair> | '' | undefined,
): Partial<TimeRangePair> | undefined {
    return aTimeKeeper === '' ? undefined : aTimeKeeper;
}
