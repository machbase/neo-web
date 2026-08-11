import type {
    PanelSeriesRowsRequest,
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

type MainSeriesRequestOptions = {
    interval?: IntervalOption;
    numericBucketWidth?: number;
    signal?: AbortSignal;
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

export function buildMainSeriesRequest(
    panelInfo: Pick<PanelInfo, 'query' | 'mode' | 'display'>,
    range: AxisRange,
    chartWidth: number,
    rollupTables: RollupTableMap,
    options: MainSeriesRequestOptions = {},
): PanelSeriesRowsRequest {
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

    if (panelInfo.mode.isRaw) {
        const sampling = panelInfo.display.mainChartSampling;
        if (!sampling.enabled) {
            return {
                kind: 'raw',
                args: [
                    seriesList,
                    range,
                    panelInfo.mode.isOrderBy,
                    options.signal,
                ],
            };
        }

        const sampleCount = sampling.sampleCount;
        if (
            sampleCount === undefined ||
            !Number.isFinite(sampleCount) ||
            sampleCount <= 0
        ) {
            throw new Error(
                'Raw main-chart sampling requires a positive sample count.',
            );
        }

        return {
            kind: 'sampled-raw',
            args: [
                seriesList,
                range,
                sampleCount,
                panelInfo.mode.isOrderBy,
                options.signal,
            ],
        };
    }

    const pixelsPerTick =
        panelInfo.display.pixelsPerTick.calculated ??
        DEFAULT_CALCULATED_PIXELS_PER_TICK;
    if (!Number.isFinite(pixelsPerTick) || pixelsPerTick <= 0) {
        throw new Error(
            'Calculated panel data requires a positive pixel density.',
        );
    }

    const rowLimit = Math.max(1, Math.floor(chartWidth / pixelsPerTick));
    const interval =
        options.interval ??
        resolveCalculatedInterval(
            panelInfo.query.intervalType,
            range,
            chartWidth,
            pixelsPerTick,
        );
    const numericBucketWidth =
        axisKind === 'numeric'
            ? options.numericBucketWidth ??
              resolveNumericIntervalValue(range.end - range.start, rowLimit)
            : undefined;

    return {
        kind: 'calculated',
        args: [
            seriesList,
            range,
            interval,
            rowLimit,
            rollupTables,
            { numericBucketWidth, signal: options.signal },
        ],
    };
}
