import type { PanelHighlight, PanelInfo } from '../panelModelTypes';
import type { SeriesAnnotation, SeriesColumns, SeriesConfig } from '../series/seriesTypes';
import type { TimeRangeConfig, TimeRangePair, ValueRange } from '../time/timeTypes';

export type PersistedSeriesColumnsV201 = {
    nameColumn: string | undefined;
    timeColumn: string | undefined;
    valueColumn: string | undefined;
    [key: string]: unknown;
};

export type PersistedSeriesInfoV200 = {
    key: string;
    table: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color: string;
    use_y2: boolean;
    id: string | undefined;
    onRollup?: boolean | undefined;
    colName: SeriesColumns | undefined;
    annotations?: SeriesAnnotation[] | undefined;
    [key: string]: unknown;
};

export type PersistedSeriesInfoV201 = {
    seriesKey: string;
    tableName: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color: string;
    useSecondaryAxis: boolean;
    id: string | undefined;
    useRollupTable: boolean;
    columnNames: PersistedSeriesColumnsV201 | undefined;
    annotations?: SeriesAnnotation[] | undefined;
};

export type PersistedPanelMetaV200 = {
    index_key: string;
    chart_title: string;
};

export type PersistedPanelDataV200 = {
    tag_set: PersistedSeriesInfoV200[];
    raw_keeper: boolean;
    count: number;
    interval_type: string | undefined;
};

export type PersistedPanelTimeV200 = {
    range_bgn: number;
    range_end: number;
    range_config: TimeRangeConfig;
    use_time_keeper: boolean;
    time_keeper: Partial<TimeRangePair> | undefined;
    default_range: ValueRange | undefined;
};

export type PersistedPanelAxesV200 = {
    show_x_tickline: boolean;
    pixels_per_tick_raw: number;
    pixels_per_tick: number;
    use_sampling: boolean;
    sampling_value: number;
    zero_base: boolean;
    show_y_tickline: boolean;
    primaryRange: ValueRange;
    primaryDrilldownRange: ValueRange;
    use_ucl: boolean;
    ucl_value: number;
    use_lcl: boolean;
    lcl_value: number;
    use_right_y2: boolean;
    zero_base2: boolean;
    show_y_tickline2: boolean;
    secondaryRange: ValueRange;
    secondaryDrilldownRange: ValueRange;
    use_ucl2: boolean;
    ucl2_value: number;
    use_lcl2: boolean;
    lcl2_value: number;
};

export type PersistedPanelInfoV200 = {
    meta: PersistedPanelMetaV200;
    data: PersistedPanelDataV200;
    time: PersistedPanelTimeV200;
    axes: PersistedPanelAxesV200;
    display: PanelInfo['display'];
    use_normalize: boolean;
    highlights?: PanelHighlight[] | undefined;
};

export type PersistedPanelMetaV201 = {
    panelKey: string;
    chartTitle: string;
};

export type PersistedPanelDataV201 = {
    seriesList: PersistedSeriesInfoV201[];
    useRawData: boolean;
    rowLimit: number;
    intervalType: string | undefined;
};

export type PersistedPanelTimeV201 = {
    rangeStart: number;
    rangeEnd: number;
    rangeConfig: TimeRangeConfig;
    useSavedTimeRange: boolean;
    savedTimeRange: Partial<TimeRangePair> | undefined;
    defaultValueRange: ValueRange | undefined;
};

export type PersistedPanelAxesV201 = {
    showXAxisTickLine: boolean;
    rawDataPixelsPerTick: number;
    rollupDataPixelsPerTick: number;
    useSampling: boolean;
    samplingValue: number;
    usePrimaryZeroBase: boolean;
    showPrimaryYAxisTickLine: boolean;
    primaryValueRange: ValueRange;
    primaryDrilldownValueRange: ValueRange;
    usePrimaryUpperControlLimit: boolean;
    primaryUpperControlLimit: number;
    usePrimaryLowerControlLimit: boolean;
    primaryLowerControlLimit: number;
    useSecondaryAxisOnRight: boolean;
    useSecondaryZeroBase: boolean;
    showSecondaryYAxisTickLine: boolean;
    secondaryValueRange: ValueRange;
    secondaryDrilldownValueRange: ValueRange;
    useSecondaryUpperControlLimit: boolean;
    secondaryUpperControlLimit: number;
    useSecondaryLowerControlLimit: boolean;
    secondaryLowerControlLimit: number;
};

export type PersistedPanelDisplayV201 = {
    showLegend: boolean;
    useZoom: boolean;
    chartType: string;
    showPoints: boolean;
    pointRadius: number;
    fill: number;
    stroke: number;
};

