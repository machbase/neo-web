import { EMPTY_TIME_RANGE } from './TimeConstants';
import {
    convertTimeRangeConfigToTimeRangeMs,
} from './TimeBoundaryConverters';
import {
    createTimeRangeMs,
    isConcreteTimeRange,
} from './TimeRangeUtils';
import type {
    FetchedTimeBoundaryRange,
    TimeRangeMs,
    TimeBoundary,
    TimeRangeConfig,
} from './TimeTypes';

type BoundaryKind = TimeBoundary['kind'];

type ResolveConcreteTimeRangeConfigWithFallbackParams = {
    rangeConfig: TimeRangeConfig;
    timeBoundaryRanges?: FetchedTimeBoundaryRange | null;
    fallbackRange: TimeRangeMs;
};

const SELF_CONTAINED_BOUNDARY_KINDS: BoundaryKind[] = ['absolute', 'now'];

export function resolvePanelOrBoardTimeRange(
    panelTime: { rangeConfig: TimeRangeConfig },
    boardTime: TimeRangeConfig | undefined,
): TimeRangeMs {
    return (
        resolveSelfContainedTimeRangeConfig(panelTime.rangeConfig) ??
        resolveConcreteTimeRangeConfigOrEmpty(boardTime)
    );
}

export function resolveConcreteTimeRangeConfigWithFallback({
    rangeConfig,
    timeBoundaryRanges,
    fallbackRange,
}: ResolveConcreteTimeRangeConfigWithFallbackParams): TimeRangeMs {
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
): TimeRangeMs {
    return resolveSelfContainedTimeRangeConfig(timeRangeConfig) ?? EMPTY_TIME_RANGE;
}

export function resolveLastTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig | undefined,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null | undefined,
): TimeRangeMs | undefined {
    if (
        !timeBoundaryRanges ||
        !hasMatchingTimeRangeBoundaryKind(timeRangeConfig, 'last')
    ) {
        return undefined;
    }

    return convertTimeRangeConfigToTimeRangeMs(
        timeRangeConfig,
        timeBoundaryRanges.end.max.timestamp,
    );
}

export function resolveAbsoluteTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig,
): TimeRangeMs | undefined {
    return resolveMatchingBoundaryKindTimeRangeConfig(timeRangeConfig, ['absolute']);
}

export function resolveNowTimeRangeConfigFromSource(
    localTimeRange: { rangeConfig: TimeRangeConfig },
    fallbackTimeRange: TimeRangeConfig | undefined,
): TimeRangeMs | undefined {
    if (!hasMatchingTimeRangeBoundaryKind(localTimeRange.rangeConfig, 'now')) {
        return undefined;
    }

    return resolvePanelOrBoardTimeRange(localTimeRange, fallbackTimeRange);
}

export function createTimeBoundaryFallbackRange(
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
): TimeRangeMs | undefined {
    if (!timeBoundaryRanges) {
        return undefined;
    }

    const sStartTime = timeBoundaryRanges.start.min.timestamp;
    const sEndTime = timeBoundaryRanges.end.max.timestamp;

    if (sStartTime <= 0 || sEndTime <= sStartTime) {
        return undefined;
    }

    return createTimeRangeMs(sStartTime, sEndTime);
}

export function resolveConcreteRangeFallback(
    baseRange: TimeRangeMs,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
): TimeRangeMs {
    return resolveConcreteOrFallback(
        baseRange,
        createTimeBoundaryFallbackRange(timeBoundaryRanges) ?? baseRange,
    );
}

function resolveSelfContainedTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig | undefined,
): TimeRangeMs | undefined {
    if (!isSelfContainedTimeRangeConfig(timeRangeConfig)) {
        return undefined;
    }

    return convertTimeRangeConfigToTimeRangeMs(timeRangeConfig);
}

function resolveMatchingBoundaryKindTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig | undefined,
    boundaryKinds: BoundaryKind[],
): TimeRangeMs | undefined {
    if (!hasMatchingBoundaryKind(timeRangeConfig, boundaryKinds)) {
        return undefined;
    }

    return convertTimeRangeConfigToTimeRangeMs(timeRangeConfig);
}

function resolveConcreteOrFallback(
    resolvedRange: TimeRangeMs | undefined,
    fallbackRange: TimeRangeMs,
): TimeRangeMs {
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
