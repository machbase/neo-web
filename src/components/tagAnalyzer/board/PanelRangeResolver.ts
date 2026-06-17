import type { PanelRangeState } from '../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import { EMPTY_TIME_RANGE } from '../domain/time/model/TimeConstants';
import {
    canResolveTimeRangeConfig,
    resolveTimeRangeConfig,
} from '../domain/time/resolution/TimeRangeConfigResolver';
import type {
    PanelNavigatorRangePair,
    TimeRangeConfig,
    TimeRangeMs,
} from '../domain/time/model/TimeTypes';
import { fetchSeriesDataTimeRange } from '../fetch/DataTimeRangeFetcher';
import {
    createTimeRangeMs,
    getTimeRangeCenter,
    getTimeRangeWidth,
    isValidTimeRange,
} from '../domain/time/range/TimeRangeUtils';

const INITIAL_MAIN_CHART_VISIBLE_RANGE_RATIO = 0.25;

export async function resolveConcretePanelRangeState({
    seriesList,
    rangeConfig,
    lastViewedRange,
    boardTime,
    applyInitialMainChartWindow = false,
}: {
    seriesList: PanelSeriesDefinition[];
    rangeConfig: TimeRangeConfig;
    lastViewedRange: Partial<PanelNavigatorRangePair> | undefined;
    boardTime: TimeRangeConfig;
    applyInitialMainChartWindow?: boolean;
}): Promise<PanelRangeState> {
    const fullDataTimeRange = await fetchPanelSeriesDataTimeRange(seriesList);
    const activeTimeConfig = hasCompleteTimeRangeConfig(rangeConfig)
        ? rangeConfig
        : boardTime;
    const timeRangeResolutionOptions = {
        lastAnchorTime: fullDataTimeRange?.endTime,
    };
    const fallbackRange = isValidTimeRange(fullDataTimeRange)
        ? fullDataTimeRange
        : EMPTY_TIME_RANGE;
    const resolvedRange = canResolveTimeRangeConfig(
        activeTimeConfig,
        timeRangeResolutionOptions,
    )
        ? resolveTimeRangeConfig(activeTimeConfig, timeRangeResolutionOptions)
        : fallbackRange;
    const fullDataRange =
        isValidTimeRange(fullDataTimeRange) ? fullDataTimeRange : resolvedRange;
    let resolvedRangeState: PanelRangeState;

    if (hasConcreteLastViewedRange(lastViewedRange)) {
        resolvedRangeState = {
            panelRange: lastViewedRange.panelRange,
            navigatorRange: lastViewedRange.navigatorRange,
            fullRange: fullDataRange,
        };
    } else if (
        shouldApplyInitialMainChartWindow({
            applyInitialMainChartWindow,
            rangeConfig,
            boardTime,
        })
    ) {
        resolvedRangeState = {
            panelRange: createCenteredRangeByRatio(
                fullDataRange,
                INITIAL_MAIN_CHART_VISIBLE_RANGE_RATIO,
            ),
            navigatorRange: fullDataRange,
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
    const dataTimeRange = await fetchPanelSeriesDataTimeRange(seriesList);
    const sBoardTimeResolutionOptions = {
        lastAnchorTime: dataTimeRange?.endTime,
    };
    const boardRange = canResolveTimeRangeConfig(
        boardTime,
        sBoardTimeResolutionOptions,
    )
        ? resolveTimeRangeConfig(boardTime, sBoardTimeResolutionOptions)
        : undefined;
    const resolvedRange = boardRange ??
        (isValidTimeRange(dataTimeRange) ? dataTimeRange : EMPTY_TIME_RANGE);

    if (!isValidTimeRange(resolvedRange)) {
        throw new Error('Cannot apply board time without a concrete range.');
    }

    return resolvedRange;
}

export async function resolveFullRange(
    seriesList: PanelSeriesDefinition[],
): Promise<TimeRangeMs | undefined> {
    const dataTimeRange = await fetchPanelSeriesDataTimeRange(seriesList);

    return isValidTimeRange(dataTimeRange) ? dataTimeRange : undefined;
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
    const fullDataTimeRange =
        !shouldUseBoardTime || !canResolveTimeRangeConfig(activeTimeConfig)
            ? await fetchPanelSeriesDataTimeRange(seriesList)
            : undefined;
    const timeRangeResolutionOptions = {
        lastAnchorTime: fullDataTimeRange?.endTime,
    };
    const fallbackPanelRange = isValidTimeRange(fullDataTimeRange)
        ? fullDataTimeRange
        : EMPTY_TIME_RANGE;
    const resolvedPanelRange = canResolveTimeRangeConfig(
        activeTimeConfig,
        timeRangeResolutionOptions,
    )
        ? resolveTimeRangeConfig(activeTimeConfig, timeRangeResolutionOptions)
        : fallbackPanelRange;
    const resolvedFullRange =
        !shouldUseBoardTime && isValidTimeRange(fullDataTimeRange)
            ? fullDataTimeRange
            : resolvedPanelRange;

    if (!isValidTimeRange(resolvedPanelRange)) {
        throw new Error('Cannot resolve panel time without a concrete panel range.');
    }

    if (!isValidTimeRange(resolvedFullRange)) {
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

async function fetchPanelSeriesDataTimeRange(
    seriesList: PanelSeriesDefinition[],
): Promise<TimeRangeMs | undefined> {
    if (seriesList.length === 0) {
        return undefined;
    }

    return fetchSeriesDataTimeRange(seriesList);
}

function hasConfiguredTimeRange(timeRangeConfig: TimeRangeConfig): boolean {
    return timeRangeConfig.start.kind !== 'empty' ||
        timeRangeConfig.end.kind !== 'empty';
}

function hasCompleteTimeRangeConfig(timeRangeConfig: TimeRangeConfig): boolean {
    return timeRangeConfig.start.kind !== 'empty' &&
        timeRangeConfig.end.kind !== 'empty';
}

function hasConcreteLastViewedRange(
    lastViewedRange: Partial<PanelNavigatorRangePair> | undefined,
): lastViewedRange is PanelNavigatorRangePair {
    return (
        isValidTimeRange(lastViewedRange?.panelRange) &&
        isValidTimeRange(lastViewedRange?.navigatorRange)
    );
}

function shouldApplyInitialMainChartWindow({
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
        !hasConfiguredTimeRange(rangeConfig) &&
        !hasConfiguredTimeRange(boardTime)
    );
}

function createCenteredRangeByRatio(
    range: TimeRangeMs,
    visibleRangeRatio: number,
): TimeRangeMs {
    const sRangeCenter = getTimeRangeCenter(range);
    const sVisibleRangeWidth = getTimeRangeWidth(range) * visibleRangeRatio;

    return createTimeRangeMs(
        sRangeCenter - sVisibleRangeWidth / 2,
        sRangeCenter + sVisibleRangeWidth / 2,
    );
}

function assertConcretePanelRangeState(rangeState: PanelRangeState): void {
    if (
        !isValidTimeRange(rangeState.panelRange) ||
        !isValidTimeRange(rangeState.navigatorRange) ||
        !isValidTimeRange(rangeState.fullRange)
    ) {
        throw new Error('Cannot resolve panel without a concrete range.');
    }
}