export type PersistedPanelInfoV201 = {
    meta: PersistedPanelMetaV201;
    data: PersistedPanelDataV201;
    time: PersistedPanelTimeV201;
    axes: PersistedPanelAxesV201;
    display: PersistedPanelDisplayV201;
    useNormalizedValues: boolean;
    highlights?: PanelHighlight[] | undefined;
};

export type PersistedPanelXAxisV202 = {
    showTickLine: boolean;
    rawDataPixelsPerTick: number;
    calculatedDataPixelsPerTick: number;
};

export type PersistedPanelSamplingV202 = {
    enabled: boolean;
    sampleCount: number;
};

export type PersistedPanelAxisThresholdV202 = {
    enabled: boolean;
    value: number;
};

export type PersistedPanelYAxisV202 = {
    zeroBase: boolean;
    showTickLine: boolean;
    valueRange: ValueRange;
    rawDataValueRange: ValueRange;
    upperControlLimit: PersistedPanelAxisThresholdV202;
    lowerControlLimit: PersistedPanelAxisThresholdV202;
};

export type PersistedPanelRightYAxisV202 = PersistedPanelYAxisV202 & {
    enabled: boolean;
};

export type PersistedPanelAxesV202 = {
    xAxis: PersistedPanelXAxisV202;
    sampling: PersistedPanelSamplingV202;
    primaryYAxis: PersistedPanelYAxisV202;
    secondaryYAxis: PersistedPanelRightYAxisV202;
};

export type PersistedPanelInfoV202 = {
    meta: PersistedPanelMetaV201;
    data: PersistedPanelDataV201;
    time: PersistedPanelTimeV201;
    axes: PersistedPanelAxesV202;
    display: PersistedPanelDisplayV201;
    useNormalizedValues: boolean;
    highlights?: PanelHighlight[] | undefined;
};

export type PersistedPanelLeftYAxisV203 = PersistedPanelYAxisV202;

export type PersistedPanelRightYAxisV203 = PersistedPanelYAxisV202 & {
    enabled: boolean;
};

export type PersistedPanelAxesV203 = {
    xAxis: PersistedPanelXAxisV202;
    sampling: PersistedPanelSamplingV202;
    leftYAxis: PersistedPanelLeftYAxisV203;
    rightYAxis: PersistedPanelRightYAxisV203;
};

export type PersistedPanelInfoV203 = {
    meta: PersistedPanelMetaV201;
    data: PersistedPanelDataV201;
    time: PersistedPanelTimeV201;
    axes: PersistedPanelAxesV203;
    display: PersistedPanelDisplayV201;
    useNormalizedValues: boolean;
    highlights?: PanelHighlight[] | undefined;
};

/**
 * Checks whether a persisted panel uses the nested `2.0.0` panel shape.
 * Intent: Let the dedicated `.taz` parser choose the correct conversion path by the received panel structure.
 * @param {unknown} aPanelInfo The unknown persisted panel value.
 * @returns {boolean} True when the value matches the `2.0.0` panel structure.
 */
export function isPersistedPanelInfoV200(
    aPanelInfo: unknown,
): aPanelInfo is PersistedPanelInfoV200 {
    if (!aPanelInfo || typeof aPanelInfo !== 'object') {
        return false;
    }

    const sPanelInfo = aPanelInfo as Partial<PersistedPanelInfoV200>;

    return (
        !!sPanelInfo.meta &&
        typeof sPanelInfo.meta === 'object' &&
        'index_key' in sPanelInfo.meta &&
        !!sPanelInfo.data &&
        typeof sPanelInfo.data === 'object' &&
        Array.isArray(sPanelInfo.data.tag_set)
    );
}

/**
 * Checks whether a persisted panel uses the explicit `2.0.1` panel shape.
 * Intent: Let the dedicated `.taz` parser choose the correct conversion path by the received panel structure.
 * @param {unknown} aPanelInfo The unknown persisted panel value.
 * @returns {boolean} True when the value matches the `2.0.1` panel structure.
 */
export function isPersistedPanelInfoV201(
    aPanelInfo: unknown,
): aPanelInfo is PersistedPanelInfoV201 {
    if (!aPanelInfo || typeof aPanelInfo !== 'object') {
        return false;
    }

    const sPanelInfo = aPanelInfo as Partial<PersistedPanelInfoV201>;

    return (
        !!sPanelInfo.meta &&
        typeof sPanelInfo.meta === 'object' &&
        'panelKey' in sPanelInfo.meta &&
        !!sPanelInfo.data &&
        typeof sPanelInfo.data === 'object' &&
        Array.isArray(sPanelInfo.data.seriesList)
    );
}

/**
 * Checks whether a persisted panel uses the explicit `2.0.2` panel shape.
 * Intent: Let the dedicated `.taz` parser choose the correct conversion path by the received panel structure.
 * @param {unknown} aPanelInfo The unknown persisted panel value.
 * @returns {boolean} True when the value matches the `2.0.2` panel structure.
 */
