import type {
    TagAnalyzerFlatPanelInfo,
    TagAnalyzerDefaultRange,
    TagAnalyzerPanelInfo,
} from './TagAnalyzerPanelModelTypes';
import { normalizeSourceTagNames } from '../TagAnalyzerSeriesNaming';

/**
 * Rehydrates either flat or nested panel payloads into the nested runtime model.
 * @param aPanelInfo The persisted or runtime panel payload.
 * @returns The normalized nested panel info object.
 */
export function normalizeTagAnalyzerPanelInfo(aPanelInfo: TagAnalyzerFlatPanelInfo | TagAnalyzerPanelInfo): TagAnalyzerPanelInfo {
    if (isNestedPanelInfo(aPanelInfo)) {
        return {
            ...aPanelInfo,
            data: {
                ...aPanelInfo.data,
                tag_set: normalizeSourceTagNames(aPanelInfo.data.tag_set || []),
            },
        };
    }

    return {
        meta: {
            index_key: aPanelInfo.index_key,
            chart_title: aPanelInfo.chart_title,
        },
        data: {
            tag_set: normalizeSourceTagNames(aPanelInfo.tag_set || []),
            raw_keeper: aPanelInfo.raw_keeper,
            count: aPanelInfo.count,
            interval_type: aPanelInfo.interval_type,
        },
        time: {
            range_bgn: aPanelInfo.range_bgn,
            range_end: aPanelInfo.range_end,
            use_time_keeper: aPanelInfo.use_time_keeper,
            time_keeper: aPanelInfo.time_keeper,
            default_range: aPanelInfo.default_range,
        },
        axes: {
            show_x_tickline: aPanelInfo.show_x_tickline,
            pixels_per_tick_raw: normalizeNumericValue(aPanelInfo.pixels_per_tick_raw),
            pixels_per_tick: normalizeNumericValue(aPanelInfo.pixels_per_tick),
            use_sampling: aPanelInfo.use_sampling,
            sampling_value: normalizeNumericValue(aPanelInfo.sampling_value),
            zero_base: aPanelInfo.zero_base,
            show_y_tickline: aPanelInfo.show_y_tickline,
            primaryRange: normalizeNumericRange(aPanelInfo.custom_min, aPanelInfo.custom_max),
            primaryDrilldownRange: normalizeNumericRange(aPanelInfo.custom_drilldown_min, aPanelInfo.custom_drilldown_max),
            use_ucl: aPanelInfo.use_ucl,
            ucl_value: normalizeNumericValue(aPanelInfo.ucl_value),
            use_lcl: aPanelInfo.use_lcl,
            lcl_value: normalizeNumericValue(aPanelInfo.lcl_value),
            use_right_y2: aPanelInfo.use_right_y2,
            zero_base2: aPanelInfo.zero_base2,
            show_y_tickline2: aPanelInfo.show_y_tickline2,
            secondaryRange: normalizeNumericRange(aPanelInfo.custom_min2, aPanelInfo.custom_max2),
            secondaryDrilldownRange: normalizeNumericRange(aPanelInfo.custom_drilldown_min2, aPanelInfo.custom_drilldown_max2),
            use_ucl2: aPanelInfo.use_ucl2,
            ucl2_value: normalizeNumericValue(aPanelInfo.ucl2_value),
            use_lcl2: aPanelInfo.use_lcl2,
            lcl2_value: normalizeNumericValue(aPanelInfo.lcl2_value),
        },
        display: {
            show_legend: aPanelInfo.show_legend,
            use_zoom: aPanelInfo.use_zoom,
            chart_type: aPanelInfo.chart_type,
            show_point: aPanelInfo.show_point,
            point_radius: normalizeNumericValue(aPanelInfo.point_radius),
            fill: normalizeNumericValue(aPanelInfo.fill),
            stroke: normalizeNumericValue(aPanelInfo.stroke),
        },
        use_normalize: aPanelInfo.use_normalize,
    };
}

/**
 * Flattens nested runtime panel info back into the persisted board shape.
 * @param aPanelInfo The nested or already-flat panel payload.
 * @returns The flat panel payload used by board persistence.
 */
export function flattenTagAnalyzerPanelInfo(aPanelInfo: TagAnalyzerFlatPanelInfo | TagAnalyzerPanelInfo): TagAnalyzerFlatPanelInfo {
    if (!isNestedPanelInfo(aPanelInfo)) {
        return aPanelInfo;
    }

    return {
        index_key: aPanelInfo.meta.index_key,
        chart_title: aPanelInfo.meta.chart_title,
        tag_set: aPanelInfo.data.tag_set,
        range_bgn: aPanelInfo.time.range_bgn,
        range_end: aPanelInfo.time.range_end,
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

/**
 * Detects whether a panel payload is already in nested runtime form.
 * @param aPanelInfo The panel payload to inspect.
 * @returns Whether the payload is already nested.
 */
function isNestedPanelInfo(aPanelInfo: TagAnalyzerFlatPanelInfo | TagAnalyzerPanelInfo): aPanelInfo is TagAnalyzerPanelInfo {
    return 'meta' in aPanelInfo && 'data' in aPanelInfo && 'time' in aPanelInfo && 'axes' in aPanelInfo && 'display' in aPanelInfo;
}

/**
 * Converts persisted numeric fields into concrete numbers.
 * @param aValue The numeric field to normalize.
 * @returns The normalized numeric value.
 */
function normalizeNumericValue(aValue: number | string | undefined): number {
    if (aValue === undefined || aValue === '') {
        return 0;
    }

    return typeof aValue === 'number' ? aValue : Number(aValue);
}

/**
 * Converts one flat min/max pair into the nested numeric range shape used at runtime.
 * @param aMin The minimum-like field from the flat persisted shape.
 * @param aMax The maximum-like field from the flat persisted shape.
 * @returns The normalized numeric range.
 */
function normalizeNumericRange(
    aMin: number | string | undefined,
    aMax: number | string | undefined,
): TagAnalyzerDefaultRange {
    return {
        min: normalizeNumericValue(aMin),
        max: normalizeNumericValue(aMax),
    };
}
