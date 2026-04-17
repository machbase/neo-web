import {
    normalizeLegacySeriesConfigs,
    toLegacySeriesConfigs,
    normalizeLegacyTimeRangeBoundary,
    fromLegacyYn,
    toLegacyYn,
} from './legacy/LegacyUtils';
import { toLegacyTimeValue } from './TagAnalyzerTimeRangeConfig';
import type {
    ValueRange,
    PanelInfo,
    TimeRangePair,
} from '../common/modelTypes';
import type { TagAnalyzerBoardInfo, TagAnalyzerBoardSourceInfo } from '../TagAnalyzerTypes';
import type {
    LegacyCompatibleSeriesConfig,
    LegacyTimeValue,
    LegacyYn,
} from './legacy/LegacyTypes';

export type TagAnalyzerFlatPanelInfo = {
    index_key: string;
    chart_title: string;
    tag_set: LegacyCompatibleSeriesConfig[];
    range_bgn: LegacyTimeValue;
    range_end: LegacyTimeValue;
    raw_keeper: boolean | undefined;
    time_keeper: Partial<TimeRangePair> | undefined;
    default_range: ValueRange | undefined;
    count: number | undefined;
    interval_type: string | undefined;
    show_legend: LegacyYn;
    use_zoom: LegacyYn;
    use_normalize: LegacyYn | undefined;
    use_time_keeper: LegacyYn;
    show_x_tickline: LegacyYn;
    pixels_per_tick_raw: number | string;
    pixels_per_tick: number | string;
    use_sampling: boolean;
    sampling_value: number | string;
    zero_base: LegacyYn;
    show_y_tickline: LegacyYn;
    custom_min: number | string;
    custom_max: number | string;
    custom_drilldown_min: number | string;
    custom_drilldown_max: number | string;
    use_ucl: LegacyYn;
    ucl_value: number | string;
    use_lcl: LegacyYn;
    lcl_value: number | string;
    use_right_y2: LegacyYn;
    zero_base2: LegacyYn;
    show_y_tickline2: LegacyYn;
    custom_min2: number | string;
    custom_max2: number | string;
    custom_drilldown_min2: number | string;
    custom_drilldown_max2: number | string;
    use_ucl2: LegacyYn;
    ucl2_value: number | string;
    use_lcl2: LegacyYn;
    lcl2_value: number | string;
    chart_type: string;
    show_point: LegacyYn;
    point_radius: number | string;
    fill: number | string;
    stroke: number | string;
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
        panels: aBoardInfo.panels.map((aPanel) => normalizeTagAnalyzerPanelInfo(aPanel)),
        range: sBoardTime.range,
        rangeConfig: sBoardTime.rangeConfig,
    };
}

export function normalizeTagAnalyzerPanelInfo(
    aPanelInfo: TagAnalyzerFlatPanelInfo,
): PanelInfo {
    const sTimeRange = normalizeLegacyTimeRangeBoundary(aPanelInfo.range_bgn, aPanelInfo.range_end);

    return {
        meta: {
            index_key: aPanelInfo.index_key,
            chart_title: aPanelInfo.chart_title,
        },
        data: {
            tag_set: normalizeLegacySeriesConfigs(aPanelInfo.tag_set || []),
            raw_keeper: aPanelInfo.raw_keeper,
            count: aPanelInfo.count,
            interval_type: aPanelInfo.interval_type,
        },
        time: {
            range_bgn: sTimeRange.range.min,
            range_end: sTimeRange.range.max,
            range_config: sTimeRange.rangeConfig,
            use_time_keeper: fromLegacyYn(aPanelInfo.use_time_keeper),
            time_keeper: aPanelInfo.time_keeper,
            default_range: aPanelInfo.default_range,
        },
        axes: {
            show_x_tickline: fromLegacyYn(aPanelInfo.show_x_tickline),
            pixels_per_tick_raw: normalizeNumericValue(aPanelInfo.pixels_per_tick_raw),
            pixels_per_tick: normalizeNumericValue(aPanelInfo.pixels_per_tick),
            use_sampling: aPanelInfo.use_sampling,
            sampling_value: normalizeNumericValue(aPanelInfo.sampling_value),
            zero_base: fromLegacyYn(aPanelInfo.zero_base),
            show_y_tickline: fromLegacyYn(aPanelInfo.show_y_tickline),
            primaryRange: normalizeNumericRange(aPanelInfo.custom_min, aPanelInfo.custom_max),
            primaryDrilldownRange: normalizeNumericRange(
                aPanelInfo.custom_drilldown_min,
                aPanelInfo.custom_drilldown_max,
            ),
            use_ucl: fromLegacyYn(aPanelInfo.use_ucl),
            ucl_value: normalizeNumericValue(aPanelInfo.ucl_value),
            use_lcl: fromLegacyYn(aPanelInfo.use_lcl),
            lcl_value: normalizeNumericValue(aPanelInfo.lcl_value),
            use_right_y2: fromLegacyYn(aPanelInfo.use_right_y2),
            zero_base2: fromLegacyYn(aPanelInfo.zero_base2),
            show_y_tickline2: fromLegacyYn(aPanelInfo.show_y_tickline2),
            secondaryRange: normalizeNumericRange(aPanelInfo.custom_min2, aPanelInfo.custom_max2),
            secondaryDrilldownRange: normalizeNumericRange(
                aPanelInfo.custom_drilldown_min2,
                aPanelInfo.custom_drilldown_max2,
            ),
            use_ucl2: fromLegacyYn(aPanelInfo.use_ucl2),
            ucl2_value: normalizeNumericValue(aPanelInfo.ucl2_value),
            use_lcl2: fromLegacyYn(aPanelInfo.use_lcl2),
            lcl2_value: normalizeNumericValue(aPanelInfo.lcl2_value),
        },
        display: {
            show_legend: fromLegacyYn(aPanelInfo.show_legend),
            use_zoom: fromLegacyYn(aPanelInfo.use_zoom),
            chart_type: aPanelInfo.chart_type,
            show_point: fromLegacyYn(aPanelInfo.show_point),
            point_radius: normalizeNumericValue(aPanelInfo.point_radius),
            fill: normalizeNumericValue(aPanelInfo.fill),
            stroke: normalizeNumericValue(aPanelInfo.stroke),
        },
        use_normalize: fromLegacyYn(aPanelInfo.use_normalize),
    };
}