export function isPersistedPanelInfoV202(
    aPanelInfo: unknown,
): aPanelInfo is PersistedPanelInfoV202 {
    if (!aPanelInfo || typeof aPanelInfo !== 'object') {
        return false;
    }

    const sPanelInfo = aPanelInfo as Partial<PersistedPanelInfoV202>;

    return (
        !!sPanelInfo.meta &&
        typeof sPanelInfo.meta === 'object' &&
        'panelKey' in sPanelInfo.meta &&
        !!sPanelInfo.data &&
        typeof sPanelInfo.data === 'object' &&
        Array.isArray(sPanelInfo.data.seriesList) &&
        !!sPanelInfo.axes &&
        typeof sPanelInfo.axes === 'object' &&
        'primaryYAxis' in sPanelInfo.axes
    );
}

/**
 * Checks whether a persisted panel uses the explicit `2.0.3` panel shape.
 * Intent: Let the dedicated `.taz` parser choose the correct conversion path by the received panel structure.
 * @param {unknown} aPanelInfo The unknown persisted panel value.
 * @returns {boolean} True when the value matches the `2.0.3` panel structure.
 */
export function isPersistedPanelInfoV203(
    aPanelInfo: unknown,
): aPanelInfo is PersistedPanelInfoV203 {
    if (!aPanelInfo || typeof aPanelInfo !== 'object') {
        return false;
    }

    const sPanelInfo = aPanelInfo as Partial<PersistedPanelInfoV203>;

    return (
        !!sPanelInfo.meta &&
        typeof sPanelInfo.meta === 'object' &&
        'panelKey' in sPanelInfo.meta &&
        !!sPanelInfo.data &&
        typeof sPanelInfo.data === 'object' &&
        Array.isArray(sPanelInfo.data.seriesList) &&
        !!sPanelInfo.axes &&
        typeof sPanelInfo.axes === 'object' &&
        'leftYAxis' in sPanelInfo.axes
    );
}

/**
 * Clones one series config into the explicit persisted series shape.
 * Intent: Save `.taz` files with descriptive series field names while keeping runtime state detached.
 * @param {SeriesConfig} aSeriesInfo The runtime series config.
 * @returns {PersistedSeriesInfoV201} The explicit persisted series config.
 */
export function createPersistedSeriesInfo(
    aSeriesInfo: SeriesConfig,
): PersistedSeriesInfoV201 {
    return {
        seriesKey: aSeriesInfo.key,
        tableName: aSeriesInfo.table,
        sourceTagName: aSeriesInfo.sourceTagName,
        alias: aSeriesInfo.alias,
        calculationMode: aSeriesInfo.calculationMode,
        color: aSeriesInfo.color,
        useSecondaryAxis: aSeriesInfo.use_y2,
        id: aSeriesInfo.id,
        useRollupTable: aSeriesInfo.onRollup,
        columnNames: createPersistedSeriesColumnsV201(aSeriesInfo.colName),
        annotations: (aSeriesInfo.annotations ?? []).map(cloneSeriesAnnotation),
    };
}

/**
 * Clones one runtime panel into the explicit `2.0.3` persisted panel shape.
 * Intent: Save `.taz` panels with clearer field names while keeping runtime state detached.
 * @param {PanelInfo} aPanelInfo The runtime panel model.
 * @returns {PersistedPanelInfoV203} The explicit persisted panel model.
 */
