import type {
    PanelNavigatorRangePair,
    TimeRangeConfig,
    TimeRangeMs,
} from '../model/TimeTypes';
import { isValidTimeRange } from '../range/TimeRangeUtils';

export function hasCompleteTimeRangeConfig(
    timeRangeConfig: TimeRangeConfig,
): boolean {
    return timeRangeConfig.start.kind !== 'empty' &&
        timeRangeConfig.end.kind !== 'empty';
}

export function normalizePanelNavigatorRangePair(
    value: unknown,
): PanelNavigatorRangePair | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const rangePair = value as {
        panelRange?: unknown;
        navigatorRange?: unknown;
    };

    const panelRange = normalizeTimeRangeMs(rangePair.panelRange);
    const navigatorRange = normalizeTimeRangeMs(rangePair.navigatorRange);

    if (!panelRange || !navigatorRange) {
        return undefined;
    }

    return {
        panelRange,
        navigatorRange,
    };
}

function normalizeTimeRangeMs(value: unknown): TimeRangeMs | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const range = value as {
        startTime?: unknown;
        endTime?: unknown;
    };

    if (
        typeof range.startTime !== 'number' ||
        typeof range.endTime !== 'number'
    ) {
        return undefined;
    }

    const timeRange = {
        startTime: range.startTime,
        endTime: range.endTime,
    };

    return isValidTimeRange(timeRange) ? timeRange : undefined;
}

export function shouldApplyInitialMainChartWindow({
    applyInitialMainChartWindow,
    rangeConfig,
    boardTime,
}: {
    applyInitialMainChartWindow: boolean;
    rangeConfig: TimeRangeConfig;
    boardTime: TimeRangeConfig;
}): boolean {
    return (
        applyInitialMainChartWindow &&
        hasNoTimeRangeConfig(rangeConfig) &&
        hasNoTimeRangeConfig(boardTime)
    );
}

function hasNoTimeRangeConfig(timeRangeConfig: TimeRangeConfig): boolean {
    return timeRangeConfig.start.kind === 'empty' &&
        timeRangeConfig.end.kind === 'empty';
}
