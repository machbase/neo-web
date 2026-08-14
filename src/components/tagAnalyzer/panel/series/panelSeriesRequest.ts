import type {
    SeriesRowsQuery,
} from '../../api/seriesDataApi';
import {
    calculateInterval,
    getIntervalMs,
    resolveNumericIntervalValue,
    type IntervalOption,
    type TimeUnit,
} from '../../range/intervalResolver';
import {
    createRangeFromCenterAndWidth,
    fitRangeWithinBounds,
    getRangeCenter,
    getRangeWidth,
    isRangeWithin,
} from '../../range/rangeArithmetic';
import type {
    AxisRange,
    ResolvedRangeState,
} from '../../range/rangeModel';
import {
    getSeriesListAxisKind,
    PanelSeriesCalculationMode,
    type RollupTableMap,
} from '../../seriesModel';
import type { PanelInfo } from '../panelModel';

const DEFAULT_CALCULATED_PIXELS_PER_TICK = 3;
const MAIN_CALCULATED_ROW_LIMIT = 10_000;
const NAVIGATOR_PREFETCH_RATIO = 0.5;

export type PanelQueryResolution =
    | { kind: 'raw' }
    | { kind: 'time'; interval: IntervalOption }
    | { kind: 'numeric'; bucketWidth: number };

export type PanelSeriesDataRequest = {
    familyKey: string;
    key: string;
    pixelWidth: number;
    visibleRange: AxisRange;
    fetchQuery: SeriesRowsQuery;
    resolution: PanelQueryResolution;
};

type ResolvePanelSeriesRequestParams = {
    target: 'main' | 'navigator';
    panelInfo: Pick<PanelInfo, 'query' | 'mode' | 'display'>;
    rangeState: ResolvedRangeState;
    visibleRange: AxisRange;
    chartWidth: number;
    rollupTables: RollupTableMap;
    refreshVersion: number;
};

function resolveCalculatedInterval(
    intervalType: TimeUnit | undefined,
    range: AxisRange,
    chartWidth: number,
    pixelsPerTick: number,
): IntervalOption {
    const automaticInterval = calculateInterval(
        range.start,
        range.end,
        chartWidth,
        pixelsPerTick,
    );
    if (intervalType === undefined) return automaticInterval;

    const configuredUnitMs = getIntervalMs(intervalType, 1);
    const automaticIntervalMs = getIntervalMs(
        automaticInterval.IntervalType,
        automaticInterval.IntervalValue,
    );
    if (configuredUnitMs <= 0 || automaticIntervalMs <= 0) {
        return automaticInterval;
    }

    return {
        IntervalType: intervalType,
        IntervalValue: Math.max(
            1,
            Math.ceil(automaticIntervalMs / configuredUnitMs),
        ),
    };
}

export function buildPanelSeriesQuery(
    target: 'main' | 'navigator',
    panelInfo: Pick<PanelInfo, 'query' | 'mode' | 'display'>,
    range: AxisRange,
    chartWidth: number,
    rollupTables: RollupTableMap,
): SeriesRowsQuery {
    if (
        !Number.isFinite(range.start) ||
        !Number.isFinite(range.end) ||
        range.start >= range.end
    ) {
        throw new Error('Panel data requests require a valid range.');
    }
    if (!Number.isFinite(chartWidth) || chartWidth <= 0) {
        throw new Error('Panel data requests require a positive chart width.');
    }

    const seriesList =
        panelInfo.mode.isRaw &&
        target === 'navigator' &&
        !panelInfo.display.rawNavigatorSampling.enabled
            ? panelInfo.query.tagSet.map((series) => ({
                  ...series,
                  calculationMode: PanelSeriesCalculationMode.Average,
              }))
            : panelInfo.query.tagSet;
    const axisKind = getSeriesListAxisKind(seriesList);
    if (axisKind === undefined) {
        throw new Error(
            'Panel data requests require compatible series with one x-axis kind.',
        );
    }

    const useRawQuery =
        panelInfo.mode.isRaw &&
        (
            target === 'main' ||
            panelInfo.display.rawNavigatorSampling.enabled
        );
    if (useRawQuery) {
        const sampling = target === 'main'
            ? panelInfo.display.mainChartSampling
            : panelInfo.display.rawNavigatorSampling;
        if (!sampling.enabled) {
            return {
                kind: 'raw',
                seriesList,
                range,
                useOrderBy: panelInfo.mode.isOrderBy,
            };
        }

        const sampleCount = sampling.sampleCount;
        if (
            sampleCount === undefined ||
            !Number.isFinite(sampleCount) ||
            sampleCount <= 0
        ) {
            throw new Error(
                'Raw panel sampling requires a positive sample count.',
            );
        }

        return {
            kind: 'sampled-raw',
            seriesList,
            range,
            sampleCount,
            useOrderBy: panelInfo.mode.isOrderBy,
        };
    }

    const configuredPixelsPerTick = target === 'main'
        ? panelInfo.display.pixelsPerTick.calculated
        : panelInfo.display.pixelsPerTick.calculatedNavigator;
    const pixelsPerTick =
        configuredPixelsPerTick ?? DEFAULT_CALCULATED_PIXELS_PER_TICK;
    if (!Number.isFinite(pixelsPerTick) || pixelsPerTick <= 0) {
        throw new Error(
            'Calculated panel data requires a positive pixel density.',
        );
    }

    const rowLimit = Math.max(1, Math.floor(chartWidth / pixelsPerTick));
    const interval = resolveCalculatedInterval(
        panelInfo.query.intervalType,
        range,
        chartWidth,
        pixelsPerTick,
    );
    const numericBucketWidth =
        axisKind === 'numeric'
            ? resolveNumericIntervalValue(range.end - range.start, rowLimit)
            : undefined;

    return {
        kind: 'calculated',
        seriesList,
        range,
        interval,
        rowLimit,
        rollupTables,
        numericBucketWidth,
    };
}

