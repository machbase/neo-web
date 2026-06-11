import type { PanelRangeState } from '../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import { EMPTY_TIME_RANGE } from '../domain/time/TimeConstants';
import { convertTimeRangeConfigToTimeRangeMs } from '../domain/time/TimeBoundaryConverters';
import { resolveFullDataTimeRange, resolvePanelTimeRange } from '../domain/time/PanelTimeRangeResolver';
import {
    resolveSeriesTimeBoundaryRanges,
    resolveTimeBoundaryRanges,
} from '../domain/time/TimeBoundaryRangeResolver';
import type {
    PanelNavigatorRangePair,
    TimeRangeConfig,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { isConcreteTimeRange } from '../domain/time/TimeRangeUtils';

export async function resolveConcretePanelRangeState({
    seriesList,
    rangeConfig,
    lastViewedRange,
    boardTime,
}: {
    seriesList: PanelSeriesDefinition[];
    rangeConfig: TimeRangeConfig;
    lastViewedRange: Partial<PanelNavigatorRangePair> | undefined;
    boardTime: TimeRangeConfig;
}): Promise<PanelRangeState> {
    const [
        timeBoundaryRanges,
        fullDataBoundaryRanges,
    ] = await Promise.all([
        resolveTimeBoundaryRanges(seriesList, boardTime, rangeConfig),
        resolveSeriesTimeBoundaryRanges(seriesList),
    ]);
    const resolvedTimeBoundaryRanges = timeBoundaryRanges ?? null;
    const resolvedFullDataBoundaryRanges =
        fullDataBoundaryRanges ?? resolvedTimeBoundaryRanges;
    const resolvedRange = resolvePanelTimeRange({
        boardTime,
        panelTime: { rangeConfig },
        timeBoundaryRanges: resolvedTimeBoundaryRanges,
        mode: 'initialize',
    });
    const fullDataRange =
        resolveFullDataTimeRange(resolvedFullDataBoundaryRanges) ?? resolvedRange;
    const lastViewedPanelRange = lastViewedRange?.panelRange;
    const lastViewedNavigatorRange = lastViewedRange?.navigatorRange;
    let resolvedRangeState: PanelRangeState;

    if (
        isConcreteTimeRange(lastViewedPanelRange) &&
        isConcreteTimeRange(lastViewedNavigatorRange)
    ) {
        resolvedRangeState = {
            panelRange: lastViewedPanelRange,
            navigatorRange: lastViewedNavigatorRange,
            fullRange: fullDataRange,
        };
    } else {
        resolvedRangeState = {
            panelRange: resolvedRange,
            navigatorRange: getCoveringNavigatorRange(
                resolvedRange,
                fullDataRange,
            ),
            fullRange: fullDataRange,
        };
    }

    assertConcretePanelRangeState(resolvedRangeState);

    return resolvedRangeState;
}

export async function resolveBoardTimeRange(
    seriesList: PanelSeriesDefinition[],
    boardTime: TimeRangeConfig,
): Promise<TimeRangeMs> {
    const boundaryRanges = (await resolveSeriesTimeBoundaryRanges(seriesList)) ?? null;
    const boardRange = convertTimeRangeConfigToTimeRangeMs(
        boardTime,
        boundaryRanges?.end.max.timestamp,
    );
    const resolvedRange = isConcreteTimeRange(boardRange)
        ? boardRange
        : resolveFullDataTimeRange(boundaryRanges) ?? EMPTY_TIME_RANGE;

    if (!isConcreteTimeRange(resolvedRange)) {
        throw new Error('Cannot apply board time without a concrete range.');
    }

    return resolvedRange;
}

export async function resolveFullRange(
    seriesList: PanelSeriesDefinition[],
): Promise<TimeRangeMs | undefined> {
    const boundaryRanges = (await resolveSeriesTimeBoundaryRanges(seriesList)) ?? null;

    return resolveFullDataTimeRange(boundaryRanges);
}

export async function resolveConfiguredPanelRange({
    seriesList,
    panelTime,
    boardTime,
}: {
    seriesList: PanelSeriesDefinition[];
    panelTime: TimeRangeConfig;
    boardTime: TimeRangeConfig;
}): Promise<{ panelRange: TimeRangeMs; fullRange: TimeRangeMs }> {
    const shouldUseBoardTime = hasConfiguredTimeRange(boardTime);
    const activeTimeConfig = shouldUseBoardTime ? boardTime : panelTime;
    const [
        timeBoundaryRanges,
        fullDataBoundaryRanges,
    ] = await Promise.all([
        resolveTimeBoundaryRanges(seriesList, boardTime, activeTimeConfig),
        resolveSeriesTimeBoundaryRanges(seriesList),
    ]);
    const resolvedTimeBoundaryRanges = timeBoundaryRanges ?? null;
    const resolvedPanelRange = resolvePanelTimeRange({
        boardTime,
        panelTime: { rangeConfig: activeTimeConfig },
        timeBoundaryRanges: resolvedTimeBoundaryRanges,
        mode: 'reset',
    });
    const resolvedFullRange =
        (shouldUseBoardTime
            ? resolvedPanelRange
            : resolveFullDataTimeRange(
                  fullDataBoundaryRanges ?? resolvedTimeBoundaryRanges,
              )) ??
        resolvedPanelRange;

    if (!isConcreteTimeRange(resolvedPanelRange)) {
        throw new Error('Cannot resolve panel time without a concrete panel range.');
    }

    if (!isConcreteTimeRange(resolvedFullRange)) {
        throw new Error('Cannot resolve panel time without a concrete full range.');
    }

    return {
        panelRange: resolvedPanelRange,
        fullRange: resolvedFullRange,
    };
}

export function getCoveringNavigatorRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): TimeRangeMs {
    return {
        startTime: Math.min(panelRange.startTime, navigatorRange.startTime),
        endTime: Math.max(panelRange.endTime, navigatorRange.endTime),
    };
}

function hasConfiguredTimeRange(timeRangeConfig: TimeRangeConfig): boolean {
    return timeRangeConfig.start.kind !== 'empty' ||
        timeRangeConfig.end.kind !== 'empty';
}

function assertConcretePanelRangeState(rangeState: PanelRangeState): void {
    if (
        !isConcreteTimeRange(rangeState.panelRange) ||
        !isConcreteTimeRange(rangeState.navigatorRange) ||
        !isConcreteTimeRange(rangeState.fullRange)
    ) {
        throw new Error('Cannot resolve panel without a concrete range.');
    }
}
