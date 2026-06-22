import {
    normalizePanelEChartType,
    type PanelAnnotation,
    type PanelInfo,
} from '../../../../domain/PanelDomain';
import {
    DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
    shouldUseNumericPanelRangeConfig,
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
import { normalizePersistedPanelRangeConfig } from '../../normalizePersistedPanelRangeConfig';
import { normalizeStoredTimeUnit } from '../../../../domain/time/interval/TimeIntervalUtils';
import type {
    PanelNavigatorRangePair,
    PanelRangeConfig,
} from '../../../../domain/time/model/TimeTypes';
import { normalizePanelNavigatorRangePair } from '../../../../domain/time/boundary/TimeBoundaryValidate';

type NormalizedPersistedPanelInfoV200 = Omit<PersistedPanelInfoV200, 'time'> & {
    time: Omit<PersistedPanelInfoV200['time'], 'rangeConfig'> & {
        rangeConfig: PanelRangeConfig;
        lastViewedRange: PanelNavigatorRangePair | undefined;
    };
};

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
    const sTagSet = sNormalizedPanelInfo.data.seriesList.map(
        createSeriesInfoFromPersistedV200,
    );
    const sMainChartSampling =
        sNormalizedPanelInfo.axes.mainChartSampling ??
        sNormalizedPanelInfo.axes.sampling;

    return {
        key: sNormalizedPanelInfo.meta.panelKey,
        title: sNormalizedPanelInfo.meta.chartTitle,
        query: {
            tagSet: sTagSet,
            count: sNormalizedPanelInfo.data.rowLimit ?? -1,
            intervalType:
                normalizeStoredTimeUnit(sNormalizedPanelInfo.data.intervalType ?? '') ??
                sNormalizedPanelInfo.data.intervalType,
        },
        mode: {
            isRaw: sNormalizedPanelInfo.toolbar.isRaw,
            isOrderBy: true,
            useNormalize: sNormalizedPanelInfo.useNormalizedValues ?? false,
        },
        timeRange: {
            ...sNormalizedPanelInfo.time.rangeConfig,
            useLastViewedRange:
                sNormalizedPanelInfo.time.useLastViewedRange === true,
            lastViewedRange: sNormalizedPanelInfo.time.lastViewedRange,
        },
        axes: {
            x: {
                showTickline: sNormalizedPanelInfo.axes.xAxis.showTickLine ?? false,
            },
            leftY: {
                zeroBase: sNormalizedPanelInfo.axes.leftYAxis.zeroBase ?? false,
                showTickline: sNormalizedPanelInfo.axes.leftYAxis.showTickLine ?? false,
                valueRange: cloneValueRangeOrDefault(
                    sNormalizedPanelInfo.axes.leftYAxis.valueRange,
                ),
                rawValueRange: cloneValueRangeOrDefault(
                    sNormalizedPanelInfo.axes.leftYAxis.rawDataValueRange,
                ),
                upperControlLimit: {
                    enabled:
                        sNormalizedPanelInfo.axes.leftYAxis.upperControlLimit.enabled ??
                        false,
                    value:
                        sNormalizedPanelInfo.axes.leftYAxis.upperControlLimit.value ?? 0,
                },
                lowerControlLimit: {
                    enabled:
                        sNormalizedPanelInfo.axes.leftYAxis.lowerControlLimit.enabled ??
                        false,
                    value:
                        sNormalizedPanelInfo.axes.leftYAxis.lowerControlLimit.value ?? 0,
                },
            },
            rightY: {
                enabled: sNormalizedPanelInfo.axes.rightYAxis.enabled ?? false,
                zeroBase: sNormalizedPanelInfo.axes.rightYAxis.zeroBase ?? false,
                showTickline:
                    sNormalizedPanelInfo.axes.rightYAxis.showTickLine ?? false,
                valueRange: cloneValueRangeOrDefault(
                    sNormalizedPanelInfo.axes.rightYAxis.valueRange,
                ),
                rawValueRange: cloneValueRangeOrDefault(
                    sNormalizedPanelInfo.axes.rightYAxis.rawDataValueRange,
                ),
                upperControlLimit: {
                    enabled:
                        sNormalizedPanelInfo.axes.rightYAxis.upperControlLimit.enabled ??
                        false,
                    value:
                        sNormalizedPanelInfo.axes.rightYAxis.upperControlLimit.value ?? 0,
                },
                lowerControlLimit: {
                    enabled:
                        sNormalizedPanelInfo.axes.rightYAxis.lowerControlLimit.enabled ??
                        false,
                    value:
                        sNormalizedPanelInfo.axes.rightYAxis.lowerControlLimit.value ?? 0,
                },
            },
        },
        display: {
            chartType: normalizePanelEChartType(sNormalizedPanelInfo.display.chartType),
            showLegend: sNormalizedPanelInfo.display.showLegend ?? false,
            showPoint: sNormalizedPanelInfo.display.showPoints ?? false,
            pointRadius: sNormalizedPanelInfo.display.pointRadius ?? 0,
            fill: sNormalizedPanelInfo.display.fill ?? 0,
            stroke: sNormalizedPanelInfo.display.stroke ?? 0,
            connectNulls: sNormalizedPanelInfo.display.connectNulls ?? false,
            useZoom: sNormalizedPanelInfo.display.useZoom ?? false,
            pixelsPerTick: {
                raw: sNormalizedPanelInfo.axes.xAxis.rawDataPixelsPerTick ?? 0,
                calculated:
                    sNormalizedPanelInfo.axes.xAxis.calculatedDataPixelsPerTick ?? 0,
                calculatedNavigator:
                    sNormalizedPanelInfo.axes.xAxis.calculatedDataPixelsPerTick ?? 0,
            },
            mainChartSampling: {
                enabled: sMainChartSampling?.enabled ?? false,
                sampleCount: sMainChartSampling?.sampleCount ?? 0,
            },
        },
        highlights: clonePanelHighlights(sNormalizedPanelInfo.highlights),
        annotations: createPanelAnnotationsFromPersistedPanel(sNormalizedPanelInfo),
    };
}

function createPanelAnnotationsFromPersistedPanel(
    panelInfo: {
        annotations?: PersistedPanelInfoV200['annotations'];
        data: Pick<PersistedPanelInfoV200['data'], 'seriesList'>;
    },
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
): NormalizedPersistedPanelInfoV200 {
    const sNormalizedSeriesList = panelInfo.data.seriesList.map(
        normalizePersistedSeriesInfoV200,
    );
    const sNormalizedRangeConfig = normalizePersistedPanelRangeConfig(
        panelInfo.time.rangeConfig,
        shouldUseNumericPanelRangeConfig(sNormalizedSeriesList),
    );
    if (!sNormalizedRangeConfig) {
        throw new Error('Invalid TagAnalyzer .taz panel time rangeConfig structure.');
    }

    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            seriesList: sNormalizedSeriesList,
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
    lastViewedRange: unknown,
): PanelNavigatorRangePair | undefined {
    return normalizePanelNavigatorRangePair(lastViewedRange);
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
