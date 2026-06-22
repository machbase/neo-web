import type { PanelRangeState } from '../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import {
    canResolveTimeRangeConfig,
    resolveTimeRangeConfig,
} from '../domain/time/resolution/TimeRangeConfigResolver';
import { resolvePanelRangeConfig } from '../domain/time/resolution/PanelRangeConfigResolver';
import {
    hasCompleteTimeRangeConfig,
    shouldApplyInitialMainChartWindow,
} from '../domain/time/boundary/TimeBoundaryValidate';
import { isTimestampRangeConfig } from '../domain/time/range/PanelRangeConfigUtils';
import type {
    AxisRange,
    PanelNavigatorRangePair,
    PanelRangeConfig,
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
    fullRange: AxisRange;
    rangeConfig: PanelRangeConfig;
    lastViewedRange: PanelNavigatorRangePair | undefined;
    boardTime: TimeRangeConfig;
    applyInitialMainChartWindow?: boolean;
}): PanelRangeState {
    if (lastViewedRange) {
        const rangeState = {
            requestPanelRange: lastViewedRange.panelRange,
            requestNavigatorRange: lastViewedRange.navigatorRange,
            fullRange,
        };

        assertConcretePanelRangeState(rangeState);
        return rangeState;
    }

    const panelRange = resolvePanelRangeConfig(rangeConfig, fullRange);

    if (panelRange) {
        const rangeState = {
            requestPanelRange: panelRange,
            requestNavigatorRange: getCoveringNavigatorRange(panelRange, fullRange),
            fullRange,
        };

        assertConcretePanelRangeState(rangeState);
        return rangeState;
    }

    const timeRangeResolutionOptions = {
        lastAnchorTime: fullRange.endTime,
    };
    const boardRange = resolveConfiguredTimeRange(
        boardTime,
        timeRangeResolutionOptions,
    );

    if (isTimestampRangeConfig(rangeConfig) && boardRange) {
        const rangeState = {
            requestPanelRange: boardRange,
            requestNavigatorRange: getCoveringNavigatorRange(boardRange, fullRange),
            fullRange,
        };

        assertConcretePanelRangeState(rangeState);
        return rangeState;
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

        const rangeState = {
            requestPanelRange: createTimeRangeMs(
                sFullRangeCenter - sInitialMainChartWindowWidth / 2,
                sFullRangeCenter + sInitialMainChartWindowWidth / 2,
            ),
            requestNavigatorRange: fullRange,
            fullRange,
        };

        assertConcretePanelRangeState(rangeState);
        return rangeState;
    }

    const rangeState = {
        requestPanelRange: fullRange,
        requestNavigatorRange: fullRange,
        fullRange,
    };

    assertConcretePanelRangeState(rangeState);
    return rangeState;
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
    panelRange: AxisRange,
    navigatorRange: AxisRange,
): AxisRange {
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
): void {
    if (
        !isValidTimeRange(rangeState.requestPanelRange) ||
        !isValidTimeRange(rangeState.requestNavigatorRange) ||
        !isValidTimeRange(rangeState.fullRange)
    ) {
        throw new Error('Cannot resolve panel without a concrete range.');
    }
}
