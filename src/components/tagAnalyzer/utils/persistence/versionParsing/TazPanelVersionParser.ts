import { normalizePanelEChartType } from '../../panelModelTypes';
import type { PanelAxes, PanelHighlight, PanelInfo } from '../../panelModelTypes';
import { DEFAULT_PANEL_SERIES_SOURCE_COLUMNS } from '../../series/PanelSeriesTypes';
import { DEFAULT_VALUE_RANGE } from '../../../TagAnalyzerCommonConstants';
import type { ValueRange } from '../../../TagAnalyzerCommonTypes';
import type {
    SeriesAnnotation,
    PanelSeriesSourceColumns,
    PanelSeriesConfig,
} from '../../series/PanelSeriesTypes';
import type { TimeRangePair } from '../../time/types/TimeTypes';
import type {
    LegacySeriesSourceColumns,
    PersistedPanelInfoV200,
    PersistedPanelInfoV201,
    PersistedPanelInfoV202,
    PersistedPanelInfoV203,
    PersistedPanelInfoV204,
    PersistedSeriesColumnsV201,
    PersistedSeriesInfoV200,
    PersistedSeriesInfoV201,
} from '../TazPanelPersistenceTypes';

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
        Array.isArray(sPanelInfo.data.tag_set) &&
        !!sPanelInfo.axes &&
        typeof sPanelInfo.axes === 'object' &&
        ('show_x_tickline' in sPanelInfo.axes || 'x_axis' in sPanelInfo.axes)
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
        Array.isArray(sPanelInfo.data.seriesList) &&
        !!sPanelInfo.axes &&
        typeof sPanelInfo.axes === 'object' &&
        'showXAxisTickLine' in sPanelInfo.axes
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
 * Checks whether a persisted panel uses the explicit `2.0.4` panel shape.
 * Intent: Detect the source-column rename while keeping the `2.0.3` axis structure.
 * @param {unknown} aPanelInfo The unknown persisted panel value.
 * @returns {boolean} True when the value matches the `2.0.4` panel structure.
 */
