import { EMPTY_TIME_RANGE } from './TimeConstants';
import {
    convertTimeRangeConfigToResolvedTimeRangeMs,
    isConcreteTimeRange,
} from './TimeBoundaryConverters';
import type {
    FetchedTimeBoundaryRange,
    ResolvedTimeRangeMs,
    TimeRangeConfig,
} from './TimeTypes';
import { resolvePanelOrBoardTimeRange } from './TimeRangeSourceUtils';

export function resolveConcreteTimeRangeConfigOrEmpty(
    timeRangeConfig: TimeRangeConfig | undefined,
): ResolvedTimeRangeMs {
    if (
        !timeRangeConfig ||
        timeRangeConfig.start.kind === 'empty' ||
        timeRangeConfig.end.kind === 'empty' ||
        timeRangeConfig.start.kind === 'last' ||
        timeRangeConfig.end.kind === 'last'
    ) {
        return EMPTY_TIME_RANGE;
    }

    return convertTimeRangeConfigToResolvedTimeRangeMs(timeRangeConfig);
}

export function resolveLastTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig | undefined,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null | undefined,
): ResolvedTimeRangeMs | undefined {
    if (
        !timeRangeConfig ||
        !timeBoundaryRanges ||
        timeRangeConfig.start.kind !== 'last' ||
        timeRangeConfig.end.kind !== 'last'
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
    if (
        timeRangeConfig.start.kind !== 'absolute' ||
        timeRangeConfig.end.kind !== 'absolute'
    ) {
        return undefined;
    }

    return convertTimeRangeConfigToResolvedTimeRangeMs(timeRangeConfig);
}

export function resolveNowTimeRangeConfigFromSource(
    localTimeRange: { rangeConfig: TimeRangeConfig },
    fallbackTimeRange: TimeRangeConfig | undefined,
): ResolvedTimeRangeMs | undefined {
    if (
        localTimeRange.rangeConfig.start.kind !== 'now' ||
        localTimeRange.rangeConfig.end.kind !== 'now'
    ) {
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

    return {
        startTime: sStartTime,
        endTime: sEndTime,
    };
}

export function resolveConcreteRangeFallback(
    baseRange: ResolvedTimeRangeMs,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
): ResolvedTimeRangeMs {
    if (isConcreteTimeRange(baseRange)) {
        return baseRange;
    }

    const sBoundaryFallbackRange = createTimeBoundaryFallbackRange(timeBoundaryRanges);
    if (sBoundaryFallbackRange) {
        return sBoundaryFallbackRange;
    }

    return baseRange;
}
