import type { PanelRangeState } from '../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import {
    canResolveTimeRangeConfig,
    resolveTimeRangeConfig,
} from '../domain/time/resolution/TimeRangeConfigResolver';
import {
    hasCompleteTimeRangeConfig,
    shouldApplyInitialMainChartWindow,
} from '../domain/time/boundary/TimeBoundaryValidate';
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

export function resolveConcretePanelRangeState({
    fullRange,
    rangeConfig,
    lastViewedRange,
    boardTime,
    applyInitialMainChartWindow = false,
}: {
    fullRange: TimeRangeMs;
    rangeConfig: TimeRangeConfig;
    lastViewedRange: PanelNavigatorRangePair | undefined;
    boardTime: TimeRangeConfig;
    applyInitialMainChartWindow?: boolean;
}): PanelRangeState {
    const timeRangeResolutionOptions = {
        lastAnchorTime: fullRange.endTime,
    };

    if (lastViewedRange) {
        return assertConcretePanelRangeState({
            panelRange: lastViewedRange.panelRange,
            navigatorRange: lastViewedRange.navigatorRange,
            fullRange,
        });
    }

    const panelRange = resolveConfiguredTimeRange(
        rangeConfig,
        timeRangeResolutionOptions,
    );

    if (panelRange) {
        return assertConcretePanelRangeState({
            panelRange,
            navigatorRange: getCoveringNavigatorRange(panelRange, fullRange),
            fullRange,
        });
    }

    const boardRange = resolveConfiguredTimeRange(
        boardTime,
        timeRangeResolutionOptions,
    );

    if (boardRange) {
        return assertConcretePanelRangeState({
            panelRange: boardRange,
            navigatorRange: getCoveringNavigatorRange(boardRange, fullRange),
            fullRange,
        });
    }

    if (
        shouldApplyInitialMainChartWindow({
            applyInitialMainChartWindow,
            rangeConfig,
            boardTime,
        })
    ) {
        const sFullRangeCenter = getTimeRangeCenter(fullRange);
        const sInitialMainChartWindowWidth =
            getTimeRangeWidth(fullRange) * INITIAL_MAIN_CHART_VISIBLE_RANGE_RATIO;

        return assertConcretePanelRangeState({
            panelRange: createTimeRangeMs(
                sFullRangeCenter - sInitialMainChartWindowWidth / 2,
                sFullRangeCenter + sInitialMainChartWindowWidth / 2,
            ),
            navigatorRange: fullRange,
            fullRange,
        });
    }

    return assertConcretePanelRangeState({
        panelRange: fullRange,
        navigatorRange: fullRange,
        fullRange,
    });
}

export function resolveBoardTimeRange(
    boardTime: TimeRangeConfig,
    fullRange: TimeRangeMs,
): TimeRangeMs {
    const sBoardTimeResolutionOptions = {
        lastAnchorTime: fullRange.endTime,
    };
    const boardRange = resolveConfiguredTimeRange(
        boardTime,
        sBoardTimeResolutionOptions,
    );

    if (!boardRange) {
        throw new Error('Cannot apply board time without a concrete board range.');
    }

    return boardRange;
}

export async function getFullRangeFromSeries(
    seriesList: PanelSeriesDefinition[],
): Promise<TimeRangeMs | undefined> {
    if (seriesList.length === 0) {
        return undefined;
    }

    const dataTimeRange = await fetchSeriesDataTimeRange(seriesList);

    return isValidTimeRange(dataTimeRange) ? dataTimeRange : undefined;
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

function resolveConfiguredTimeRange(
    timeRangeConfig: TimeRangeConfig,
    timeRangeResolutionOptions: { lastAnchorTime?: number },
): TimeRangeMs | undefined {
    if (!hasCompleteTimeRangeConfig(timeRangeConfig)) {
        return undefined;
    }

    if (!canResolveTimeRangeConfig(timeRangeConfig, timeRangeResolutionOptions)) {
        return undefined;
    }

    return resolveTimeRangeConfig(timeRangeConfig, timeRangeResolutionOptions);
}

function assertConcretePanelRangeState(
    rangeState: PanelRangeState,
): PanelRangeState {
    if (
        !isValidTimeRange(rangeState.panelRange) ||
        !isValidTimeRange(rangeState.navigatorRange) ||
        !isValidTimeRange(rangeState.fullRange)
    ) {
        throw new Error('Cannot resolve panel without a concrete range.');
    }

    return rangeState;
}
