import type {
    FetchedTimeBoundaryRange,
    TimeRangeConfig,
} from '../time/TimeTypes';
import {
    isAbsoluteTimeBoundary,
    isEmptyTimeBoundary,
    isLastTimeBoundary,
} from '../time/TimeBoundaryGuards';
import { timeBoundaryRangeFetcherApi } from './helper/TimeBoundaryRangeFetcher';
import type { BoundarySeries } from './FetchContracts';

export async function resolveTimeBoundaryRanges<T extends BoundarySeries>(
    seriesConfigSet: T[],
    boardTime: TimeRangeConfig,
    panelTime: TimeRangeConfig,
): Promise<FetchedTimeBoundaryRange | undefined> {
    const sActiveRangeConfig =
        !isEmptyTimeBoundary(panelTime.start) && !isEmptyTimeBoundary(panelTime.end)
            ? panelTime
            : boardTime;

    if (
        isAbsoluteTimeBoundary(sActiveRangeConfig.start) &&
        isAbsoluteTimeBoundary(sActiveRangeConfig.end)
    ) {
        return {
            start: {
                min: sActiveRangeConfig.start,
                max: sActiveRangeConfig.start,
            },
            end: {
                min: sActiveRangeConfig.end,
                max: sActiveRangeConfig.end,
            },
        };
    } else if (seriesConfigSet.length === 0) {
        return undefined;
    } else if (
        isLastTimeBoundary(sActiveRangeConfig.start) &&
        isLastTimeBoundary(sActiveRangeConfig.end)
    ) {
        return resolveLastRelativeBoundaryRange(seriesConfigSet);
    } else {
        return resolveSeriesMinMaxBoundaryRange(seriesConfigSet);
    }
}

export async function resolveSeriesTimeBoundaryRanges<T extends BoundarySeries>(
    seriesConfigSet: T[],
): Promise<FetchedTimeBoundaryRange | undefined> {
    if (seriesConfigSet.length === 0) {
        return undefined;
    }

    return resolveSeriesMinMaxBoundaryRange(seriesConfigSet);
}

async function resolveSeriesMinMaxBoundaryRange<T extends BoundarySeries>(
    seriesConfigSet: T[],
): Promise<FetchedTimeBoundaryRange | undefined> {
    return timeBoundaryRangeFetcherApi.fetchMinMaxTable(seriesConfigSet);
}

async function resolveLastRelativeBoundaryRange<T extends BoundarySeries>(
    seriesConfigSet: T[],
): Promise<FetchedTimeBoundaryRange | undefined> {
    const sBaseSeries = seriesConfigSet[0];
    return timeBoundaryRangeFetcherApi.fetchVirtualStatTable(
        sBaseSeries.table,
        collectTableTagNames(seriesConfigSet, sBaseSeries.table),
        sBaseSeries.sourceColumns.time,
    );
}

function collectTableTagNames<T extends BoundarySeries>(
    seriesConfigSet: T[],
    tableName: string,
): string[] {
    return seriesConfigSet
        .filter((series) => series.table === tableName)
        .map((series) => series.sourceTagName || '');
}
