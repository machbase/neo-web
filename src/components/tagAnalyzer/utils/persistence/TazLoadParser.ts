import type { BoardInfo } from '../../panel/BoardTypes';
import { normalizePanelEChartType } from '../panelModelTypes';
import type { PanelInfo } from '../panelModelTypes';
import { DEFAULT_PANEL_SERIES_SOURCE_COLUMNS } from '../series/PanelSeriesTypes';
import type {
    PanelSeriesDefinition,
    PanelSeriesSourceColumns,
} from '../series/PanelSeriesTypes';
import type { ResolvedTimeBounds, TimeBoundary } from '../time/TimeTypes';
import { normalizeTimeRangeConfig } from '../time/TimeBoundaryParsing';
import { normalizeStoredTimeRangeBoundary } from '../time/StoredTimeRangeAdapter';
import {
    clonePanelHighlights,
    cloneSeriesAnnotations,
    cloneValueRangeOrDefault,
} from './PersistenceCloneUtils';
import type { PersistedPanelInfoV200 } from './TazPanelPersistenceTypes';
import type {
    PersistedBoardTimeRange,
    PersistedTazBoardInfo,
} from './TazPersistenceTypes';

export const TAZ_FORMAT_VERSION = '2.0.0';

export type PersistedTazVersion = typeof TAZ_FORMAT_VERSION;

export function parseReceivedBoardInfo(boardInfo: PersistedTazBoardInfo): BoardInfo {
    const sNormalizedBoardInfo = normalizeCurrentBoardInput(boardInfo);
    assertSupportedPersistedTazVersion(sNormalizedBoardInfo.version);
    const sBoardTime = normalizePersistedBoardTime(sNormalizedBoardInfo.boardTimeRange);

    return {
        ...sNormalizedBoardInfo,
        name: sNormalizedBoardInfo.name ?? '',
        path: sNormalizedBoardInfo.path ?? '',
        code: sNormalizedBoardInfo.code ?? '',
        panels: (sNormalizedBoardInfo.panels ?? []).map((panelInfo) =>
            parseReceivedPanelInfo(panelInfo),
        ),
        savedCode: sNormalizedBoardInfo.savedCode ?? false,
        range: sBoardTime.range,
        rangeConfig: sBoardTime.rangeConfig,
    };
}

export function parseReceivedPanelInfo(panelInfo: unknown): PanelInfo {
    if (!isPersistedPanelInfoV200(panelInfo)) {
        throw new Error('Unsupported TagAnalyzer .taz panel shape.');
    }

    return createPanelInfoFromPersistedV200(normalizePersistedPanelInfoV200(panelInfo));
}

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

export function createPanelInfoFromPersistedV200(
    panelInfo: PersistedPanelInfoV200,
): PanelInfo {
    return {
        meta: {
            index_key: panelInfo.meta.panelKey,
            chart_title: panelInfo.meta.chartTitle,
        },
        data: {
            tag_set: (panelInfo.data.seriesList ?? []).map(createSeriesInfoFromPersistedV200),
            count: panelInfo.data.rowLimit ?? -1,
            interval_type: panelInfo.data.intervalType,
        },
        toolbar: {
            isRaw: panelInfo.toolbar.isRaw,
        },
        time: {
            range_bgn: 0,
            range_end: 0,
            range_config: panelInfo.time.rangeConfig,
            use_time_keeper: false,
            time_keeper: undefined,
            default_range: undefined,
        },
        axes: {
            x_axis: {
                show_tickline: panelInfo.axes.xAxis.showTickLine ?? false,
                raw_data_pixels_per_tick: panelInfo.axes.xAxis.rawDataPixelsPerTick ?? 0,
                calculated_data_pixels_per_tick:
                    panelInfo.axes.xAxis.calculatedDataPixelsPerTick ?? 0,
            },
            sampling: {
                enabled: panelInfo.axes.sampling.enabled ?? false,
                sample_count: panelInfo.axes.sampling.sampleCount ?? 0,
            },
            left_y_axis: {
                zero_base: panelInfo.axes.leftYAxis.zeroBase ?? false,
                show_tickline: panelInfo.axes.leftYAxis.showTickLine ?? false,
                value_range: cloneValueRangeOrDefault(panelInfo.axes.leftYAxis.valueRange),
                raw_data_value_range: cloneValueRangeOrDefault(
                    panelInfo.axes.leftYAxis.rawDataValueRange,
                ),
                upper_control_limit: {
                    enabled: panelInfo.axes.leftYAxis.upperControlLimit.enabled ?? false,
                    value: panelInfo.axes.leftYAxis.upperControlLimit.value ?? 0,
                },
                lower_control_limit: {
                    enabled: panelInfo.axes.leftYAxis.lowerControlLimit.enabled ?? false,
                    value: panelInfo.axes.leftYAxis.lowerControlLimit.value ?? 0,
                },
            },
            right_y_axis_enabled: panelInfo.axes.rightYAxis.enabled ?? false,
            right_y_axis: {
                zero_base: panelInfo.axes.rightYAxis.zeroBase ?? false,
                show_tickline: panelInfo.axes.rightYAxis.showTickLine ?? false,
                value_range: cloneValueRangeOrDefault(panelInfo.axes.rightYAxis.valueRange),
                raw_data_value_range: cloneValueRangeOrDefault(
                    panelInfo.axes.rightYAxis.rawDataValueRange,
                ),
                upper_control_limit: {
                    enabled: panelInfo.axes.rightYAxis.upperControlLimit.enabled ?? false,
                    value: panelInfo.axes.rightYAxis.upperControlLimit.value ?? 0,
                },
                lower_control_limit: {
                    enabled: panelInfo.axes.rightYAxis.lowerControlLimit.enabled ?? false,
                    value: panelInfo.axes.rightYAxis.lowerControlLimit.value ?? 0,
                },
            },
        },
        display: {
            show_legend: panelInfo.display.showLegend ?? false,
            use_zoom: panelInfo.display.useZoom ?? false,
            chart_type: normalizePanelEChartType(panelInfo.display.chartType),
            show_point: panelInfo.display.showPoints ?? false,
            point_radius: panelInfo.display.pointRadius ?? 0,
            fill: panelInfo.display.fill ?? 0,
            stroke: panelInfo.display.stroke ?? 0,
        },
        use_normalize: panelInfo.useNormalizedValues ?? false,
        highlights: clonePanelHighlights(panelInfo.highlights),
    };
}

