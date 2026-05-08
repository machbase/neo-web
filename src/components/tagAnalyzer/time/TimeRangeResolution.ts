import { EMPTY_TIME_RANGE } from './TimeConstants';
import {
    convertTimeRangeConfigToResolvedTimeRangeMs,
} from './TimeBoundaryConverters';
import {
    createResolvedTimeRange,
    isConcreteTimeRange,
} from './TimeRangeUtils';
import type {
    FetchedTimeBoundaryRange,
    ResolvedTimeRangeMs,
    TimeBoundary,
    TimeRangeConfig,
} from './TimeTypes';

type BoundaryKind = TimeBoundary['kind'];

type ResolveConcreteTimeRangeConfigWithFallbackParams = {
    rangeConfig: TimeRangeConfig;
    timeBoundaryRanges?: FetchedTimeBoundaryRange | null;
    fallbackRange: ResolvedTimeRangeMs;
};

const SELF_CONTAINED_BOUNDARY_KINDS: BoundaryKind[] = ['absolute', 'now'];

export function resolvePanelOrBoardTimeRange(
    panelTime: { rangeConfig: TimeRangeConfig },
    boardTime: TimeRangeConfig | undefined,
): ResolvedTimeRangeMs {
    return (
        resolveSelfContainedTimeRangeConfig(panelTime.rangeConfig) ??
        resolveConcreteTimeRangeConfigOrEmpty(boardTime)
    );
}

export function resolveConcreteTimeRangeConfigWithFallback({
    rangeConfig,
    timeBoundaryRanges,
    fallbackRange,
}: ResolveConcreteTimeRangeConfigWithFallbackParams): ResolvedTimeRangeMs {
    return (
        resolveLastTimeRangeConfig(rangeConfig, timeBoundaryRanges) ??
        resolveConcreteOrFallback(
            resolveMatchingBoundaryKindTimeRangeConfig(
                rangeConfig,
                SELF_CONTAINED_BOUNDARY_KINDS,
            ),
            fallbackRange,
        )
    );
}

export function resolveConcreteTimeRangeConfigOrEmpty(
    timeRangeConfig: TimeRangeConfig | undefined,
): ResolvedTimeRangeMs {
    return resolveSelfContainedTimeRangeConfig(timeRangeConfig) ?? EMPTY_TIME_RANGE;
}

export function resolveLastTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig | undefined,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null | undefined,
): ResolvedTimeRangeMs | undefined {
    if (
        !timeBoundaryRanges ||
        !hasMatchingTimeRangeBoundaryKind(timeRangeConfig, 'last')
    ) {
        return undefined;
    }

    return convertTimeRangeConfigToResolvedTimeRangeMs(
        timeRangeConfig,
        timeBoundaryRanges.end.max.timestamp,
    );
}

export function resolveAbsoluteTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig,
): ResolvedTimeRangeMs | undefined {
    return resolveMatchingBoundaryKindTimeRangeConfig(timeRangeConfig, ['absolute']);
}

export function resolveNowTimeRangeConfigFromSource(
    localTimeRange: { rangeConfig: TimeRangeConfig },
    fallbackTimeRange: TimeRangeConfig | undefined,
): ResolvedTimeRangeMs | undefined {
    if (!hasMatchingTimeRangeBoundaryKind(localTimeRange.rangeConfig, 'now')) {
        return undefined;
    }

    return resolvePanelOrBoardTimeRange(localTimeRange, fallbackTimeRange);
}

export function createTimeBoundaryFallbackRange(
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
): ResolvedTimeRangeMs | undefined {
    if (!timeBoundaryRanges) {
        return undefined;
    }

    const sStartTime = timeBoundaryRanges.start.min.timestamp;
    const sEndTime = timeBoundaryRanges.end.max.timestamp;

    if (sStartTime <= 0 || sEndTime <= sStartTime) {
        return undefined;
    }

    return createResolvedTimeRange(sStartTime, sEndTime);
}

export function resolveConcreteRangeFallback(
    baseRange: ResolvedTimeRangeMs,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
): ResolvedTimeRangeMs {
    return resolveConcreteOrFallback(
        baseRange,
        createTimeBoundaryFallbackRange(timeBoundaryRanges) ?? baseRange,
    );
}

function resolveSelfContainedTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig | undefined,
): ResolvedTimeRangeMs | undefined {
    if (!isSelfContainedTimeRangeConfig(timeRangeConfig)) {
        return undefined;
    }

    return convertTimeRangeConfigToResolvedTimeRangeMs(timeRangeConfig);
}

function resolveMatchingBoundaryKindTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig | undefined,
    boundaryKinds: BoundaryKind[],
): ResolvedTimeRangeMs | undefined {
    if (!hasMatchingBoundaryKind(timeRangeConfig, boundaryKinds)) {
        return undefined;
    }

    return convertTimeRangeConfigToResolvedTimeRangeMs(timeRangeConfig);
}

function resolveConcreteOrFallback(
    resolvedRange: ResolvedTimeRangeMs | undefined,
    fallbackRange: ResolvedTimeRangeMs,
): ResolvedTimeRangeMs {
    return isConcreteTimeRange(resolvedRange) ? resolvedRange : fallbackRange;
}

function isSelfContainedTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig | undefined,
): timeRangeConfig is TimeRangeConfig {
    return !!timeRangeConfig && !hasAnyBoundaryKind(timeRangeConfig, ['empty', 'last']);
}

function hasAnyBoundaryKind(
    timeRangeConfig: TimeRangeConfig,
    boundaryKinds: BoundaryKind[],
): boolean {
    return boundaryKinds.some(
        (kind) =>
            timeRangeConfig.start.kind === kind || timeRangeConfig.end.kind === kind,
    );
}

function hasMatchingBoundaryKind(
    timeRangeConfig: TimeRangeConfig | undefined,
    boundaryKinds: BoundaryKind[],
): timeRangeConfig is TimeRangeConfig {
    return boundaryKinds.some((kind) =>
        hasMatchingTimeRangeBoundaryKind(timeRangeConfig, kind),
    );
}

export function hasMatchingTimeRangeBoundaryKind(
    timeRangeConfig: TimeRangeConfig | undefined,
    kind: BoundaryKind,
): timeRangeConfig is TimeRangeConfig {
    return !!(
        timeRangeConfig &&
        timeRangeConfig.start.kind === kind &&
        timeRangeConfig.end.kind === kind
    );
}
