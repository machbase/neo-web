import {
    normalizeLegacySeriesConfigs,
    toLegacySeriesConfigs,
    normalizeLegacyTimeRangeBoundary,
    fromLegacyBoolean,
    toLegacyBoolean,
} from './legacy/LegacyUtils';
import { toLegacyTimeValue } from './TagAnalyzerTimeRangeConfig';
import type {
    PanelInfo,
    SeriesConfig,
    TimeRangeConfig,
    TimeRangePair,
    ValueRange,
} from '../common/modelTypes';
import type { TagAnalyzerBoardInfo, TagAnalyzerBoardSourceInfo } from '../TagAnalyzerTypes';
import type { TagAnalyzerLegacyFlatPanelInfo } from './legacy/LegacyTypes';

export type TagAnalyzerFlatPanelInfo = {
    index_key: string;
    chart_title: string;
    tag_set: SeriesConfig[];
    range_bgn: number;
    range_end: number;
    range_config: TimeRangeConfig;
    raw_keeper: boolean | undefined;
    time_keeper: Partial<TimeRangePair> | undefined;
    default_range: ValueRange | undefined;
    count: number | undefined;
    interval_type: string | undefined;
    show_legend: boolean;
    use_zoom: boolean;
    use_normalize: boolean;
    use_time_keeper: boolean;
    show_x_tickline: boolean;
    pixels_per_tick_raw: number;
    pixels_per_tick: number;
    use_sampling: boolean;
    sampling_value: number;
    zero_base: boolean;
    show_y_tickline: boolean;
    custom_min: number;
    custom_max: number;
    custom_drilldown_min: number;
    custom_drilldown_max: number;
    use_ucl: boolean;
    ucl_value: number;
    use_lcl: boolean;
    lcl_value: number;
    use_right_y2: boolean;
    zero_base2: boolean;
    show_y_tickline2: boolean;
    custom_min2: number;
    custom_max2: number;
    custom_drilldown_min2: number;
    custom_drilldown_max2: number;
    use_ucl2: boolean;
    ucl2_value: number;
    use_lcl2: boolean;
    lcl2_value: number;
    chart_type: string;
    show_point: boolean;
    point_radius: number;
    fill: number;
    stroke: number;
    [key: string]: unknown;
};

export function normalizeTagAnalyzerBoardInfo(
    aBoardInfo: TagAnalyzerBoardSourceInfo,
): TagAnalyzerBoardInfo {
    const sBoardTime = normalizeLegacyTimeRangeBoundary(
        aBoardInfo.range_bgn,
        aBoardInfo.range_end,
    );

    return {
        ...aBoardInfo,
        panels: aBoardInfo.panels.map((aPanel) => normalizeLegacyTagAnalyzerPanelInfo(aPanel)),
        range: sBoardTime.range,
        rangeConfig: sBoardTime.rangeConfig,
    };
}