export function flattenTagAnalyzerPanelInfo(
    aPanelInfo: PanelInfo,
): TagAnalyzerFlatPanelInfo {
    const sRangeConfig =
        aPanelInfo.time.range_config ??
        normalizeLegacyTimeRangeBoundary(aPanelInfo.time.range_bgn, aPanelInfo.time.range_end)
            .rangeConfig;

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
        show_legend: toLegacyYn(aPanelInfo.display.show_legend),
        use_zoom: toLegacyYn(aPanelInfo.display.use_zoom),
        use_normalize: toLegacyYn(aPanelInfo.use_normalize),
        use_time_keeper: toLegacyYn(aPanelInfo.time.use_time_keeper),
        show_x_tickline: toLegacyYn(aPanelInfo.axes.show_x_tickline),
        pixels_per_tick_raw: aPanelInfo.axes.pixels_per_tick_raw,
        pixels_per_tick: aPanelInfo.axes.pixels_per_tick,
        use_sampling: aPanelInfo.axes.use_sampling,
        sampling_value: aPanelInfo.axes.sampling_value,
        zero_base: toLegacyYn(aPanelInfo.axes.zero_base),
        show_y_tickline: toLegacyYn(aPanelInfo.axes.show_y_tickline),
        custom_min: aPanelInfo.axes.primaryRange.min,
        custom_max: aPanelInfo.axes.primaryRange.max,
        custom_drilldown_min: aPanelInfo.axes.primaryDrilldownRange.min,
        custom_drilldown_max: aPanelInfo.axes.primaryDrilldownRange.max,
        use_ucl: toLegacyYn(aPanelInfo.axes.use_ucl),
        ucl_value: aPanelInfo.axes.ucl_value,
        use_lcl: toLegacyYn(aPanelInfo.axes.use_lcl),
        lcl_value: aPanelInfo.axes.lcl_value,
        use_right_y2: toLegacyYn(aPanelInfo.axes.use_right_y2),
        zero_base2: toLegacyYn(aPanelInfo.axes.zero_base2),
        show_y_tickline2: toLegacyYn(aPanelInfo.axes.show_y_tickline2),
        custom_min2: aPanelInfo.axes.secondaryRange.min,
        custom_max2: aPanelInfo.axes.secondaryRange.max,
        custom_drilldown_min2: aPanelInfo.axes.secondaryDrilldownRange.min,
        custom_drilldown_max2: aPanelInfo.axes.secondaryDrilldownRange.max,
        use_ucl2: toLegacyYn(aPanelInfo.axes.use_ucl2),
        ucl2_value: aPanelInfo.axes.ucl2_value,
        use_lcl2: toLegacyYn(aPanelInfo.axes.use_lcl2),
        lcl2_value: aPanelInfo.axes.lcl2_value,
        chart_type: aPanelInfo.display.chart_type,
        show_point: toLegacyYn(aPanelInfo.display.show_point),
        point_radius: aPanelInfo.display.point_radius,
        fill: aPanelInfo.display.fill,
        stroke: aPanelInfo.display.stroke,
    };
}

function normalizeNumericValue(aValue: number | string | undefined): number {
    if (aValue === undefined || aValue === '') {
        return 0;
    }

    return typeof aValue === 'number' ? aValue : Number(aValue);
}

function normalizeNumericRange(
    aMin: number | string | undefined,
    aMax: number | string | undefined,
): ValueRange {
    return {
        min: normalizeNumericValue(aMin),
        max: normalizeNumericValue(aMax),
    };
}

