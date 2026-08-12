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
import type { AxisRange } from '../../range/rangeModel';
import {
    getSeriesListAxisKind,
    type RollupTableMap,
} from '../../seriesModel';
import type { PanelInfo } from '../panelModel';

const DEFAULT_CALCULATED_PIXELS_PER_TICK = 3;

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

    const seriesList = panelInfo.query.tagSet;
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
