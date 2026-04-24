import type { PanelHighlight, PanelInfo } from '../../panelModelTypes';
import type {
    PanelSeriesConfig,
    PanelSeriesSourceColumns,
    SeriesAnnotation,
} from '../../series/PanelSeriesTypes';
import { getPanelSeriesDisplayColor } from '../../series/PanelSeriesColorResolver';
import type {
    PersistedPanelInfoV207,
    PersistedSeriesColumnsV201,
    PersistedSeriesInfoV204,
} from '../TazPanelPersistenceTypes';

/**
 * Clones one series config into the explicit persisted series shape.
 * Intent: Save `.taz` files with descriptive series field names while keeping runtime state detached.
 * @param {PanelSeriesConfig} aSeriesInfo The runtime series config.
 * @param {number} aSeriesIndex The series index used for palette fallback.
 * @returns {PersistedSeriesInfoV204} The explicit persisted series config.
 */
export function createPersistedSeriesInfo(
    aSeriesInfo: PanelSeriesConfig,
    aSeriesIndex: number,
): PersistedSeriesInfoV204 {
    return {
        seriesKey: aSeriesInfo.key,
        tableName: aSeriesInfo.table,
        sourceTagName: aSeriesInfo.sourceTagName,
        alias: aSeriesInfo.alias,
        calculationMode: aSeriesInfo.calculationMode,
        color: getPanelSeriesDisplayColor(aSeriesInfo, aSeriesIndex),
        useSecondaryAxis: aSeriesInfo.useSecondaryAxis,
        id: aSeriesInfo.id,
        useRollupTable: aSeriesInfo.useRollupTable,
        sourceColumns: createPersistedSeriesColumnsV201(aSeriesInfo.sourceColumns),
        annotations: (aSeriesInfo.annotations ?? []).map(cloneSeriesAnnotation),
    };
}

/**
 * Clones one runtime panel into the explicit `2.0.7` persisted panel shape.
 * Intent: Keep outbound `.taz` serialization separate from inbound version parsing.
 * @param {PanelInfo} aPanelInfo The runtime panel model.
 * @returns {PersistedPanelInfoV207} The explicit persisted panel model.
 */
export function createPersistedPanelInfo(
    aPanelInfo: PanelInfo,
): PersistedPanelInfoV207 {
    return {
        meta: {
            panelKey: aPanelInfo.meta.index_key,
            chartTitle: aPanelInfo.meta.chart_title,
        },
        data: {
            seriesList: (aPanelInfo.data.tag_set ?? []).map(createPersistedSeriesInfo),
            rowLimit: aPanelInfo.data.count,
            intervalType: aPanelInfo.data.interval_type,
        },
        toolbar: {
            isRaw: aPanelInfo.toolbar.isRaw,
        },
        time: {
            rangeConfig: { ...aPanelInfo.time.range_config },
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

function createPersistedSeriesColumnsV201(
    aColumns: PanelSeriesSourceColumns,
): PersistedSeriesColumnsV201 {
    const { name, time, value, ...sRest } = aColumns;

    return {
        ...sRest,
        nameColumn: name,
        timeColumn: time,
        valueColumn: value,
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
