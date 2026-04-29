import { normalizePanelEChartType } from '../../../utils/panelModelTypes';
import type { PanelInfo } from '../../../utils/panelModelTypes';
import { DEFAULT_PANEL_SERIES_SOURCE_COLUMNS } from '../../../series/PanelSeriesTypes';
import type {
    PanelSeriesDefinition,
    PanelSeriesSourceColumns,
} from '../../../series/PanelSeriesTypes';
import {
    clonePanelHighlights,
    cloneSeriesAnnotations,
    cloneValueRangeOrDefault,
} from '../../PersistenceCloneUtils';
import type { PersistedPanelInfoV200 } from '../../TazPersistenceTypesV200';

export function isPersistedPanelInfoV200(
    panelInfo: unknown,
): panelInfo is PersistedPanelInfoV200 {
    if (!panelInfo || typeof panelInfo !== 'object') {
        return false;
    }

    const sPanelInfo = panelInfo as Partial<PersistedPanelInfoV200>;

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

export function parseLoadedPanelTazVer200(
    panelInfo: PersistedPanelInfoV200,
): PanelInfo {
    const sNormalizedPanelInfo = normalizePersistedPanelInfoV200(panelInfo);

    return {
        meta: {
            index_key: sNormalizedPanelInfo.meta.panelKey,
            chart_title: sNormalizedPanelInfo.meta.chartTitle,
        },
        data: {
            tag_set: (sNormalizedPanelInfo.data.seriesList ?? []).map(
                createSeriesInfoFromPersistedV200,
            ),
            count: sNormalizedPanelInfo.data.rowLimit ?? -1,
            interval_type: sNormalizedPanelInfo.data.intervalType,
        },
        toolbar: {
            isRaw: sNormalizedPanelInfo.toolbar.isRaw,
        },
        time: {
            rangeConfig: sNormalizedPanelInfo.time.rangeConfig,
            useTimeKeeper: false,
            timeKeeper: undefined,
            defaultRange: undefined,
        },
        axes: {
            x_axis: {
                show_tickline: sNormalizedPanelInfo.axes.xAxis.showTickLine ?? false,
                raw_data_pixels_per_tick:
                    sNormalizedPanelInfo.axes.xAxis.rawDataPixelsPerTick ?? 0,
                calculated_data_pixels_per_tick:
                    sNormalizedPanelInfo.axes.xAxis.calculatedDataPixelsPerTick ?? 0,
            },
            sampling: {
                enabled: sNormalizedPanelInfo.axes.sampling.enabled ?? false,
                sample_count: sNormalizedPanelInfo.axes.sampling.sampleCount ?? 0,
            },
            left_y_axis: {
                zero_base: sNormalizedPanelInfo.axes.leftYAxis.zeroBase ?? false,
                show_tickline: sNormalizedPanelInfo.axes.leftYAxis.showTickLine ?? false,
                value_range: cloneValueRangeOrDefault(
                    sNormalizedPanelInfo.axes.leftYAxis.valueRange,
                ),
                raw_data_value_range: cloneValueRangeOrDefault(
                    sNormalizedPanelInfo.axes.leftYAxis.rawDataValueRange,
                ),
                upper_control_limit: {
                    enabled:
                        sNormalizedPanelInfo.axes.leftYAxis.upperControlLimit.enabled ??
                        false,
                    value:
                        sNormalizedPanelInfo.axes.leftYAxis.upperControlLimit.value ?? 0,
                },
                lower_control_limit: {
                    enabled:
                        sNormalizedPanelInfo.axes.leftYAxis.lowerControlLimit.enabled ??
                        false,
                    value:
                        sNormalizedPanelInfo.axes.leftYAxis.lowerControlLimit.value ?? 0,
                },
            },
            right_y_axis_enabled: sNormalizedPanelInfo.axes.rightYAxis.enabled ?? false,
            right_y_axis: {
                zero_base: sNormalizedPanelInfo.axes.rightYAxis.zeroBase ?? false,
                show_tickline: sNormalizedPanelInfo.axes.rightYAxis.showTickLine ?? false,
                value_range: cloneValueRangeOrDefault(
                    sNormalizedPanelInfo.axes.rightYAxis.valueRange,
                ),
                raw_data_value_range: cloneValueRangeOrDefault(
                    sNormalizedPanelInfo.axes.rightYAxis.rawDataValueRange,
                ),
                upper_control_limit: {
                    enabled:
                        sNormalizedPanelInfo.axes.rightYAxis.upperControlLimit.enabled ??
                        false,
                    value:
                        sNormalizedPanelInfo.axes.rightYAxis.upperControlLimit.value ?? 0,
                },
                lower_control_limit: {
                    enabled:
                        sNormalizedPanelInfo.axes.rightYAxis.lowerControlLimit.enabled ??
                        false,
                    value:
                        sNormalizedPanelInfo.axes.rightYAxis.lowerControlLimit.value ?? 0,
                },
            },
        },
        display: {
            show_legend: sNormalizedPanelInfo.display.showLegend ?? false,
            use_zoom: sNormalizedPanelInfo.display.useZoom ?? false,
            chart_type: normalizePanelEChartType(sNormalizedPanelInfo.display.chartType),
            show_point: sNormalizedPanelInfo.display.showPoints ?? false,
            point_radius: sNormalizedPanelInfo.display.pointRadius ?? 0,
            fill: sNormalizedPanelInfo.display.fill ?? 0,
            stroke: sNormalizedPanelInfo.display.stroke ?? 0,
        },
        use_normalize: sNormalizedPanelInfo.useNormalizedValues ?? false,
        highlights: clonePanelHighlights(sNormalizedPanelInfo.highlights),
    };
}

function normalizePersistedPanelInfoV200(
    panelInfo: PersistedPanelInfoV200,
): PersistedPanelInfoV200 {
    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            seriesList: (panelInfo.data.seriesList ?? []).map(
                normalizePersistedSeriesInfoV200,
            ),
            rowLimit: panelInfo.data.rowLimit ?? -1,
        },
        toolbar: {
            isRaw: panelInfo.toolbar?.isRaw ?? false,
        },
        highlights: panelInfo.highlights ?? [],
    };
}

