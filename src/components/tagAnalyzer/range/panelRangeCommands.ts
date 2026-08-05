import {
    type AxisRange,
    type PanelRangeState,
    type RangeExpressionInput,
} from './rangeModel';
import {
    getRangeCenter,
    getRangeWidth,
    shiftRange,
} from './rangeArithmetic';

const PANEL_RANGE_SHIFT_FRACTION = 0.3;
const NAVIGATOR_RANGE_SHIFT_FRACTION = 0.1;
const FOCUS_ZOOM_HALF_WIDTH_FRACTION = 0.1;
const SMALL_ZOOM_FRACTION = 0.2;
const LARGE_ZOOM_FRACTION = 0.4;

type ShiftDirection = -1 | 1;

export type PanelRangeButtonAction =
    | 'zoom-in-small'
    | 'zoom-in-large'
    | 'zoom-out-small'
    | 'zoom-out-large'
    | 'focus'
    | 'shift-main-left'
    | 'shift-main-right'
    | 'shift-navigator-left'
    | 'shift-navigator-right';

export type PanelRangeUpdate =
    | { type: 'main-range-zoomed'; range: AxisRange }
    | { type: 'main-range-raw-limited'; range: AxisRange }
    | { type: 'navigator-selection-dragged'; range: PanelRangeState }
    | { type: 'main-range-entered'; range: AxisRange }
    | {
          type: 'navigator-range-entered';
          range: AxisRange;
          rangeInput?: RangeExpressionInput;
      };

export type PanelRangeAuthority = 'main' | 'navigator';

export type PanelRangeCandidate = {
    authority: PanelRangeAuthority;
    requestedRange: PanelRangeState;
};

export function createPanelRangeUpdateCandidate(
    state: PanelRangeState,
    update: PanelRangeUpdate,
): PanelRangeCandidate {
    switch (update.type) {
        case 'main-range-zoomed':
        case 'main-range-raw-limited':
        case 'main-range-entered':
            return createMainCandidate(state, update.range);
        case 'navigator-selection-dragged':
            return { authority: 'main', requestedRange: update.range };
        case 'navigator-range-entered':
            return createNavigatorCandidate(state, update.range);
    }
}

export function createPanelRangeButtonCandidate(
    state: PanelRangeState,
    action: PanelRangeButtonAction,
): PanelRangeCandidate {
    switch (action) {
        case 'shift-main-left':
            return createMainCandidate(state, shiftMainRange(state, -1));
        case 'shift-main-right':
            return createMainCandidate(state, shiftMainRange(state, 1));
        case 'shift-navigator-left':
            return createNavigatorCandidate(
                state,
                shiftNavigatorRange(state, -1),
            );
        case 'shift-navigator-right':
            return createNavigatorCandidate(
                state,
                shiftNavigatorRange(state, 1),
            );
        case 'zoom-in-small':
            return createMainCandidate(
                state,
                zoomMainRange(state, SMALL_ZOOM_FRACTION, 'in'),
            );
        case 'zoom-in-large':
            return createMainCandidate(
                state,
                zoomMainRange(state, LARGE_ZOOM_FRACTION, 'in'),
            );
        case 'zoom-out-small':
            return createMainCandidate(
                state,
                zoomMainRange(state, SMALL_ZOOM_FRACTION, 'out'),
            );
        case 'zoom-out-large':
            return createMainCandidate(
                state,
                zoomMainRange(state, LARGE_ZOOM_FRACTION, 'out'),
            );
        case 'focus':
            return {
                authority: 'main',
                requestedRange: focusMainRange(state),
            };
    }
}

function createMainCandidate(
    state: PanelRangeState,
    panelRange: AxisRange,
): PanelRangeCandidate {
    return {
        authority: 'main',
        requestedRange: { ...state, panelRange },
    };
}

function createNavigatorCandidate(
    state: PanelRangeState,
    navigatorRange: AxisRange,
): PanelRangeCandidate {
    return {
        authority: 'navigator',
        requestedRange: { ...state, navigatorRange },
    };
}

function shiftMainRange(
    state: PanelRangeState,
    direction: ShiftDirection,
): AxisRange {
    const sOffset =
        getRangeWidth(state.panelRange) *
        PANEL_RANGE_SHIFT_FRACTION *
        direction;
    return shiftRange(state.panelRange, sOffset);
}

function shiftNavigatorRange(
    state: PanelRangeState,
    direction: ShiftDirection,
): AxisRange {
    return shiftRange(
        state.navigatorRange,
        getRangeWidth(state.navigatorRange) *
            NAVIGATOR_RANGE_SHIFT_FRACTION *
            direction,
    );
}

function zoomMainRange(
    state: PanelRangeState,
    zoomFraction: number,
    direction: 'in' | 'out',
): AxisRange {
    const sSignedOffset =
        getRangeWidth(state.panelRange) *
        zoomFraction *
        (direction === 'in' ? 1 : -1);

    return {
        startTime: state.panelRange.startTime + sSignedOffset,
        endTime: state.panelRange.endTime - sSignedOffset,
    };
}

function focusMainRange(state: PanelRangeState): PanelRangeState {
    const sHalfWidth =
        getRangeWidth(state.panelRange) *
        FOCUS_ZOOM_HALF_WIDTH_FRACTION;
    const sPanelCenter = getRangeCenter(state.panelRange);
    const sPanelRange: AxisRange = {
        startTime: sPanelCenter - sHalfWidth,
        endTime: sPanelCenter + sHalfWidth,
    };

    return {
        panelRange: sPanelRange,
        navigatorRange: state.panelRange,
    };
}
