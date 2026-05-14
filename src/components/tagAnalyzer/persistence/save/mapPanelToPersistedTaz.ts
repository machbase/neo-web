import type { PanelInfo } from '../../domain/PanelModel';
import type {
    PanelSeriesDefinition,
    PanelSeriesSourceColumns,
} from '../../domain/SeriesModel';
import { getPanelSeriesDisplayColor } from '../../series/PanelSeriesUtils';
import {
    clonePanelHighlights,
    cloneSeriesAnnotations,
} from '../PersistenceCloneUtils';
import type {
    PersistedSeriesColumnsV200,
    PersistedSeriesInfoV200,
} from '../TazPersistenceTypesV200';
import type { PersistedPanelInfoV201 } from '../TazPersistenceTypesV201';
import { normalizeStoredTimeUnit } from '../../domain/time/TimeUnitUtils';
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
export function mapPanelToPersistedTaz(
    panelInfo: PanelInfo,
): PersistedPanelInfoV201 {
    return {
        meta: {
            panelKey: panelInfo.meta.index_key,
            chartTitle: panelInfo.meta.chart_title,
        },
        data: {
            seriesList: (panelInfo.data.tag_set ?? []).map(createPersistedSeriesInfo),
            rowLimit: panelInfo.data.count,
            intervalType:
                normalizeStoredTimeUnit(panelInfo.data.interval_type ?? '') ??
                panelInfo.data.interval_type,
        },
        toolbar: {
            isRaw: panelInfo.toolbar.isRaw,
        },
        time: {
            rangeConfig: { ...panelInfo.time.rangeConfig },
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
            mainChartSampling: {
                enabled: panelInfo.axes.main_chart_sampling.enabled,
                sampleCount: panelInfo.axes.main_chart_sampling.sample_count,
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
