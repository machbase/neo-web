import type {
    EChartDataZoomEventItem,
    EChartDataZoomEventPayload,
    EChartDataZoomOptionStateItem,
} from './ChartInteractionTypes';

/**
 * Returns whether an event data-zoom payload exposes enough state to reconstruct a range.
 * Intent: Keep event payload normalization separate from saved chart option state.
 * @param aDataZoomState The incoming ECharts data-zoom event payload.
 * @returns Whether the event payload contains a complete zoom range.
 */
export const hasExplicitDataZoomEventRange = (
    aDataZoomState: EChartDataZoomEventPayload,
): boolean => {
    const sDataZoomState = getPrimaryDataZoomEventState(aDataZoomState);

    return sDataZoomState ? hasExplicitPrimaryDataZoomRange(sDataZoomState) : false;
};

/**
 * Returns whether option data-zoom state exposes enough state to reconstruct a range.
 * Intent: Let callers guard missing option state before asking whether it is usable.
 * @param aDataZoomState The current ECharts option data-zoom state.
 * @returns Whether the option state contains a complete zoom range.
 */
export const hasExplicitDataZoomOptionRange = (
    aDataZoomState: EChartDataZoomOptionStateItem,
): boolean => hasExplicitPrimaryDataZoomRange(aDataZoomState);

/**
 * Returns the first event data-zoom item from direct or batched event payloads.
 * Intent: Normalize only ECharts event payloads, not option state or missing values.
 * @param aDataZoomState The incoming ECharts data-zoom event payload.
 * @returns The primary event zoom item to inspect.
 */
function getPrimaryDataZoomEventState(
    aDataZoomState: EChartDataZoomEventPayload,
): EChartDataZoomEventItem | undefined {
    return 'batch' in aDataZoomState ? aDataZoomState.batch[0] : aDataZoomState;
}

/**
 * Returns whether a normalized data-zoom item contains explicit range fields.
 * Intent: Share field-level range detection after callers have chosen the correct payload path.
 * @param aDataZoomState The normalized data-zoom item.
 * @returns Whether the item contains a complete zoom range.
 */
function hasExplicitPrimaryDataZoomRange(
    aDataZoomState: EChartDataZoomEventItem | EChartDataZoomOptionStateItem,
): boolean {
    return (
        (aDataZoomState.startValue !== undefined && aDataZoomState.endValue !== undefined) ||
        (aDataZoomState.start !== undefined && aDataZoomState.end !== undefined)
    );
}
