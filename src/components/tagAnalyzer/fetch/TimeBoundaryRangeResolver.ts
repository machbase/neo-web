import type {
    FetchedTimeBoundaryRange,
    TimeRangeConfig,
} from '../time/TimeTypes';
import { timeBoundaryRepositoryApi } from './TimeBoundaryFetchRepository';
import type { BoundarySeries } from './FetchTypes';

export async function resolveTimeBoundaryRanges<T extends BoundarySeries>(
    seriesConfigSet: T[],
    boardTime: TimeRangeConfig,
    panelTime: TimeRangeConfig,
): Promise<FetchedTimeBoundaryRange | undefined> {
    const sActiveRangeConfig = selectActiveRangeConfig(boardTime, panelTime);
    const sAbsoluteBoundaryRange = resolveAbsoluteBoundaryRange(sActiveRangeConfig);

    if (sAbsoluteBoundaryRange || seriesConfigSet.length === 0) {
        return sAbsoluteBoundaryRange;
    }

    if (
        sActiveRangeConfig.start.kind === 'last' &&
        sActiveRangeConfig.end.kind === 'last'
    ) {
        return resolveLastBoundaryRange(seriesConfigSet);
    }

    return resolveSeriesMinMaxBoundaryRange(seriesConfigSet);
}

async function resolveSeriesMinMaxBoundaryRange<T extends BoundarySeries>(
    seriesConfigSet: T[],
): Promise<FetchedTimeBoundaryRange | undefined> {
    return timeBoundaryRepositoryApi.fetchMinMaxTable(seriesConfigSet);
}

function selectActiveRangeConfig(
    boardTime: TimeRangeConfig,
    panelTime: TimeRangeConfig,
): TimeRangeConfig {
    const sHasPanelTime =
        panelTime.start.kind !== 'empty' && panelTime.end.kind !== 'empty';

    return sHasPanelTime ? panelTime : boardTime;
}

function resolveAbsoluteBoundaryRange(
    rangeConfig: TimeRangeConfig,
): FetchedTimeBoundaryRange | undefined {
    const sStartBoundary = rangeConfig.start;
    const sEndBoundary = rangeConfig.end;

    if (sStartBoundary.kind !== 'absolute' || sEndBoundary.kind !== 'absolute') {
        return undefined;
    }

    return {
        start: {
            min: sStartBoundary,
            max: sStartBoundary,
        },
        end: {
            min: sEndBoundary,
            max: sEndBoundary,
        },
    };
}

async function resolveLastBoundaryRange<T extends BoundarySeries>(
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