export function normalizeLegacyTagAnalyzerFlatPanelInfo(
    aPanelInfo: TagAnalyzerLegacyFlatPanelInfo,
): TagAnalyzerFlatPanelInfo {
    const sTimeRange = normalizeLegacyTimeRangeBoundary(aPanelInfo.range_bgn, aPanelInfo.range_end);

    return {
        index_key: aPanelInfo.index_key,
        chart_title: aPanelInfo.chart_title,
        tag_set: normalizeLegacySeriesConfigs(aPanelInfo.tag_set || []),
        range_bgn: sTimeRange.range.min,
        range_end: sTimeRange.range.max,
        range_config: sTimeRange.rangeConfig,
        raw_keeper: aPanelInfo.raw_keeper,
        time_keeper: normalizeTimeRangePair(aPanelInfo.time_keeper),
        default_range: aPanelInfo.default_range,
        count: aPanelInfo.count,
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

export function normalizeLegacyTagAnalyzerPanelInfo(
    aPanelInfo: TagAnalyzerLegacyFlatPanelInfo,
): PanelInfo {
    return normalizeTagAnalyzerPanelInfo(normalizeLegacyTagAnalyzerFlatPanelInfo(aPanelInfo));
}

export function normalizeTagAnalyzerPanelInfo(
    aPanelInfo: TagAnalyzerFlatPanelInfo,
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

export function flattenTagAnalyzerPanelInfo(
    aPanelInfo: PanelInfo,
): TagAnalyzerFlatPanelInfo {
    const sRangeConfig = resolvePanelTimeRangeConfig(aPanelInfo);

    return {
        index_key: aPanelInfo.meta.index_key,
        chart_title: aPanelInfo.meta.chart_title,
        tag_set: aPanelInfo.data.tag_set,
        range_bgn: aPanelInfo.time.range_bgn,
        range_end: aPanelInfo.time.range_end,
        range_config: sRangeConfig,
        raw_keeper: aPanelInfo.data.raw_keeper,
        time_keeper: aPanelInfo.time.time_keeper,
        default_range: aPanelInfo.time.default_range,
        count: aPanelInfo.data.count,
        interval_type: aPanelInfo.data.interval_type,
        show_legend: aPanelInfo.display.show_legend,
        use_zoom: aPanelInfo.display.use_zoom,
        use_normalize: aPanelInfo.use_normalize,
        use_time_keeper: aPanelInfo.time.use_time_keeper,
        show_x_tickline: aPanelInfo.axes.show_x_tickline,
        pixels_per_tick_raw: aPanelInfo.axes.pixels_per_tick_raw,
        pixels_per_tick: aPanelInfo.axes.pixels_per_tick,
        use_sampling: aPanelInfo.axes.use_sampling,
        sampling_value: aPanelInfo.axes.sampling_value,
        zero_base: aPanelInfo.axes.zero_base,
        show_y_tickline: aPanelInfo.axes.show_y_tickline,
        custom_min: aPanelInfo.axes.primaryRange.min,
        custom_max: aPanelInfo.axes.primaryRange.max,
        custom_drilldown_min: aPanelInfo.axes.primaryDrilldownRange.min,
        custom_drilldown_max: aPanelInfo.axes.primaryDrilldownRange.max,
        use_ucl: aPanelInfo.axes.use_ucl,
        ucl_value: aPanelInfo.axes.ucl_value,
        use_lcl: aPanelInfo.axes.use_lcl,
        lcl_value: aPanelInfo.axes.lcl_value,
        use_right_y2: aPanelInfo.axes.use_right_y2,
        zero_base2: aPanelInfo.axes.zero_base2,
        show_y_tickline2: aPanelInfo.axes.show_y_tickline2,
        custom_min2: aPanelInfo.axes.secondaryRange.min,
        custom_max2: aPanelInfo.axes.secondaryRange.max,
        custom_drilldown_min2: aPanelInfo.axes.secondaryDrilldownRange.min,
        custom_drilldown_max2: aPanelInfo.axes.secondaryDrilldownRange.max,
        use_ucl2: aPanelInfo.axes.use_ucl2,
        ucl2_value: aPanelInfo.axes.ucl2_value,
        use_lcl2: aPanelInfo.axes.use_lcl2,
        lcl2_value: aPanelInfo.axes.lcl2_value,
        chart_type: aPanelInfo.display.chart_type,
        show_point: aPanelInfo.display.show_point,
        point_radius: aPanelInfo.display.point_radius,
        fill: aPanelInfo.display.fill,
        stroke: aPanelInfo.display.stroke,
    };
}

export function toLegacyTagAnalyzerFlatPanelInfo(
    aPanelInfo: TagAnalyzerFlatPanelInfo,
): TagAnalyzerLegacyFlatPanelInfo {
    return {
        index_key: aPanelInfo.index_key,
        chart_title: aPanelInfo.chart_title,
        tag_set: toLegacySeriesConfigs(aPanelInfo.tag_set),
        range_bgn: toLegacyTimeValue(aPanelInfo.range_config.start),
        range_end: toLegacyTimeValue(aPanelInfo.range_config.end),
        raw_keeper: aPanelInfo.raw_keeper,
        time_keeper: aPanelInfo.time_keeper,
        default_range: aPanelInfo.default_range,
        count: aPanelInfo.count,
        interval_type: aPanelInfo.interval_type,
        show_legend: toLegacyBoolean(aPanelInfo.show_legend),
        use_zoom: toLegacyBoolean(aPanelInfo.use_zoom),
        use_normalize: toLegacyBoolean(aPanelInfo.use_normalize),
        use_time_keeper: toLegacyBoolean(aPanelInfo.use_time_keeper),
        show_x_tickline: toLegacyBoolean(aPanelInfo.show_x_tickline),
        pixels_per_tick_raw: aPanelInfo.pixels_per_tick_raw,
        pixels_per_tick: aPanelInfo.pixels_per_tick,
        use_sampling: aPanelInfo.use_sampling,
        sampling_value: aPanelInfo.sampling_value,
        zero_base: toLegacyBoolean(aPanelInfo.zero_base),
        show_y_tickline: toLegacyBoolean(aPanelInfo.show_y_tickline),
        custom_min: aPanelInfo.custom_min,
        custom_max: aPanelInfo.custom_max,
        custom_drilldown_min: aPanelInfo.custom_drilldown_min,
        custom_drilldown_max: aPanelInfo.custom_drilldown_max,
        use_ucl: toLegacyBoolean(aPanelInfo.use_ucl),
        ucl_value: aPanelInfo.ucl_value,
        use_lcl: toLegacyBoolean(aPanelInfo.use_lcl),
        lcl_value: aPanelInfo.lcl_value,
        use_right_y2: toLegacyBoolean(aPanelInfo.use_right_y2),
        zero_base2: toLegacyBoolean(aPanelInfo.zero_base2),
        show_y_tickline2: toLegacyBoolean(aPanelInfo.show_y_tickline2),
        custom_min2: aPanelInfo.custom_min2,
        custom_max2: aPanelInfo.custom_max2,
        custom_drilldown_min2: aPanelInfo.custom_drilldown_min2,
        custom_drilldown_max2: aPanelInfo.custom_drilldown_max2,
        use_ucl2: toLegacyBoolean(aPanelInfo.use_ucl2),
        ucl2_value: aPanelInfo.ucl2_value,
        use_lcl2: toLegacyBoolean(aPanelInfo.use_lcl2),
        lcl2_value: aPanelInfo.lcl2_value,
        chart_type: aPanelInfo.chart_type,
        show_point: toLegacyBoolean(aPanelInfo.show_point),
        point_radius: aPanelInfo.point_radius,
        fill: aPanelInfo.fill,
        stroke: aPanelInfo.stroke,
    };
}

export function flattenLegacyTagAnalyzerPanelInfo(
    aPanelInfo: PanelInfo,
): TagAnalyzerLegacyFlatPanelInfo {
    return toLegacyTagAnalyzerFlatPanelInfo(flattenTagAnalyzerPanelInfo(aPanelInfo));
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

