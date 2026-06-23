import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import {
    hasValidRangeState,
    showPanelFullRangeUnavailableToast,
} from './BoardPanelState';
import { resolveTimeRangeConfig } from '../domain/time/resolution/TimeRangeConfigResolver';
import { resolvePanelRangeInput } from '../domain/time/resolution/PanelRangeConfigResolver';
import {
    hasCompleteTimeRangeConfig,
    shouldApplyInitialMainChartWindow,
} from '../domain/time/boundary/TimeBoundaryValidate';
import { isTimestampRangeInput } from '../domain/time/range/PanelRangeConfigUtils';
import type {
    PanelViewRange,
    PanelRangeInput,
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
    applyInitialMainChartWindow,
}: {
    fullRange: TimeRangeMs;
    rangeConfig: PanelRangeInput;
    lastViewedRange: PanelViewRange | undefined;
    boardTime: TimeRangeConfig;
    applyInitialMainChartWindow: boolean;
}): PanelRangeState {
    if (lastViewedRange) {
        return buildValidatedRangeState(
            lastViewedRange.panelRange,
            lastViewedRange.navigatorRange,
            fullRange,
        );
    }

    const panelRange = resolvePanelRangeInput(rangeConfig, fullRange);

    if (panelRange) {
        return buildValidatedRangeState(
            panelRange,
            getCoveringNavigatorRange(panelRange, fullRange),
            fullRange,
        );
    }

    const timeRangeResolutionOptions = {
        lastAnchorTime: fullRange.endTime,
    };
    const boardRange = resolveConfiguredTimeRange(
        boardTime,
        timeRangeResolutionOptions,
    );

    if (isTimestampRangeInput(rangeConfig) && boardRange) {
        return buildValidatedRangeState(
            boardRange,
            getCoveringNavigatorRange(boardRange, fullRange),
            fullRange,
        );
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

        return buildValidatedRangeState(
            createTimeRangeMs(
                sFullRangeCenter - sInitialMainChartWindowWidth / 2,
                sFullRangeCenter + sInitialMainChartWindowWidth / 2,
            ),
            fullRange,
            fullRange,
        );
    }

    return buildValidatedRangeState(fullRange, fullRange, fullRange);
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

export async function fetchFullRangeOrWarn(
    seriesList: PanelSeriesDefinition[],
): Promise<TimeRangeMs | undefined> {
    const fullRange = await getFullRangeFromSeries(seriesList);

    if (!fullRange) {
        showPanelFullRangeUnavailableToast();
        return undefined;
    }

    return fullRange;
}

export async function resolvePanelRangeStateForSeries({
    panelInfo,
    boardTime,
    useLastViewedRange,
    applyInitialMainChartWindow,
}: {
    panelInfo: PanelInfo;
    boardTime: TimeRangeConfig;
    useLastViewedRange: boolean;
    applyInitialMainChartWindow: boolean;
}): Promise<PanelRangeState | undefined> {
    const fullRange = await fetchFullRangeOrWarn(panelInfo.query.tagSet);

    if (!fullRange) {
        return undefined;
    }

    return resolveConcretePanelRangeState({
        fullRange,
        rangeConfig: panelInfo.timeRange,
        lastViewedRange:
            useLastViewedRange && panelInfo.timeRange.useLastViewedRange
                ? panelInfo.timeRange.lastViewedRange
                : undefined,
        boardTime,
        applyInitialMainChartWindow,
    });
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

    try {
        return resolveTimeRangeConfig(timeRangeConfig, timeRangeResolutionOptions);
    } catch {
        return undefined;
    }
}

function buildValidatedRangeState(
    requestPanelRange: TimeRangeMs,
    requestNavigatorRange: TimeRangeMs,
    fullRange: TimeRangeMs,
): PanelRangeState {
    const rangeState = {
        requestPanelRange,
        requestNavigatorRange,
        fullRange,
    };

    if (!hasValidRangeState(rangeState)) {
        throw new Error('Cannot resolve panel without a concrete range.');
    }

    return rangeState;
}
