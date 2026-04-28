import type { PanelInfo } from '../../panelModelTypes';
import type {
    PanelSeriesDefinition,
    PanelSeriesSourceColumns,
} from '../../series/PanelSeriesTypes';
import { getPanelSeriesDisplayColor } from '../../series/PanelSeriesColorResolver';
import {
    clonePanelHighlights,
    cloneSeriesAnnotations,
} from '../PersistenceCloneUtils';
import type {
    PersistedPanelInfoV200,
    PersistedSeriesColumnsV200,
    PersistedSeriesInfoV200,
} from '../TazPanelPersistenceTypes';

/**
 * Clones one series config into the explicit persisted series shape.
 * Intent: Save `.taz` files with descriptive series field names while keeping runtime state detached.
 * @param {PanelSeriesDefinition} seriesInfo The runtime series config.
 * @param {number} seriesIndex The series index used for palette fallback.
 * @returns {PersistedSeriesInfoV200} The explicit persisted series config.
 */
export function createPersistedSeriesInfo(
    seriesInfo: PanelSeriesDefinition,
    seriesIndex: number,
): PersistedSeriesInfoV200 {
    return {
        seriesKey: seriesInfo.key,
        tableName: seriesInfo.table,
        sourceTagName: seriesInfo.sourceTagName,
        alias: seriesInfo.alias,
        calculationMode: seriesInfo.calculationMode,
        color: getPanelSeriesDisplayColor(seriesInfo, seriesIndex),
        useSecondaryAxis: seriesInfo.useSecondaryAxis,
        id: seriesInfo.id,
        useRollupTable: seriesInfo.useRollupTable,
        sourceColumns: createPersistedSeriesColumnsV200(seriesInfo.sourceColumns),
        annotations: cloneSeriesAnnotations(seriesInfo.annotations),
    };
}

/**
 * Clones one runtime panel into the explicit `2.0.0` persisted panel shape.
 * Intent: Keep outbound `.taz` serialization separate from inbound version parsing.
 * @param {PanelInfo} panelInfo The runtime panel model.
 * @returns {PersistedPanelInfoV200} The explicit persisted panel model.
 */
export function createPersistedPanelInfo(
    panelInfo: PanelInfo,
): PersistedPanelInfoV200 {
    return {
        meta: {
            panelKey: panelInfo.meta.index_key,
            chartTitle: panelInfo.meta.chart_title,
        },
        data: {
            seriesList: (panelInfo.data.tag_set ?? []).map(createPersistedSeriesInfo),
            rowLimit: panelInfo.data.count,
            intervalType: panelInfo.data.interval_type,
        },
        toolbar: {
            isRaw: panelInfo.toolbar.isRaw,
        },
        time: {
            rangeConfig: { ...panelInfo.time.range_config },
        },
        axes: {
            xAxis: {
                showTickLine: panelInfo.axes.x_axis.show_tickline,
                rawDataPixelsPerTick: panelInfo.axes.x_axis.raw_data_pixels_per_tick,
                calculatedDataPixelsPerTick:
                    panelInfo.axes.x_axis.calculated_data_pixels_per_tick,
            },
            sampling: {
                enabled: panelInfo.axes.sampling.enabled,
                sampleCount: panelInfo.axes.sampling.sample_count,
            },
            leftYAxis: {
                zeroBase: panelInfo.axes.left_y_axis.zero_base,
                showTickLine: panelInfo.axes.left_y_axis.show_tickline,
                valueRange: { ...panelInfo.axes.left_y_axis.value_range },
                rawDataValueRange: {
                    ...panelInfo.axes.left_y_axis.raw_data_value_range,
                },
                upperControlLimit: {
                    enabled: panelInfo.axes.left_y_axis.upper_control_limit.enabled,
                    value: panelInfo.axes.left_y_axis.upper_control_limit.value,
                },
                lowerControlLimit: {
                    enabled: panelInfo.axes.left_y_axis.lower_control_limit.enabled,
                    value: panelInfo.axes.left_y_axis.lower_control_limit.value,
                },
            },
            rightYAxis: {
                enabled: panelInfo.axes.right_y_axis_enabled,
                zeroBase: panelInfo.axes.right_y_axis.zero_base,
                showTickLine: panelInfo.axes.right_y_axis.show_tickline,
                valueRange: { ...panelInfo.axes.right_y_axis.value_range },
                rawDataValueRange: {
                    ...panelInfo.axes.right_y_axis.raw_data_value_range,
                },
                upperControlLimit: {
                    enabled: panelInfo.axes.right_y_axis.upper_control_limit.enabled,
                    value: panelInfo.axes.right_y_axis.upper_control_limit.value,
                },
                lowerControlLimit: {
                    enabled: panelInfo.axes.right_y_axis.lower_control_limit.enabled,
                    value: panelInfo.axes.right_y_axis.lower_control_limit.value,
                },
            },
        },
        display: {
            showLegend: panelInfo.display.show_legend,
            useZoom: panelInfo.display.use_zoom,
            chartType: panelInfo.display.chart_type,
            showPoints: panelInfo.display.show_point,
            pointRadius: panelInfo.display.point_radius,
            fill: panelInfo.display.fill,
            stroke: panelInfo.display.stroke,
        },
        useNormalizedValues: panelInfo.use_normalize,
        highlights: clonePanelHighlights(panelInfo.highlights),
    };
}

function createPersistedSeriesColumnsV200(
    columns: PanelSeriesSourceColumns,
): PersistedSeriesColumnsV200 {
    const { name, time, value, ...sRest } = columns;

    return {
        ...sRest,
        nameColumn: name,
        timeColumn: time,
        valueColumn: value,
    };
}
