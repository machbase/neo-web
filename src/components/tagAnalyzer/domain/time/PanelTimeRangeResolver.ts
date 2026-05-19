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
    TimeBoundary,
    TimeRangeConfig,
    TimeRangeMs,
} from './TimeTypes';

type BoundaryKind = TimeBoundary['kind'];

type PanelRangeResolutionMode = 'initialize' | 'reset';
type PanelTimeRangeSource = {
    rangeConfig: TimeRangeConfig;
};

export function resolvePanelTimeRange({
    boardTime,
    panelTime,
    timeBoundaryRanges,
    mode,
}: {
    boardTime: TimeRangeConfig | undefined;
    panelTime: PanelTimeRangeSource;
    timeBoundaryRanges: FetchedTimeBoundaryRange | null;
    mode: PanelRangeResolutionMode;
}): TimeRangeMs {
    const sPanelOrBoardRange = resolvePanelOrBoardTimeRange(panelTime, boardTime);
    const sAbsolutePanelRange = resolveAbsoluteTimeRangeConfig(panelTime.rangeConfig);
    if (sAbsolutePanelRange) {
        return sAbsolutePanelRange;
    }

    const sBoardPriorityRange = resolveLastTimeRangeConfig(boardTime, timeBoundaryRanges);
    if (sBoardPriorityRange) {
        return sBoardPriorityRange;
    }

    const sRelativePanelRange = resolveRelativeOrNowPanelRange(
        boardTime,
        panelTime,
        timeBoundaryRanges,
    );
    if (sRelativePanelRange) {
        return sRelativePanelRange;
    }

    if (mode === 'reset') {
        return resolveConcreteRangeFallback(
            resolveConcreteTimeRangeConfigOrEmpty(boardTime),
            timeBoundaryRanges,
        );
    }

    return resolveConcreteRangeFallback(
        sPanelOrBoardRange,
        timeBoundaryRanges,
    );
}

function resolveRelativeOrNowPanelRange(
    boardTime: TimeRangeConfig | undefined,
    panelTime: PanelTimeRangeSource,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
): TimeRangeMs | undefined {
    const sRelativePanelLastRange = resolveRelativePanelLastRange(
        panelTime,
        timeBoundaryRanges,
    );
    if (sRelativePanelLastRange) {
        return sRelativePanelLastRange;
    }

    return resolveNowTimeRangeConfigFromSource(panelTime, boardTime);
}

function resolveRelativePanelLastRange(
    panelTime: PanelTimeRangeSource,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
): TimeRangeMs | undefined {
    if (
        !hasMatchingTimeRangeBoundaryKind(panelTime.rangeConfig, 'last') ||
        !timeBoundaryRanges
    ) {
        return undefined;
    }

    return resolveLastTimeRangeConfig(panelTime.rangeConfig, timeBoundaryRanges);
}

export function resolveFullDataTimeRange(
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
): TimeRangeMs | undefined {
    return createTimeBoundaryFallbackRange(timeBoundaryRanges);
}

function resolvePanelOrBoardTimeRange(
    panelTime: { rangeConfig: TimeRangeConfig },
    boardTime: TimeRangeConfig | undefined,
): TimeRangeMs {
    return (
        resolveSelfContainedTimeRangeConfig(panelTime.rangeConfig) ??
        resolveConcreteTimeRangeConfigOrEmpty(boardTime)
    );
}

function resolveConcreteTimeRangeConfigOrEmpty(
    timeRangeConfig: TimeRangeConfig | undefined,
): TimeRangeMs {
    return resolveSelfContainedTimeRangeConfig(timeRangeConfig) ?? EMPTY_TIME_RANGE;
}

function resolveLastTimeRangeConfig(
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

function resolveAbsoluteTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig,
): TimeRangeMs | undefined {
    return resolveMatchingBoundaryKindTimeRangeConfig(timeRangeConfig, ['absolute']);
}

function resolveNowTimeRangeConfigFromSource(
    localTimeRange: { rangeConfig: TimeRangeConfig },
    fallbackTimeRange: TimeRangeConfig | undefined,
): TimeRangeMs | undefined {
    if (!hasMatchingTimeRangeBoundaryKind(localTimeRange.rangeConfig, 'now')) {
        return undefined;
    }

    return resolvePanelOrBoardTimeRange(localTimeRange, fallbackTimeRange);
}

function createTimeBoundaryFallbackRange(
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

function resolveConcreteRangeFallback(
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

function hasMatchingTimeRangeBoundaryKind(
    timeRangeConfig: TimeRangeConfig | undefined,
    kind: BoundaryKind,
): timeRangeConfig is TimeRangeConfig {
    return !!(
        timeRangeConfig &&
        timeRangeConfig.start.kind === kind &&
        timeRangeConfig.end.kind === kind
    );
}