export function createPersistedPanelInfo(
    aPanelInfo: PanelInfo,
): PersistedPanelInfoV203 {
    return {
        meta: {
            panelKey: aPanelInfo.meta.index_key,
            chartTitle: aPanelInfo.meta.chart_title,
        },
        data: {
            seriesList: (aPanelInfo.data.tag_set ?? []).map(createPersistedSeriesInfo),
            useRawData: aPanelInfo.data.raw_keeper,
            rowLimit: aPanelInfo.data.count,
            intervalType: aPanelInfo.data.interval_type,
        },
        time: {
            rangeStart: aPanelInfo.time.range_bgn,
            rangeEnd: aPanelInfo.time.range_end,
            rangeConfig: aPanelInfo.time.range_config
                ? { ...aPanelInfo.time.range_config }
                : aPanelInfo.time.range_config,
            useSavedTimeRange: aPanelInfo.time.use_time_keeper,
            savedTimeRange: cloneTimeRangePair(aPanelInfo.time.time_keeper),
            defaultValueRange: cloneValueRange(aPanelInfo.time.default_range),
        },
        axes: {
            xAxis: {
                showTickLine: aPanelInfo.axes.x_axis.show_tickline,
                rawDataPixelsPerTick: aPanelInfo.axes.x_axis.raw_data_pixels_per_tick,
                calculatedDataPixelsPerTick:
                    aPanelInfo.axes.x_axis.calculated_data_pixels_per_tick,
            },
            sampling: {
                enabled: aPanelInfo.axes.sampling.enabled,
                sampleCount: aPanelInfo.axes.sampling.sample_count,
            },
            leftYAxis: {
                zeroBase: aPanelInfo.axes.left_y_axis.zero_base,
                showTickLine: aPanelInfo.axes.left_y_axis.show_tickline,
                valueRange: { ...aPanelInfo.axes.left_y_axis.value_range },
                rawDataValueRange: {
                    ...aPanelInfo.axes.left_y_axis.raw_data_value_range,
                },
                upperControlLimit: {
                    enabled: aPanelInfo.axes.left_y_axis.upper_control_limit.enabled,
                    value: aPanelInfo.axes.left_y_axis.upper_control_limit.value,
                },
                lowerControlLimit: {
                    enabled: aPanelInfo.axes.left_y_axis.lower_control_limit.enabled,
                    value: aPanelInfo.axes.left_y_axis.lower_control_limit.value,
                },
            },
            rightYAxis: {
                enabled: aPanelInfo.axes.right_y_axis.enabled,
                zeroBase: aPanelInfo.axes.right_y_axis.zero_base,
                showTickLine: aPanelInfo.axes.right_y_axis.show_tickline,
                valueRange: { ...aPanelInfo.axes.right_y_axis.value_range },
                rawDataValueRange: {
                    ...aPanelInfo.axes.right_y_axis.raw_data_value_range,
                },
                upperControlLimit: {
                    enabled: aPanelInfo.axes.right_y_axis.upper_control_limit.enabled,
                    value: aPanelInfo.axes.right_y_axis.upper_control_limit.value,
                },
                lowerControlLimit: {
                    enabled: aPanelInfo.axes.right_y_axis.lower_control_limit.enabled,
                    value: aPanelInfo.axes.right_y_axis.lower_control_limit.value,
                },
            },
        },
        display: {
            showLegend: aPanelInfo.display.show_legend,
            useZoom: aPanelInfo.display.use_zoom,
            chartType: aPanelInfo.display.chart_type,
            showPoints: aPanelInfo.display.show_point,
            pointRadius: aPanelInfo.display.point_radius,
            fill: aPanelInfo.display.fill,
            stroke: aPanelInfo.display.stroke,
        },
        useNormalizedValues: aPanelInfo.use_normalize,
        highlights: (aPanelInfo.highlights ?? []).map(clonePanelHighlight),
    };
}

/**
 * Converts a persisted `2.0.0` panel into the runtime `PanelInfo` shape.
 * Intent: Keep old nested `.taz` files loadable after the `2.0.1` persistence rename.
 * @param {PersistedPanelInfoV200} aPanelInfo The `2.0.0` persisted panel.
 * @returns {PanelInfo} The runtime panel model.
 */
export function createPanelInfoFromPersistedV200(
    aPanelInfo: PersistedPanelInfoV200,
): PanelInfo {
    return {
        meta: {
            index_key: aPanelInfo.meta.index_key,
            chart_title: aPanelInfo.meta.chart_title,
        },
        data: {
            tag_set: (aPanelInfo.data.tag_set ?? []).map(createSeriesInfoFromPersistedV200),
            raw_keeper: aPanelInfo.data.raw_keeper ?? false,
            count: aPanelInfo.data.count ?? -1,
            interval_type: aPanelInfo.data.interval_type,
        },
        time: {
            range_bgn: aPanelInfo.time.range_bgn ?? 0,
            range_end: aPanelInfo.time.range_end ?? 0,
            range_config: aPanelInfo.time.range_config,
            use_time_keeper: aPanelInfo.time.use_time_keeper ?? false,
            time_keeper: cloneTimeRangePair(aPanelInfo.time.time_keeper),
            default_range: cloneValueRange(aPanelInfo.time.default_range),
        },
        axes: {
            x_axis: {
                show_tickline: aPanelInfo.axes.show_x_tickline ?? false,
                raw_data_pixels_per_tick: aPanelInfo.axes.pixels_per_tick_raw ?? 0,
                calculated_data_pixels_per_tick: aPanelInfo.axes.pixels_per_tick ?? 0,
            },
            sampling: {
                enabled: aPanelInfo.axes.use_sampling ?? false,
                sample_count: aPanelInfo.axes.sampling_value ?? 0,
            },
            left_y_axis: {
                zero_base: aPanelInfo.axes.zero_base ?? false,
                show_tickline: aPanelInfo.axes.show_y_tickline ?? false,
                value_range: cloneValueRangeOrDefault(aPanelInfo.axes.primaryRange),
                raw_data_value_range: cloneValueRangeOrDefault(
                    aPanelInfo.axes.primaryDrilldownRange,
                ),
                upper_control_limit: {
                    enabled: aPanelInfo.axes.use_ucl ?? false,
                    value: aPanelInfo.axes.ucl_value ?? 0,
                },
                lower_control_limit: {
                    enabled: aPanelInfo.axes.use_lcl ?? false,
                    value: aPanelInfo.axes.lcl_value ?? 0,
                },
            },
            right_y_axis: {
                enabled: aPanelInfo.axes.use_right_y2 ?? false,
                zero_base: aPanelInfo.axes.zero_base2 ?? false,
                show_tickline: aPanelInfo.axes.show_y_tickline2 ?? false,
                value_range: cloneValueRangeOrDefault(aPanelInfo.axes.secondaryRange),
                raw_data_value_range: cloneValueRangeOrDefault(
                    aPanelInfo.axes.secondaryDrilldownRange,
                ),
                upper_control_limit: {
                    enabled: aPanelInfo.axes.use_ucl2 ?? false,
                    value: aPanelInfo.axes.ucl2_value ?? 0,
                },
                lower_control_limit: {
                    enabled: aPanelInfo.axes.use_lcl2 ?? false,
                    value: aPanelInfo.axes.lcl2_value ?? 0,
                },
            },
        },
        display: { ...aPanelInfo.display },
        use_normalize: aPanelInfo.use_normalize ?? false,
        highlights: (aPanelInfo.highlights ?? []).map(clonePanelHighlight),
    };
}

