import type {
    AxisRange,
    PanelRangeState,
    RangeExpressionInput,
} from '../range/rangeModel';

export type ResolvedPanelRangeState = {
    status: 'ready';
    range: PanelRangeState;
    fullRange: AxisRange;
    /** User-entered override retained so expressions such as last-10m can be resolved again. */
    navigatorRangeInput: RangeExpressionInput | undefined;
};

/** Loading or resolved range state owned by a Panel. */
export type PanelRangeSourceState =
    | { status: 'loading' }
    | ResolvedPanelRangeState;

export const LOADING_PANEL_RANGE_STATE: PanelRangeSourceState = {
    status: 'loading',
};

export function isResolvedPanelRangeState(
    rangeState: PanelRangeSourceState,
): rangeState is ResolvedPanelRangeState {
    return rangeState.status === 'ready';
}
