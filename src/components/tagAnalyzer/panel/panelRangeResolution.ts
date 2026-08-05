import {
    clampRangeToBounds,
    createRangeFromCenterAndWidth,
    getCoveringRange,
    getRangeCenter,
    getRangeWidth,
    isRangeWithin,
    isSameRange,
    isValidPanelRangeState,
    isValidRange,
} from '../range/rangeArithmetic';
import {
    isRangeExpressionEmpty,
    type RangeExpressionInput,
    type AxisRange,
    type PanelRangeState,
} from '../range/rangeModel';
import { resolvePanelRangeInput } from '../range/format/rangeFormat';
import { resolveBoardTimeRangeInput } from '../range/format/timeRangeFormat';
import type { PanelRangeCandidate } from '../range/panelRangeCommands';
import type { ResolvedPanelRangeState } from './panelRangeSourceState';

const NAVIGATOR_TRACK_SIDE_OFFSET_PX = 56;
const MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH = 36;
const TARGET_NAVIGATOR_SELECTION_PIXEL_WIDTH = 40;
const INITIAL_MAIN_CHART_VISIBLE_RANGE_RATIO = 0.25;

export function getNavigatorTrackWidth(chartAreaWidth: number): number {
    if (!Number.isFinite(chartAreaWidth) || chartAreaWidth <= 0) {
        throw new Error('Cannot calculate navigator limits without chart width.');
    }

    return Math.max(chartAreaWidth - NAVIGATOR_TRACK_SIDE_OFFSET_PX, 1);
}

/** Derives the visible Navigator without changing the requested range. */
export function resolveNavigatorDisplayRange(
    panelRange: AxisRange,
    navigatorRange: AxisRange,
    chartAreaWidth: number | undefined,
): AxisRange {
    if (!isValidRange(panelRange)) {
        return navigatorRange;
    }

    return resolveNavigatorRangeForPanel(
        panelRange,
        isValidRange(navigatorRange) ? navigatorRange : panelRange,
        chartAreaWidth !== undefined && chartAreaWidth > 0
            ? getNavigatorTrackWidth(chartAreaWidth)
            : undefined,
    );
}

export function resolvePanelRangeCandidate(
    currentRange: PanelRangeState,
    candidate: PanelRangeCandidate,
): PanelRangeState {
    return candidate.authority === 'main'
        ? resolveMainAuthoritativeRangeState(
              currentRange,
              candidate.requestedRange,
          )
        : resolveNavigatorAuthoritativeRangeState(
              currentRange,
              candidate.requestedRange,
          );
}

function resolveMainAuthoritativeRangeState(
    currentRange: PanelRangeState,
    requestedRange: PanelRangeState,
): PanelRangeState {
    if (
        !isValidRange(requestedRange.panelRange) &&
        isValidPanelRangeState(currentRange)
    ) {
        return currentRange;
    }

    const sPanelRange = isValidRange(requestedRange.panelRange)
        ? requestedRange.panelRange
        : isValidRange(currentRange.panelRange)
          ? currentRange.panelRange
          : isValidRange(currentRange.navigatorRange)
            ? currentRange.navigatorRange
            : requestedRange.navigatorRange;

    if (!isValidRange(sPanelRange)) {
        throw new Error('Cannot resolve a panel without a valid range.');
    }

    const sNavigatorRange = isValidRange(requestedRange.navigatorRange)
        ? requestedRange.navigatorRange
        : isValidRange(currentRange.navigatorRange)
          ? currentRange.navigatorRange
          : sPanelRange;

    return {
        panelRange: sPanelRange,
        navigatorRange: isRangeWithin(sPanelRange, sNavigatorRange)
            ? sNavigatorRange
            : getCoveringRange(sPanelRange, sNavigatorRange),
    };
}

function resolveNavigatorAuthoritativeRangeState(
    currentRange: PanelRangeState,
    requestedRange: PanelRangeState,
): PanelRangeState {
    if (
        !isValidRange(requestedRange.navigatorRange) &&
        isValidPanelRangeState(currentRange)
    ) {
        return currentRange;
    }

    const sNavigatorRange = isValidRange(requestedRange.navigatorRange)
        ? requestedRange.navigatorRange
        : isValidRange(currentRange.navigatorRange)
          ? currentRange.navigatorRange
          : requestedRange.panelRange;

    if (!isValidRange(sNavigatorRange)) {
        throw new Error('Cannot resolve a panel without a valid navigator range.');
    }

    const sPanelRange = isValidRange(requestedRange.panelRange)
        ? requestedRange.panelRange
        : isValidRange(currentRange.panelRange)
          ? currentRange.panelRange
          : sNavigatorRange;

    return {
        panelRange: clampRangeToBounds(sPanelRange, sNavigatorRange),
        navigatorRange: sNavigatorRange,
    };
}