function assertSupportedPersistedTazVersion(
    version: string | undefined,
): asserts version is PersistedTazVersion {
    if (version === TAZ_FORMAT_VERSION) {
        return;
    }

    throw new Error(`Unsupported TagAnalyzer .taz version: ${version ?? 'missing'}`);
}

function normalizeCurrentBoardInput(
    boardInfo: PersistedTazBoardInfo,
): PersistedTazBoardInfo {
    if (boardInfo.version) {
        return boardInfo;
    }

    if (canTreatBoardAsCurrentFormat(boardInfo)) {
        return {
            ...boardInfo,
            version: TAZ_FORMAT_VERSION,
            boardTimeRange:
                boardInfo.boardTimeRange ??
                normalizeStoredTimeRangeBoundary(
                    boardInfo.range_bgn,
                    boardInfo.range_end,
                ).rangeConfig,
        };
    }

    throw new Error('Unsupported TagAnalyzer .taz version: missing');
}

function canTreatBoardAsCurrentFormat(boardInfo: PersistedTazBoardInfo): boolean {
    if (!Array.isArray(boardInfo.panels)) {
        return false;
    }

    if (boardInfo.panels.length === 0) {
        return true;
    }

    return boardInfo.panels.every((panelInfo) => isPersistedPanelInfoV200(panelInfo));
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

function normalizePersistedBoardTime(
    boardTimeRange: PersistedBoardTimeRange | undefined,
): ResolvedTimeBounds {
    if (!isPersistedBoardTimeRange(boardTimeRange)) {
        throw new Error('Unsupported TagAnalyzer .taz boardTimeRange shape.');
    }

    return normalizeTimeRangeConfig(boardTimeRange);
}

function isPersistedBoardTimeRange(
    boardTimeRange: PersistedBoardTimeRange | undefined,
): boardTimeRange is PersistedBoardTimeRange {
    if (!boardTimeRange || typeof boardTimeRange !== 'object') {
        return false;
    }

    return isTimeBoundary(boardTimeRange.start) && isTimeBoundary(boardTimeRange.end);
}

function isTimeBoundary(boundary: unknown): boundary is TimeBoundary {
    if (!boundary || typeof boundary !== 'object') {
        return false;
    }

    const sBoundary = boundary as Record<string, unknown>;

    return (
        isEmptyBoundary(sBoundary) ||
        isAbsoluteBoundary(sBoundary) ||
        isRelativeBoundary(sBoundary) ||
        isRawBoundary(sBoundary)
    );
}

function isEmptyBoundary(boundary: Record<string, unknown>): boolean {
    return boundary.kind === 'empty';
}

function isAbsoluteBoundary(boundary: Record<string, unknown>): boolean {
    return boundary.kind === 'absolute' && typeof boundary.timestamp === 'number';
}

function isRelativeBoundary(boundary: Record<string, unknown>): boolean {
    return (
        boundary.kind === 'relative' &&
        (boundary.anchor === 'now' || boundary.anchor === 'last') &&
        typeof boundary.amount === 'number' &&
        typeof boundary.expression === 'string' &&
        (boundary.unit === undefined || typeof boundary.unit === 'string')
    );
}

function isRawBoundary(boundary: Record<string, unknown>): boolean {
    return boundary.kind === 'raw' && typeof boundary.value === 'string';
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