function normalizePersistedSeriesInfoV200(
    seriesInfo: PersistedPanelInfoV200['data']['seriesList'][number],
): PersistedPanelInfoV200['data']['seriesList'][number] {
    return {
        ...seriesInfo,
        annotations: seriesInfo.annotations ?? [],
    };
}

function createSeriesInfoFromPersistedV200(
    seriesInfo: PersistedPanelInfoV200['data']['seriesList'][number],
): PanelSeriesDefinition {
    return {
        key: seriesInfo.seriesKey,
        table: seriesInfo.tableName,
        sourceTagName: seriesInfo.sourceTagName,
        alias: seriesInfo.alias,
        calculationMode: seriesInfo.calculationMode,
        color: seriesInfo.color,
        useSecondaryAxis: seriesInfo.useSecondaryAxis ?? false,
        id: seriesInfo.id,
        useRollupTable: seriesInfo.useRollupTable ?? false,
        sourceColumns: createRuntimeSeriesColumns(seriesInfo.sourceColumns),
        annotations: cloneSeriesAnnotations(seriesInfo.annotations),
    };
}

function createRuntimeSeriesColumns(
    columns: PersistedPanelInfoV200['data']['seriesList'][number]['sourceColumns'] | undefined,
): PanelSeriesSourceColumns {
    if (!columns) {
        return { ...DEFAULT_PANEL_SERIES_SOURCE_COLUMNS };
    }

    const { nameColumn, timeColumn, valueColumn, ...sRest } = columns;

    return {
        ...sRest,
        name: nameColumn ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.name,
        time: timeColumn ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.time,
        value: valueColumn ?? DEFAULT_PANEL_SERIES_SOURCE_COLUMNS.value,
    };
}