export function resolvePanelSeriesRequest({
    target,
    panelInfo,
    rangeState,
    visibleRange,
    chartWidth,
    rollupTables,
    refreshVersion,
}: ResolvePanelSeriesRequestParams): PanelSeriesDataRequest {
    let fetchQuery = buildPanelSeriesQuery(
        target,
        panelInfo,
        target === 'navigator'
            ? createPaddedRange(
                  visibleRange,
                  rangeState.fullRange,
                  NAVIGATOR_PREFETCH_RATIO,
              )
            : visibleRange,
        chartWidth,
        rollupTables,
    );
    if (target === 'main' && fetchQuery.kind === 'calculated') {
        const rowLimit = Math.max(
            MAIN_CALCULATED_ROW_LIMIT,
            fetchQuery.rowLimit,
        );
        const desiredRange = fetchQuery.numericBucketWidth === undefined
            ? fitRangeWithinBounds(
                  rangeState.range.navigatorRange,
                  rangeState.fullRange,
              )
            : createPaddedRange(visibleRange, rangeState.fullRange, 1);
        fetchQuery = {
            ...fetchQuery,
            range: resolveCalculatedMainFetchRange(
                visibleRange,
                desiredRange,
                fetchQuery.numericBucketWidth ??
                    getIntervalMs(
                        fetchQuery.interval.IntervalType,
                        fetchQuery.interval.IntervalValue,
                    ),
                rowLimit,
            ),
            rowLimit,
        };
    }
    if (
        fetchQuery.kind === 'calculated' &&
        fetchQuery.numericBucketWidth !== undefined
    ) {
        fetchQuery = {
            ...fetchQuery,
            range: {
                ...fetchQuery.range,
                start:
                    Math.floor(
                        fetchQuery.range.start /
                            fetchQuery.numericBucketWidth,
                    ) * fetchQuery.numericBucketWidth,
            },
        };
    }

    const resolution: PanelQueryResolution =
        fetchQuery.kind !== 'calculated'
            ? { kind: 'raw' }
            : fetchQuery.numericBucketWidth !== undefined
              ? {
                    kind: 'numeric',
                    bucketWidth: fetchQuery.numericBucketWidth,
                }
              : { kind: 'time', interval: fetchQuery.interval };
    const { familyKey, exactKey } = createSeriesRowsQueryKeys(fetchQuery);

    return {
        familyKey: JSON.stringify([refreshVersion, familyKey, resolution]),
        key: JSON.stringify([refreshVersion, exactKey]),
        pixelWidth: chartWidth,
        visibleRange,
        fetchQuery,
        resolution,
    };
}

function createPaddedRange(
    visibleRange: AxisRange,
    fullRange: AxisRange,
    paddingRatio: number,
): AxisRange {
    return fitRangeWithinBounds(
        createRangeFromCenterAndWidth(
            getRangeCenter(visibleRange),
            getRangeWidth(visibleRange) * (1 + 2 * paddingRatio),
        ),
        fullRange,
    );
}

function resolveCalculatedMainFetchRange(
    visibleRange: AxisRange,
    fetchRange: AxisRange,
    step: number,
    rowLimit: number,
): AxisRange {
    if (!isRangeWithin(visibleRange, fetchRange)) {
        return visibleRange;
    }
    const visibleWidth = getRangeWidth(visibleRange);
    const width = Math.max(
        visibleWidth,
        Math.min(
            getRangeWidth(fetchRange),
            step > 0
                ? step * (rowLimit - 1)
                : visibleWidth,
        ),
    );
    return fitRangeWithinBounds(
        createRangeFromCenterAndWidth(getRangeCenter(visibleRange), width),
        fetchRange,
    );
}

export function createSeriesRowsQueryKeys(
    query: SeriesRowsQuery,
): { familyKey: string; exactKey: string } {
    const includeCalculation = query.kind === 'calculated';
    const seriesKey = query.seriesList.map((series) => ({
        key: series.key,
        table: series.table,
        sourceTagName: series.sourceTagName,
        sourceColumns: series.sourceColumns,
        ...(includeCalculation
            ? {
                  calculationMode: series.calculationMode,
                  useRollupTable: series.useRollupTable,
              }
            : {}),
    }));
    const [familyOptions, resolutionOptions]: [unknown, unknown] =
        query.kind === 'raw'
            ? [{ useOrderBy: query.useOrderBy }, undefined]
            : query.kind === 'sampled-raw'
              ? [
                    {
                        sampleCount: query.sampleCount,
                        useOrderBy: query.useOrderBy,
                    },
                    undefined,
                ]
              : [
                    { rollupTables: query.rollupTables },
                    {
                        interval: query.interval,
                        rowLimit: query.rowLimit,
                        numericBucketWidth: query.numericBucketWidth,
                    },
                ];
    const familyKey = JSON.stringify([
        query.kind,
        seriesKey,
        familyOptions,
    ]);

    return {
        familyKey,
        exactKey: JSON.stringify([
            familyKey,
            query.range,
            resolutionOptions,
        ]),
    };
}