export function resolveRequestedNavigatorRangeState(
    currentRange: PanelRangeState,
    navigatorRange: AxisRange,
    chartAreaWidth: number | undefined,
): PanelRangeState {
    if (!isValidRange(navigatorRange)) return currentRange;

    const sRange = resolveNavigatorAuthoritativeRangeState(currentRange, {
        ...currentRange,
        navigatorRange,
    });
    const sNavigatorPixelWidth =
        chartAreaWidth !== undefined && chartAreaWidth > 0
            ? getNavigatorTrackWidth(chartAreaWidth)
            : undefined;
    const sPanelRangeWidth = getRangeWidth(sRange.panelRange);
    const sNavigatorRangeWidth = getRangeWidth(navigatorRange);
    const sSelectionIsUsable = sNavigatorPixelWidth === undefined
        ? sPanelRangeWidth / sNavigatorRangeWidth >=
          INITIAL_MAIN_CHART_VISIBLE_RANGE_RATIO
        : isNavigatorSelectionUsable(
              sPanelRangeWidth,
              sNavigatorRangeWidth,
              sNavigatorPixelWidth,
          );
    if (sSelectionIsUsable) {
        return sRange;
    }

    return {
        panelRange: createMainChartFallbackRange(
            navigatorRange,
            getRangeCenter(sRange.panelRange),
            sNavigatorPixelWidth,
        ),
        navigatorRange,
    };
}

function resolveNavigatorRangeForPanel(
    panelRange: AxisRange,
    navigatorRange: AxisRange,
    navigatorPixelWidth: number | undefined,
): AxisRange {
    const sPanelRangeWidth = getRangeWidth(panelRange);
    const sSourceNavigatorRange = isRangeWithin(panelRange, navigatorRange)
        ? navigatorRange
        : getCoveringRange(panelRange, navigatorRange);

    if (!Number.isFinite(sPanelRangeWidth)) {
        return sSourceNavigatorRange;
    }

    const sSourceNavigatorRangeWidth = getRangeWidth(
        sSourceNavigatorRange,
    );
    if (navigatorPixelWidth === undefined) {
        return sSourceNavigatorRange;
    }

    const sNavigatorPixelWidth = Math.max(navigatorPixelWidth, 1);
    const sVisibleNavigatorRange = isNavigatorSelectionUsable(
        sPanelRangeWidth,
        sSourceNavigatorRangeWidth,
        sNavigatorPixelWidth,
    )
        ? sSourceNavigatorRange
        : createRangeFromCenterAndWidth(
              getRangeCenter(panelRange),
              Math.max(
                  sPanelRangeWidth,
                  (sPanelRangeWidth * sNavigatorPixelWidth) /
                      Math.min(
                          TARGET_NAVIGATOR_SELECTION_PIXEL_WIDTH,
                          sNavigatorPixelWidth,
                      ),
              ),
          );

    return sVisibleNavigatorRange;
}

function isNavigatorSelectionUsable(
    panelRangeWidth: number,
    navigatorRangeWidth: number,
    navigatorPixelWidth: number,
): boolean {
    const sMinimumSelectionPixelWidth = Math.min(
        MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH,
        navigatorPixelWidth,
    );
    return getNavigatorSelectionPixelWidth(
        panelRangeWidth,
        navigatorRangeWidth,
        navigatorPixelWidth,
    ) >= sMinimumSelectionPixelWidth;
}

function getNavigatorSelectionPixelWidth(
    panelRangeWidth: number,
    navigatorRangeWidth: number,
    navigatorPixelWidth: number,
): number {
    return (panelRangeWidth * navigatorPixelWidth) / navigatorRangeWidth;
}

function createMainChartFallbackRange(
    navigatorRange: AxisRange,
    center: number = getRangeCenter(navigatorRange),
    navigatorPixelWidth?: number,
): AxisRange {
    const sTargetVisibleRatio = navigatorPixelWidth === undefined
        ? 0
        : Math.min(
              TARGET_NAVIGATOR_SELECTION_PIXEL_WIDTH,
              Math.max(navigatorPixelWidth, 1),
          ) / Math.max(navigatorPixelWidth, 1);
    const sVisibleRatio = Math.min(
        Math.max(
            INITIAL_MAIN_CHART_VISIBLE_RANGE_RATIO,
            sTargetVisibleRatio,
        ),
        1,
    );

    return clampRangeToBounds(
        createRangeFromCenterAndWidth(
            center,
            getRangeWidth(navigatorRange) * sVisibleRatio,
        ),
        navigatorRange,
    );
}