/**
 * Converts a persisted `2.0.1` panel into the runtime `PanelInfo` shape.
 * Intent: Keep the runtime model stable while `.taz` storage uses clearer field names.
 * @param {PersistedPanelInfoV201} aPanelInfo The `2.0.1` persisted panel.
 * @returns {PanelInfo} The runtime panel model.
 */
export function createPanelInfoFromPersistedV201(
    aPanelInfo: PersistedPanelInfoV201,
): PanelInfo {
    return {
        meta: {
            index_key: aPanelInfo.meta.panelKey,
            chart_title: aPanelInfo.meta.chartTitle,
        },
        data: {
            tag_set: (aPanelInfo.data.seriesList ?? []).map(createSeriesInfoFromPersistedV201),
            raw_keeper: aPanelInfo.data.useRawData ?? false,
            count: aPanelInfo.data.rowLimit ?? -1,
            interval_type: aPanelInfo.data.intervalType,
        },
        time: {
            range_bgn: aPanelInfo.time.rangeStart ?? 0,
            range_end: aPanelInfo.time.rangeEnd ?? 0,
            range_config: aPanelInfo.time.rangeConfig,
            use_time_keeper: aPanelInfo.time.useSavedTimeRange ?? false,
            time_keeper: cloneTimeRangePair(aPanelInfo.time.savedTimeRange),
            default_range: cloneValueRange(aPanelInfo.time.defaultValueRange),
        },
        axes: {
            x_axis: {
                show_tickline: aPanelInfo.axes.showXAxisTickLine ?? false,
                raw_data_pixels_per_tick: aPanelInfo.axes.rawDataPixelsPerTick ?? 0,
                calculated_data_pixels_per_tick:
                    aPanelInfo.axes.rollupDataPixelsPerTick ?? 0,
            },
            sampling: {
                enabled: aPanelInfo.axes.useSampling ?? false,
                sample_count: aPanelInfo.axes.samplingValue ?? 0,
            },
            left_y_axis: {
                zero_base: aPanelInfo.axes.usePrimaryZeroBase ?? false,
                show_tickline: aPanelInfo.axes.showPrimaryYAxisTickLine ?? false,
                value_range: cloneValueRangeOrDefault(aPanelInfo.axes.primaryValueRange),
                raw_data_value_range: cloneValueRangeOrDefault(
                    aPanelInfo.axes.primaryDrilldownValueRange,
                ),
                upper_control_limit: {
                    enabled: aPanelInfo.axes.usePrimaryUpperControlLimit ?? false,
                    value: aPanelInfo.axes.primaryUpperControlLimit ?? 0,
                },
                lower_control_limit: {
                    enabled: aPanelInfo.axes.usePrimaryLowerControlLimit ?? false,
                    value: aPanelInfo.axes.primaryLowerControlLimit ?? 0,
                },
            },
            right_y_axis: {
                enabled: aPanelInfo.axes.useSecondaryAxisOnRight ?? false,
                zero_base: aPanelInfo.axes.useSecondaryZeroBase ?? false,
                show_tickline: aPanelInfo.axes.showSecondaryYAxisTickLine ?? false,
                value_range: cloneValueRangeOrDefault(aPanelInfo.axes.secondaryValueRange),
                raw_data_value_range: cloneValueRangeOrDefault(
                    aPanelInfo.axes.secondaryDrilldownValueRange,
                ),
                upper_control_limit: {
                    enabled: aPanelInfo.axes.useSecondaryUpperControlLimit ?? false,
                    value: aPanelInfo.axes.secondaryUpperControlLimit ?? 0,
                },
                lower_control_limit: {
                    enabled: aPanelInfo.axes.useSecondaryLowerControlLimit ?? false,
                    value: aPanelInfo.axes.secondaryLowerControlLimit ?? 0,
                },
            },
        },
        display: {
            show_legend: aPanelInfo.display.showLegend ?? false,
            use_zoom: aPanelInfo.display.useZoom ?? false,
            chart_type: aPanelInfo.display.chartType ?? 'Line',
            show_point: aPanelInfo.display.showPoints ?? false,
            point_radius: aPanelInfo.display.pointRadius ?? 0,
            fill: aPanelInfo.display.fill ?? 0,
            stroke: aPanelInfo.display.stroke ?? 0,
        },
        use_normalize: aPanelInfo.useNormalizedValues ?? false,
        highlights: (aPanelInfo.highlights ?? []).map(clonePanelHighlight),
    };
}

