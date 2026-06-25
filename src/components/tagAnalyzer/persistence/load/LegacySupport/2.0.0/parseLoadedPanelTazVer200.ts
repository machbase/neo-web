import {
    DEFAULT_RAW_NAVIGATOR_SAMPLING,
    normalizePanelQueryCount,
    normalizePanelEChartType,
    type PanelAnnotation,
    type PanelInfo,
    type PanelYAxis,
} from '../../../../domain/panel/PanelConfig';
import { isPlainObject } from '../../../../domain/ObjectGuards';
import {
    DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
    shouldUseNumericPanelRangeInput,
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
} from '../../../../domain/SeriesDomain';
import {
    clonePanelAnnotations,
    clonePanelHighlights,
    cloneSeriesAnnotations,
} from '../../../PersistenceCloneUtils';
import type { PersistedPanelInfoV200 } from '../../../TazPersistenceTypesV200';
import { normalizePersistedPanelRangeInput } from '../../normalizePersistedPanelRangeInput';
import { normalizePersistedValueRangeOrAuto } from '../../normalizePersistedValueRange';
import { normalizeStoredTimeUnit } from '../../../../domain/time/TimeIntervalUtils';
import type {
    PanelViewRange,
    PanelRangeInput,
} from '../../../../domain/time/TimeTypes';
import { normalizePanelViewRange } from '../../../../domain/panelRange/PanelRangeResolver';

type NormalizedPersistedPanelInfoV200 = Omit<PersistedPanelInfoV200, 'time'> & {
    time: Omit<PersistedPanelInfoV200['time'], 'rangeConfig'> & {
        rangeConfig: PanelRangeInput;
        lastViewedRange: PanelViewRange | undefined;
    };
};

export function isPersistedPanelInfoV200(
    panelInfo: unknown,
): panelInfo is PersistedPanelInfoV200 {
    if (!isPlainObject(panelInfo)) {
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
            count: sNormalizedPanelInfo.data.rowLimit,
            intervalType:
                normalizeStoredTimeUnit(sNormalizedPanelInfo.data.intervalType ?? '') ??
                sNormalizedPanelInfo.data.intervalType,
        },
        mode: {
            isRaw: sNormalizedPanelInfo.toolbar.isRaw,
            isOrderBy: true,
            useNormalize: sNormalizedPanelInfo.useNormalizedValues ?? false,
        },
        time: {
            rangeInput: sNormalizedPanelInfo.time.rangeConfig,
            useLastViewedRange:
                sNormalizedPanelInfo.time.useLastViewedRange === true,
            lastViewedRange: sNormalizedPanelInfo.time.lastViewedRange,
        },
        axes: {
            x: {
                showTickline: sNormalizedPanelInfo.axes.xAxis.showTickLine ?? false,
            },
            leftY: mapNormalizedYAxis(sNormalizedPanelInfo.axes.leftYAxis),
            rightY: {
                ...mapNormalizedYAxis(sNormalizedPanelInfo.axes.rightYAxis),
                enabled: sNormalizedPanelInfo.axes.rightYAxis.enabled ?? false,
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
            rawNavigatorSampling: { ...DEFAULT_RAW_NAVIGATOR_SAMPLING },
        },
        highlights: clonePanelHighlights(sNormalizedPanelInfo.highlights),
        annotations: createPanelAnnotationsFromPersistedPanel(sNormalizedPanelInfo),
    };
}

function mapNormalizedYAxis(
    axis: NormalizedPersistedPanelInfoV200['axes']['leftYAxis'],
): PanelYAxis {
    return {
        zeroBase: axis.zeroBase ?? false,
        showTickline: axis.showTickLine ?? false,
        valueRange: normalizePersistedValueRangeOrAuto(axis.valueRange),
        rawValueRange: normalizePersistedValueRangeOrAuto(axis.rawDataValueRange),
        upperControlLimit: {
            enabled: axis.upperControlLimit.enabled ?? false,
            value: axis.upperControlLimit.value ?? 0,
        },
        lowerControlLimit: {
            enabled: axis.lowerControlLimit.enabled ?? false,
            value: axis.lowerControlLimit.value ?? 0,
        },
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
    const sNormalizedRangeConfig = normalizePersistedPanelRangeInput(
        panelInfo.time.rangeConfig,
        shouldUseNumericPanelRangeInput(sNormalizedSeriesList),
    );
    if (!sNormalizedRangeConfig) {
        throw new Error('Invalid TagAnalyzer .taz panel time rangeConfig structure.');
    }

    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            seriesList: sNormalizedSeriesList,
            rowLimit: normalizePanelQueryCount(panelInfo.data.rowLimit),
        },
        toolbar: {
            isRaw: panelInfo.toolbar.isRaw,
        },
        time: {
            rangeConfig: sNormalizedRangeConfig,
            useLastViewedRange: panelInfo.time.useLastViewedRange === true,
            lastViewedRange: normalizePanelViewRange(
                panelInfo.time.lastViewedRange,
            ),
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