export function resolveConcretePanelRangeState({
    fullRange,
    rangeInput,
    isNumericAxis,
    lastViewedRange,
    boardRange,
    applyInitialMainChartWindow,
    chartAreaWidth,
}: {
    fullRange: AxisRange;
    rangeInput: RangeExpressionInput;
    isNumericAxis: boolean;
    lastViewedRange: PanelRangeState | undefined;
    boardRange: RangeExpressionInput;
    applyInitialMainChartWindow: boolean;
    chartAreaWidth?: number;
}): ResolvedPanelRangeState {
    const sBoardNavigatorRange = resolveNavigatorRangeInput(
        boardRange,
        fullRange,
        isNumericAxis,
    );
    const sDefaultNavigatorRange = sBoardNavigatorRange ?? fullRange;

    if (sBoardNavigatorRange) {
        return createResolvedPanelRangeState(
            {
                panelRange: applyInitialMainChartWindow
                    ? createMainChartFallbackRange(
                          sDefaultNavigatorRange,
                          getRangeCenter(sDefaultNavigatorRange),
                          chartAreaWidth !== undefined && chartAreaWidth > 0
                              ? getNavigatorTrackWidth(chartAreaWidth)
                              : undefined,
                      )
                    : sDefaultNavigatorRange,
                navigatorRange: sDefaultNavigatorRange,
            },
            fullRange,
        );
    }

    if (lastViewedRange) {
        return createResolvedPanelRangeState(lastViewedRange, fullRange);
    }

    const sPanelRange = resolvePanelRangeInput(
        rangeInput,
        fullRange,
        isNumericAxis,
    );
    let sResolvedPanelRange = sPanelRange ?? fullRange;
    if (
        !sPanelRange &&
        isRangeExpressionEmpty(rangeInput) &&
        applyInitialMainChartWindow
    ) {
        sResolvedPanelRange = createMainChartFallbackRange(
            fullRange,
        );
    }

    return createResolvedPanelRangeState(
        {
            panelRange: sResolvedPanelRange,
            navigatorRange: sDefaultNavigatorRange,
        },
        fullRange,
    );
}

export function resolveNavigatorRangeInput(
    rangeInput: RangeExpressionInput,
    fullRange: AxisRange,
    isNumericAxis: boolean,
): AxisRange | undefined {
    return isNumericAxis
        ? resolvePanelRangeInput(rangeInput, fullRange, true)
        : resolveBoardTimeRangeInput(rangeInput, {
              firstDataTime: fullRange.startTime,
              lastDataTime: fullRange.endTime,
          });
}

export function resolveNavigatorInputRangeState(
    currentRangeState: ResolvedPanelRangeState,
    fullRange: AxisRange,
    rangeInput: RangeExpressionInput,
    isNumericAxis: boolean,
    chartAreaWidth?: number,
    retainInput: boolean = false,
): ResolvedPanelRangeState {
    const sNavigatorRange = resolveNavigatorRangeInput(
        rangeInput,
        fullRange,
        isNumericAxis,
    );
    if (!sNavigatorRange) return currentRangeState;

    const sRange = resolveRequestedNavigatorRangeState(
        currentRangeState.range,
        sNavigatorRange,
        chartAreaWidth,
    );

    return createResolvedPanelRangeState(
        sRange,
        fullRange,
        retainInput ? rangeInput : undefined,
    );
}

export function resolveEnteredMainRangeState(
    currentRangeState: ResolvedPanelRangeState,
    fullRange: AxisRange,
    rangeInput: RangeExpressionInput,
    isNumericAxis: boolean,
): ResolvedPanelRangeState | undefined {
    const sPanelRange = resolvePanelRangeInput(
        rangeInput,
        fullRange,
        isNumericAxis,
    );
    if (!sPanelRange) return undefined;

    const sRange = resolvePanelRangeCandidate(
        currentRangeState.range,
        {
            authority: 'main',
            requestedRange: {
                ...currentRangeState.range,
                panelRange: sPanelRange,
            },
        },
    );

    return createResolvedPanelRangeState(
        sRange,
        fullRange,
        isSameRange(
            sRange.navigatorRange,
            currentRangeState.range.navigatorRange,
        )
            ? currentRangeState.navigatorRangeInput
            : undefined,
    );
}

export function createResolvedPanelRangeState(
    range: PanelRangeState,
    fullRange: AxisRange,
    navigatorRangeInput?: RangeExpressionInput,
): ResolvedPanelRangeState {
    const sRange = resolvePanelRangeCandidate(
        { panelRange: fullRange, navigatorRange: fullRange },
        { authority: 'navigator', requestedRange: range },
    );

    return {
        status: 'ready',
        range: sRange,
        fullRange,
        navigatorRangeInput: navigatorRangeInput
            ? { ...navigatorRangeInput }
            : undefined,
    };
}
