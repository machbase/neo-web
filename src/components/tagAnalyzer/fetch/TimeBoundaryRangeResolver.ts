import type {
    FetchedTimeBoundaryRange,
    TimeRangeConfig,
} from '../time/TimeTypes';
import {
    isAbsoluteTimeBoundary,
    isEmptyTimeBoundary,
    isLastTimeBoundary,
} from '../time/TimeBoundaryGuards';
import { timeBoundaryRepositoryApi } from './helper/TimeBoundaryFetchRepository';
import type { BoundarySeries } from './FetchTypes';

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

async function resolveSeriesMinMaxBoundaryRange<T extends BoundarySeries>(
    seriesConfigSet: T[],
): Promise<FetchedTimeBoundaryRange | undefined> {
    return timeBoundaryRepositoryApi.fetchMinMaxTable(seriesConfigSet);
}

async function resolveLastRelativeBoundaryRange<T extends BoundarySeries>(
    seriesConfigSet: T[],
): Promise<FetchedTimeBoundaryRange | undefined> {
    const sBaseSeries = seriesConfigSet[0];
    return timeBoundaryRepositoryApi.fetchVirtualStatTable(
        sBaseSeries.table,
        collectTableTagNames(seriesConfigSet, sBaseSeries.table),
        sBaseSeries,
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
