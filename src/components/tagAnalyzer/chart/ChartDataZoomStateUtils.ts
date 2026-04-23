import type {
    EChartDataZoomEventItem,
    EChartDataZoomEventPayload,
    EChartDataZoomOptionStateItem,
} from './options/ChartOptionTypes';

/**
 * Returns the primary data-zoom payload regardless of whether ECharts sent it directly or inside `batch`.
 * Intent: Normalize the zoom payload shape before the range extraction logic reads it.
 * @param aDataZoomState The incoming data-zoom payload.
 * @returns The primary zoom payload object to inspect.
 */
export const getPrimaryDataZoomState = (
    aDataZoomState:
        | EChartDataZoomEventPayload
        | EChartDataZoomOptionStateItem
        | undefined,
): EChartDataZoomEventItem | EChartDataZoomOptionStateItem | undefined => {
    if (!aDataZoomState) {
        return undefined;
    }

    return 'batch' in aDataZoomState ? aDataZoomState.batch[0] : aDataZoomState;
};

/**
 * Returns whether a live data-zoom payload exposes enough state to reconstruct a range.
 * Intent: Gate range reconstruction on the fields ECharts actually provided.
 * @param aDataZoomState The current live ECharts data-zoom state.
 * @returns Whether the payload contains a complete zoom range.
 */
export const hasExplicitDataZoomRange = (
    aDataZoomState:
        | EChartDataZoomEventPayload
        | EChartDataZoomOptionStateItem
        | undefined,
): boolean => {
    const sDataZoomState = getPrimaryDataZoomState(aDataZoomState);
    if (!sDataZoomState) {
        return false;
    }

    return (
        (sDataZoomState.startValue !== undefined && sDataZoomState.endValue !== undefined) ||
        (sDataZoomState.start !== undefined && sDataZoomState.end !== undefined)
    );
};
