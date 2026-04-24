import { normalizePanelEChartType } from '../../panelModelTypes';
import type { PanelHighlight, PanelInfo } from '../../panelModelTypes';
import { DEFAULT_PANEL_SERIES_SOURCE_COLUMNS } from '../../series/PanelSeriesTypes';
import { DEFAULT_VALUE_RANGE } from '../../../TagAnalyzerCommonConstants';
import type { ValueRange } from '../../../TagAnalyzerCommonTypes';
import type {
    PanelSeriesConfig,
    PanelSeriesSourceColumns,
    SeriesAnnotation,
} from '../../series/PanelSeriesTypes';
import type { PersistedPanelInfoV200 } from '../TazPanelPersistenceTypes';

/**
 * Checks whether a persisted panel uses the only supported `2.0.0` panel shape.
 * Intent: Keep the `.taz` boundary explicit now that pre-production legacy support was removed.
 * @param {unknown} aPanelInfo The unknown persisted panel value.
 * @returns {boolean} True when the value matches the supported panel structure.
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
        typeof sPanelInfo.meta.panelKey === 'string' &&
        typeof sPanelInfo.meta.chartTitle === 'string' &&
        !!sPanelInfo.data &&
        typeof sPanelInfo.data === 'object' &&
        Array.isArray(sPanelInfo.data.seriesList) &&
        !!sPanelInfo.toolbar &&
        typeof sPanelInfo.toolbar === 'object' &&
        typeof sPanelInfo.toolbar.isRaw === 'boolean' &&
        !!sPanelInfo.time &&
        typeof sPanelInfo.time === 'object' &&
        !!sPanelInfo.time.rangeConfig &&
        !!sPanelInfo.axes &&
        typeof sPanelInfo.axes === 'object' &&
        !!sPanelInfo.axes.xAxis &&
        !!sPanelInfo.axes.leftYAxis &&
        !!sPanelInfo.axes.rightYAxis &&
        !!sPanelInfo.display &&
        typeof sPanelInfo.display === 'object'
    );
}

/**
 * Converts a persisted `2.0.0` panel into the runtime `PanelInfo` shape.
 * Intent: Keep TagAnalyzer runtime state separate from the saved `.taz` contract.
 * @param {PersistedPanelInfoV200} aPanelInfo The supported persisted panel.
 * @returns {PanelInfo} The runtime panel model.
 */
export function createPanelInfoFromPersistedV200(
    aPanelInfo: PersistedPanelInfoV200,
): PanelInfo {
    return {
        meta: {
            index_key: aPanelInfo.meta.panelKey,
            chart_title: aPanelInfo.meta.chartTitle,
        },
        data: {
            tag_set: (aPanelInfo.data.seriesList ?? []).map(createSeriesInfoFromPersistedV200),
            count: aPanelInfo.data.rowLimit ?? -1,
            interval_type: aPanelInfo.data.intervalType,
        },
        toolbar: {
            isRaw: aPanelInfo.toolbar.isRaw,
        },
        time: {
            range_bgn: 0,
            range_end: 0,
            range_config: aPanelInfo.time.rangeConfig,
            use_time_keeper: false,
            time_keeper: undefined,
            default_range: undefined,
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

function createSeriesInfoFromPersistedV200(
    aSeriesInfo: PersistedPanelInfoV200['data']['seriesList'][number],
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
        sourceColumns: createRuntimeSeriesColumns(aSeriesInfo.sourceColumns),
        annotations: (aSeriesInfo.annotations ?? []).map(cloneSeriesAnnotation),
    };
}

function createRuntimeSeriesColumns(
    aColumns: PersistedPanelInfoV200['data']['seriesList'][number]['sourceColumns'] | undefined,
): PanelSeriesSourceColumns {
    if (!aColumns) {
        return { ...DEFAULT_PANEL_SERIES_SOURCE_COLUMNS };
    }

    const { nameColumn, timeColumn, valueColumn, ...sRest } = aColumns;

    return {
        ...sRest,
        name: nameColumn ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.name,
        time: timeColumn ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.time,
        value: valueColumn ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.value,
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

function cloneValueRangeOrDefault(aValueRange: ValueRange | undefined): ValueRange {
    return aValueRange ? { ...aValueRange } : { ...DEFAULT_VALUE_RANGE };
}