export function isPersistedPanelInfoV204(
    aPanelInfo: unknown,
): aPanelInfo is PersistedPanelInfoV204 {
    if (!isPersistedPanelInfoV203(aPanelInfo)) {
        return false;
    }

    return aPanelInfo.data.seriesList.every(
        (aSeriesInfo) => 'sourceColumns' in aSeriesInfo || !('columnNames' in aSeriesInfo),
    );
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
    const sAxes = createRuntimeAxesFromPersistedV200(aPanelInfo.axes);

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
        axes: sAxes,
        display: createRuntimeDisplayFromPersistedV200(aPanelInfo.display),
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
            chart_type: normalizePanelEChartType(aPanelInfo.display.chartType),
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
            chart_type: normalizePanelEChartType(aPanelInfo.display.chartType),
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
            chart_type: normalizePanelEChartType(aPanelInfo.display.chartType),
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
 * Converts a persisted `2.0.4` panel into the runtime `PanelInfo` shape.
 * Intent: Load panels that use `sourceColumns` while reusing the `2.0.3` panel layout.
 * @param {PersistedPanelInfoV204} aPanelInfo The `2.0.4` persisted panel.
 * @returns {PanelInfo} The runtime panel model.
 */
export function createPanelInfoFromPersistedV204(
    aPanelInfo: PersistedPanelInfoV204,
): PanelInfo {
    const sPanelInfoV203: PersistedPanelInfoV203 = {
        ...aPanelInfo,
        data: {
            ...aPanelInfo.data,
            seriesList: aPanelInfo.data.seriesList.map((aSeriesInfo) => ({
                ...aSeriesInfo,
                columnNames: aSeriesInfo.sourceColumns,
            })),
        },
    };

    return createPanelInfoFromPersistedV203(sPanelInfoV203);
}

function createRuntimeAxesFromPersistedV200(
    aAxes: PersistedPanelInfoV200['axes'] | PanelAxes,
): PanelAxes {
    if ('x_axis' in aAxes && 'left_y_axis' in aAxes && 'right_y_axis' in aAxes) {
        return {
            x_axis: {
                show_tickline: aAxes.x_axis.show_tickline ?? false,
                raw_data_pixels_per_tick: aAxes.x_axis.raw_data_pixels_per_tick ?? 0,
                calculated_data_pixels_per_tick:
                    aAxes.x_axis.calculated_data_pixels_per_tick ?? 0,
            },
            sampling: {
                enabled: aAxes.sampling.enabled ?? false,
                sample_count: aAxes.sampling.sample_count ?? 0,
            },
            left_y_axis: {
                zero_base: aAxes.left_y_axis.zero_base ?? false,
                show_tickline: aAxes.left_y_axis.show_tickline ?? false,
                value_range: cloneValueRangeOrDefault(aAxes.left_y_axis.value_range),
                raw_data_value_range: cloneValueRangeOrDefault(
                    aAxes.left_y_axis.raw_data_value_range,
                ),
                upper_control_limit: {
                    enabled: aAxes.left_y_axis.upper_control_limit.enabled ?? false,
                    value: aAxes.left_y_axis.upper_control_limit.value ?? 0,
                },
                lower_control_limit: {
                    enabled: aAxes.left_y_axis.lower_control_limit.enabled ?? false,
                    value: aAxes.left_y_axis.lower_control_limit.value ?? 0,
                },
            },
            right_y_axis: {
                enabled: aAxes.right_y_axis.enabled ?? false,
                zero_base: aAxes.right_y_axis.zero_base ?? false,
                show_tickline: aAxes.right_y_axis.show_tickline ?? false,
                value_range: cloneValueRangeOrDefault(aAxes.right_y_axis.value_range),
                raw_data_value_range: cloneValueRangeOrDefault(
                    aAxes.right_y_axis.raw_data_value_range,
                ),
                upper_control_limit: {
                    enabled: aAxes.right_y_axis.upper_control_limit.enabled ?? false,
                    value: aAxes.right_y_axis.upper_control_limit.value ?? 0,
                },
                lower_control_limit: {
                    enabled: aAxes.right_y_axis.lower_control_limit.enabled ?? false,
                    value: aAxes.right_y_axis.lower_control_limit.value ?? 0,
                },
            },
        };
    }

    return {
        x_axis: {
            show_tickline: aAxes.show_x_tickline ?? false,
            raw_data_pixels_per_tick: aAxes.pixels_per_tick_raw ?? 0,
            calculated_data_pixels_per_tick: aAxes.pixels_per_tick ?? 0,
        },
        sampling: {
            enabled: aAxes.use_sampling ?? false,
            sample_count: aAxes.sampling_value ?? 0,
        },
        left_y_axis: {
            zero_base: aAxes.zero_base ?? false,
            show_tickline: aAxes.show_y_tickline ?? false,
            value_range: cloneValueRangeOrDefault(aAxes.primaryRange),
            raw_data_value_range: cloneValueRangeOrDefault(aAxes.primaryDrilldownRange),
            upper_control_limit: {
                enabled: aAxes.use_ucl ?? false,
                value: aAxes.ucl_value ?? 0,
            },
            lower_control_limit: {
                enabled: aAxes.use_lcl ?? false,
                value: aAxes.lcl_value ?? 0,
            },
        },
        right_y_axis: {
            enabled: aAxes.use_right_y2 ?? false,
            zero_base: aAxes.zero_base2 ?? false,
            show_tickline: aAxes.show_y_tickline2 ?? false,
            value_range: cloneValueRangeOrDefault(aAxes.secondaryRange),
            raw_data_value_range: cloneValueRangeOrDefault(aAxes.secondaryDrilldownRange),
            upper_control_limit: {
                enabled: aAxes.use_ucl2 ?? false,
                value: aAxes.ucl2_value ?? 0,
            },
            lower_control_limit: {
                enabled: aAxes.use_lcl2 ?? false,
                value: aAxes.lcl2_value ?? 0,
            },
        },
    };
}

function createRuntimeDisplayFromPersistedV200(
    aDisplay: PanelInfo['display'],
): PanelInfo['display'] {
    return {
        ...aDisplay,
        chart_type: normalizePanelEChartType(aDisplay.chart_type),
    };
}

function createSeriesInfoFromPersistedV200(
    aSeriesInfo: PersistedSeriesInfoV200,
): PanelSeriesConfig {
    const sSeriesInfo = aSeriesInfo as PersistedSeriesInfoV200 & {
        useSecondaryAxis?: boolean;
        columnNames?: PersistedSeriesColumnsV201 | LegacySeriesSourceColumns | undefined;
        sourceColumns?: PersistedSeriesColumnsV201 | LegacySeriesSourceColumns | undefined;
    };

    return {
        key: sSeriesInfo.key,
        table: sSeriesInfo.table,
        sourceTagName: sSeriesInfo.sourceTagName,
        alias: sSeriesInfo.alias,
        calculationMode: sSeriesInfo.calculationMode,
        color: sSeriesInfo.color,
        useSecondaryAxis: sSeriesInfo.use_y2 ?? sSeriesInfo.useSecondaryAxis ?? false,
        id: sSeriesInfo.id,
        useRollupTable: sSeriesInfo.onRollup ?? false,
        sourceColumns: createRuntimeSeriesColumnsFromPersistedV200(sSeriesInfo),
        annotations: (sSeriesInfo.annotations ?? []).map(cloneSeriesAnnotation),
    };
}

function createRuntimeSeriesColumnsFromPersistedV200(
    aSeriesInfo: PersistedSeriesInfoV200 & {
        columnNames?: PersistedSeriesColumnsV201 | LegacySeriesSourceColumns | undefined;
        sourceColumns?: PersistedSeriesColumnsV201 | LegacySeriesSourceColumns | undefined;
    },
): PanelSeriesSourceColumns {
    const sPersistedSourceColumns = aSeriesInfo.sourceColumns ?? aSeriesInfo.columnNames;

    if (aSeriesInfo.colName) {
        return cloneSeriesColumns(aSeriesInfo.colName);
    }

    if (hasRuntimeSeriesColumns(sPersistedSourceColumns)) {
        return cloneSeriesColumns(sPersistedSourceColumns);
    }

    return createRuntimeSeriesColumns(
        sPersistedSourceColumns as PersistedSeriesColumnsV201 | undefined,
    );
}

function hasRuntimeSeriesColumns(
    aColumns: PersistedSeriesColumnsV201 | LegacySeriesSourceColumns | undefined,
): aColumns is LegacySeriesSourceColumns {
    return (
        !!aColumns &&
        typeof aColumns === 'object' &&
        ('name' in aColumns || 'time' in aColumns || 'value' in aColumns)
    );
}

function createSeriesInfoFromPersistedV201(
    aSeriesInfo: PersistedSeriesInfoV201,
): PanelSeriesConfig {
    return {
        key: aSeriesInfo.seriesKey,
        table: aSeriesInfo.tableName,
        sourceTagName: aSeriesInfo.sourceTagName,
        alias: aSeriesInfo.alias,
        calculationMode: aSeriesInfo.calculationMode,
        color: aSeriesInfo.color,
        useSecondaryAxis: aSeriesInfo.useSecondaryAxis ?? false,
        id: aSeriesInfo.id,
        useRollupTable: aSeriesInfo.useRollupTable ?? false,
        sourceColumns: createRuntimeSeriesColumns(aSeriesInfo.columnNames),
        annotations: (aSeriesInfo.annotations ?? []).map(cloneSeriesAnnotation),
    };
}

function createRuntimeSeriesColumns(
    aColumns: PersistedSeriesColumnsV201 | undefined,
): PanelSeriesSourceColumns {
    if (!aColumns) {
        return { ...DEFAULT_PANEL_SERIES_SOURCE_COLUMNS };
    }

    const {
        nameColumn,
        timeColumn,
        valueColumn,
        ...sRest
    } = aColumns;

    return {
        ...sRest,
        name: nameColumn ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.name,
        time: timeColumn ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.time,
        value: valueColumn ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.value,
    };
}

function cloneSeriesColumns(
    aColumns: LegacySeriesSourceColumns | PanelSeriesSourceColumns | undefined,
): PanelSeriesSourceColumns {
    return {
        ...(aColumns ?? {}),
        name: aColumns?.name ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.name,
        time: aColumns?.time ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.time,
        value: aColumns?.value ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.value,
    };
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
    return aValueRange ? { ...aValueRange } : { ...DEFAULT_VALUE_RANGE };
}

