import {
    DEFAULT_RAW_NAVIGATOR_SAMPLING,
    normalizePanelQueryCount,
    type PanelInfo,
    type PanelYAxis,
} from '../../domain/panel/PanelConfig';
import { isPlainObject } from '../../domain/ObjectGuards';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
import { normalizeStoredTimeUnit } from '../../domain/time/TimeIntervalUtils';
import { normalizePanelViewRange } from '../../domain/panelRange/PanelRangeResolver';
import { shouldUseNumericPanelRangeInput } from '../../domain/SeriesDomain';
import {
    clonePanelAnnotations,
    clonePanelHighlights,
} from '../PersistenceCloneUtils';
import type { PersistedPanelInfoV210 } from '../TazPersistenceTypesV210';
import { normalizePersistedPanelRangeInput } from './normalizePersistedPanelRangeInput';
import { normalizePersistedValueRange } from './normalizePersistedValueRange';

export function isPersistedPanelInfoV210(
    panelInfo: unknown,
): panelInfo is PersistedPanelInfoV210 {
    if (!isPlainObject(panelInfo)) {
        return false;
    }

    const sPanelInfo = panelInfo as Partial<PersistedPanelInfoV210>;
    return (
        typeof sPanelInfo.key === 'string' &&
        typeof sPanelInfo.title === 'string' &&
        !!sPanelInfo.query &&
        typeof sPanelInfo.query === 'object' &&
        Array.isArray(sPanelInfo.query.tagSet) &&
        !!sPanelInfo.mode &&
        typeof sPanelInfo.mode === 'object' &&
        typeof sPanelInfo.mode.isRaw === 'boolean' &&
        typeof sPanelInfo.mode.isOrderBy === 'boolean' &&
        typeof sPanelInfo.mode.useNormalize === 'boolean' &&
        !!sPanelInfo.timeRange &&
        typeof sPanelInfo.timeRange === 'object' &&
        !!sPanelInfo.axes &&
        typeof sPanelInfo.axes === 'object' &&
        !!sPanelInfo.display &&
        typeof sPanelInfo.display === 'object'
    );
}

export function parseLoadedPanelTazVer210(
    panelInfo: PersistedPanelInfoV210,
): PanelInfo {
    assertValidPersistedPanelInfoV210(panelInfo);

    const sTagSet = panelInfo.query.tagSet.map(mapPersistedSeriesToRuntime);
    const sRangeInput = normalizePersistedPanelRangeInput(
        panelInfo.timeRange,
        shouldUseNumericPanelRangeInput(sTagSet),
    );
    if (!sRangeInput) {
        throw new Error('Invalid TagAnalyzer .taz v2.1 panel timeRange structure.');
    }

    const sIntervalType =
        normalizeStoredTimeUnit(panelInfo.query.intervalType ?? '') ??
        panelInfo.query.intervalType;

    return {
        key: panelInfo.key,
        title: panelInfo.title,
        query: {
            tagSet: sTagSet,
            count: normalizePanelQueryCount(panelInfo.query.count),
            intervalType: sIntervalType,
        },
        mode: {
            isRaw: panelInfo.mode.isRaw,
            isOrderBy: panelInfo.mode.isOrderBy,
            useNormalize: panelInfo.mode.useNormalize,
        },
        time: {
            rangeInput: sRangeInput,
            useLastViewedRange: panelInfo.timeRange.useLastViewedRange ?? false,
            lastViewedRange: normalizePanelViewRange(
                panelInfo.timeRange.lastViewedRange,
            ),
        },
        axes: {
            x: {
                showTickline: panelInfo.axes.x.showTickline,
            },
            leftY: mapPersistedYAxis(panelInfo.axes.leftY),
            rightY: {
                ...mapPersistedYAxis(panelInfo.axes.rightY),
                enabled: panelInfo.axes.rightY.enabled,
            },
        },
        display: {
            chartType: panelInfo.display.chartType,
            showLegend: panelInfo.display.showLegend,
            showPoint: panelInfo.display.showPoint,
            pointRadius: panelInfo.display.pointRadius,
            fill: panelInfo.display.fill,
            stroke: panelInfo.display.stroke,
            connectNulls: panelInfo.display.connectNulls,
            useZoom: panelInfo.display.useZoom,
            pixelsPerTick: {
                raw: panelInfo.display.pixelsPerTick.raw,
                calculated: panelInfo.display.pixelsPerTick.calculated,
                calculatedNavigator:
                    panelInfo.display.pixelsPerTick.calculatedNavigator,
            },
            mainChartSampling: {
                enabled: panelInfo.display.mainChartSampling.enabled,
                sampleCount: panelInfo.display.mainChartSampling.sampleCount,
            },
            rawNavigatorSampling: {
                enabled: panelInfo.display.rawNavigatorSampling?.enabled ??
                    DEFAULT_RAW_NAVIGATOR_SAMPLING.enabled,
                sampleCount: panelInfo.display.rawNavigatorSampling?.sampleCount ??
                    DEFAULT_RAW_NAVIGATOR_SAMPLING.sampleCount,
            },
        },
        highlights: clonePanelHighlights(panelInfo.highlights),
        annotations: clonePanelAnnotations(panelInfo.annotations),
    };
}

