import type {
    PanelDisplayRangeState,
    PanelRangeState,
} from '../../domain/panel/PanelConfig';
import {
    getNavigatorTrackWidth,
    resolveNavigatorRangeForPanel,
} from '../../domain/panelRange/PanelRangeApply';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';
import {
    createTimeRangeMs,
    ensureMinimumTimeRangeWidth,
    isSameTimeRange,
    isValidTimeRange,
} from '../../domain/time/TimeRangeUtils';
import type { FetchPanelSeriesRowsResult } from '../../fetch/panelData/PanelDataFetchTypes';
import type { PanelChartDataLoadConfig } from './panelChartLoadConfig';
import { hasFetchLimitReached } from './panelFetchResultStatus';

export type PanelDisplayNotice = 'No Data' | 'Some series unavailable';

const MIN_DISPLAY_DATA_RANGE_WIDTH = 1;

export function resolveNavigatorRangeWithPixelWidth(
    displayPanelRange: TimeRangeMs,
    requestNavigatorRange: TimeRangeMs,
    chartAreaWidth: number | undefined,
): TimeRangeMs {
    if (!isValidTimeRange(displayPanelRange) || !isValidTimeRange(requestNavigatorRange)) {
        return requestNavigatorRange;
    }

    const sNavigatorTrackPixelWidth =
        chartAreaWidth !== undefined && chartAreaWidth > 0
            ? getNavigatorTrackWidth(chartAreaWidth)
            : undefined;

    return resolveNavigatorRangeForPanel(
        displayPanelRange,
        requestNavigatorRange,
        sNavigatorTrackPixelWidth,
    );
}

export function createPanelDisplayRangeState(
    displayPanelRange: TimeRangeMs,
    displayNavigatorRange: TimeRangeMs,
    isDefaultNavigatorRangeValue: boolean,
): PanelDisplayRangeState {
    return {
        displayPanelRange,
        displayNavigatorRange,
        isDefaultNavigatorRange: isDefaultNavigatorRangeValue,
    };
}

export function applyFetchedPanelRangeCorrection({
    result,
    rangeState,
    requestPanelRange,
    onRangeStateChange,
}: {
    result: FetchPanelSeriesRowsResult;
    rangeState: PanelRangeState;
    requestPanelRange: TimeRangeMs;
    onRangeStateChange: (rangeState: PanelRangeState) => void;
}): void {
    const sCorrectedPanelRange = resolveFetchedPanelRangeCorrection(
        result,
        requestPanelRange,
    );

    if (!sCorrectedPanelRange) {
        return;
    }

    onRangeStateChange({
        ...rangeState,
        requestPanelRange: sCorrectedPanelRange,
    });
}

export function resolveDisplayPanelRange(
    result: FetchPanelSeriesRowsResult | undefined,
    fallbackRange: TimeRangeMs,
): TimeRangeMs {
    if (!isRawWithLimitReached(result)) {
        return fallbackRange;
    }

    return getFetchedRowsRange(result) ?? fallbackRange;
}

export function resolveVisibleDisplayResult(
    result: FetchPanelSeriesRowsResult | undefined,
    requestPanelRange: TimeRangeMs,
): FetchPanelSeriesRowsResult | undefined {
    if (!result || !isValidTimeRange(requestPanelRange)) {
        return result;
    }

    return {
        ...result,
        seriesFetchResults: result.seriesFetchResults.map((seriesResult) => ({
            ...seriesResult,
            fetchResult: {
                ...seriesResult.fetchResult,
                data: {
                    ...seriesResult.fetchResult.data,
                    rows: seriesResult.fetchResult.data.rows.filter((row) => {
                        const sTimestamp = Number(row[0]);

                        return (
                            Number.isFinite(sTimestamp) &&
                            sTimestamp >= requestPanelRange.startTime &&
                            sTimestamp <= requestPanelRange.endTime
                        );
                    }),
                },
            },
        })),
    };
}

export function resolvePanelDisplayNotice(
    result: FetchPanelSeriesRowsResult | undefined,
): PanelDisplayNotice | undefined {
    if (!result || result.seriesFetchResults.length === 0) {
        return undefined;
    }

    const sUnavailableSeriesCount = getUnavailableSeriesCount(
        result,
    );

    if (sUnavailableSeriesCount === 0) {
        return undefined;
    }

    if (sUnavailableSeriesCount !== result.seriesFetchResults.length) {
        return 'Some series unavailable';
    }

    return hasOnlyNoDataSeriesErrors(result)
        ? 'No Data'
        : 'Some series unavailable';
}

export function resolveInvalidRangeDisplayNotice({
    canFetch,
    loadConfig,
    rangeState,
}: {
    canFetch: boolean;
    loadConfig: PanelChartDataLoadConfig;
    rangeState: PanelRangeState;
}): PanelDisplayNotice | undefined {
    if (
        canFetch ||
        loadConfig.seriesList.length === 0 ||
        isValidTimeRange(rangeState.fullRange)
    ) {
        return undefined;
    }

    return 'No Data';
}

function resolveFetchedPanelRangeCorrection(
    result: FetchPanelSeriesRowsResult,
    requestPanelRange: TimeRangeMs,
): TimeRangeMs | undefined {
    if (!isRawWithLimitReached(result)) {
        return undefined;
    }

    const sFetchedRowsRange = getFetchedRowsRange(result);
    if (
        !sFetchedRowsRange ||
        isSameTimeRange(sFetchedRowsRange, requestPanelRange)
    ) {
        return undefined;
    }

    return sFetchedRowsRange;
}

function isRawWithLimitReached(
    result: FetchPanelSeriesRowsResult | undefined,
): result is FetchPanelSeriesRowsResult {
    return result?.isRaw === true && hasFetchLimitReached(result);
}

function getFetchedRowsRange(
    result: FetchPanelSeriesRowsResult,
): TimeRangeMs | undefined {
    let sStartTime = Number.POSITIVE_INFINITY;
    let sEndTime = Number.NEGATIVE_INFINITY;

    for (const { fetchResult } of result.seriesFetchResults) {
        for (const row of fetchResult.data.rows) {
            const sTimestamp = Number(row[0]);

            if (!Number.isFinite(sTimestamp)) {
                continue;
            }

            sStartTime = Math.min(sStartTime, sTimestamp);
            sEndTime = Math.max(sEndTime, sTimestamp);
        }
    }

    if (!Number.isFinite(sStartTime) || !Number.isFinite(sEndTime)) {
        return undefined;
    }

    return ensureMinimumTimeRangeWidth(
        createTimeRangeMs(sStartTime, sEndTime),
        MIN_DISPLAY_DATA_RANGE_WIDTH,
    );
}

function getUnavailableSeriesCount(
    result: FetchPanelSeriesRowsResult,
): number {
    return result.seriesFetchResults.filter(
        ({ error }) => error !== undefined,
    ).length;
}

function hasOnlyNoDataSeriesErrors(
    result: FetchPanelSeriesRowsResult,
): boolean {
    return result.seriesFetchResults.every(
        ({ error }) => error?.kind === 'no-data',
    );
}