/**
 * Converts a persisted `2.0.2` panel into the runtime `PanelInfo` shape.
 * Intent: Keep the runtime model stable while `.taz` storage uses grouped axis sections.
 * @param {PersistedPanelInfoV202} aPanelInfo The `2.0.2` persisted panel.
 * @returns {PanelInfo} The runtime panel model.
 */
export function createPanelInfoFromPersistedV202(
    aPanelInfo: PersistedPanelInfoV202,
): PanelInfo {
    return {
        meta: {
            index_key: aPanelInfo.meta.panelKey,
            chart_title: aPanelInfo.meta.chartTitle,
        },
        data: {
            tag_set: (aPanelInfo.data.seriesList ?? []).map(createSeriesInfoFromPersistedV201),
            raw_keeper: aPanelInfo.data.useRawData ?? false,
            count: aPanelInfo.data.rowLimit ?? -1,
            interval_type: aPanelInfo.data.intervalType,
        },
        time: {
            range_bgn: aPanelInfo.time.rangeStart ?? 0,
            range_end: aPanelInfo.time.rangeEnd ?? 0,
            range_config: aPanelInfo.time.rangeConfig,
            use_time_keeper: aPanelInfo.time.useSavedTimeRange ?? false,
            time_keeper: cloneTimeRangePair(aPanelInfo.time.savedTimeRange),
            default_range: cloneValueRange(aPanelInfo.time.defaultValueRange),
        },
        axes: {
            x_axis: {
                show_tickline: aPanelInfo.axes.xAxis.showTickLine ?? false,
                raw_data_pixels_per_tick: aPanelInfo.axes.xAxis.rawDataPixelsPerTick ?? 0,
                calculated_data_pixels_per_tick:
                    aPanelInfo.axes.xAxis.calculatedDataPixelsPerTick ?? 0,
            },
            sampling: {
                enabled: aPanelInfo.axes.sampling.enabled ?? false,
                sample_count: aPanelInfo.axes.sampling.sampleCount ?? 0,
            },
            left_y_axis: {
                zero_base: aPanelInfo.axes.primaryYAxis.zeroBase ?? false,
                show_tickline: aPanelInfo.axes.primaryYAxis.showTickLine ?? false,
                value_range: cloneValueRangeOrDefault(aPanelInfo.axes.primaryYAxis.valueRange),
                raw_data_value_range: cloneValueRangeOrDefault(
                    aPanelInfo.axes.primaryYAxis.rawDataValueRange,
                ),
                upper_control_limit: {
                    enabled: aPanelInfo.axes.primaryYAxis.upperControlLimit.enabled ?? false,
                    value: aPanelInfo.axes.primaryYAxis.upperControlLimit.value ?? 0,
                },
                lower_control_limit: {
                    enabled: aPanelInfo.axes.primaryYAxis.lowerControlLimit.enabled ?? false,
                    value: aPanelInfo.axes.primaryYAxis.lowerControlLimit.value ?? 0,
                },
            },
            right_y_axis: {
                enabled: aPanelInfo.axes.secondaryYAxis.enabled ?? false,
                zero_base: aPanelInfo.axes.secondaryYAxis.zeroBase ?? false,
                show_tickline: aPanelInfo.axes.secondaryYAxis.showTickLine ?? false,
                value_range: cloneValueRangeOrDefault(aPanelInfo.axes.secondaryYAxis.valueRange),
                raw_data_value_range: cloneValueRangeOrDefault(
                    aPanelInfo.axes.secondaryYAxis.rawDataValueRange,
                ),
                upper_control_limit: {
                    enabled: aPanelInfo.axes.secondaryYAxis.upperControlLimit.enabled ?? false,
                    value: aPanelInfo.axes.secondaryYAxis.upperControlLimit.value ?? 0,
                },
                lower_control_limit: {
                    enabled: aPanelInfo.axes.secondaryYAxis.lowerControlLimit.enabled ?? false,
                    value: aPanelInfo.axes.secondaryYAxis.lowerControlLimit.value ?? 0,
                },
            },
        },
        display: {
            show_legend: aPanelInfo.display.showLegend ?? false,
            use_zoom: aPanelInfo.display.useZoom ?? false,
            chart_type: aPanelInfo.display.chartType ?? 'Line',
            show_point: aPanelInfo.display.showPoints ?? false,
            point_radius: aPanelInfo.display.pointRadius ?? 0,
            fill: aPanelInfo.display.fill ?? 0,
            stroke: aPanelInfo.display.stroke ?? 0,
        },
        use_normalize: aPanelInfo.useNormalizedValues ?? false,
        highlights: (aPanelInfo.highlights ?? []).map(clonePanelHighlight),
    };
}

