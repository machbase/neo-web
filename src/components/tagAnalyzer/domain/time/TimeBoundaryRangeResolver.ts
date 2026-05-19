import type {
    FetchedTimeBoundaryRange,
    TimeRangeConfig,
} from './TimeTypes';
import {
    fetchMinMaxTable,
    fetchVirtualStatTable,
} from '../../fetch/TimeBoundaryRangeFetcher';
import type { BoundarySeries } from '../../fetch/FetchContracts';

export async function resolveTimeBoundaryRanges<T extends BoundarySeries>(
    seriesConfigSet: T[],
    boardTime: TimeRangeConfig,
    panelTime: TimeRangeConfig,
): Promise<FetchedTimeBoundaryRange | undefined> {
    const sActiveRangeConfig =
        panelTime.start.kind !== 'empty' && panelTime.end.kind !== 'empty'
            ? panelTime
            : boardTime;

    if (
        sActiveRangeConfig.start.kind === 'absolute' &&
        sActiveRangeConfig.end.kind === 'absolute'
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
        sActiveRangeConfig.start.kind === 'last' &&
        sActiveRangeConfig.end.kind === 'last'
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
    return fetchMinMaxTable(seriesConfigSet);
}

async function resolveLastRelativeBoundaryRange<T extends BoundarySeries>(
    seriesConfigSet: T[],
): Promise<FetchedTimeBoundaryRange | undefined> {
    const sBaseSeries = seriesConfigSet[0];
    return fetchVirtualStatTable(
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