function assertValidPersistedPanelInfoV210(
    panelInfo: PersistedPanelInfoV210,
): void {
    const sAxes = panelInfo.axes as Partial<PersistedPanelInfoV210['axes']>;
    const sXAxis = assertObject(sAxes.x, 'axes.x');
    const sLeftYAxis = assertObject(sAxes.leftY, 'axes.leftY');
    const sRightYAxis = assertObject(sAxes.rightY, 'axes.rightY');
    const sDisplay = panelInfo.display as Partial<PersistedPanelInfoV210['display']>;
    const sPixelsPerTick = assertObject(
        sDisplay.pixelsPerTick,
        'display.pixelsPerTick',
    );
    const sMainChartSampling = assertObject(
        sDisplay.mainChartSampling,
        'display.mainChartSampling',
    );
    const sRawNavigatorSampling = sDisplay.rawNavigatorSampling === undefined
        ? undefined
        : assertObject(
            sDisplay.rawNavigatorSampling,
            'display.rawNavigatorSampling',
        );

    assertBoolean(sXAxis.showTickline, 'axes.x.showTickline');
    assertYAxis(sLeftYAxis, 'axes.leftY');
    assertYAxis(sRightYAxis, 'axes.rightY');
    assertBoolean(sRightYAxis.enabled, 'axes.rightY.enabled');
    assertPositiveNumber(
        sPixelsPerTick.raw,
        'display.pixelsPerTick.raw',
    );
    assertPositiveNumber(
        sPixelsPerTick.calculated,
        'display.pixelsPerTick.calculated',
    );
    assertPositiveNumber(
        sPixelsPerTick.calculatedNavigator,
        'display.pixelsPerTick.calculatedNavigator',
    );
    assertSampling(
        sMainChartSampling,
        'display.mainChartSampling',
    );
    if (sRawNavigatorSampling !== undefined) {
        assertSampling(
            sRawNavigatorSampling,
            'display.rawNavigatorSampling',
        );
    }
}

function assertYAxis(
    axis: Record<string, unknown>,
    path: string,
): void {
    const sValueRange = assertObject(axis.valueRange, `${path}.valueRange`);
    const sRawValueRange = assertObject(axis.rawValueRange, `${path}.rawValueRange`);
    const sUpperControlLimit = assertObject(
        axis.upperControlLimit,
        `${path}.upperControlLimit`,
    );
    const sLowerControlLimit = assertObject(
        axis.lowerControlLimit,
        `${path}.lowerControlLimit`,
    );

    assertBoolean(axis.zeroBase, `${path}.zeroBase`);
    assertBoolean(axis.showTickline, `${path}.showTickline`);
    assertValueRange(sValueRange, `${path}.valueRange`);
    assertValueRange(sRawValueRange, `${path}.rawValueRange`);
    assertAxisThreshold(sUpperControlLimit, `${path}.upperControlLimit`);
    assertAxisThreshold(sLowerControlLimit, `${path}.lowerControlLimit`);
}

function assertValueRange(
    range: Record<string, unknown>,
    path: string,
): void {
    assertOptionalFiniteNumber(range.min, `${path}.min`);
    assertOptionalFiniteNumber(range.max, `${path}.max`);

    const sMin = range.min;
    const sMax = range.max;
    const sHasMin = sMin !== undefined;
    const sHasMax = sMax !== undefined;

    if (sHasMin !== sHasMax) {
        throwInvalidPanelError(path);
    }

    if (!normalizePersistedValueRange(range)) {
        throwInvalidPanelError(path);
    }
}

function assertAxisThreshold(
    threshold: Record<string, unknown>,
    path: string,
): void {
    assertBoolean(threshold.enabled, `${path}.enabled`);
    assertOptionalFiniteNumber(threshold.value, `${path}.value`);

    if (threshold.enabled === true && threshold.value === undefined) {
        throwInvalidPanelError(`${path}.value`);
    }
}

function assertSampling(
    sampling: Record<string, unknown>,
    path: string,
): void {
    assertBoolean(sampling.enabled, `${path}.enabled`);
    assertOptionalFiniteNumber(sampling.sampleCount, `${path}.sampleCount`);

    if (sampling.enabled === true && sampling.sampleCount === undefined) {
        throwInvalidPanelError(`${path}.sampleCount`);
    }
}

function mapPersistedYAxis(
    axis: PersistedPanelInfoV210['axes']['leftY'],
): PanelYAxis {
    return {
        zeroBase: axis.zeroBase,
        showTickline: axis.showTickline,
        valueRange: normalizeLoadedValueRange(axis.valueRange, 'valueRange'),
        rawValueRange: normalizeLoadedValueRange(axis.rawValueRange, 'rawValueRange'),
        upperControlLimit: { ...axis.upperControlLimit },
        lowerControlLimit: { ...axis.lowerControlLimit },
    };
}

function normalizeLoadedValueRange(
    valueRange: unknown,
    label: string,
): PanelYAxis['valueRange'] {
    const sValueRange = normalizePersistedValueRange(valueRange);
    if (!sValueRange) {
        throwInvalidPanelError(`axes.${label}`);
    }

    return sValueRange;
}
function assertObject(value: unknown, path: string): Record<string, unknown> {
    if (!isPlainObject(value)) {
        throwInvalidPanelError(path);
    }

    return value;
}

function assertBoolean(value: unknown, path: string): void {
    if (typeof value !== 'boolean') {
        throwInvalidPanelError(path);
    }
}

function assertPositiveNumber(value: unknown, path: string): void {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throwInvalidPanelError(path);
    }
}

function assertOptionalFiniteNumber(value: unknown, path: string): void {
    if (
        value !== undefined &&
        (typeof value !== 'number' || !Number.isFinite(value))
    ) {
        throwInvalidPanelError(path);
    }
}

function throwInvalidPanelError(path: string): never {
    throw new Error(`Invalid TagAnalyzer .taz v2.1 panel value: ${path}.`);
}

function mapPersistedSeriesToRuntime(
    series: PanelSeriesDefinition,
): PanelSeriesDefinition {
    return {
        ...series,
        id: series.id ?? undefined,
        sourceColumns: { ...series.sourceColumns },
    };
}
