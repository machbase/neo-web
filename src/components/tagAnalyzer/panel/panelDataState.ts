import type { PanelDataFetchResult } from '../api/seriesDataApi';
import type { AxisRange } from '../range/rangeModel';

type PanelDisplayNotice = 'No Data' | 'Some series unavailable';

export function getReusablePanelDataRange(
    result: PanelDataFetchResult,
    queryRange: AxisRange,
): AxisRange | undefined {
    if (
        result.some(({ error }) => error !== undefined) ||
        hasFetchLimitReached(result)
    ) {
        return undefined;
    }

    if (
        result.length === 0 ||
        !result.some(({ metadata }) => metadata?.kind === 'raw')
    ) {
        return queryRange;
    }

    let sStart: number = Number.NEGATIVE_INFINITY;
    let sEnd: number = Number.POSITIVE_INFINITY;
    for (const { data } of result) {
        sStart = Math.max(
            sStart,
            Math.min(queryRange.start, data[0]?.[0] ?? queryRange.start),
        );
        sEnd = Math.min(
            sEnd,
            Math.max(
                queryRange.end,
                data[data.length - 1]?.[0] ?? queryRange.end,
            ),
        );
    }

    return { start: sStart, end: sEnd };
}

export function hasFetchLimitReached(result: PanelDataFetchResult): boolean {
    return result.some(
        ({ metadata }) => metadata?.isLimitReached === true,
    );
}

export function resolvePanelDisplay(
    result: PanelDataFetchResult | undefined,
    requestedRange: AxisRange,
    isRaw: boolean,
): { range: AxisRange; notice: PanelDisplayNotice | undefined } {
    return {
        range: isRaw && result && hasFetchLimitReached(result)
            ? getFetchedRowsRange(result) ?? requestedRange
            : requestedRange,
        notice: resolveDisplayNotice(result),
    };
}

export function getUnavailableSeriesCount(
    result: PanelDataFetchResult,
): number {
    return result.filter(({ error }) => error !== undefined).length;
}

export function hasOnlyNoDataSeriesErrors(
    result: PanelDataFetchResult,
): boolean {
    return result.every(({ error }) => error?.kind === 'no-data');
}

function resolveDisplayNotice(
    result: PanelDataFetchResult | undefined,
): PanelDisplayNotice | undefined {
    if (!result) return undefined;

    const unavailableSeriesCount = getUnavailableSeriesCount(result);
    if (unavailableSeriesCount === 0) return undefined;

    return unavailableSeriesCount === result.length &&
        hasOnlyNoDataSeriesErrors(result)
        ? 'No Data'
        : 'Some series unavailable';
}

function getFetchedRowsRange(
    result: PanelDataFetchResult,
): AxisRange | undefined {
    const boundaryTimes: number[] = result.flatMap(({ data }) =>
        data.length > 0
            ? [data[0][0], data[data.length - 1][0]]
            : [],
    );
    if (boundaryTimes.length === 0) return undefined;

    const startTime = Math.min(...boundaryTimes);
    const endTime = Math.max(...boundaryTimes);
    return {
        start: startTime,
        end: Math.max(endTime, startTime + 1),
    };
}