/**
 * Converts a persisted `2.0.3` panel into the runtime `PanelInfo` shape.
 * Intent: Keep the runtime model stable while `.taz` storage uses left/right axis names.
 * @param {PersistedPanelInfoV203} aPanelInfo The `2.0.3` persisted panel.
 * @returns {PanelInfo} The runtime panel model.
 */
export function createPanelInfoFromPersistedV203(
    aPanelInfo: PersistedPanelInfoV203,
): PanelInfo {
    return {
        meta: {
            index_key: aPanelInfo.meta.panelKey,
            chart_title: aPanelInfo.meta.chartTitle,
        },
        data: {
            tag_set: (aPanelInfo.data.seriesList ?? []).map(createSeriesInfoFromPersistedV201),
            raw_keeper: aPanelInfo.data.useRawData ?? false,
            count: aPanelInfo.data.rowLimit ?? -1,
            interval_type: aPanelInfo.data.intervalType,
        },
        time: {
            range_bgn: aPanelInfo.time.rangeStart ?? 0,
            range_end: aPanelInfo.time.rangeEnd ?? 0,
            range_config: aPanelInfo.time.rangeConfig,
            use_time_keeper: aPanelInfo.time.useSavedTimeRange ?? false,
            time_keeper: cloneTimeRangePair(aPanelInfo.time.savedTimeRange),
            default_range: cloneValueRange(aPanelInfo.time.defaultValueRange),
        },
        axes: {
            x_axis: {
                show_tickline: aPanelInfo.axes.xAxis.showTickLine ?? false,
                raw_data_pixels_per_tick: aPanelInfo.axes.xAxis.rawDataPixelsPerTick ?? 0,
                calculated_data_pixels_per_tick:
                    aPanelInfo.axes.xAxis.calculatedDataPixelsPerTick ?? 0,
            },
            sampling: {
                enabled: aPanelInfo.axes.sampling.enabled ?? false,
                sample_count: aPanelInfo.axes.sampling.sampleCount ?? 0,
            },
            left_y_axis: {
                zero_base: aPanelInfo.axes.leftYAxis.zeroBase ?? false,
                show_tickline: aPanelInfo.axes.leftYAxis.showTickLine ?? false,
                value_range: cloneValueRangeOrDefault(aPanelInfo.axes.leftYAxis.valueRange),
                raw_data_value_range: cloneValueRangeOrDefault(
                    aPanelInfo.axes.leftYAxis.rawDataValueRange,
                ),
                upper_control_limit: {
                    enabled: aPanelInfo.axes.leftYAxis.upperControlLimit.enabled ?? false,
                    value: aPanelInfo.axes.leftYAxis.upperControlLimit.value ?? 0,
                },
                lower_control_limit: {
                    enabled: aPanelInfo.axes.leftYAxis.lowerControlLimit.enabled ?? false,
                    value: aPanelInfo.axes.leftYAxis.lowerControlLimit.value ?? 0,
                },
            },
            right_y_axis: {
                enabled: aPanelInfo.axes.rightYAxis.enabled ?? false,
                zero_base: aPanelInfo.axes.rightYAxis.zeroBase ?? false,
                show_tickline: aPanelInfo.axes.rightYAxis.showTickLine ?? false,
                value_range: cloneValueRangeOrDefault(aPanelInfo.axes.rightYAxis.valueRange),
                raw_data_value_range: cloneValueRangeOrDefault(
                    aPanelInfo.axes.rightYAxis.rawDataValueRange,
                ),
                upper_control_limit: {
                    enabled: aPanelInfo.axes.rightYAxis.upperControlLimit.enabled ?? false,
                    value: aPanelInfo.axes.rightYAxis.upperControlLimit.value ?? 0,
                },
                lower_control_limit: {
                    enabled: aPanelInfo.axes.rightYAxis.lowerControlLimit.enabled ?? false,
                    value: aPanelInfo.axes.rightYAxis.lowerControlLimit.value ?? 0,
                },
            },
        },
        display: {
            show_legend: aPanelInfo.display.showLegend ?? false,
            use_zoom: aPanelInfo.display.useZoom ?? false,
            chart_type: aPanelInfo.display.chartType ?? 'Line',
            show_point: aPanelInfo.display.showPoints ?? false,
            point_radius: aPanelInfo.display.pointRadius ?? 0,
            fill: aPanelInfo.display.fill ?? 0,
            stroke: aPanelInfo.display.stroke ?? 0,
        },
        use_normalize: aPanelInfo.useNormalizedValues ?? false,
        highlights: (aPanelInfo.highlights ?? []).map(clonePanelHighlight),
    };
}

