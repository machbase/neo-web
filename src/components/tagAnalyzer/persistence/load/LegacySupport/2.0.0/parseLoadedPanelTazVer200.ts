import {
    normalizePanelEChartType,
    type PanelAnnotation,
    type PanelInfo,
} from '../../../../domain/PanelDomain';
import {
    DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
} from '../../../../domain/SeriesDomain';
import {
    clonePanelAnnotations,
    clonePanelHighlights,
    cloneSeriesAnnotations,
    cloneValueRangeOrDefault,
} from '../../../PersistenceCloneUtils';
import type { PersistedPanelInfoV200 } from '../../../TazPersistenceTypesV200';
import { normalizePersistedTimeRangeConfig } from '../../normalizePersistedTimeRangeConfig';
import { normalizeStoredTimeUnit } from '../../../../domain/time/TimeIntervalUtils';
import type {
    PanelNavigatorRangePair,
    TimeRangeMs,
} from '../../../../domain/time/TimeTypes';

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
        general: {
            chart_title: sNormalizedPanelInfo.meta.chartTitle,
            use_zoom: sNormalizedPanelInfo.display.useZoom ?? false,
            use_last_viewed_range:
                sNormalizedPanelInfo.time.useLastViewedRange === true,
            last_viewed_range: sNormalizedPanelInfo.time.lastViewedRange,
            is_raw: sNormalizedPanelInfo.toolbar.isRaw,
            is_order_by: true,
            use_normalize: sNormalizedPanelInfo.useNormalizedValues ?? false,
        },
        data: {
            index_key: sNormalizedPanelInfo.meta.panelKey,
            tag_set: sNormalizedPanelInfo.data.seriesList.map(
                createSeriesInfoFromPersistedV200,
            ),
            count: sNormalizedPanelInfo.data.rowLimit ?? -1,
            interval_type:
                normalizeStoredTimeUnit(sNormalizedPanelInfo.data.intervalType ?? '') ??
                sNormalizedPanelInfo.data.intervalType,
        },
        time: {
            range_config: sNormalizedPanelInfo.time.rangeConfig,
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
                enabled: sNormalizedPanelInfo.axes.sampling?.enabled ?? true,
                sample_count: sNormalizedPanelInfo.axes.sampling?.sampleCount ?? 0,
            },
            main_chart_sampling: {
                enabled: sNormalizedPanelInfo.axes.mainChartSampling?.enabled ?? false,
                sample_count:
                    sNormalizedPanelInfo.axes.mainChartSampling?.sampleCount ??
                    sNormalizedPanelInfo.axes.sampling?.sampleCount ??
                    0,
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
            chart_type: normalizePanelEChartType(sNormalizedPanelInfo.display.chartType),
            connect_nulls: sNormalizedPanelInfo.display.connectNulls ?? false,
            show_point: sNormalizedPanelInfo.display.showPoints ?? false,
            point_radius: sNormalizedPanelInfo.display.pointRadius ?? 0,
            fill: sNormalizedPanelInfo.display.fill ?? 0,
            stroke: sNormalizedPanelInfo.display.stroke ?? 0,
        },
        highlights: clonePanelHighlights(sNormalizedPanelInfo.highlights),
        annotations: createPanelAnnotationsFromPersistedPanel(sNormalizedPanelInfo),
    };
}

function createPanelAnnotationsFromPersistedPanel(
    panelInfo: PersistedPanelInfoV200,
): PanelAnnotation[] {
    const sPanelAnnotations = clonePanelAnnotations(panelInfo.annotations);
    const sSeriesAnnotations = panelInfo.data.seriesList.flatMap((seriesInfo) =>
        cloneSeriesAnnotations(seriesInfo.annotations).map((annotation) => ({
            ...annotation,
            seriesKey: seriesInfo.seriesKey,
        })),
    );

    return [...sPanelAnnotations, ...sSeriesAnnotations];
}

function normalizePersistedPanelInfoV200(
    panelInfo: PersistedPanelInfoV200,
): PersistedPanelInfoV200 {
    const sNormalizedRangeConfig = normalizePersistedTimeRangeConfig(
        panelInfo.time.rangeConfig,
    );
    if (!sNormalizedRangeConfig) {
        throw new Error('Unsupported TagAnalyzer .taz panel time rangeConfig shape.');
    }

    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            seriesList: panelInfo.data.seriesList.map(
                normalizePersistedSeriesInfoV200,
            ),
            rowLimit: panelInfo.data.rowLimit ?? -1,
        },
        toolbar: {
            isRaw: panelInfo.toolbar.isRaw,
        },
        time: {
            rangeConfig: sNormalizedRangeConfig,
            useLastViewedRange: panelInfo.time.useLastViewedRange === true,
            lastViewedRange: normalizePersistedLastViewedRange(
                panelInfo.time.lastViewedRange,
            ),
        },
        highlights: panelInfo.highlights ?? [],
    };
}

function normalizePersistedLastViewedRange(
    lastViewedRange: Partial<PanelNavigatorRangePair> | undefined,
): Partial<PanelNavigatorRangePair> | undefined {
    const sPanelRange = normalizePersistedTimeRange(lastViewedRange?.panelRange);
    const sNavigatorRange = normalizePersistedTimeRange(
        lastViewedRange?.navigatorRange,
    );

    if (!sPanelRange && !sNavigatorRange) {
        return undefined;
    }

    return {
        panelRange: sPanelRange,
        navigatorRange: sNavigatorRange,
    };
}

function normalizePersistedTimeRange(
    timeRange: TimeRangeMs | undefined,
): TimeRangeMs | undefined {
    if (
        !timeRange ||
        typeof timeRange.startTime !== 'number' ||
        typeof timeRange.endTime !== 'number'
    ) {
        return undefined;
    }

    return {
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
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
