import type { PanelRangeState } from '../panel/PanelConfig';
import type {
    PanelViewRange,
    PanelRangeInput,
    TimeRangeInput,
    TimeRangeMs,
} from '../time/TimeTypes';
import {
    createTimeRangeFromCenterAndWidth,
    getTimeRangeCenter,
    getTimeRangeWidth,
    isEmptyTimeRangeInput,
    isValidTimeRange,
} from '../time/TimeRangeUtils';
import { resolveBoardTimeRangeInput } from '../time/TimeRangeInputResolver';
import { isPlainObject } from '../ObjectGuards';
import {
    isEmptyPanelRangeInput,
    resolvePanelRangeInput,
} from './PanelRangeInput';
import { hasConcretePanelRangeState } from './PanelRangeApply';

const INITIAL_MAIN_CHART_VISIBLE_RANGE_RATIO = 0.25;

export function normalizePanelViewRange(
    value: unknown,
): PanelViewRange | undefined {
    if (!isPlainObject(value)) {
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

export function shouldApplyInitialMainChartWindow({
    applyInitialMainChartWindow,
    rangeInput,
}: {
    applyInitialMainChartWindow: boolean;
    rangeInput: PanelRangeInput;
}): boolean {
    return (
        applyInitialMainChartWindow &&
        isEmptyPanelRangeInput(rangeInput)
    );
}
function normalizeTimeRangeMs(value: unknown): TimeRangeMs | undefined {
    if (!isPlainObject(value)) {
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

export function resolveConcretePanelRangeState({
    fullRange,
    rangeInput,
    isNumericAxis,
    lastViewedRange,
    boardTime,
    applyInitialMainChartWindow,
}: {
    fullRange: TimeRangeMs;
    rangeInput: PanelRangeInput;
    isNumericAxis: boolean;
    lastViewedRange: PanelViewRange | undefined;
    boardTime: TimeRangeInput;
    applyInitialMainChartWindow: boolean;
}): PanelRangeState {
    if (lastViewedRange) {
        return buildValidatedRangeState(
            lastViewedRange.panelRange,
            lastViewedRange.navigatorRange,
            fullRange,
        );
    }

    const panelRange = resolvePanelRangeInput(
        rangeInput,
        fullRange,
        isNumericAxis,
    );

    const sDefaultNavigatorRange = isNumericAxis
        ? fullRange
        : resolveDefaultNavigatorRange(boardTime, fullRange);

    if (panelRange) {
        return buildValidatedRangeState(
            panelRange,
            sDefaultNavigatorRange,
            fullRange,
        );
    }

    if (shouldApplyInitialMainChartWindow({
        applyInitialMainChartWindow,
        rangeInput,
    })) {
        const sInitialMainChartWindow = createInitialMainChartWindow(fullRange);

        return buildValidatedRangeState(
            sInitialMainChartWindow,
            sDefaultNavigatorRange,
            fullRange,
        );
    }

    return buildValidatedRangeState(fullRange, sDefaultNavigatorRange, fullRange);
}

export function resolveDefaultNavigatorRange(
    boardTime: TimeRangeInput,
    fullRange: TimeRangeMs,
): TimeRangeMs {
    return resolveDefaultNavigatorRangeResolution(boardTime, fullRange).range;
}

export type DefaultNavigatorRangeResolution = {
    range: TimeRangeMs;
    source: 'board-time' | 'full-range';
};

export function resolveDefaultNavigatorRangeResolution(
    boardTime: TimeRangeInput,
    fullRange: TimeRangeMs,
): DefaultNavigatorRangeResolution {
    const sBoardRange = !isEmptyTimeRangeInput(boardTime)
        ? resolveConfiguredTimeRange(boardTime, { lastDataTime: fullRange.endTime })
        : undefined;

    if (sBoardRange) {
        return {
            range: sBoardRange,
            source: 'board-time',
        };
    }

    return {
        range: fullRange,
        source: 'full-range',
    };
}

function resolveConfiguredTimeRange(
    timeRangeInput: TimeRangeInput,
    timeRangeInputResolutionOptions: { lastDataTime?: number },
): TimeRangeMs | undefined {
    try {
        return resolveBoardTimeRangeInput(timeRangeInput, timeRangeInputResolutionOptions);
    } catch {
        return undefined;
    }
}

function createInitialMainChartWindow(fullRange: TimeRangeMs): TimeRangeMs {
    const sFullRangeCenter = getTimeRangeCenter(fullRange);
    const sInitialMainChartWindowWidth =
        getTimeRangeWidth(fullRange) * INITIAL_MAIN_CHART_VISIBLE_RANGE_RATIO;

    return createTimeRangeFromCenterAndWidth(
        sFullRangeCenter,
        sInitialMainChartWindowWidth,
    );
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

    if (!hasConcretePanelRangeState(rangeState)) {
        throw new Error('Cannot resolve panel without a concrete range.');
    }

    return rangeState;
}