function createSeriesInfoFromPersistedV200(
    aSeriesInfo: PersistedSeriesInfoV200,
): SeriesConfig {
    return {
        key: aSeriesInfo.key,
        table: aSeriesInfo.table,
        sourceTagName: aSeriesInfo.sourceTagName,
        alias: aSeriesInfo.alias,
        calculationMode: aSeriesInfo.calculationMode,
        color: aSeriesInfo.color,
        use_y2: aSeriesInfo.use_y2,
        id: aSeriesInfo.id,
        onRollup: aSeriesInfo.onRollup ?? false,
        colName: cloneSeriesColumns(aSeriesInfo.colName),
        annotations: (aSeriesInfo.annotations ?? []).map(cloneSeriesAnnotation),
    };
}

function createSeriesInfoFromPersistedV201(
    aSeriesInfo: PersistedSeriesInfoV201,
): SeriesConfig {
    return {
        key: aSeriesInfo.seriesKey,
        table: aSeriesInfo.tableName,
        sourceTagName: aSeriesInfo.sourceTagName,
        alias: aSeriesInfo.alias,
        calculationMode: aSeriesInfo.calculationMode,
        color: aSeriesInfo.color,
        use_y2: aSeriesInfo.useSecondaryAxis ?? false,
        id: aSeriesInfo.id,
        onRollup: aSeriesInfo.useRollupTable ?? false,
        colName: createRuntimeSeriesColumns(aSeriesInfo.columnNames),
        annotations: (aSeriesInfo.annotations ?? []).map(cloneSeriesAnnotation),
    };
}

function createPersistedSeriesColumnsV201(
    aColumns: SeriesColumns | undefined,
): PersistedSeriesColumnsV201 | undefined {
    if (!aColumns) {
        return undefined;
    }

    const { name, time, value, ...sRest } = aColumns;

    return {
        ...sRest,
        nameColumn: name,
        timeColumn: time,
        valueColumn: value,
    };
}

function createRuntimeSeriesColumns(
    aColumns: PersistedSeriesColumnsV201 | undefined,
): SeriesColumns | undefined {
    if (!aColumns) {
        return undefined;
    }

    const {
        nameColumn,
        timeColumn,
        valueColumn,
        ...sRest
    } = aColumns;

    return {
        ...sRest,
        name: nameColumn,
        time: timeColumn,
        value: valueColumn,
    };
}

function cloneSeriesColumns(aColumns: SeriesColumns | undefined): SeriesColumns | undefined {
    return aColumns ? { ...aColumns } : undefined;
}

function cloneSeriesAnnotation(aAnnotation: SeriesAnnotation): SeriesAnnotation {
    return {
        text: aAnnotation.text,
        timeRange: {
            startTime: aAnnotation.timeRange.startTime,
            endTime: aAnnotation.timeRange.endTime,
        },
    };
}

function clonePanelHighlight(aHighlight: PanelHighlight): PanelHighlight {
    return {
        text: aHighlight.text,
        timeRange: {
            startTime: aHighlight.timeRange.startTime,
            endTime: aHighlight.timeRange.endTime,
        },
    };
}

function cloneTimeRangePair(
    aTimeRangePair: Partial<TimeRangePair> | undefined,
): Partial<TimeRangePair> | undefined {
    if (!aTimeRangePair) {
        return undefined;
    }

    return {
        ...aTimeRangePair,
        panelRange: aTimeRangePair.panelRange
            ? { ...aTimeRangePair.panelRange }
            : undefined,
        navigatorRange: aTimeRangePair.navigatorRange
            ? { ...aTimeRangePair.navigatorRange }
            : undefined,
    };
}

function cloneValueRange(
    aValueRange: ValueRange | undefined,
): ValueRange | undefined {
    return aValueRange ? { ...aValueRange } : undefined;
}

function cloneValueRangeOrDefault(aValueRange: ValueRange | undefined): ValueRange {
    return aValueRange ? { ...aValueRange } : { min: 0, max: 0 };
}

